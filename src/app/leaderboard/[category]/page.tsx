"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Trophy, Medal, Award, User, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import LoadingSpinner, { LeaderboardSkeleton } from "@/components/LoadingSpinner";

interface LeaderboardEntry {
  _id: string;
  rank: number;
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
    eduEmailVerified?: boolean;
  };
}

interface LeaderboardData {
  category: string;
  totalUsers: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  leaderboard: LeaderboardEntry[];
}

interface SearchResultInput {
  _id: string;
  searchRank: number;
  wpm: number;
  accuracy: number;
  consistency: number;
  rawWpm: number;
  lastUpdated?: string;
  leaderboardRank?: number;
  user: {
    discordUsername: string;
    discordAvatar?: string;
    monkeyTypeUsername: string;
    branch?: string;
    year?: number;
    eduEmailVerified?: boolean;
  };
  userId?: string;
}

const categoryDisplayNames: Record<string, string> = {
  "15s": "15s",
  "30s": "30s", 
  "60s": "60s",
  "120s": "120s"
};

const categoryColors: Record<string, string> = {
  "15s": "text-green-400 border-green-400/20 bg-green-400/5",
  "30s": "text-blue-400 border-blue-400/20 bg-blue-400/5",
  "60s": "text-purple-400 border-purple-400/20 bg-purple-400/5", 
  "120s": "text-red-400 border-red-400/20 bg-red-400/5"
};

