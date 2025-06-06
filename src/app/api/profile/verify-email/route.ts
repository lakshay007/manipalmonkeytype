import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { verificationCode } = await request.json();

    // Validate verification code
    if (!verificationCode || typeof verificationCode !== 'string') {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    // Remove spaces and convert to string (in case user adds spaces)
    const cleanCode = verificationCode.replace(/\s/g, '');

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json({ 
        error: 'Verification code must be 6 digits' 
      }, { status: 400 });
    }

    await connectToDatabase();

    // Find the user
    const user = await User.findOne({ discordId: session.user.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a verification code
    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      return NextResponse.json({ 
        error: 'No verification code found. Please request a new code.' 
      }, { status: 400 });
    }

    // Check if code has expired
    if (new Date() > user.verificationCodeExpiresAt) {
      return NextResponse.json({ 
        error: 'Verification code has expired. Please request a new code.' 
      }, { status: 400 });
    }

    // Check if code matches
    if (user.verificationCode !== cleanCode) {
      return NextResponse.json({ 
        error: 'Invalid verification code. Please check and try again.' 
      }, { status: 400 });
    }

    // Check if email is already verified (edge case)
    if (user.eduEmailVerified) {
      return NextResponse.json({ 
        error: 'Email is already verified' 
      }, { status: 400 });
    }

    // Verify the email
    await User.findByIdAndUpdate(user._id, {
      eduEmailVerified: true,
      verificationCode: undefined, // Clear the code
      verificationCodeExpiresAt: undefined, // Clear the expiration
      lastUpdated: new Date()
    });

    return NextResponse.json({ 
      message: 'Email verified successfully! You now have the verified badge.',
      eduEmail: user.eduEmail,
      verified: true
    });

  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 