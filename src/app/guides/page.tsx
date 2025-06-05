"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { ArrowRight, ExternalLink, CheckCircle, User, Link as LinkIcon, RefreshCw, Trophy, AlertCircle } from "lucide-react";

export default function Guides() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-black pt-20 pb-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Getting Started Guide
          </h1>
          <p className="text-gray-400 text-lg">
            Join the Manipal typing leaderboards in just 3 simple steps
          </p>
        </div>

        {/* Current Status Banner */}
        {session ? (
          <div className="mb-8 p-4 bg-green-900/30 rounded-lg border border-green-700">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400 font-medium">
                You're signed in! Ready to proceed to the next steps.
              </span>
              <Link 
                href="/dashboard"
                className="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-blue-900/30 rounded-lg border border-blue-700">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              <span className="text-blue-400 font-medium">
                Start by signing in with Discord to begin your journey.
              </span>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-8">
          {/* Step 1: Sign in with Discord */}
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3">
                  Step 1: Sign in with Discord
                </h2>
                <p className="text-gray-300 mb-4">
                  Connect your Discord account to access the Manipal typing leaderboards.
                </p>
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <h4 className="text-white font-medium mb-2">Why Discord?</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Secure authentication system</li>
                    <li>• Easy identification for Manipal students</li>
                    <li>• No need to create separate accounts</li>
                  </ul>
                </div>
                {!session ? (
                  <button 
                    onClick={() => signIn("discord")}
                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                    </svg>
                    <span>Sign in with Discord</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">✓ Completed - You're signed in!</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Link MonkeyType Profile */}
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <LinkIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3">
                  Step 2: Link Your MonkeyType Profile
                </h2>
                <p className="text-gray-300 mb-4">
                  Connect your MonkeyType account to automatically import your typing scores.
                </p>
                
                {/* Prerequisites */}
                <div className="bg-yellow-900/30 rounded-lg p-4 mb-4 border border-yellow-700">
                  <h4 className="text-yellow-400 font-medium mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Before you start:
                  </h4>
                  <ol className="text-gray-300 text-sm space-y-2">
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-400 font-bold">1.</span>
                      <span>
                        Go to your{" "}
                        <a 
                          href="https://monkeytype.com/account" 
                          target="_blank" 
                          className="text-yellow-400 hover:underline inline-flex items-center"
                        >
                          MonkeyType profile settings <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-400 font-bold">2.</span>
                      <span>
                        Add{" "}
                        <code className="bg-gray-800 px-2 py-1 rounded text-yellow-400 font-mono">
                          "Manipal"
                        </code>{" "}
                        to your bio for verification
                      </span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-400 font-bold">3.</span>
                      <span>Make sure your profile is public</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-400 font-bold">4.</span>
                      <span>Complete at least a few typing tests on MonkeyType</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-green-900/30 rounded-lg p-4 mb-4 border border-green-700">
                  <h4 className="text-green-400 font-medium mb-2">What happens when you link:</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• We verify your profile exists and is public</li>
                    <li>• We check for "Manipal" in your bio</li>
                    <li>• <strong>We automatically import all your personal best scores</strong></li>
                    <li>• You're instantly added to the leaderboards!</li>
                  </ul>
                </div>

                {session ? (
                  <Link 
                    href="/profile/setup"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                  >
                    <LinkIcon className="h-5 w-5" />
                    <span>Link MonkeyType Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <div className="text-gray-400 italic">
                    ↑ Complete Step 1 first to proceed
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Refresh Scores */}
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3">
                  Step 3: Keep Your Scores Updated
                </h2>
                <p className="text-gray-300 mb-4">
                  Your scores are automatically imported when you first link your account. Use the refresh feature to update them after achieving new personal bests.
                </p>
                
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <h4 className="text-white font-medium mb-2">When to refresh:</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• After completing new personal bests on MonkeyType</li>
                    <li>• Weekly to maintain your leaderboard position</li>
                    <li>• Before important competitions or challenges</li>
                    <li>• When you notice your scores are outdated</li>
                  </ul>
                </div>

                <div className="bg-blue-900/30 rounded-lg p-4 mb-4 border border-blue-700">
                  <h4 className="text-blue-400 font-medium mb-2">How it works:</h4>
                  <p className="text-gray-300 text-sm">
                    Both the initial linking and refresh feature automatically fetch your latest personal best scores 
                    from your MonkeyType profile and update them in our leaderboards. This 
                    ensures your rankings are always current and accurate.
                  </p>
                </div>

                {session ? (
                  <Link 
                    href="/dashboard"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                  >
                    <RefreshCw className="h-5 w-5" />
                    <span>Go to Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <div className="text-gray-400 italic">
                    ↑ Complete Steps 1 & 2 first to proceed
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Final Step: Compete */}
          <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-8 border border-yellow-700">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3">
                  🎉 You're All Set!
                </h2>
                <p className="text-gray-300 mb-4">
                  Once you've completed all steps, you'll be ready to compete with your fellow Manipalites!
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <Link 
                    href="/leaderboard/30s"
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors text-center"
                  >
                    View Leaderboards
                  </Link>
                  <Link 
                    href="/dashboard"
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors text-center"
                  >
                    Manage Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Why do I need to add "Manipal" to my bio?
              </h3>
              <p className="text-gray-300 text-sm">
                This verification step ensures that only Manipal students can join our leaderboards, 
                maintaining the community aspect of the competition.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                How often should I refresh my scores?
              </h3>
              <p className="text-gray-300 text-sm">
                Your scores are automatically imported when you first link your account. After that, we recommend refreshing weekly or after achieving new personal bests. 
                The system only updates when you have better scores, so refreshing frequently won't hurt.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What typing categories are supported?
              </h3>
              <p className="text-gray-300 text-sm">
                We track personal bests for 15s, 30s, 60s, and 120s time-based tests. 
                Word-based tests may be added in future updates.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                My scores aren't showing up, what should I do?
              </h3>
              <p className="text-gray-300 text-sm">
                Scores are automatically imported when you link your account. If they're missing, make sure your MonkeyType profile is public, has "Manipal" in the bio, 
                and that you've completed typing tests. If issues persist, try refreshing your scores from the dashboard.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Do I need to refresh scores immediately after linking?
              </h3>
              <p className="text-gray-300 text-sm">
                No! Your scores are automatically imported during the linking process. You only need to use the refresh feature 
                when you achieve new personal bests on MonkeyType that you want to update on the leaderboards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 