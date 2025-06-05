/* eslint-disable react/no-unescaped-entities */
"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ProfileSetup() {
  const { data: session, status } = useSession();
  const [monkeyTypeUsername, setMonkeyTypeUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'input' | 'verifying' | 'success' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState("");
  const [scoresImported, setScoresImported] = useState(0);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    redirect("/");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monkeyTypeUsername.trim()) return;

    // Client-side validation
    const trimmedUsername = monkeyTypeUsername.trim();
    
    // Basic validation
    if (trimmedUsername.length < 2) {
      setVerificationStep('error');
      setErrorMessage('Username must be at least 2 characters long');
      return;
    }
    
    if (trimmedUsername.length > 50) {
      setVerificationStep('error');
      setErrorMessage('Username must be 50 characters or less');
      return;
    }
    
    // Check for valid characters
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setVerificationStep('error');
      setErrorMessage('Username can only contain letters, numbers, periods, hyphens, and underscores');
      return;
    }

    setIsLoading(true);
    setVerificationStep('verifying');
    setErrorMessage("");

    try {
      const response = await fetch('/api/profile/link-monkeytype', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monkeyTypeUsername: trimmedUsername,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setScoresImported(data.user?.scoresImported || 0);
        setVerificationStep('success');
      } else {
        setVerificationStep('error');
        setErrorMessage(data.error || 'Failed to link MonkeyType account');
      }
    } catch {
      setVerificationStep('error');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-20 pb-10">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Link Your MonkeyType Account
          </h1>
          <p className="text-gray-400">
            Connect your MonkeyType profile to join the Manipal leaderboards
          </p>
        </div>

        {verificationStep === 'input' && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            {/* Instructions */}
            <div className="mb-8 p-4 bg-blue-900/30 rounded-lg border border-blue-800">
              <h3 className="text-blue-400 font-semibold mb-2">Before you start:</h3>
              <ol className="text-gray-300 space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Go to your <a href="https://monkeytype.com/account" target="_blank" className="text-blue-400 hover:underline inline-flex items-center">MonkeyType profile <ExternalLink className="h-3 w-3 ml-1" /></a></span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Add <code className="bg-gray-800 px-1 rounded text-yellow-400">Manipal</code> to your bio</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Make sure your profile is public</span>
                </li>
              </ol>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2">
                  MonkeyType Username
                </label>
                <input
                  type="text"
                  value={monkeyTypeUsername}
                  onChange={(e) => setMonkeyTypeUsername(e.target.value)}
                  placeholder="Enter your MonkeyType username"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!monkeyTypeUsername.trim() || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Link MonkeyType Account
              </button>
            </form>
          </div>
        )}

        {verificationStep === 'verifying' && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
            <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Linking Your Account</h3>
            <p className="text-gray-400 mb-4">
              We're verifying your MonkeyType profile and automatically importing your scores...
            </p>
            <div className="space-y-2 text-sm text-gray-300">
              <div>⏳ Checking profile exists and is public</div>
              <div>⏳ Verifying Manipal in bio</div>
              <div>⏳ Importing your personal best scores</div>
              <div className="text-xs text-gray-400 mt-2">This may take 10-15 seconds</div>
            </div>
          </div>
        )}

        {verificationStep === 'success' && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Account Linked Successfully!</h3>
            <p className="text-gray-400 mb-6">
              {scoresImported > 0 
                ? `Your MonkeyType account has been verified and ${scoresImported} category scores have been automatically imported!`
                : 'Your MonkeyType account has been verified. No scores found - make sure you have completed typing tests on MonkeyType and try refreshing from your dashboard.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/dashboard"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link 
                href="/leaderboard/30s"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                View Leaderboards
              </Link>
            </div>
          </div>
        )}

        {verificationStep === 'error' && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Verification Failed</h3>
            <p className="text-gray-400 mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => setVerificationStep('input')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 