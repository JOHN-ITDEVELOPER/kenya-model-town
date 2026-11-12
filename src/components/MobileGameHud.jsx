import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Undo2,
  Sparkles,
  ZoomIn,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCw,
  Navigation,
  Ban,
  BookOpen
} from 'lucide-react';
import BoardCanvas from './BoardCanvas';
import InstructorPanel from './InstructorPanel';

const ZOOM_LEVELS = [1, 1.4, 1.8];

export default function MobileGameHud({
  isLandscape,
  isManualGameMode,
  onExitGameMode,
  boardZoom,
  setBoardZoom,
  mode,
  allChallenges,
  activeChallengeIdx,
  currentChallenge,
  loadChallenge,
  completedChallenges,
  plottedPath,
  startNodeId,
  targetNodeId,
  blockedNodes,
  lastPlottedNodeId,
  validNextNodeIds,
  isDriving,
  isCurrentChallengeLocked,
  passPriceKes,
  onOpenUnlockModal,
  handleNodeClick,
  handleUndoStep,
  handleResetRoute,
  handleDemonstrateSolution,
  animateCarAlongPath,
  verdict,
  setVerdict,
  showWaypoints,
  setShowWaypoints,
  showHint,
  setShowHint,
  showSolutionGuide,
  setShowSolutionGuide,
  showRuleInspector,
  setShowRuleInspector,
  inspectedNode,
  inspectedNodeId,
  sandboxTool,
  setSandboxTool,
  vehicleType,
  setVehicleType,
  carPose,
  carColor,
  carLabel,
  setCarColor,
  playClick,
  solutionCommentarySteps,
  officialSolutionPath,
  activeDemoStepIdx,
  user,
  userProfile,
  isAdmin,
  showAdminBuilder,
  setShowAdminBuilder
}) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [dismissRotateTip, setDismissRotateTip] = useState(false);
  const [dismissVerdictBanner, setDismissVerdictBanner] = useState(false);

  useEffect(() => {
    setDismissVerdictBanner(false);
  }, [verdict]);

  const cycleZoom = () => {
    const idx = ZOOM_LEVELS.indexOf(boardZoom);
    const next = ZOOM_LEVELS[(idx + 1) % ZOOM_LEVELS.length];
    setBoardZoom(next);
  };

  const totalCount = allChallenges.length;
  const isCustom = Boolean(currentChallenge?.isCustom);
  const scenarioBadge = isCustom
    ? `C${activeChallengeIdx - 9}`
    : `Q${activeChallengeIdx + 1}`;

  const goPrev = () => {
    if (activeChallengeIdx > 0) loadChallenge(activeChallengeIdx - 1);
  };

  const goNext = () => {
    if (activeChallengeIdx < totalCount - 1) loadChallenge(activeChallengeIdx + 1);
  };

  const lockedOverlay = isCurrentChallengeLocked && (
    <div className="absolute inset-0 z-20 rounded-2xl bg-slate-950/75 backdrop-blur-[3px] flex items-center justify-center p-2 sm:p-3">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-3 sm:p-4 max-w-sm w-full max-h-[92%] overflow-y-auto text-center shadow-2xl space-y-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mx-auto">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
            Locked Custom Challenge • KES {currentChallenge?.price}
          </div>
          <h3 className="text-sm font-black text-white mt-0.5 truncate">
            {currentChallenge?.title}
          </h3>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            Unlock this challenge (KES {currentChallenge?.price}) or get a 90-Day Pass (KES {passPriceKes}).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenUnlockModal(currentChallenge)}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Unlock (M-Pesa)
          </button>
          <button
            type="button"
            onClick={() => loadChallenge(0)}
            className="py-2 px-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700"
          >
            Free Q1–Q10
          </button>
        </div>
      </div>
    </div>
  );

  const verdictOverlay = verdict && !dismissVerdictBanner && !isDriving && (
    <div
      className={`absolute top-2 left-1/2 -translate-x-1/2 z-20 max-w-md w-[94%] rounded-xl px-3 py-2 shadow-2xl border backdrop-blur-md flex items-center justify-between gap-2 ${
        verdict.isValid
          ? 'bg-emerald-950/95 border-emerald-400 text-emerald-100'
          : 'bg-rose-950/95 border-rose-400 text-rose-100'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {verdict.isValid ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-black leading-tight truncate">
            {verdict.isValid
              ? `NTSA EXAM PASSED! (${verdict.score}%)`
              : `NTSA Violation (${verdict.score}%)`}
          </div>
          <div className="text-[10px] opacity-90 truncate">
            {verdict.isValid
              ? verdict.passedRules?.[0] || 'Clean route completed!'
              : verdict.violations?.[0] || 'Check details or Watch Solution.'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!verdict.isValid && (
          <button
            type="button"
            onClick={handleDemonstrateSolution}
            className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black"
          >
            Demo
          </button>
        )}
        {verdict.isValid && activeChallengeIdx < totalCount - 1 && (
          <button
            type="button"
            onClick={goNext}
            className="px-2 py-1 rounded-lg bg-emerald-400 text-slate-950 text-[10px] font-black"
          >
            Next
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowDrawer(true)}
          className="px-2 py-1 rounded-lg bg-slate-900/80 border border-white/20 text-[10px] font-bold"
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setDismissVerdictBanner(true)}
          className="p-1 rounded hover:bg-black/20"
          aria-label="Dismiss verdict"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const boardElement = (
    <div className="relative flex-1 min-h-0 w-full">
      <BoardCanvas
        mode={mode}
        setCarColor={setCarColor}
        playClick={playClick}
        showSolutionGuide={isCurrentChallengeLocked ? false : showSolutionGuide}
        activeDemoStepIdx={activeDemoStepIdx}
        solutionCommentarySteps={
          isCurrentChallengeLocked ? [] : solutionCommentarySteps
        }
        officialSolutionPath={
          isCurrentChallengeLocked ? [] : officialSolutionPath
        }
        plottedPath={plottedPath}
        startNodeId={startNodeId}
        targetNodeId={targetNodeId}
        blockedNodes={blockedNodes}
        parkedCars={currentChallenge?.parkedCars || []}
        showWaypoints={showWaypoints}
        validNextNodeIds={validNextNodeIds}
        showRuleInspector={showRuleInspector}
        inspectedNodeId={inspectedNodeId}
        carPose={carPose}
        carColor={currentChallenge?.carColor || carColor}
        carLabel={currentChallenge?.carLabel || carLabel}
        vehicleType={vehicleType}
        currentChallenge={currentChallenge}
        handleNodeClick={handleNodeClick}
        lastPlottedNodeId={lastPlottedNodeId}
        isDriving={isDriving}
        zoom={boardZoom}
        fillHeight
        compactHud
      />
      {lockedOverlay}
      {verdictOverlay}
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-40 bg-slate-950 text-slate-100 safe-area-hud flex overflow-hidden select-none ${
        isLandscape ? 'flex-row' : 'flex-col'
      }`}
    >
      {/* MAIN BOARD STAGE */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col p-1.5 gap-1">
        {/* Ultra-Slim Game Status Bar */}
        <div className="flex items-center justify-between gap-2 px-1.5 py-1 bg-slate-900/90 border border-slate-800 rounded-lg shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setShowDrawer(true)}
              className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-black shrink-0 flex items-center gap-1"
            >
              {mode === 'challenges' ? scenarioBadge : 'SANDBOX'}
            </button>
            <span className="text-[11px] font-bold text-slate-200 truncate">
              {mode === 'challenges'
                ? currentChallenge?.title
                : 'Instructor Sandbox'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {plottedPath.length}
            </span>
            {blockedNodes.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/50 flex items-center gap-1">
                <Ban className="w-3 h-3" />
                {blockedNodes.length}
              </span>
            )}
            <button
              type="button"
              onClick={cycleZoom}
              className={`px-2 py-0.5 rounded text-[10px] font-extrabold border flex items-center gap-1 ${
                boardZoom > 1
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Zoom Model Town Board"
            >
              <ZoomIn className="w-3 h-3" />
              {boardZoom}x
            </button>
            {!isLandscape && (
              <button
                type="button"
                onClick={onExitGameMode}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1"
              >
                <Minimize2 className="w-3 h-3" />
                Exit
              </button>
            )}
          </div>
        </div>

        {/* Helpful rotation hint only when holding vertically in portrait Game Mode */}
        {!isLandscape && !dismissRotateTip && (
          <div className="bg-amber-500/15 border border-amber-400/40 rounded-lg px-2.5 py-1 flex items-center justify-between gap-2 text-[11px] text-amber-200 shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <RotateCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Rotate phone sideways for full widescreen landscape, or tap <strong>{boardZoom}x</strong> to zoom.
            </span>
            <button
              type="button"
              onClick={() => setDismissRotateTip(true)}
              className="p-0.5 text-amber-300 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {boardElement}

        {/* Bottom Thumb Controller Strip when in Portrait Game Mode */}
        {!isLandscape && (
          <div className="grid grid-cols-5 gap-1.5 pt-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowDrawer(true)}
              className="py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold flex flex-col items-center justify-center gap-0.5"
            >
              <ListChecks className="w-4 h-4 text-sky-400" />
              <span>Scenarios</span>
            </button>
            <button
              type="button"
              onClick={handleUndoStep}
              disabled={isDriving || plottedPath.length <= 1}
              className="py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-40"
            >
              <Undo2 className="w-4 h-4 text-amber-300" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleResetRoute}
              disabled={isDriving}
              className="py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleDemonstrateSolution}
              disabled={isDriving || isCurrentChallengeLocked}
              className="py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>Demo</span>
            </button>
            <button
              type="button"
              onClick={() => animateCarAlongPath(plottedPath, false)}
              disabled={isDriving || plottedPath.length < 2 || isCurrentChallengeLocked}
              className="py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 text-[11px] font-black flex flex-col items-center justify-center gap-0.5 disabled:opacity-40 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isDriving ? 'Driving' : 'Drive'}</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT HAND CONTROLLER RAIL (Landscape Console Mode) */}
      {isLandscape && (
        <aside className="w-44 sm:w-52 shrink-0 bg-slate-900/95 border-l border-slate-800 p-2 flex flex-col justify-between gap-2 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            {/* Quick Prev / Next Scenario Switcher */}
            {mode === 'challenges' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={activeChallengeIdx === 0}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-35"
                  title="Previous Question"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDrawer(true)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-extrabold text-emerald-300 flex items-center justify-center gap-1 truncate"
                >
                  <ListChecks className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {scenarioBadge}/{totalCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={activeChallengeIdx >= totalCount - 1}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-35"
                  title="Next Question"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Prompt Snippet */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-300 leading-snug line-clamp-3">
              {mode === 'challenges'
                ? currentChallenge?.prompt
                : 'Drag the car along valid green dots or click waypoints to plot.'}
            </div>

            {/* Primary Action: Drive & Evaluate */}
            <button
              type="button"
              onClick={() => animateCarAlongPath(plottedPath, false)}
              disabled={isDriving || plottedPath.length < 2 || isCurrentChallengeLocked}
              className="w-full py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              {isDriving ? 'Driving...' : 'Drive & Evaluate'}
            </button>

            {/* Undo & Reset */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleUndoStep}
                disabled={isDriving || plottedPath.length <= 1}
                className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-300" />
                Undo
              </button>
              <button
                type="button"
                onClick={handleResetRoute}
                disabled={isDriving}
                className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Watch Instructor Solution */}
            <button
              type="button"
              onClick={handleDemonstrateSolution}
              disabled={isDriving || isCurrentChallengeLocked}
              className="w-full py-2 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Watch Demo
            </button>

            {/* Board Helpers: Zoom & Waypoints */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={cycleZoom}
                className={`py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 ${
                  boardZoom > 1
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
                {boardZoom}x
              </button>
              <button
                type="button"
                onClick={() => setShowWaypoints((w) => !w)}
                className="py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1"
              >
                {showWaypoints ? (
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                Nodes
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowDrawer(true)}
              className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                verdict
                  ? verdict.isValid
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-rose-500/20 border-rose-400 text-rose-200'
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {verdict ? 'Verdict & Guide' : 'Questions & Rules'}
            </button>

            <button
              type="button"
              onClick={onExitGameMode}
              className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              {isManualGameMode ? 'Exit Game Mode' : 'Standard View'}
            </button>
          </div>
        </aside>
      )}

      {/* SLIDE-OVER QUESTIONS, VERDICT & GUIDE DRAWER */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-end">
          <div
            className="flex-1"
            onClick={() => setShowDrawer(false)}
          />
          <div className="w-[88vw] max-w-sm h-full bg-slate-950 border-l border-slate-700 shadow-2xl flex flex-col">
            <div className="px-3 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Scenarios, Verdict &amp; Guide
              </span>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <InstructorPanel
                mode={mode}
                challengesList={allChallenges}
                user={user}
                userProfile={userProfile}
                isAdmin={isAdmin}
                showAdminBuilder={showAdminBuilder}
                setShowAdminBuilder={setShowAdminBuilder}
                onOpenUnlockModal={(ch) => {
                  setShowDrawer(false);
                  onOpenUnlockModal(ch);
                }}
                passPriceKes={passPriceKes}
                activeChallengeIdx={activeChallengeIdx}
                currentChallenge={currentChallenge}
                completedChallenges={completedChallenges}
                loadChallenge={(idx) => {
                  loadChallenge(idx);
                  setShowDrawer(false);
                }}
                showHint={showHint}
                setShowHint={setShowHint}
                showSolutionGuide={showSolutionGuide}
                setShowSolutionGuide={setShowSolutionGuide}
                sandboxTool={sandboxTool}
                setSandboxTool={setSandboxTool}
                vehicleType={vehicleType}
                setVehicleType={setVehicleType}
                verdict={verdict}
                isDriving={isDriving}
                handleDemonstrateSolution={() => {
                  setShowDrawer(false);
                  handleDemonstrateSolution();
                }}
                solutionCommentarySteps={solutionCommentarySteps}
                activeDemoStepIdx={activeDemoStepIdx}
                showRuleInspector={showRuleInspector}
                inspectedNode={inspectedNode}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

