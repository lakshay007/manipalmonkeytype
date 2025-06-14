import React from 'react';
import { Loader2, Trophy } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  icon?: 'default' | 'trophy';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ 
  message = "Loading...", 
  icon = 'default',
  size = 'md',
  className = ""
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  };

  const IconComponent = icon === 'trophy' ? Trophy : Loader2;
  const iconClasses = icon === 'trophy' 
    ? `${sizeClasses[size]} text-yellow-400 animate-pulse`
    : `${sizeClasses[size]} text-blue-400 animate-spin`;

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* Animated Icon */}
      <div className="relative">
        <IconComponent className={iconClasses} />
        {/* Outer pulse ring */}
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2 border-blue-400/20 animate-ping`}></div>
      </div>
      
      {/* Loading Text */}
      <div className="text-center">
        <p className={`font-medium text-white ${textSizeClasses[size]} mb-2`}>
          {message}
        </p>
        
        {/* Animated dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
      
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 rounded-full blur-xl -z-10"></div>
    </div>
  );
}

// Skeleton loading component for leaderboard entries
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="bg-gray-900/30 rounded-t-lg px-4 py-3 border border-gray-800/50">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-1 h-4 bg-gray-700 rounded animate-pulse"></div>
          <div className="col-span-4 h-4 bg-gray-700 rounded animate-pulse"></div>
          <div className="col-span-2 h-4 bg-gray-700 rounded animate-pulse"></div>
          <div className="col-span-2 h-4 bg-gray-700 rounded animate-pulse"></div>
          <div className="col-span-2 h-4 bg-gray-700 rounded animate-pulse"></div>
          <div className="col-span-1 h-4 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
      
      {/* Entry skeletons */}
      <div className="bg-gray-900/20 rounded-b-lg border-x border-b border-gray-800/50">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-gray-800/30 last:border-b-0">
            {/* Rank */}
            <div className="col-span-1">
              <div className="w-6 h-6 bg-gray-700 rounded animate-pulse"></div>
            </div>
            
            {/* Player info */}
            <div className="col-span-4 flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
              <div className="space-y-1 flex-1">
                <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded animate-pulse w-1/2"></div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="col-span-2 text-center">
              <div className="h-6 bg-gray-700 rounded animate-pulse mx-auto w-12"></div>
            </div>
            <div className="col-span-2 text-center">
              <div className="h-6 bg-gray-700 rounded animate-pulse mx-auto w-12"></div>
            </div>
            <div className="col-span-2 text-center">
              <div className="h-6 bg-gray-700 rounded animate-pulse mx-auto w-12"></div>
            </div>
            <div className="col-span-1 text-center">
              <div className="h-6 bg-gray-700 rounded animate-pulse mx-auto w-8"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 