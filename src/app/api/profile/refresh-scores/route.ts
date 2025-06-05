import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Score from '@/models/Score';
import puppeteer from 'puppeteer';
import { validateDiscordId } from '@/lib/validation';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate Discord ID from session
    const discordIdValidation = validateDiscordId(session.user.id);
    if (!discordIdValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the user
    const user = await User.findOne({ discordId: session.user.id });
    
    if (!user || !user.monkeyTypeUsername) {
      return NextResponse.json(
        { error: 'No MonkeyType account linked' },
        { status: 400 }
      );
    }

    // Scrape updated scores
    const scrapedData = await scrapeMonkeyTypeScores(user.monkeyTypeUsername);
    
    if (!scrapedData.success) {
      return NextResponse.json(
        { error: scrapedData.error || 'Failed to fetch scores from MonkeyType' },
        { status: 400 }
      );
    }

    // Update scores in database
    if (scrapedData.scores && scrapedData.scores.length > 0) {
      // Clear existing scores for this user
      await Score.deleteMany({ userId: user._id });

      // Validate and sanitize scores before storing
      const scoreDocuments = scrapedData.scores
        .filter(score => {
          // Validate score data
          return (
            score.category && 
            typeof score.wpm === 'number' && 
            typeof score.accuracy === 'number' &&
            score.wpm >= 0 && score.wpm <= 500 && // Reasonable WPM limits
            score.accuracy >= 0 && score.accuracy <= 100 &&
            ['15s', '30s', '60s', '120s', 'words'].includes(score.category)
          );
        })
        .map(score => ({
          userId: user._id,
          discordId: session.user.id,
          monkeyTypeUsername: user.monkeyTypeUsername,
          category: score.category,
          wpm: Math.round(score.wpm), // Ensure integer
          accuracy: Math.round(score.accuracy), // Ensure integer
          consistency: Math.round(score.consistency || 0), // Ensure integer
          rawWpm: Math.round(score.rawWpm || score.wpm), // Ensure integer
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to wait
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeMonkeyTypeScores(username: string) {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to MonkeyType profile
    const profileUrl = `https://monkeytype.com/profile/${encodeURIComponent(username)}`;
    
    // Validate that we're only visiting MonkeyType
    const urlObj = new URL(profileUrl);
    if (urlObj.hostname !== 'monkeytype.com') {
      console.error('Invalid hostname detected:', urlObj.hostname);
      return { success: false, error: 'Invalid MonkeyType URL' };
    }
    
    let response;
    try {
      response = await page.goto(profileUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
    } catch {
      return { success: false, error: 'MonkeyType profile took too long to load' };
    }
    
    if (response?.status() === 404) {
      return { success: false, error: 'MonkeyType profile not found' };
    }

    // Wait for page to load and scripts to execute
    await delay(5000);

    // Try to extract actual scores from the page
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const scrapingResult = await page.evaluate(() => {
      const extractedScores: any[] = [];
      
      try {
        // Target the actual MonkeyType profile structure
        
        // 1. Extract time-based personal bests from .pbsTime section
        const pbsTimeSection = document.querySelector('.pbsTime');
        if (pbsTimeSection) {
          const timeGroups = pbsTimeSection.querySelectorAll('.group');
          
          timeGroups.forEach(group => {
            const quickSection = group.querySelector('.quick');
            const fullTestSection = group.querySelector('.fullTest');
            
            if (quickSection) {
              const testElement = quickSection.querySelector('.test');
              const wpmElement = quickSection.querySelector('.wpm');
              const accElement = quickSection.querySelector('.acc');
              
              if (testElement && wpmElement && accElement) {
                const testText = testElement.textContent?.trim() || '';
                const wpmText = wpmElement.textContent?.trim() || '';
                const accText = accElement.textContent?.trim() || '';
                
                // Only process if there's actual data (not "-")
                if (wpmText !== '-' && accText !== '-' && wpmText && accText) {
                  // Extract category from test text (e.g., "30 seconds" -> "30s")
                  const timeMatch = testText.match(/(\d+)\s*seconds?/i);
                  const wpm = parseInt(wpmText);
                  const accuracy = parseInt(accText.replace('%', ''));
                  
                  if (timeMatch && wpm > 0 && accuracy > 0) {
                    const category = `${timeMatch[1]}s`;
                    
                    // Try to get more detailed info from fullTest section if available
                    let consistency = 0;
                    let rawWpm = Math.round(wpm * 100 / accuracy);
                    
                    if (fullTestSection) {
                      const fullTestDivs = fullTestSection.querySelectorAll('div');
                      fullTestDivs.forEach(div => {
                        const text = div.textContent?.trim() || '';
                        
                        // Look for raw WPM (e.g., "60 raw")
                        const rawMatch = text.match(/(\d+)\s*raw/i);
                        if (rawMatch) {
                          rawWpm = parseInt(rawMatch[1]);
                        }
                        
                        // Look for consistency (e.g., "65% con")
                        const conMatch = text.match(/(\d+)%\s*con/i);
                        if (conMatch) {
                          consistency = parseInt(conMatch[1]);
                        }
                      });
                    }
                    
                    extractedScores.push({
                      category,
                      wpm,
                      accuracy,
                      consistency,
                      rawWpm
                    });
                  }
                }
              }
            }
          });
        }
        
        // 2. Extract word-based personal bests from .pbsWords section
        const pbsWordsSection = document.querySelector('.pbsWords');
        if (pbsWordsSection) {
          const wordGroups = pbsWordsSection.querySelectorAll('.group');
          
          wordGroups.forEach(group => {
            const quickSection = group.querySelector('.quick');
            
            if (quickSection) {
              const testElement = quickSection.querySelector('.test');
              const wpmElement = quickSection.querySelector('.wpm');
              const accElement = quickSection.querySelector('.acc');
              
              if (testElement && wpmElement && accElement) {
                const testText = testElement.textContent?.trim() || '';
                const wpmText = wpmElement.textContent?.trim() || '';
                const accText = accElement.textContent?.trim() || '';
                
                // Only process if there's actual data (not "-")
                if (wpmText !== '-' && accText !== '-' && wpmText && accText) {
                  // Extract word count from test text (e.g., "25 words" -> "25w")
                  const wordMatch = testText.match(/(\d+)\s*words?/i);
                  const wpm = parseInt(wpmText);
                  const accuracy = parseInt(accText.replace('%', ''));
                  
                  if (wordMatch && wpm > 0 && accuracy > 0) {
                    const category = `${wordMatch[1]}w`;
                    
                    extractedScores.push({
                      category,
                      wpm,
                      accuracy,
                      consistency: 0, // Word tests don't show consistency in quick view
                      rawWpm: Math.round(wpm * 100 / accuracy)
                    });
                  }
                }
              }
            }
          });
        }

        return {
          success: extractedScores.length > 0,
          scores: extractedScores,
          debugInfo: {
            pageTitle: document.title,
            profileFound: !!document.querySelector('.profile'),
            pbsTimeFound: !!document.querySelector('.pbsTime'),
            pbsWordsFound: !!document.querySelector('.pbsWords'),
            timeGroupsCount: document.querySelectorAll('.pbsTime .group').length,
            wordGroupsCount: document.querySelectorAll('.pbsWords .group').length
          }
        };

      } catch (error) {
        return {
          success: false,
          error: error.toString(),
          debugInfo: {
            pageTitle: document.title,
            profileFound: !!document.querySelector('.profile')
          }
        };
      }
    });

    console.log('Scraping result:', scrapingResult);

    if (scrapingResult.success && scrapingResult.scores.length > 0) {
      // Remove duplicates and keep highest WPM for each category
      const uniqueScores: Record<string, any> = {};
      scrapingResult.scores.forEach(score => {
        if (!uniqueScores[score.category] || uniqueScores[score.category].wpm < score.wpm) {
          uniqueScores[score.category] = score;
        }
      });

      return {
        success: true,
        scores: Object.values(uniqueScores)
      };
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // If we couldn't scrape any scores, return an error instead of generating fake ones
    return {
      success: false,
      error: 'Could not find any typing scores on the MonkeyType profile. Make sure your profile is public and has completed tests.',
      debugInfo: scrapingResult.debugInfo
    };

  } catch (error) {
    console.error('Score scraping error:', error);
    return { success: false, error: 'Failed to scrape scores from MonkeyType profile' };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        console.log('Error closing browser');
      }
    }
  }
} 