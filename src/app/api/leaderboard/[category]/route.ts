import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Score from '@/models/Score';
import { validateCategory, validatePagination } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const { searchParams } = new URL(req.url);
    
    // Check if this is a refresh request
    const isRefresh = searchParams.get('refresh') === 'true';
    
    // Validate category
    const categoryValidation = validateCategory(category);
    if (!categoryValidation.isValid) {
      return NextResponse.json(
        { error: categoryValidation.error },
        { status: 400 }
      );
    }
    const sanitizedCategory = categoryValidation.sanitized!;
    
    // Validate pagination parameters
    const paginationValidation = validatePagination(
      searchParams.get('page') || undefined,
      searchParams.get('limit') || undefined
    );
    
    if (!paginationValidation.isValid) {
      return NextResponse.json(
        { error: paginationValidation.error },
        { status: 400 }
      );
    }
    
    const { page, limit } = paginationValidation;
    const skip = (page - 1) * limit;

    await connectDB();

    // Get total count for pagination (optimized query)
    const totalUsers = await Score.countDocuments({
      category: sanitizedCategory,
      personalBest: true
    });

    // Optimized aggregation pipeline for better performance
    const scores = await Score.aggregate([
      {
        $match: {
          category: sanitizedCategory,
          personalBest: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $match: { isVerified: true }
            },
            {
              $project: {
                discordUsername: 1,
                discordAvatar: 1,
                monkeyTypeUsername: 1,
                branch: 1,
                year: 1
              }
            }
          ]
        }
      },
      {
        $unwind: '$user'
      },
      {
        $sort: {
          wpm: -1,
          accuracy: -1,
          consistency: -1
        }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      },
      {
        $project: {
          wpm: 1,
          accuracy: 1,
          consistency: 1,
          rawWpm: 1,
          lastUpdated: 1,
          user: 1
        }
      }
    ]);

    // Add ranking (considering pagination)
    const rankedScores = scores.map((score, index) => ({
      ...score,
      rank: skip + index + 1
    }));

    // Cache headers - bypass cache if refresh is requested
    const headers: Record<string, string> = isRefresh ? {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    } : {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
    };

    return NextResponse.json({
      category: sanitizedCategory,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      hasNextPage: page * limit < totalUsers,
      hasPreviousPage: page > 1,
      leaderboard: rankedScores
    }, { headers });

  } catch (error) {
    console.error('Error fetching leaderboard:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 