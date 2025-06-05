import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Score from '@/models/Score';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { monkeyTypeUsername } = await req.json();

    if (!monkeyTypeUsername) {
      return NextResponse.json(
        { error: 'MonkeyType username is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if current user already has a different verified MonkeyType account
    const currentUser = await User.findOne({ discordId: session.user.id });
    if (currentUser && currentUser.monkeyTypeUsername && currentUser.isVerified && 
        currentUser.monkeyTypeUsername !== monkeyTypeUsername) {
      return NextResponse.json(
        { 
          error: `You already have a verified MonkeyType account linked: ${currentUser.monkeyTypeUsername}. Contact support if you need to change it.`,
          code: 'ALREADY_VERIFIED_DIFFERENT_ACCOUNT'
        },
        { status: 409 }
      );
    }

    // Check if MonkeyType username is already taken by another verified user
    const existingUser = await User.findOne({ 
      monkeyTypeUsername,
      discordId: { $ne: session.user.id },
      isVerified: true
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          error: 'This MonkeyType username is already linked to another verified account. If this is your account, please contact support.',
          code: 'USERNAME_ALREADY_CLAIMED'
        },
        { status: 409 }
      );
    }

    // Additional check: Look for any user (even unverified) with this username
    const anyExistingUser = await User.findOne({ 
      monkeyTypeUsername,
      discordId: { $ne: session.user.id }
    });

    if (anyExistingUser) {
      return NextResponse.json(
        { 
          error: 'This MonkeyType username is already associated with another account. Each MonkeyType profile can only be linked once.',
          code: 'USERNAME_CONFLICT'
        },
        { status: 409 }
      );
    }

    // Scrape MonkeyType profile
    const profileData = await scrapeMonkeyTypeProfile(monkeyTypeUsername);
    
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

    // Update or create user record
    const user = await User.findOneAndUpdate(
      { discordId: session.user.id },
      {
        discordId: session.user.id,
        discordUsername: session.user.name || '',
        discordAvatar: session.user.image || '',
        monkeyTypeUsername,
        isVerified: true,
        verificationStatus: 'verified',
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    // Store initial scores
    if (profileData.scores && profileData.scores.length > 0) {
      // Clear existing scores for this user
      await Score.deleteMany({ userId: user._id });

      // Insert new scores
      const scoreDocuments = profileData.scores.map(score => ({
        userId: user._id,
        discordId: session.user.id,
        monkeyTypeUsername,
        category: score.category,
        wpm: score.wpm,
        accuracy: score.accuracy,
        consistency: score.consistency,
        rawWpm: score.rawWpm,
        personalBest: true,
        lastUpdated: new Date(),
      }));

      await Score.insertMany(scoreDocuments);
    }

    return NextResponse.json({
      message: profileData.scores && profileData.scores.length > 0 
        ? `MonkeyType account linked successfully! Automatically imported ${profileData.scores.length} category scores.`
        : 'MonkeyType account linked successfully! No scores found - make sure you have completed typing tests on MonkeyType.',
      user: {
        monkeyTypeUsername: user.monkeyTypeUsername,
        scoresImported: profileData.scores?.length || 0,
      },
    });

  } catch (error) {
    console.error('Error linking MonkeyType account:', error);
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

async function scrapeMonkeyTypeProfile(username: string) {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to MonkeyType profile with increased timeout
    const profileUrl = `https://monkeytype.com/profile/${username}`;
    
    let response;
    try {
      response = await page.goto(profileUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 // 60 seconds
      });
    } catch (timeoutError) {
      console.log('Navigation timeout, trying alternative approach');
      return { exists: false, hasManipialInBio: false, scores: [] };
    }
    
    if (response?.status() === 404) {
      return { exists: false, hasManipialInBio: false, scores: [] };
    }

    // Wait for page to load
    await delay(5000);

    // Check if profile exists and is public - try multiple selectors
    let profileExists = false;
    try {
      profileExists = await page.evaluate(() => {
        // Check for various elements that indicate a valid profile
        return !!(
          document.querySelector('.profile') ||
          document.querySelector('[data-testid="profile"]') ||
          document.querySelector('.profileTop') ||
          document.querySelector('.user') ||
          document.body.textContent?.includes('Personal Bests')
        );
      });
    } catch (e) {
      console.log('Error checking profile existence:', e);
    }
    
    if (!profileExists) {
      return { exists: false, hasManipialInBio: false, scores: [] };
    }

    // Check bio for "Manipal" - try multiple approaches
    let hasManipialInBio = false;
    try {
      hasManipialInBio = await page.evaluate(() => {
        // Check various possible bio selectors and page content
        const bioSelectors = ['.bio', '.description', '.userBio', '[data-testid="bio"]'];
        
        for (const selector of bioSelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent?.toLowerCase().includes('manipal')) {
            return true;
          }
        }
        
        // Also check if "manipal" appears anywhere on the page as fallback
        return document.body.textContent?.toLowerCase().includes('manipal') || false;
      });
    } catch (e) {
      console.log('Could not check bio for Manipal:', e);
    }

    // Scrape actual scores from the page
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
          error: error instanceof Error ? error.message : String(error),
          debugInfo: {
            pageTitle: document.title,
            profileFound: !!document.querySelector('.profile')
          }
        };
      }
    });

    console.log('Scraping result:', scrapingResult);

    // Process the scraped scores
    let processedScores: any[] = [];
    if (scrapingResult.success && scrapingResult.scores && scrapingResult.scores.length > 0) {
      // Remove duplicates and keep highest WPM for each category
      const uniqueScores: Record<string, any> = {};
      scrapingResult.scores.forEach(score => {
        if (!uniqueScores[score.category] || uniqueScores[score.category].wpm < score.wpm) {
          uniqueScores[score.category] = score;
        }
      });

      processedScores = Object.values(uniqueScores);
    }

    return {
      exists: true,
      hasManipialInBio,
      scores: processedScores,
      scrapingDebug: scrapingResult.debugInfo
    };

  } catch (error) {
    console.error('Scraping error:', error);
    return { exists: false, hasManipialInBio: false, scores: [] };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.log('Error closing browser:', e);
      }
    }
  }
}

function parseCategoryFromText(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('15') && lowerText.includes('second')) return '15s';
  if (lowerText.includes('30') && lowerText.includes('second')) return '30s';
  if (lowerText.includes('60') && lowerText.includes('second')) return '60s';
  if (lowerText.includes('120') && lowerText.includes('second')) return '120s';
  if (lowerText.includes('word')) return 'words';
  
  return null;
} 