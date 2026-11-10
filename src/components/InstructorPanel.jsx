import React from 'react';
import {
  Award,
  Check,
  HelpCircle,
  BookOpen,
  ChevronRight,
  MousePointer,
  Navigation,
  Car,
  Ban,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Play,
  Info,
  Flag,
  Truck,
  ShieldAlert,
  Footprints,
  PlusCircle,
  Lock
} from 'lucide-react';
import { CHALLENGES, NTSA_CHALLENGES } from '../data/challenges';
import { canAccessChallenge } from '../services/userService';

export default function InstructorPanel({
  mode,
  activeChallengeIdx,
  currentChallenge,
  challengesList = NTSA_CHALLENGES,
  completedChallenges = [],
  loadChallenge,
  showHint,
  setShowHint,
  showSolutionGuide,
  setShowSolutionGuide,
  sandboxTool,
  setSandboxTool,
  vehicleType,
  setVehicleType,
  verdict,
  isDriving,
  handleDemonstrateSolution,
  solutionCommentarySteps = [],
  activeDemoStepIdx,
  showRuleInspector,
  inspectedNode,
  user,
  userProfile,
  isAdmin,
  showAdminBuilder,
  setShowAdminBuilder,
  onOpenUnlockModal,
  passPriceKes = 300
}) {
  const isCurrentLocked = !canAccessChallenge(currentChallenge, userProfile, isAdmin);
  return (
<div className="xl:col-span-4 flex flex-col gap-3">
          {/* 1. 10 CHALLENGE SELECTOR OR SANDBOX BUILDER */}
          {mode === 'challenges' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  NTSA Practical Exam Scenarios
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Question {activeChallengeIdx + 1} of {challengesList.length}
                </span>
              </div>

              {/* Quick Challenge Creator Toggle */}
              {user && isAdmin && (
                <button
                  onClick={() => setShowAdminBuilder && setShowAdminBuilder((prev) => !prev)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                    showAdminBuilder
                      ? 'bg-amber-500 border-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                      : 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  <span>{showAdminBuilder ? 'Close Challenge Creator' : '+ Create Custom Challenge'}</span>
                </button>
              )}

              {/* 10 Challenge Pills (2 rows of 5) */}
              <div className="grid grid-cols-5 gap-1.5">
                {NTSA_CHALLENGES.map((ch, idx) => {
                  const isDone = completedChallenges.includes(ch.id);
                  const isActive = idx === activeChallengeIdx;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => loadChallenge(idx)}
                      className={`py-1.5 rounded-lg text-xs font-extrabold border transition flex items-center justify-center gap-1 ${
                        isActive
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                          : isDone
                          ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      Q{ch.number}
                      {isDone && <Check className="w-3 h-3 text-emerald-300" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Challenges List (C1, C2...) */}
              {challengesList.length > NTSA_CHALLENGES.length && (
                <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                    Custom Challenges ({challengesList.length - NTSA_CHALLENGES.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {challengesList.slice(NTSA_CHALLENGES.length).map((ch, cIdx) => {
                      const actualIdx = NTSA_CHALLENGES.length + cIdx;
                      const isActive = actualIdx === activeChallengeIdx;
                      const isLocked = !canAccessChallenge(ch, userProfile, isAdmin);
                      const isDone = completedChallenges.includes(ch.id);
                      return (
                        <button
                          key={ch.id || `custom_${cIdx}`}
                          onClick={() => loadChallenge(actualIdx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 truncate max-w-[230px] ${
                            isActive
                              ? 'bg-amber-500 border-amber-300 text-slate-950 font-black shadow-md'
                              : isLocked
                              ? 'bg-slate-900 border-amber-500/40 text-amber-200 hover:bg-slate-800'
                              : 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                          }`}
                          title={ch.title}
                        >
                          <span className="px-1 py-0.2 rounded bg-amber-950/80 text-[10px] text-amber-300 font-extrabold">
                            C{cIdx + 1}
                          </span>
                          <span className="truncate">{ch.title}</span>
                          {isLocked ? (
                            <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-400 shrink-0">
                              <Lock className="w-3 h-3" />
                              {ch.price}
                            </span>
                          ) : isDone ? (
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Challenge Prompt */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-extrabold text-white">{currentChallenge.title}</h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {Number(currentChallenge.price) > 0 && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                        KES {currentChallenge.price}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {currentChallenge.badge}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{currentChallenge.prompt}</p>

                <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
                  <strong>NTSA Rule Focus:</strong> {currentChallenge.ruleApplied}
                </div>

                {isCurrentLocked ? (
                  <div className="mt-2 p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                      <Lock className="w-4 h-4 shrink-0" />
                      Locked Paid Challenge (KES {currentChallenge.price})
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Unlock this individual challenge for <strong>KES {currentChallenge.price}</strong> or get a{' '}
                      <strong>90-Day Pass (KES {passPriceKes})</strong> to access every custom challenge &amp; Instructor Demo.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenUnlockModal && onOpenUnlockModal(currentChallenge)}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Unlock Challenge / 90-Day Pass
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowHint((h) => !h)}
                          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          {showHint ? 'Hide Hint' : 'Instructor Hint'}
                        </button>

                        <button
                          onClick={() => setShowSolutionGuide((s) => !s)}
                          className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          {showSolutionGuide ? 'Hide Solution' : 'Step-by-Step Guide'}
                        </button>
                      </div>

                      {activeChallengeIdx < challengesList.length - 1 && (
                        <button
                          onClick={() => loadChallenge(activeChallengeIdx + 1)}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                        >
                          Next Question <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {showHint && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                        <strong>Instructor Hint:</strong> {currentChallenge.hint}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* INSTRUCTOR SANDBOX CONTROLS */
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <MousePointer className="w-4 h-4" />
                  Instructor Custom Sandbox
                </span>
                <span className="text-[11px] text-slate-400">Close Any Lane / Move Cars</span>
              </div>

              <p className="text-xs text-slate-300">
                Select a tool below and click any node on the board to close lanes with barriers, move your car, or test custom NTSA exam scenarios:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSandboxTool('path')}
                  className={`p-2 rounded-lg text-xs font-bold border text-left flex items-center gap-2 ${
                    sandboxTool === 'path'
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                  Plot Route
                </button>

                <button
                  onClick={() => setSandboxTool('setStart')}
                  className={`p-2 rounded-lg text-xs font-bold border text-left flex items-center gap-2 ${
                    sandboxTool === 'setStart'
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <Car className="w-4 h-4 text-green-400 shrink-0" />
                  Move Start Car
                </button>

                <button
                  onClick={() => setSandboxTool('setTarget')}
                  className={`p-2 rounded-lg text-xs font-bold border text-left flex items-center gap-2 ${
                    sandboxTool === 'setTarget'
                      ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <Flag className="w-4 h-4 text-amber-400 shrink-0" />
                  Move Target Spot
                </button>

                <button
                  onClick={() => setSandboxTool('toggleCone')}
                  className={`p-2 rounded-lg text-xs font-bold border text-left flex items-center gap-2 ${
                    sandboxTool === 'toggleCone'
                      ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                  Close / Open Lane
                </button>
              </div>

              <div className="pt-1 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-400">Vehicle Class:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setVehicleType('saloon')}
                    className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 border ${
                      vehicleType === 'saloon'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" /> Saloon
                  </button>
                  <button
                    onClick={() => setVehicleType('lorry')}
                    className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 border ${
                      vehicleType === 'lorry'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" /> Lorry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. NTSA EXAMINER VERDICT & AUTOMATIC FAILURE SOLUTION GUIDE */}
          {verdict && (
            <div
              className={`rounded-2xl p-4 border shadow-xl transition-all ${
                verdict.isValid
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100'
                  : 'bg-rose-950/90 border-rose-500/60 text-rose-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {verdict.isValid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wide">
                      {verdict.isValid ? 'NTSA Exam Passed!' : 'NTSA Exam Failed — See Solution Below'}
                    </h3>
                    <p className="text-[11px] opacity-85">
                      Examiner Score: <strong>{verdict.score}%</strong>
                    </p>
                  </div>
                </div>

                {verdict.isValid &&
                  mode === 'challenges' &&
                  activeChallengeIdx < challengesList.length - 1 && (
                    <button
                      onClick={() => loadChallenge(activeChallengeIdx + 1)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition"
                    >
                      Next Question →
                    </button>
                  )}
              </div>

              {verdict.violations.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {verdict.violations.map((v, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-rose-900/50 border border-rose-500/40 text-xs flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {verdict.passedRules.length > 0 && (
                <div className="space-y-1 mt-2">
                  {verdict.passedRules.map((p, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-emerald-900/40 border border-emerald-500/30 text-xs flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}

              {!verdict.isValid && (
                <div className="mt-3 pt-2.5 border-t border-rose-800/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-rose-200 font-semibold">
                    The gold solution path is now highlighted on the board!
                  </span>
                  <button
                    onClick={handleDemonstrateSolution}
                    disabled={isDriving}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Watch Instructor Demo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. STEP-BY-STEP INSTRUCTOR SOLUTION GUIDE PANEL */}
          {showSolutionGuide && !isCurrentLocked && (
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4" />
                  Step-by-Step NTSA Solution Guide
                </span>
                <button
                  onClick={handleDemonstrateSolution}
                  disabled={isDriving}
                  className="px-2.5 py-1 rounded-md bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Animate Solution
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {solutionCommentarySteps.map((stepText, idx) => {
                  const isCurrentStep = activeDemoStepIdx === idx;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-xs flex items-start gap-2.5 transition ${
                        isCurrentStep
                          ? 'bg-amber-500/20 border-amber-400 text-white font-semibold'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrentStep
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-amber-400 border border-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{stepText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. KENYAN MODEL TOWN BOARD 3 GOLDEN RULES & ROUNDABOUT MATRIX */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                NTSA Rules &amp; Selected Zone
              </span>
              <span className="text-[11px] text-slate-400">{inspectedNode.zone}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1">
              <div className="text-xs font-bold text-white">{inspectedNode.road}</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{inspectedNode.ruleInfo}</p>
            </div>

            {/* Strict NTSA Roundabout Rule */}
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-[11px] font-semibold flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong className="text-rose-300">CRITICAL NTSA RULE:</strong> Never change lanes on a roundabout! Once you enter a concentric ring, you are strictly prohibited from switching rings until your exit.
              </span>
            </div>

            {/* 3 Golden Rules */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1 text-[11px]">
              <div className="font-extrabold text-emerald-400 uppercase tracking-wider">
                The 3 Golden Rules of Model Town Board:
              </div>
              <p className="text-slate-300">
                <strong>1.</strong> Use the shortest &amp; most correct route without using parking.
              </p>
              <p className="text-slate-300">
                <strong>2.</strong> Use the longest &amp; most correct route without using parking (if shortest is closed).
              </p>
              <p className="text-slate-300">
                <strong>3.</strong> Use parking ONLY as the last resort (when all road routes are closed).
              </p>
            </div>

            {/* Roundabout Options Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
              <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                <strong className="text-emerald-400">Major Road (4 Lanes):</strong>
                <ul className="mt-1 space-y-0.5 text-slate-400">
                  <li>• <strong>L1:</strong> 90° L or 0° Str (Ring 1)</li>
                  <li>• <strong>L2:</strong> 0° Straight ONLY (Ring 2)</li>
                  <li>• <strong>L3:</strong> 0° Str or 90° R (Ring 3)</li>
                  <li>• <strong>L4 (4 opts):</strong> 90° R, 180° U, 270° Q, 360° O (Ring 4)</li>
                </ul>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                <strong className="text-amber-400">Minor Road (3 Lanes):</strong>
                <ul className="mt-1 space-y-0.5 text-slate-400">
                  <li>• <strong>L1:</strong> 90° L or 0° Str (Ring 1)</li>
                  <li>• <strong>L2:</strong> 0° Straight ONLY (Ring 2)</li>
                  <li>
                    • <strong>L3 (5 opts):</strong> Ring 3 (0° Str, 90° R) OR <span className="text-amber-300 font-semibold">Ring 4 (90° R, 180° U, 270° Q)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
    </div>
  );
}
