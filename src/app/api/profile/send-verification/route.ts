import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { sendVerificationEmail, generateVerificationCode } from '@/lib/email';
import { authOptions } from '@/lib/auth';

// Rate limiting: Allow one email per 2 minutes, max 3 attempts per hour
const RATE_LIMIT_WINDOW = 2 * 60 * 1000; // 2 minutes
const MAX_ATTEMPTS_PER_HOUR = 3;
const MAX_ATTEMPTS_PER_DAY = 10;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eduEmail } = await request.json();

    // Validate email format
    if (!eduEmail || typeof eduEmail !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Sanitize and validate email input
    const sanitizedEmail = eduEmail.trim().toLowerCase();
    
    // Additional security: Check for email injection patterns
    if (sanitizedEmail.includes('\n') || sanitizedEmail.includes('\r') || sanitizedEmail.includes('\0')) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate Manipal email format
    if (!sanitizedEmail.endsWith('@learner.manipal.edu')) {
      return NextResponse.json({ 
        error: 'Please use a valid Manipal email address ending with @learner.manipal.edu' 
      }, { status: 400 });
    }

    // Additional validation: ensure it's a valid email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@learner\.manipal\.edu$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    await connectToDatabase();

    // Find the user
    const user = await User.findOne({ discordId: session.user.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is already verified
    if (user.eduEmailVerified && user.eduEmail === sanitizedEmail) {
      return NextResponse.json({ 
        error: 'This email is already verified' 
      }, { status: 400 });
    }

    // Check if another user has already verified this email
    const existingUser = await User.findOne({ 
      eduEmail: sanitizedEmail, 
      eduEmailVerified: true,
      discordId: { $ne: session.user.id }
    });
    
    if (existingUser) {
      return NextResponse.json({ 
        error: 'This email is already verified by another account' 
      }, { status: 400 });
    }

    // Rate limiting checks
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check if last email was sent too recently
    if (user.lastVerificationEmailSent) {
      const timeSinceLastEmail = now.getTime() - user.lastVerificationEmailSent.getTime();
      if (timeSinceLastEmail < RATE_LIMIT_WINDOW) {
        const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - timeSinceLastEmail) / 1000);
        return NextResponse.json({ 
          error: `Please wait ${remainingTime} seconds before requesting another verification code` 
        }, { status: 429 });
      }
    }

    // Check attempts in the last hour
    const recentAttempts = await User.countDocuments({
      discordId: session.user.id,
      lastVerificationEmailSent: { $gte: oneHourAgo }
    });

    if (recentAttempts >= MAX_ATTEMPTS_PER_HOUR) {
      return NextResponse.json({ 
        error: 'Too many verification attempts. Please try again in an hour.' 
      }, { status: 429 });
    }

    // Check attempts in the last day
    const dailyAttempts = await User.countDocuments({
      discordId: session.user.id,
      lastVerificationEmailSent: { $gte: oneDayAgo }
    });

    if (dailyAttempts >= MAX_ATTEMPTS_PER_DAY) {
      return NextResponse.json({ 
        error: 'Daily limit reached. Please try again tomorrow.' 
      }, { status: 429 });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // Update user with verification code
    await User.findByIdAndUpdate(user._id, {
      eduEmail: sanitizedEmail,
      verificationCode,
      verificationCodeExpiresAt: expiresAt,
      lastVerificationEmailSent: now,
      $inc: { verificationAttempts: 1 },
      lastUpdated: now
    });

    // Send verification email
    const emailResult = await sendVerificationEmail({
      to: sanitizedEmail,
      verificationCode,
      studentName: user.discordUsername
    });

    if (!emailResult.success) {
      return NextResponse.json({ 
        error: 'Failed to send verification email. Please try again.' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Verification code sent! Please check your email.',
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 