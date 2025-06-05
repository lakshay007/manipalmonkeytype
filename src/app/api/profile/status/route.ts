import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user by Discord ID
    const user = await User.findOne({ discordId: session.user.id });

    if (!user) {
      return NextResponse.json({
        isLinked: false,
        monkeyTypeUsername: null,
        isVerified: false,
      });
    }

    return NextResponse.json({
      isLinked: !!user.monkeyTypeUsername,
      monkeyTypeUsername: user.monkeyTypeUsername,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
    });

  } catch (error) {
    console.error('Error checking profile status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 