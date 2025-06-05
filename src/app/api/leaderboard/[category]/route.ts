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

    // OPTIMIZED: Single aggregation query using $facet to get both count and data
    // This reduces database round trips from 2 to 1
    const results = await Score.aggregate([
      {
        // Initial match - uses the optimized compound index
        $match: {
          category: sanitizedCategory,
          personalBest: true
        }
      },
      {
        // Use $facet to run count and data queries in parallel
        $facet: {
          // Get total count for pagination
          totalCount: [
            { $count: "count" }
          ],
          // Get paginated leaderboard data
          leaderboardData: [
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
              // Sort using the compound index: category + personalBest + wpm
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
          ]
        }
      }
    ]);

    // Extract results from $facet
    const totalUsers = results[0]?.totalCount[0]?.count || 0;
    const scores = results[0]?.leaderboardData || [];

    // Add ranking (considering pagination)
    const rankedScores = scores.map((score: {
      _id: string;
      wpm: number;
      accuracy: number;
      consistency: number;
      rawWpm: number;
      lastUpdated: string;
      user: {
        discordUsername: string;
        discordAvatar?: string;
        monkeyTypeUsername: string;
        branch?: string;
        year?: number;
      };
    }, index: number) => ({
      ...score,
      rank: skip + index + 1
    }));

    return NextResponse.json({
      category: sanitizedCategory,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      hasNextPage: page * limit < totalUsers,
      hasPreviousPage: page > 1,
      leaderboard: rankedScores
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 