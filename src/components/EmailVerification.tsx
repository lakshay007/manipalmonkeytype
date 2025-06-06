"use client";

import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, Clock, AlertCircle, Send, Shield } from 'lucide-react';

interface EmailVerificationProps {
  eduEmail?: string | null;
  eduEmailVerified: boolean;
  hasVerificationCode: boolean;
  verificationCodeExpiresAt?: string | null;
  onVerificationComplete: () => void;
}

export default function EmailVerification({
  eduEmail,
  eduEmailVerified,
  hasVerificationCode,
  verificationCodeExpiresAt,
  onVerificationComplete
}: EmailVerificationProps) {
  const [email, setEmail] = useState(eduEmail || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'verify'>(hasVerificationCode ? 'verify' : 'input');
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Calculate time remaining for verification code
  useEffect(() => {
    if (verificationCodeExpiresAt && hasVerificationCode) {
      const updateTimeRemaining = () => {
        const expiresAt = new Date(verificationCodeExpiresAt);
        const now = new Date();
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
        
        if (remaining === 0) {
          setStep('input');
          setStatus({ type: 'error', message: 'Verification code expired. Please request a new one.' });
        }
        
        setTimeRemaining(remaining);
      };

      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [verificationCodeExpiresAt, hasVerificationCode]);

  const handleSendVerification = async () => {
    if (!email.trim()) {
      setStatus({ type: 'error', message: 'Please enter your Manipal email address' });
      return;
    }

    if (!email.endsWith('@learner.manipal.edu')) {
      setStatus({ type: 'error', message: 'Please use a valid Manipal email (@learner.manipal.edu)' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/profile/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eduEmail: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('verify');
        setStatus({ 
          type: 'success', 
          message: 'Verification code sent! Please check your email.' 
        });
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to send verification code' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setStatus({ type: 'error', message: 'Please enter the verification code' });
      return;
    }

    const cleanCode = verificationCode.replace(/\s/g, '');
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setStatus({ type: 'error', message: 'Verification code must be 6 digits' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/profile/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationCode: cleanCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ 
          type: 'success', 
          message: 'Email verified successfully! You now have the verified badge.' 
        });
        onVerificationComplete();
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to verify code' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (eduEmailVerified) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-6 w-6 text-green-400" />
          <h2 className="text-xl font-semibold text-white">Email Verification</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-white">Email verified</span>
          </div>
          <p className="text-gray-400">
            Verified: <span className="text-green-400">{eduEmail}</span>
          </p>
          <div className="flex items-center space-x-2 text-sm text-green-400">
            <Shield className="h-4 w-4" />
            <span>You have the verified badge on leaderboards!</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center space-x-3 mb-4">
        <Mail className="h-6 w-6 text-blue-400" />
        <h2 className="text-xl font-semibold text-white">Email Verification</h2>
      </div>

      {/* Status Message */}
      {status.type && (
        <div className={`mb-4 p-3 rounded-lg border ${
          status.type === 'success' 
            ? 'bg-green-900/30 border-green-700 text-green-400' 
            : status.type === 'error'
            ? 'bg-red-900/30 border-red-700 text-red-400'
            : 'bg-blue-900/30 border-blue-700 text-blue-400'
        }`}>
          <div className="flex items-center space-x-2">
            {status.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : status.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            <span className="text-sm">{status.message}</span>
          </div>
        </div>
      )}

      {step === 'input' ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="eduEmail" className="block text-sm font-medium text-gray-300 mb-2">
              Manipal Email Address
            </label>
            <input
              type="email"
              id="eduEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@learner.manipal.edu"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter your Manipal student email to get the verified badge
            </p>
          </div>
          
          <button
            onClick={handleSendVerification}
            disabled={isLoading || !email.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center justify-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>{isLoading ? 'Sending...' : 'Send Verification Code'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-300">
                Verification Code
              </label>
              {timeRemaining !== null && timeRemaining > 0 && (
                <span className="text-xs text-blue-400 flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Expires in {formatTime(timeRemaining)}</span>
                </span>
              )}
            </div>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
              }}
              placeholder="123456"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest font-mono"
              maxLength={6}
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the 6-digit code sent to {email}
            </p>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleVerifyCode}
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center justify-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{isLoading ? 'Verifying...' : 'Verify Email'}</span>
            </button>
            
            <button
              onClick={() => {
                setStep('input');
                setVerificationCode('');
                setStatus({ type: null, message: '' });
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Use Different Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 