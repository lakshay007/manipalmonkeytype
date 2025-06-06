"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Clock, Settings, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import EmailVerification from "@/components/EmailVerification";

interface ProfileStatus {
  isLinked: boolean;
  monkeyTypeUsername: string | null;
  isVerified: boolean;
  verificationStatus?: string;
  eduEmail?: string | null;
  eduEmailVerified: boolean;
  hasVerificationCode: boolean;
  verificationCodeExpiresAt?: string | null;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    scoresUpdated?: number;
  }>({ type: null, message: '' });

  useEffect(() => {
    if (status === "loading") {
      return; // Still determining auth status
    }
    
    if (!session) {
      redirect("/");
      return;
    }
    
    if (session?.user?.id) {
      fetchProfileStatus();
    } else {
      setIsLoading(false);
    }
  }, [session, status]);

  const fetchProfileStatus = async () => {
    try {
      const response = await fetch('/api/profile/status');
      if (response.ok) {
        const data = await response.json();
        setProfileStatus(data);
      }
    } catch {
      console.error('Error fetching profile status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshScores = async () => {
    setIsRefreshing(true);
    setRefreshStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/profile/refresh-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setRefreshStatus({
          type: 'success',
          message: `Successfully refreshed scores! Updated ${data.scoresUpdated} categories.`,
          scoresUpdated: data.scoresUpdated
        });
      } else {
        setRefreshStatus({
          type: 'error',
          message: data.error || 'Failed to refresh scores'
        });
      }
    } catch {
      setRefreshStatus({
        type: 'error',
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden relative">
              <Image 
                src={session.user?.image || "/default-avatar.png"} 
                alt="Discord Avatar" 
                fill
                className="object-cover"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome, {session.user?.name}!
          </h1>
          <p className="text-gray-400">
            Ready to compete with your fellow Manipalites?
          </p>
        </div>

        {/* Refresh Status */}
        {refreshStatus.type && (
          <div className={`mb-6 p-4 rounded-lg border ${
            refreshStatus.type === 'success' 
              ? 'bg-green-900/30 border-green-700 text-green-400' 
              : 'bg-red-900/30 border-red-700 text-red-400'
          }`}>
            <div className="flex items-center space-x-2">
              {refreshStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{refreshStatus.message}</span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Profile Status</h2>
            </div>
            
            {profileStatus?.isLinked ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">MonkeyType account linked</span>
                </div>
                <p className="text-gray-400">
                  Username: <span className="text-white">{profileStatus.monkeyTypeUsername}</span>
                </p>
                <div className="flex flex-col space-y-2">
                  <Link 
                    href="/profile/setup"
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors inline-block text-sm text-center"
                  >
                    Update Profile
                  </Link>
                  <button 
                    onClick={handleRefreshScores}
                    disabled={isRefreshing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center justify-center space-x-2 text-sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh Scores'}</span>
                  </button>
                </div>
                
                {isRefreshing && (
                  <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-800">
                    <p className="text-blue-400 text-sm">
                      🔄 Fetching your latest typing scores from MonkeyType...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400">
                  Link your MonkeyType account to start tracking your scores.
                </p>
                <Link 
                  href="/profile/setup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block"
                >
                  Link MonkeyType
                </Link>
              </div>
            )}
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center space-x-3 mb-4">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">View Rankings</h2>
            </div>
            <p className="text-gray-400 mb-4">
              Check out the leaderboards and see where you rank.
            </p>
            <Link 
              href="/leaderboard/30s"
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors inline-block"
            >
              View Leaderboards
            </Link>
          </div>
        </div>

        {/* Email Verification Section */}
        {profileStatus && (
          <div className="mb-12">
            <EmailVerification
              eduEmail={profileStatus.eduEmail}
              eduEmailVerified={profileStatus.eduEmailVerified}
              hasVerificationCode={profileStatus.hasVerificationCode}
              verificationCodeExpiresAt={profileStatus.verificationCodeExpiresAt}
              onVerificationComplete={fetchProfileStatus}
            />
          </div>
        )}

        {/* Leaderboard Categories */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6">Leaderboard Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              href="/leaderboard/15s"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors border border-gray-700"
            >
              <Clock className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-white font-medium">15 seconds</div>
            </Link>
            <Link 
              href="/leaderboard/30s"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors border border-gray-700"
            >
              <Clock className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <div className="text-white font-medium">30 seconds</div>
            </Link>
            <Link 
              href="/leaderboard/60s"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors border border-gray-700"
            >
              <Clock className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-white font-medium">60 seconds</div>
            </Link>
            <Link 
              href="/leaderboard/120s"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors border border-gray-700"
            >
              <Clock className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <div className="text-white font-medium">120 seconds</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 