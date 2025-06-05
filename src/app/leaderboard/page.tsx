"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeaderboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to 30s leaderboard by default
    router.replace("/leaderboard/30s");
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-lg">Redirecting to leaderboard...</div>
    </div>
  );
} 