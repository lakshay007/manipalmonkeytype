import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Score from '@/models/Score';
import { validateSearchQuery, validateCategory } from '@/lib/validation';

interface FuzzyMatch {
  user: {
    _id: string;
    discordUsername: string;
    monkeyTypeUsername?: string;
  };
  similarity: number;
  matchType: string;
}

interface SearchResultRaw {
  _id: string;
  userId: string;
  wpm: number;
  accuracy: number;
  consistency: number;
  rawWpm: number;
  lastUpdated: Date;
  user: {
    _id: string;
    discordUsername: string;
    discordAvatar?: string;
    monkeyTypeUsername: string;
    branch?: string;
    year?: number;
    eduEmailVerified?: boolean;
  };
  matchPriority?: number;
}

// Levenshtein distance function for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category') || '30s';
    const fuzzy = searchParams.get('fuzzy') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    // Validate search query
    const queryValidation = validateSearchQuery(query || undefined);
    if (!queryValidation.isValid) {
      return NextResponse.json({
        results: [],
        error: queryValidation.error
      }, { status: 400 });
    }

    // Validate category
    const categoryValidation = validateCategory(category);
    if (!categoryValidation.isValid) {
      return NextResponse.json({
        results: [],
        error: categoryValidation.error
      }, { status: 400 });
    }

    const sanitizedQuery = queryValidation.sanitized!;
    const sanitizedCategory = categoryValidation.sanitized!;
    
    await connectDB();

    let searchResults: SearchResultRaw[] = [];

    if (fuzzy) {
      // FUZZY SEARCH APPROACH
      // Get all verified users for fuzzy matching
      const allUsers = await User.find(
        { isVerified: true },
        { discordUsername: 1, monkeyTypeUsername: 1 }
      ).limit(1000); // Reasonable limit for fuzzy search

      const fuzzyMatches: FuzzyMatch[] = allUsers
        .map(user => {
          const discordDistance = levenshteinDistance(
            sanitizedQuery.toLowerCase(), 
            user.discordUsername.toLowerCase()
          );
          const monkeyTypeDistance = user.monkeyTypeUsername ? 
            levenshteinDistance(
              sanitizedQuery.toLowerCase(), 
              user.monkeyTypeUsername.toLowerCase()
            ) : Infinity;

          const minDistance = Math.min(discordDistance, monkeyTypeDistance);
          const maxLength = Math.max(
            sanitizedQuery.length, 
            Math.max(user.discordUsername.length, user.monkeyTypeUsername?.length || 0)
          );
          
          // Calculate similarity score (0-1, higher is better)
          const similarity = 1 - (minDistance / maxLength);
          
          return {
            user,
            similarity,
            matchType: discordDistance < monkeyTypeDistance ? 'discord' : 'monkeytype'
          };
        })
        .filter(match => match.similarity > 0.4) // Minimum similarity threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      // Get user IDs for score lookup
      const userIds = fuzzyMatches.map(match => match.user._id);
      
      if (userIds.length > 0) {
        searchResults = await Score.aggregate([
          {
            $match: {
              userId: { $in: userIds },
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
                  $project: {
                    discordUsername: 1,
                    discordAvatar: 1,
                    monkeyTypeUsername: 1,
                    branch: 1,
                    year: 1,
                    eduEmailVerified: 1
                  }
                }
              ]
            }
          },
          {
            $unwind: '$user'
          },
          {
            $sort: { wpm: -1 }
          }
        ]);

        // Add similarity scores to results
        searchResults = searchResults.map(result => {
          const fuzzyMatch = fuzzyMatches.find(match => 
            match.user._id.toString() === result.userId.toString()
          );
          return {
            ...result,
            similarity: fuzzyMatch?.similarity || 0,
            matchType: fuzzyMatch?.matchType || 'unknown'
          };
        });
      }

    } else {
      // EXACT + PARTIAL MATCH APPROACH
      // Escape regex special characters for safe regex
      const escapedQuery = sanitizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      searchResults = await Score.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $match: {
                  isVerified: true,
                  $or: [
                    // Exact matches (highest priority)
                    { discordUsername: { $regex: `^${escapedQuery}$`, $options: 'i' } },
                    { monkeyTypeUsername: { $regex: `^${escapedQuery}$`, $options: 'i' } },
                    // Starts with matches
                    { discordUsername: { $regex: `^${escapedQuery}`, $options: 'i' } },
                    { monkeyTypeUsername: { $regex: `^${escapedQuery}`, $options: 'i' } },
                    // Contains matches
                    { discordUsername: { $regex: escapedQuery, $options: 'i' } },
                    { monkeyTypeUsername: { $regex: escapedQuery, $options: 'i' } },
                  ]
                }
              },
              {
                $project: {
                  discordUsername: 1,
                  discordAvatar: 1,
                  monkeyTypeUsername: 1,
                  branch: 1,
                  year: 1,
                  eduEmailVerified: 1
                }
              }
            ]
          }
        },
        {
          $unwind: '$user'
        },
        {
          $match: {
            category: sanitizedCategory,
            personalBest: true
          }
        },
        {
          $addFields: {
            // Calculate match priority for sorting
            matchPriority: {
              $switch: {
                branches: [
                  // Exact match has highest priority
                  {
                    case: {
                      $or: [
                        { $eq: [{ $toLower: '$user.discordUsername' }, sanitizedQuery.toLowerCase()] },
                        { $eq: [{ $toLower: '$user.monkeyTypeUsername' }, sanitizedQuery.toLowerCase()] }
                      ]
                    },
                    then: 3
                  },
                  // Starts with match
                  {
                    case: {
                      $or: [
                        { $eq: [{ $indexOfCP: [{ $toLower: '$user.discordUsername' }, sanitizedQuery.toLowerCase()] }, 0] },
                        { $eq: [{ $indexOfCP: [{ $toLower: '$user.monkeyTypeUsername' }, sanitizedQuery.toLowerCase()] }, 0] }
                      ]
                    },
                    then: 2
                  }
                ],
                default: 1 // Contains match
              }
            }
          }
        },
        {
          $sort: {
            matchPriority: -1,
            wpm: -1,
            accuracy: -1
          }
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
            user: 1,
            matchPriority: 1
          }
        }
      ]);
    }

    // Add ranking within search results
    const rankedResults = searchResults.map((result, index) => ({
      ...result,
      searchRank: index + 1
    }));

    return NextResponse.json({
      query: sanitizedQuery,
      category: sanitizedCategory,
      searchType: fuzzy ? 'fuzzy' : 'partial',
      totalResults: rankedResults.length,
      results: rankedResults
    });

  } catch (error) {
    console.error('Search error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
} 