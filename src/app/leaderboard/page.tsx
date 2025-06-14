"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function LeaderboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to 30s leaderboard by default
    router.replace("/leaderboard/30s");
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <LoadingSpinner 
        message="Redirecting to leaderboard..." 
        icon="trophy"
        size="lg"
      />
    </div>
  );
} 