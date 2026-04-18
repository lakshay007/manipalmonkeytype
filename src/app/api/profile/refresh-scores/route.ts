import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Score from '@/models/Score';
import { validateDiscordId } from '@/lib/validation';

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

  // Prefer standard english, no punctuation, no numbers, normal difficulty
  const standard = pbs.filter(
    pb =>
      pb.language === 'english' &&
      pb.punctuation === false &&
      pb.numbers === false &&
      pb.difficulty === 'normal'
  );

  const pool = standard.length > 0 ? standard : pbs.filter(pb => pb.language === 'english');
  const best = (pool.length > 0 ? pool : pbs).reduce((a, b) => (a.wpm >= b.wpm ? a : b));
  return best;
}

async function fetchMonkeyTypeScores(username: string) {
  const url = `${MONKEYTYPE_API}/users/${encodeURIComponent(username)}/profile`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      // Next.js: no caching — always fetch fresh data
      cache: 'no-store',
    });
  } catch {
    return { success: false, error: 'Failed to reach MonkeyType API' };
  }

  if (res.status === 404) {
    return { success: false, error: 'MonkeyType profile not found' };
  }
  if (!res.ok) {
    return { success: false, error: `MonkeyType API returned ${res.status}` };
  }

  let json: { message: string; data: MonkeyTypeProfile };
  try {
    json = await res.json();
  } catch {
    return { success: false, error: 'Invalid response from MonkeyType API' };
  }

  const profile = json.data;
  if (!profile) {
    return { success: false, error: 'No profile data in MonkeyType API response' };
  }

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

  if (scores.length === 0) {
    return {
      success: false,
      error:
        'No typing scores found on this MonkeyType profile. Make sure your profile is public and you have completed tests.',
    };
  }

  return { success: true, scores };
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const discordIdValidation = validateDiscordId(session.user.id);
    if (!discordIdValidation.isValid) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ discordId: session.user.id });

    if (!user || !user.monkeyTypeUsername) {
      return NextResponse.json({ error: 'No MonkeyType account linked' }, { status: 400 });
    }

    const scrapedData = await fetchMonkeyTypeScores(user.monkeyTypeUsername);

    if (!scrapedData.success) {
      return NextResponse.json(
        { error: scrapedData.error || 'Failed to fetch scores from MonkeyType' },
        { status: 400 }
      );
    }

    if (scrapedData.scores && scrapedData.scores.length > 0) {
      await Score.deleteMany({ userId: user._id });

      const scoreDocuments = scrapedData.scores
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
          monkeyTypeUsername: user.monkeyTypeUsername,
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
      message: 'Scores refreshed successfully',
      scoresUpdated: scrapedData.scores?.length || 0,
      scores: scrapedData.scores,
    });
  } catch (error) {
    console.error('Error refreshing scores:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