export default function LeaderboardPage() {
  const params = useParams();
  const category = params?.category as string;
  
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<LeaderboardEntry[] | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const fetchLeaderboard = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard/${category}?page=${page}&limit=20`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const leaderboardData = await response.json();
      setData(leaderboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    if (category) {
      fetchLeaderboard(currentPage);
    }
  }, [category, currentPage, fetchLeaderboard]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-gray-400 font-bold text-sm">#{rank}</span>;
  };

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/10 to-yellow-400/5 border-yellow-400/20";
    if (rank === 2) return "bg-gradient-to-r from-gray-500/10 to-gray-400/5 border-gray-400/20";
    if (rank === 3) return "bg-gradient-to-r from-amber-600/10 to-amber-500/5 border-amber-500/20";
    return "bg-gray-900/50 border-gray-800/50";
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchResult = (result: SearchResultInput) => {
    // Convert search result to leaderboard entry format
    const leaderboardEntry: LeaderboardEntry = {
      _id: result._id,
      rank: result.leaderboardRank || result.searchRank,
      wpm: result.wpm,
      accuracy: result.accuracy,
      consistency: result.consistency,
      rawWpm: result.rawWpm,
      lastUpdated: result.lastUpdated || new Date().toISOString(),
      user: result.user
    };

    // Set search results and highlight the user
    setSearchResults([leaderboardEntry]);
    setHighlightedUserId(result.userId || result._id);
    setIsSearchActive(true);
    
    // Optional: Scroll to show the result
    setTimeout(() => {
      const element = document.getElementById(`user-${result._id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const clearSearch = () => {
    setSearchResults(null);
    setHighlightedUserId(null);
    setIsSearchActive(false);
  };

  const displayData = searchResults || data?.leaderboard || [];
  const isShowingSearchResults = isSearchActive && searchResults;

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-16 pb-10">
        <div className="max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <Link 
              href="/dashboard"
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                <span className={categoryColors[category]?.split(' ')[0] || "text-white"}>
                  {categoryDisplayNames[category] || category}
                </span>
                <span className="text-white"> Leaderboard</span>
              </h1>
            </div>
          </div>

          {/* Category Navigation */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-1 bg-gray-900/80 rounded-lg p-1 backdrop-blur">
              {Object.entries(categoryDisplayNames).map(([cat, name]) => (
                <Link
                  key={cat}
                  href={`/leaderboard/${cat}`}
                  className={`px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                    category === cat 
                      ? `${categoryColors[cat]} border` 
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  }`}
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>

          {/* Modern Loading Component */}
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner 
              message="Loading leaderboard..." 
              icon="trophy"
              size="lg"
            />
          </div>

          {/* Skeleton Leaderboard */}
          <LeaderboardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">Error: {error}</div>
          <Link 
            href="/dashboard"
            className="text-blue-400 hover:underline"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-16 pb-10">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              <span className={categoryColors[category]?.split(' ')[0] || "text-white"}>
                {categoryDisplayNames[category] || category}
              </span>
              <span className="text-white"> Leaderboard</span>
            </h1>
            <p className="text-gray-400">
              {isShowingSearchResults 
                ? `Search Results • ${searchResults?.length || 0} found`
                : `${data?.totalUsers || 0} verified typists • Page ${data?.currentPage} of ${data?.totalPages}`
              }
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            category={category}
            onResultSelect={(result) => {
              // Type-safe wrapper to convert SearchBar result to our expected type
              const searchResult: SearchResultInput = {
                _id: result._id,
                searchRank: result.searchRank,
                wpm: result.wpm,
                accuracy: result.accuracy,
                consistency: result.consistency,
                rawWpm: result.rawWpm,
                lastUpdated: new Date().toISOString(),
                leaderboardRank: result.leaderboardRank,
                user: result.user,
                userId: result._id
              };
              handleSearchResult(searchResult);
            }}
            className="max-w-lg mx-auto"
          />
          {isShowingSearchResults && (
            <div className="text-center mt-2">
              <button
                onClick={clearSearch}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                ← Back to full leaderboard
              </button>
            </div>
          )}
        </div>

        {/* Category Navigation */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-1 bg-gray-900/80 rounded-lg p-1 backdrop-blur">
            {Object.entries(categoryDisplayNames).map(([cat, name]) => (
              <Link
                key={cat}
                href={`/leaderboard/${cat}`}
                onClick={clearSearch} // Clear search when switching categories
                className={`px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                  category === cat 
                    ? `${categoryColors[cat]} border` 
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                {name}
              </Link>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        {displayData.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {isShowingSearchResults ? 'No search results' : 'No scores yet'}
            </h3>
            <p className="text-gray-400">
              {isShowingSearchResults 
                ? 'Try a different search term or enable fuzzy search'
                : 'Be the first to set a score in this category!'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Leaderboard Header */}
            <div className="bg-gray-900/30 rounded-t-lg px-4 py-3 border border-gray-800/50">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <div className="col-span-1">
                  {isShowingSearchResults ? 'Match' : 'Rank'}
                </div>
                <div className="col-span-4">Player</div>
                <div className="col-span-2 text-center">WPM</div>
                <div className="col-span-2 text-center">Accuracy</div>
                <div className="col-span-2 text-center">Consistency</div>
                <div className="col-span-1 text-center">Raw</div>
              </div>
            </div>

            {/* Leaderboard Entries */}
            <div className="bg-gray-900/20 rounded-b-lg border-x border-b border-gray-800/50">
              {displayData.map((entry) => {
                const isHighlighted = highlightedUserId === entry._id;
                const baseClassName = `grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-gray-800/30 last:border-b-0 transition-all hover:bg-gray-800/30`;
                
                return (
                  <div
                    key={entry._id}
                    id={`user-${entry._id}`}
                    className={`${baseClassName} ${
                      isHighlighted 
                        ? 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/50' 
                        : getRankBgColor(entry.rank)
                    }`}
                  >
                    {/* Rank/Match Indicator */}
                    <div className="col-span-1 flex items-center">
                      {isShowingSearchResults ? (
                        <span className="text-blue-400 font-bold text-sm">
                          #{entry.rank}
                        </span>
                      ) : (
                        getRankIcon(entry.rank)
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="col-span-4 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0 relative">
                        {entry.user.discordAvatar ? (
                          <Image 
                            src={entry.user.discordAvatar} 
                            alt="Avatar" 
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white text-sm truncate flex items-center space-x-2">
                          <span>{entry.user.discordUsername}</span>
                          {entry.user.eduEmailVerified && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                              <span className="text-green-400 text-[7px] font-medium bg-green-400/10 px-1 py-0.5 rounded border border-green-400/20">
                                VERIFIED
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs truncate">
                          @{entry.user.monkeyTypeUsername}
                          {entry.user.branch && entry.user.year && (
                            <span className="ml-2">
                              • {entry.user.branch} {entry.user.year}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* WPM */}
                    <div className="col-span-2 text-center">
                      <div className="font-bold text-white text-lg">{entry.wpm}</div>
                      <div className="text-xs text-gray-400">WPM</div>
                    </div>

                    {/* Accuracy */}
                    <div className="col-span-2 text-center">
                      <div className="font-semibold text-green-400">{entry.accuracy}%</div>
                      <div className="text-xs text-gray-400">ACC</div>
                    </div>

                    {/* Consistency */}
                    <div className="col-span-2 text-center">
                      <div className="font-semibold text-blue-400">{entry.consistency}%</div>
                      <div className="text-xs text-gray-400">CON</div>
                    </div>

                    {/* Raw WPM */}
                    <div className="col-span-1 text-center">
                      <div className="font-medium text-gray-300 text-sm">{entry.rawWpm}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination - Only show for full leaderboard */}
            {!isShowingSearchResults && data && data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-400">
                  Showing {((data.currentPage - 1) * 20) + 1} to {Math.min(data.currentPage * 20, data.totalUsers)} of {data.totalUsers} players
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(data.currentPage - 1)}
                    disabled={!data.hasPreviousPage}
                    className="flex items-center space-x-1 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const currentPage = data.currentPage;
                      const totalPages = data.totalPages;
                      const pages = [];
                      
                      if (totalPages <= 4) {
                        // Show all pages if 4 or fewer
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => handlePageChange(i)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                i === currentPage
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                              }`}
                            >
                              {i}
                            </button>
                          );
                        }
                      } else {
                        // Show 1, 2, ..., last pattern
                        // Page 1
                        pages.push(
                          <button
                            key={1}
                            onClick={() => handlePageChange(1)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              1 === currentPage
                                ? "bg-blue-600 text-white"
                                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                            }`}
                          >
                            1
                          </button>
                        );
                        
                        // Page 2 (if current page is 1 or 2, or if total pages is 5)
                        if (currentPage <= 2 || totalPages === 5) {
                          pages.push(
                            <button
                              key={2}
                              onClick={() => handlePageChange(2)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                2 === currentPage
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                              }`}
                            >
                              2
                            </button>
                          );
                        }
                        
                        // Current page (if it's not 1, 2, or last page)
                        if (currentPage > 2 && currentPage < totalPages) {
                          if (currentPage > 3) {
                            pages.push(
                              <span key="ellipsis" className="px-2 text-gray-500">
                                ...
                              </span>
                            );
                          }
                          pages.push(
                            <button
                              key={currentPage}
                              onClick={() => handlePageChange(currentPage)}
                              className="w-8 h-8 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white"
                            >
                              {currentPage}
                            </button>
                          );
                        }
                        
                        // Ellipsis before last page (if needed)
                        if (totalPages > 3 && currentPage < totalPages - 1 && (currentPage <= 2 || totalPages > 5)) {
                          pages.push(
                            <span key="ellipsis-end" className="px-2 text-gray-500">
                              ...
                            </span>
                          );
                        }
                        
                        // Last page (if it's not page 1 or 2)
                        if (totalPages > 2) {
                          pages.push(
                            <button
                              key={totalPages}
                              onClick={() => handlePageChange(totalPages)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                totalPages === currentPage
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                              }`}
                            >
                              {totalPages}
                            </button>
                          );
                        }
                      }
                      
                      return pages;
                    })()}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(data.currentPage + 1)}
                    disabled={!data.hasNextPage}
                    className="flex items-center space-x-1 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 