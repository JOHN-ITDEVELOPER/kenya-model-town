import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Smartphone,
  Sparkles,
  CheckCircle2,
  X,
  LogIn,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { PASS_DURATION_DAYS } from '../services/userService';

export default function ChallengeUnlockModal({
  challenge,
  passPriceKes = 300,
  user,
  onSignIn,
  onClose
}) {
  const challengePrice = Number(challenge?.price) || 0;
  const [selectedPlan, setSelectedPlan] = useState('pass90'); // 'single' | 'pass90'
  const [phone, setPhone] = useState('');
  const [feedback, setFeedback] = useState('');

  if (!challenge) return null;

  const amountDue = selectedPlan === 'pass90' ? passPriceKes : challengePrice;

  const handlePhase1Submit = (e) => {
    e.preventDefault();
    const cleaned = phone.replace(/\s+/g, '');
    if (!/^(\+?254|0)(7|1)\d{8}$/.test(cleaned)) {
      setFeedback('Enter a valid Kenyan Safaricom number (e.g. 0712345678 or 0112345678).');
      return;
    }
    setFeedback(
      `Daraja M-Pesa STK Push for KES ${amountDue} (${cleaned}) will trigger here once Safaricom Daraja sandbox/live credentials are wired in Phase 2. Meanwhile, your instructor can manually activate your account from the Admin Dashboard.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-5 text-slate-100 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                Premium Instructor Challenge
              </div>
              <h3 className="text-sm font-black text-white">{challenge.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plan Selector */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* Option 1: Single Challenge */}
          <button
            type="button"
            onClick={() => {
              setSelectedPlan('single');
              setFeedback('');
            }}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
              selectedPlan === 'single'
                ? 'bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400/50'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                Unlock This Challenge Only
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Lifetime access + Watch Instructor Solution for "{challenge.title}".
              </div>
            </div>
            <div className="text-sm font-black text-emerald-300 shrink-0">
              KES {challengePrice}
            </div>
          </button>

          {/* Option 2: 90-Day Unlock-All Pass */}
          <button
            type="button"
            onClick={() => {
              setSelectedPlan('pass90');
              setFeedback('');
            }}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 relative ${
              selectedPlan === 'pass90'
                ? 'bg-amber-950/50 border-amber-400 ring-1 ring-amber-400/50'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
              Best Value • 3 Months
            </span>
            <div>
              <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {PASS_DURATION_DAYS}-Day Full Driving Class Pass
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Unlocks ALL custom instructor challenges + live demos for {PASS_DURATION_DAYS} days.
              </div>
            </div>
            <div className="text-sm font-black text-amber-300 shrink-0">
              KES {passPriceKes}
            </div>
          </button>
        </div>

        {/* Auth Check or M-Pesa Form */}
        {!user ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 text-center">
            <p className="text-xs text-slate-300">
              Sign in with Google first so your unlock or 90-day pass stays linked to your account across devices.
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg transition"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google to Continue
            </button>
          </div>
        ) : (
          <form onSubmit={handlePhase1Submit} className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                M-Pesa Phone Number (Safaricom)
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {feedback && (
              <div className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-200 text-[11px] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{feedback}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg transition"
            >
              <Sparkles className="w-4 h-4" />
              Pay KES {amountDue} via M-Pesa
            </button>

            <div className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Signed in as {user.email} • Official Q1–Q10 remain 100% Free
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
