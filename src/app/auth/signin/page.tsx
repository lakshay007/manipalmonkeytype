"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Couldn't start the Discord sign-in. Please try again.",
  OAuthCallback: "Discord sign-in didn't complete. Please try again.",
  OAuthCreateAccount: "Couldn't create your account. Please try again.",
  Callback: "Discord sign-in was cancelled or failed. Please try again.",
  AccessDenied: "Access was denied. Please try again.",
  Configuration: "Sign-in is temporarily misconfigured. Please try again later.",
  SessionRequired: "Please sign in to view that page.",
};

// Only allow same-site relative paths so the page can't be used as an open redirect.
function getSafeCallbackUrl(raw: string | null): string {
  if (!raw) return "/dashboard";

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/dashboard";
    if (url.pathname.startsWith("/auth/")) return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

function SignInContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const error = searchParams.get("error");
  const rawCallbackUrl = searchParams.get("callbackUrl");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(getSafeCallbackUrl(rawCallbackUrl));
    }
  }, [status, rawCallbackUrl, router]);

  const errorMessage = error
    ? ERROR_MESSAGES[error] ?? "Something went wrong while signing in. Please try again."
    : null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-4xl font-bold text-white mb-3">Sign in</h1>
        <p className="text-gray-400 mb-8">
          Sign in with Discord to join the Manipal typing leaderboards.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300"
          >
            {errorMessage}
          </div>
        )}

        <button
          onClick={() =>
            signIn("discord", { callbackUrl: getSafeCallbackUrl(rawCallbackUrl) })
          }
          disabled={status !== "unauthenticated"}
          className="inline-flex items-center space-x-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <span>
            {status === "authenticated" ? "Redirecting..." : "Sign in with Discord"}
          </span>
        </button>

        <div className="mt-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SignInContent />
    </Suspense>
  );
}
