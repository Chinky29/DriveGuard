import React from "react";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Sign In | DriveGuard",
  description: "Sign in to access your DriveGuard cockpit and personal calibration baseline.",
};

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#07090f] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              DriveGuard
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time driver fatigue monitoring with secure cloud calibration sync.
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="w-full flex justify-center">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/monitor"
          />
        </div>
      </div>
    </main>
  );
}
