import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Unlock,
  Smartphone,
  Sparkles,
  CheckCircle2,
  X,
  LogIn,
  Clock,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Receipt
} from 'lucide-react';
import {
  PASS_DURATION_DAYS,
  initiateMpesaStkPush,
  queryMpesaPaymentStatus,
  subscribeToPaymentStatus
} from '../services/userService';

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
  const [phase, setPhase] = useState('form'); // 'form' | 'submitting' | 'pending' | 'completed' | 'failed'
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [paymentRecord, setPaymentRecord] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [environment, setEnvironment] = useState('sandbox');

  const amountDue = selectedPlan === 'pass90' ? passPriceKes : challengePrice;

  const applyPaymentUpdate = useCallback((record) => {
    if (!record) return;
    setPaymentRecord((prev) => ({ ...(prev || {}), ...record }));
    if (record.environment) {
      setEnvironment(record.environment);
    }

    if (record.status === 'COMPLETED' && record.fulfilled) {
      setPhase('completed');
      setStatusMessage(
        record.resultDesc || 'Payment confirmed and access unlocked!'
      );
      setErrorMsg('');
    } else if (record.status === 'CANCELLED' || record.status === 'FAILED') {
      setPhase('failed');
      setErrorMsg(
        record.resultDesc ||
          (record.status === 'CANCELLED'
            ? 'M-Pesa prompt was cancelled on your phone.'
            : 'M-Pesa payment failed. Please try again.')
      );
    }
  }, []);

  // Listen to Firestore payment document in real time while waiting for callback
  useEffect(() => {
    if (!checkoutRequestId || (phase !== 'pending' && phase !== 'completed')) {
      return undefined;
    }
    const unsub = subscribeToPaymentStatus(
      checkoutRequestId,
      (docData) => {
        if (docData) applyPaymentUpdate(docData);
      },
      () => {
        // Fallback polling continues seamlessly even if listener warns
      }
    );
    return () => unsub();
  }, [checkoutRequestId, phase, applyPaymentUpdate]);

  const handleManualQuery = useCallback(async () => {
    if (!checkoutRequestId || checkingStatus) return;
    setCheckingStatus(true);
    try {
      const result = await queryMpesaPaymentStatus(checkoutRequestId);
      if (result.status === 'COMPLETED' && result.fulfilled) {
        applyPaymentUpdate({
          status: 'COMPLETED',
          fulfilled: true,
          mpesaReceiptNumber: result.mpesaReceiptNumber,
          resultDesc: result.resultDesc
        });
      } else if (result.status === 'CANCELLED' || result.status === 'FAILED') {
        applyPaymentUpdate({
          status: result.status,
          fulfilled: false,
          resultDesc: result.resultDesc
        });
      } else if (result.stillProcessing) {
        setStatusMessage(
          'Still waiting for M-Pesa PIN confirmation on your phone...'
        );
      }
    } catch (err) {
      setStatusMessage(err.message || 'Could not refresh status yet.');
    } finally {
      setCheckingStatus(false);
    }
  }, [checkoutRequestId, checkingStatus, applyPaymentUpdate]);

  // Automatic Daraja STK Query fallback every 5s after an 8s initial grace delay
  useEffect(() => {
    if (phase !== 'pending' || !checkoutRequestId) return undefined;

    let attempts = 0;
    let pollId = null;

    const startTimeout = setTimeout(() => {
      handleManualQuery();
      pollId = setInterval(() => {
        attempts += 1;
        if (attempts >= 12) {
          clearInterval(pollId);
          return;
        }
        handleManualQuery();
      }, 5000);
    }, 8000);

    return () => {
      clearTimeout(startTimeout);
      if (pollId) clearInterval(pollId);
    };
  }, [phase, checkoutRequestId, handleManualQuery]);

  const handleStkSubmit = async (e) => {
    e.preventDefault();
    const cleaned = phone.replace(/[\s\-()+]/g, '');
    if (!/^(254|0)?(7|1)\d{8}$/.test(cleaned)) {
      setErrorMsg(
        'Enter a valid Kenyan Safaricom number (e.g. 0712345678 or 0112345678).'
      );
      return;
    }

    setErrorMsg('');
    setStatusMessage('Sending M-Pesa STK Push prompt to your phone...');
    setPhase('submitting');

    try {
      const res = await initiateMpesaStkPush({
        plan: selectedPlan,
        challengeId: selectedPlan === 'single' ? challenge.id : null,
        phoneNumber: phone
      });
      setCheckoutRequestId(res.checkoutRequestId);
      setEnvironment(res.environment || 'sandbox');
      setStatusMessage(
        res.customerMessage ||
          'Prompt sent! Enter your M-Pesa PIN on your phone to finish.'
      );
      setPhase('pending');
    } catch (err) {
      setPhase('form');
      setErrorMsg(err.message || 'Failed to initiate M-Pesa STK Push.');
    }
  };

  const handleResetToForm = () => {
    setPhase('form');
    setCheckoutRequestId('');
    setPaymentRecord(null);
    setErrorMsg('');
    setStatusMessage('');
  };

  const isBusy = phase === 'submitting' || phase === 'pending';

  if (!challenge) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto p-4 sm:p-5 text-slate-100 shadow-2xl flex flex-col gap-3.5 sm:gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              {phase === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
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

        {/* Plan Selector (only editable before submitting) */}
        {phase !== 'completed' && (
          <div className="grid grid-cols-1 gap-2.5">
            {challengePrice > 0 && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setSelectedPlan('single');
                  setErrorMsg('');
                }}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 disabled:opacity-60 ${
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
            )}

            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setSelectedPlan('pass90');
                setErrorMsg('');
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 relative disabled:opacity-60 ${
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
                  Unlocks ALL custom instructor challenges + live demos for{' '}
                  {PASS_DURATION_DAYS} days.
                </div>
              </div>
              <div className="text-sm font-black text-amber-300 shrink-0">
                KES {passPriceKes}
              </div>
            </button>
          </div>
        )}

        {/* Auth Gate or Payment Workflow */}
        {!user ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 text-center">
            <p className="text-xs text-slate-300">
              Sign in with Google first so your M-Pesa unlock or 90-day pass stays
              linked to your account across devices.
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
        ) : phase === 'pending' ? (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex flex-col gap-3 text-center">
            <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mx-auto">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center justify-center gap-1.5">
                Check Your Phone ({phone})
                {environment === 'sandbox' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    SANDBOX
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 mt-1">
                {statusMessage ||
                  `Enter your M-Pesa PIN for KES ${amountDue} on your Safaricom prompt.`}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleManualQuery}
                disabled={checkingStatus}
                className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-60 transition"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`}
                />
                {checkingStatus
                  ? 'Checking Safaricom M-Pesa...'
                  : "I've Entered My PIN — Verify Status"}
              </button>

              <button
                type="button"
                onClick={handleResetToForm}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Cancel or use a different M-Pesa number
              </button>
            </div>
          </div>
        ) : phase === 'completed' ? (
          <div className="bg-emerald-950/60 border border-emerald-400/50 rounded-xl p-4 flex flex-col gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-300">
                M-Pesa Payment Confirmed!
              </div>
              <h4 className="text-sm font-black text-white mt-0.5">
                {selectedPlan === 'pass90'
                  ? `${PASS_DURATION_DAYS}-Day Full Class Pass Activated`
                  : `"${challenge.title}" Unlocked`}
              </h4>
              {paymentRecord?.mpesaReceiptNumber && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-emerald-500/30 text-[11px] font-bold text-emerald-200">
                  <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                  Receipt: {paymentRecord.mpesaReceiptNumber}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shadow-lg"
            >
              Start Practicing Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleStkSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                M-Pesa Phone Number (Safaricom)
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  disabled={phase === 'submitting'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 disabled:opacity-60"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-200 text-[11px] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={phase === 'submitting'}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 transition"
            >
              {phase === 'submitting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending M-Pesa Prompt...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {phase === 'failed'
                    ? `Retry KES ${amountDue} via M-Pesa`
                    : `Pay KES ${amountDue} via M-Pesa`}
                </>
              )}
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
