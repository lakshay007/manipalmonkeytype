"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, User } from 'lucide-react';
import Image from 'next/image';

interface SearchResult {
  _id: string;
  searchRank: number;
  wpm: number;
  accuracy: number;
  consistency: number;
  rawWpm: number;
  matchPriority?: number;
  similarity?: number;
  matchType?: string;
  user: {
    discordUsername: string;
    discordAvatar?: string;
    monkeyTypeUsername: string;
    branch?: string;
    year?: number;
    eduEmailVerified?: boolean;
  };
}

interface SearchBarProps {
  category: string;
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ 
  category, 
  onResultSelect, 
  placeholder = "Search by Discord or MonkeyType username...",
  className = ""
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search function
  const performSearch = useCallback(async (searchQuery: string, searchCategory: string, fuzzy: boolean) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/leaderboard/search?q=${encodeURIComponent(searchQuery)}&category=${searchCategory}&fuzzy=${fuzzy}&limit=8`
      );
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [setResults, setIsOpen, setIsLoading]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(performSearch, 300),
    [performSearch]
  );

  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query.trim(), category, false);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, category, debouncedSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    onResultSelect?.(result);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getMatchTypeIndicator = (result: SearchResult) => {
    if (result.matchType === 'discord') {
      return <span className="text-blue-400 text-xs bg-blue-400/10 px-1 py-0.5 rounded">Discord</span>;
    } else if (result.matchType === 'monkeytype') {
      return <span className="text-green-400 text-xs bg-green-400/10 px-1 py-0.5 rounded">MonkeyType</span>;
    }
    return null;
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-12 py-2.5 bg-gray-900/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {/* Clear Button */}
          {query && (
            <button
              onClick={clearSearch}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {/* Search Info Header */}
          <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {isLoading ? 'Searching...' : `${results.length} results`}
              </span>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <div className="py-1">
              {results.map((result) => (
                <button
                  key={result._id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-3 py-2.5 hover:bg-gray-800 transition-colors text-left group"
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0 relative">
                      {result.user.discordAvatar ? (
                        <Image 
                          src={result.user.discordAvatar} 
                          alt="Avatar" 
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className="font-medium text-white text-sm truncate">
                          {result.user.discordUsername}
                        </span>
                        {getMatchTypeIndicator(result)}
                        {result.similarity && (
                          <span className="text-gray-400 text-xs">
                            {Math.round(result.similarity * 100)}% match
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs truncate">
                        @{result.user.monkeyTypeUsername}
                        {result.user.branch && result.user.year && (
                          <span className="ml-2">• {result.user.branch} {result.user.year}</span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-white text-sm">{result.wpm} WPM</div>
                      <div className="text-gray-400 text-xs">{result.accuracy}% ACC</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            !isLoading && query.length >= 2 && (
              <div className="px-3 py-6 text-center text-gray-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users found matching &quot;{query}&quot;</p>
                <p className="text-xs mt-1">Try a different search term or check spelling</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
} 