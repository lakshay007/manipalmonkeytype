import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Score from '@/models/Score';
import { validateMonkeyTypeUsername, validateDiscordId, sanitizeString } from '@/lib/validation';

const MONKEYTYPE_API = 'https://api.monkeytype.com';
const TIME_CATEGORIES = ['15', '30', '60', '120'] as const;

interface MonkeyTypePb {
  wpm: number;
  raw: number;
  acc: number;
  consistency: number;
  difficulty: string;
  language: string;
  punctuation: boolean;
  numbers: boolean;
  timestamp?: number;
}

interface MonkeyTypeProfile {
  name: string;
  details?: {
    bio?: string;
  };
  personalBests?: {
    time?: Record<string, MonkeyTypePb[]>;
    words?: Record<string, MonkeyTypePb[]>;
  };
}

function getBestStandardPb(pbs: MonkeyTypePb[]): MonkeyTypePb | null {
  if (!pbs || pbs.length === 0) return null;

  const standard = pbs.filter(
    pb =>
      pb.language === 'english' &&
      pb.punctuation === false &&
      pb.numbers === false &&
      pb.difficulty === 'normal'
  );

  const pool = standard.length > 0 ? standard : pbs.filter(pb => pb.language === 'english');
  return (pool.length > 0 ? pool : pbs).reduce((a, b) => (a.wpm >= b.wpm ? a : b));
}

async function fetchMonkeyTypeProfile(username: string) {
  // Extra safety: only allow safe characters in the username before hitting the API
  const safeUsernameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!username || username.length > 50 || !safeUsernameRegex.test(username)) {
    return { exists: false, hasManipialInBio: false, scores: [] };
  }

  const url = `${MONKEYTYPE_API}/users/${encodeURIComponent(username)}/profile`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
  } catch {
    console.error('Failed to reach MonkeyType API for username:', username);
    return { exists: false, hasManipialInBio: false, scores: [] };
  }

  if (res.status === 404) {
    return { exists: false, hasManipialInBio: false, scores: [] };
  }

  if (!res.ok) {
    console.error(`MonkeyType API returned ${res.status} for username:`, username);
    return { exists: false, hasManipialInBio: false, scores: [] };
  }

  let json: { message: string; data: MonkeyTypeProfile };
  try {
    json = await res.json();
  } catch {
    return { exists: false, hasManipialInBio: false, scores: [] };
  }

  const profile = json.data;
  if (!profile) {
    return { exists: false, hasManipialInBio: false, scores: [] };
  }

  const bio = profile.details?.bio ?? '';
  const hasManipialInBio = bio.toLowerCase().includes('manipal');

  const scores: { category: string; wpm: number; accuracy: number; consistency: number; rawWpm: number }[] = [];

  for (const duration of TIME_CATEGORIES) {
    const pbs = profile.personalBests?.time?.[duration];
    if (!pbs || pbs.length === 0) continue;

    const best = getBestStandardPb(pbs);
    if (!best || best.wpm <= 0) continue;

    scores.push({
      category: `${duration}s`,
      wpm: best.wpm,
      accuracy: best.acc,
      consistency: best.consistency ?? 0,
      rawWpm: best.raw ?? best.wpm,
    });
  }

  return { exists: true, hasManipialInBio, scores };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const discordIdValidation = validateDiscordId(session.user.id);
    if (!discordIdValidation.isValid) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }

    const body = await req.json();
    const { monkeyTypeUsername } = body;

    const usernameValidation = validateMonkeyTypeUsername(monkeyTypeUsername);
    if (!usernameValidation.isValid) {
      return NextResponse.json({ error: usernameValidation.error }, { status: 400 });
    }

    const sanitizedUsername = usernameValidation.sanitized!;

    await connectDB();

    // Check if current user already has a different verified MonkeyType account
    const currentUser = await User.findOne({ discordId: session.user.id });
    if (
      currentUser &&
      currentUser.monkeyTypeUsername &&
      currentUser.isVerified &&
      currentUser.monkeyTypeUsername !== sanitizedUsername
    ) {
      return NextResponse.json(
        {
          error: `You already have a verified MonkeyType account linked: ${sanitizeString(currentUser.monkeyTypeUsername)}. Contact support if you need to change it.`,
          code: 'ALREADY_VERIFIED_DIFFERENT_ACCOUNT',
        },
        { status: 409 }
      );
    }

    // Check if MonkeyType username is already taken by another verified user
    const existingUser = await User.findOne({
      monkeyTypeUsername: sanitizedUsername,
      discordId: { $ne: session.user.id },
      isVerified: true,
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'This MonkeyType username is already linked to another verified account. If this is your account, please contact support.',
          code: 'USERNAME_ALREADY_CLAIMED',
        },
        { status: 409 }
      );
    }

    // Additional check: Look for any user (even unverified) with this username
    const anyExistingUser = await User.findOne({
      monkeyTypeUsername: sanitizedUsername,
      discordId: { $ne: session.user.id },
    });

    if (anyExistingUser) {
      return NextResponse.json(
        {
          error: 'This MonkeyType username is already associated with another account. Each MonkeyType profile can only be linked once.',
          code: 'USERNAME_CONFLICT',
        },
        { status: 409 }
      );
    }

    // Fetch MonkeyType profile via API
    const profileData = await fetchMonkeyTypeProfile(sanitizedUsername);

    if (!profileData.exists) {
      return NextResponse.json(
        { error: 'MonkeyType profile not found or not public' },
        { status: 404 }
      );
    }

    if (!profileData.hasManipialInBio) {
      return NextResponse.json(
        { error: 'Please add "Manipal" to your MonkeyType bio for verification' },
        { status: 400 }
      );
    }

    const sanitizedDiscordUsername = sanitizeString(session.user.name || '');
    const sanitizedDiscordAvatar = session.user.image || '';

    const user = await User.findOneAndUpdate(
      { discordId: session.user.id },
      {
        discordId: session.user.id,
        discordUsername: sanitizedDiscordUsername,
        discordAvatar: sanitizedDiscordAvatar,
        monkeyTypeUsername: sanitizedUsername,
        isVerified: true,
        verificationStatus: 'verified',
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    if (profileData.scores && profileData.scores.length > 0) {
      await Score.deleteMany({ userId: user._id });

      const scoreDocuments = profileData.scores
        .filter(score => {
          return (
            score.category &&
            typeof score.wpm === 'number' &&
            typeof score.accuracy === 'number' &&
            score.wpm >= 0 &&
            score.wpm <= 500 &&
            score.accuracy >= 0 &&
            score.accuracy <= 100 &&
            ['15s', '30s', '60s', '120s'].includes(score.category)
          );
        })
        .map(score => ({
          userId: user._id,
          discordId: session.user.id,
          monkeyTypeUsername: sanitizedUsername,
          category: score.category,
          wpm: Math.round(score.wpm),
          accuracy: Math.round(score.accuracy),
          consistency: Math.round(score.consistency || 0),
          rawWpm: Math.round(score.rawWpm || score.wpm),
          personalBest: true,
          lastUpdated: new Date(),
        }));

      if (scoreDocuments.length > 0) {
        await Score.insertMany(scoreDocuments);
      }
    }

    return NextResponse.json({
      message:
        profileData.scores && profileData.scores.length > 0
          ? `MonkeyType account linked successfully! Automatically imported ${profileData.scores.length} category scores.`
          : 'MonkeyType account linked successfully! No scores found - make sure you have completed typing tests on MonkeyType.',
      user: {
        monkeyTypeUsername: user.monkeyTypeUsername,
        scoresImported: profileData.scores?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error linking MonkeyType account:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
