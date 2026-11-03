import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Volume2,
  VolumeX,
  Compass,
  Navigation,
  Award,
  Eye,
  EyeOff,
  MousePointer,
  BookOpen,
  Ban
} from 'lucide-react';
import { NODES, BOARD_NODES, EDGES, ALL_EDGES, RA_CX, RA_CY, RING_RADII } from './data/boardGraph';
import { CHALLENGES, NTSA_CHALLENGES } from './data/challenges';
import { validateNtsaRoute, findShortestValidNtsaRoute } from './engine/bfsSolver';
import BoardCanvas from './components/BoardCanvas';
import InstructorPanel from './components/InstructorPanel';

const useDrivingSound = (muted) => {
  const audioCtxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (muted) return null;
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, [muted]);

  const playClick = useCallback(
    (freq = 620) => {
      const ctx = getCtx();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } catch {
        // Ignore audio errors
      }
    },
    [getCtx]
  );

  const playReverseBeep = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Ignore
    }
  }, [getCtx]);

  const playVerdictSound = useCallback(
    (passed) => {
      const ctx = getCtx();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const notes = passed ? [523.25, 659.25, 783.99, 1046.5] : [311.13, 277.18, 233.08];
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = passed ? 'triangle' : 'sawtooth';
          osc.frequency.setValueAtTime(f, now + idx * 0.11);
          gain.gain.setValueAtTime(0.09, now + idx * 0.11);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.11);
          osc.stop(now + idx * 0.11 + 0.24);
        });
      } catch {
        // Ignore
      }
    },
    [getCtx]
  );

  return { playClick, playReverseBeep, playVerdictSound };
};

/**
 * ============================================================================
 * MAIN COMPONENT: KENYAN MODEL TOWN BOARD SIMULATOR
 * ============================================================================
 */
export default function App() {
  // Active Challenge or Sandbox State
  const [mode, setMode] = useState('challenges'); // 'challenges' | 'sandbox'
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const currentChallenge = NTSA_CHALLENGES[activeChallengeIdx];

  // Board State
  const [startNodeId, setStartNodeId] = useState(currentChallenge.startNode);
  const [targetNodeId, setTargetNodeId] = useState(currentChallenge.targetNode);
  const [blockedNodes, setBlockedNodes] = useState(currentChallenge.blockedNodes);
  const [carColor, setCarColor] = useState(currentChallenge.carColor);
  const [vehicleType, setVehicleType] = useState(currentChallenge.vehicleType);

  // Sandbox Click Tool ('path' | 'setStart' | 'setTarget' | 'toggleCone')
  const [sandboxTool, setSandboxTool] = useState('path');

  // Plotted Route (Array of Node IDs)
  const [plottedPath, setPlottedPath] = useState([currentChallenge.startNode]);
  const [verdict, setVerdict] = useState(null);
  const [showHint, setShowHint] = useState(false);

  // Solution Guide & Visual Instructor Demonstration State
  const [showSolutionGuide, setShowSolutionGuide] = useState(false);
  const [activeDemoStepIdx, setActiveDemoStepIdx] = useState(null);

  // Overlays & UI toggles
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [showRuleInspector, setShowRuleInspector] = useState(false);
  const [inspectedNodeId, setInspectedNodeId] = useState('MS_N_L3_ENTRY');
  const [muted, setMuted] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState([]);

  // Smooth Car Animation State
  const [isDriving, setIsDriving] = useState(false);
  const [carPose, setCarPose] = useState(() => {
    const n = BOARD_NODES[currentChallenge.startNode];
    return { x: n.x, y: n.y, angle: 90, turn: 'none', isReverse: false };
  });
  const animRef = useRef(null);

  const { playClick, playReverseBeep, playVerdictSound } = useDrivingSound(muted);

  // Compute initial heading angle of a node based on its outgoing legal edge
  const getInitialNodeAngle = useCallback((nodeId) => {
    const curr = BOARD_NODES[nodeId];
    if (!curr) return 90;
    const outEdge = ALL_EDGES.find((e) => e.from === nodeId && e.isLegal);
    if (!outEdge) return 90;
    const next = BOARD_NODES[outEdge.to];
    if (!next) return 90;
    return (Math.atan2(next.y - curr.y, next.x - curr.x) * 180) / Math.PI + 90;
  }, []);

  // Compute Official Solution Path for active challenge or custom sandbox setup
  const officialSolutionPath = useMemo(() => {
    if (
      mode === 'challenges' &&
      currentChallenge.solutionPath &&
      currentChallenge.blockedNodes.length === blockedNodes.length
    ) {
      return currentChallenge.solutionPath;
    }
    return (
      findShortestValidNtsaRoute(
        startNodeId,
        targetNodeId,
        blockedNodes,
        vehicleType,
        mode === 'challenges' ? currentChallenge.allowParkingShortcut : false,
        mode === 'challenges' ? currentChallenge.requiredWaypoints : []
      ) || []
    );
  }, [mode, currentChallenge, startNodeId, targetNodeId, blockedNodes, vehicleType]);

  // Generate human-readable step-by-step commentary for any solution path
  const solutionCommentarySteps = useMemo(() => {
    if (
      mode === 'challenges' &&
      currentChallenge.solutionSteps &&
      currentChallenge.blockedNodes.length === blockedNodes.length
    ) {
      return currentChallenge.solutionSteps;
    }
    if (!officialSolutionPath || officialSolutionPath.length < 2) {
      return ['No open legal route found. Remove a roadblock barrier or switch to a Saloon car.'];
    }
    return officialSolutionPath.map((nid, idx) => {
      const n = BOARD_NODES[nid];
      if (idx === 0) return `Start at ${n?.label} (${n?.road}).`;
      if (idx === officialSolutionPath.length - 1)
        return `Arrive and stop accurately at target: ${n?.label}.`;
      return `Proceed to ${n?.label} (${n?.road}).`;
    });
  }, [mode, currentChallenge, blockedNodes.length, officialSolutionPath]);

  // Sync Challenge Selection
  const loadChallenge = useCallback(
    (idx) => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setIsDriving(false);
      const ch = NTSA_CHALLENGES[idx];
      setActiveChallengeIdx(idx);
      setStartNodeId(ch.startNode);
      setTargetNodeId(ch.targetNode);
      setBlockedNodes(ch.blockedNodes);
      setCarColor(ch.carColor);
      setVehicleType(ch.vehicleType);
      setPlottedPath([ch.startNode]);
      setVerdict(null);
      setShowHint(false);
      setShowSolutionGuide(false);
      setActiveDemoStepIdx(null);
      const startNode = BOARD_NODES[ch.startNode];
      setCarPose({
        x: startNode.x,
        y: startNode.y,
        angle: getInitialNodeAngle(ch.startNode),
        turn: 'none',
        isReverse: false
      });
    },
    [getInitialNodeAngle]
  );

  // Reset current route back to startNodeId
  const handleResetRoute = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsDriving(false);
    setPlottedPath([startNodeId]);
    setVerdict(null);
    setActiveDemoStepIdx(null);
    const startNode = BOARD_NODES[startNodeId];
    if (startNode) {
      setCarPose({
        x: startNode.x,
        y: startNode.y,
        angle: getInitialNodeAngle(startNodeId),
        turn: 'none',
        isReverse: false
      });
    }
    playClick(480);
  }, [startNodeId, getInitialNodeAngle, playClick]);

  // Synchronize car pose with the tip of plottedPath when not playing animation
  useEffect(() => {
    if (isDriving) return;
    if (!plottedPath || plottedPath.length === 0) return;
    const lastId = plottedPath[plottedPath.length - 1];
    const lastNode = BOARD_NODES[lastId];
    if (!lastNode) return;

    let angle = 90;
    let turn = 'none';
    let isReverse = false;

    if (plottedPath.length >= 2) {
      const prevId = plottedPath[plottedPath.length - 2];
      const prevNode = BOARD_NODES[prevId];
      if (prevNode) {
        const edge = ALL_EDGES.find((e) => e.from === prevId && e.to === lastId);
        turn = edge?.turn || 'none';
        isReverse = Boolean(edge?.isReverse);

        if (prevNode.zone === 'roundabout' && lastNode.zone === 'roundabout' && prevNode.ring === lastNode.ring) {
          const currA = Math.atan2(lastNode.y - RA_CY, lastNode.x - RA_CX);
          angle = (Math.atan2(Math.cos(currA), -Math.sin(currA)) * 180) / Math.PI + 90;
        } else {
          const rawAngle = (Math.atan2(lastNode.y - prevNode.y, lastNode.x - prevNode.x) * 180) / Math.PI + 90;
          angle = isReverse ? rawAngle + 180 : rawAngle;
        }
      }
    } else {
      angle = getInitialNodeAngle(lastId);
    }

    setCarPose({
      x: lastNode.x,
      y: lastNode.y,
      angle,
      turn,
      isReverse
    });
  }, [plottedPath, isDriving, getInitialNodeAngle]);

  // Available next nodes from the end of `plottedPath`
  const lastPlottedNodeId = plottedPath[plottedPath.length - 1];
  const validNextNodeIds = useMemo(() => {
    if (!lastPlottedNodeId) return [];
    return ALL_EDGES.filter((e) => e.from === lastPlottedNodeId).map((e) => e.to);
  }, [lastPlottedNodeId]);

  // Handle clicking a node on the board
  const handleNodeClick = (nodeId) => {
    if (isDriving) return;
    setInspectedNodeId(nodeId);

    // If Rule Inspector mode is active, just inspect the node
    if (showRuleInspector) {
      playClick(700);
      return;
    }

    // Handle Sandbox Tools
    if (mode === 'sandbox' && sandboxTool !== 'path') {
      if (sandboxTool === 'setStart') {
        setStartNodeId(nodeId);
        setPlottedPath([nodeId]);
        setVerdict(null);
        const n = BOARD_NODES[nodeId];
        setCarPose({
          x: n.x,
          y: n.y,
          angle: getInitialNodeAngle(nodeId),
          turn: 'none',
          isReverse: false
        });
        setSandboxTool('path');
        playClick(760);
        return;
      }
      if (sandboxTool === 'setTarget') {
        setTargetNodeId(nodeId);
        setVerdict(null);
        setSandboxTool('path');
        playClick(840);
        return;
      }
      if (sandboxTool === 'toggleCone') {
        if (nodeId === startNodeId || nodeId === targetNodeId) return;
        setBlockedNodes((prev) =>
          prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
        );
        setVerdict(null);
        playClick(520);
        return;
      }
    }

    // Standard Path Plotting Mode
    // 1. If clicking the second-to-last node, undo the last step
    if (plottedPath.length >= 2 && plottedPath[plottedPath.length - 2] === nodeId) {
      setPlottedPath((prev) => prev.slice(0, -1));
      setVerdict(null);
      playClick(440);
      return;
    }

    // 2. If clicking a connected next node, append it to path
    if (validNextNodeIds.includes(nodeId)) {
      setPlottedPath((prev) => [...prev, nodeId]);
      setVerdict(null);
      playClick(660);
      return;
    }

    // 3. If clicking one of the alternative lane starts right at the beginning, switch start lane
    const startEdges = ALL_EDGES.filter((e) => e.from === startNodeId).map((e) => e.to);
    if (plottedPath.length === 2 && startEdges.includes(nodeId)) {
      setPlottedPath([startNodeId, nodeId]);
      setVerdict(null);
      playClick(660);
    }
  };

  // Animate the Toy Car along `pathIds` and then show NTSA Examiner Verdict
  const animateCarAlongPath = useCallback(
    (pathIds, isInstructorDemo = false) => {
      if (!pathIds || pathIds.length < 2) return;
      if (animRef.current) cancelAnimationFrame(animRef.current);

      setIsDriving(true);
      if (!isInstructorDemo) {
        setVerdict(null);
        setActiveDemoStepIdx(null);
      } else {
        setShowSolutionGuide(true);
        setActiveDemoStepIdx(0);
      }

      // Build interpolation segments
      const segments = [];
      for (let i = 0; i < pathIds.length - 1; i++) {
        const u = BOARD_NODES[pathIds[i]];
        const v = BOARD_NODES[pathIds[i + 1]];
        const edge = ALL_EDGES.find((e) => e.from === pathIds[i] && e.to === pathIds[i + 1]);
        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const dist = Math.max(20, Math.hypot(dx, dy));
        segments.push({
          segIndex: i,
          u,
          v,
          dist,
          turn: edge?.turn || 'none',
          isReverse: Boolean(edge?.isReverse),
          bothRoundabout: u.zone === 'roundabout' && v.zone === 'roundabout',
          ring: u.ring || v.ring || null
        });
      }

      const totalDist = segments.reduce((acc, s) => acc + s.dist, 0);
      const speedPxPerMs = isInstructorDemo ? 0.16 : 0.21; // Slower during instructor demonstration
      const totalDuration = Math.max(950, totalDist / speedPxPerMs);
      let startTime = null;
      let lastBlinkerTick = 0;

      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / totalDuration);
        const targetDist = progress * totalDist;

        // Locate active segment
        let accumulated = 0;
        let activeSeg = segments[segments.length - 1];
        let segT = 1;

        for (const seg of segments) {
          if (accumulated + seg.dist >= targetDist) {
            activeSeg = seg;
            segT = (targetDist - accumulated) / seg.dist;
            break;
          }
          accumulated += seg.dist;
        }

        if (isInstructorDemo) {
          const stepCount = solutionCommentarySteps.length;
          const mappedIdx = Math.min(
            stepCount - 1,
            Math.floor((activeSeg.segIndex / Math.max(1, segments.length)) * stepCount)
          );
          setActiveDemoStepIdx(mappedIdx);
        }

        let x, y, tangentAngle;

        if (activeSeg.bothRoundabout && activeSeg.u.ring === activeSeg.v.ring) {
          const r = RING_RADII[activeSeg.u.ring];
          const a1 = Math.atan2(activeSeg.u.y - RA_CY, activeSeg.u.x - RA_CX);
          let a2 = Math.atan2(activeSeg.v.y - RA_CY, activeSeg.v.x - RA_CX);
          while (a2 < a1) a2 += Math.PI * 2;
          const currA = a1 + (a2 - a1) * segT;
          x = RA_CX + r * Math.cos(currA);
          y = RA_CY + r * Math.sin(currA);
          tangentAngle = (Math.atan2(Math.cos(currA), -Math.sin(currA)) * 180) / Math.PI + 90;
        } else {
          x = activeSeg.u.x + (activeSeg.v.x - activeSeg.u.x) * segT;
          y = activeSeg.u.y + (activeSeg.v.y - activeSeg.u.y) * segT;
          const rawAngle =
            (Math.atan2(activeSeg.v.y - activeSeg.u.y, activeSeg.v.x - activeSeg.u.x) * 180) /
              Math.PI +
            90;
          tangentAngle = activeSeg.isReverse ? rawAngle + 180 : rawAngle;
        }

        if (timestamp - lastBlinkerTick > 280) {
          lastBlinkerTick = timestamp;
          if (activeSeg.isReverse) {
            playReverseBeep();
          } else if (activeSeg.turn !== 'none') {
            playClick(activeSeg.turn === 'left' ? 780 : 690);
          }
        }

        setCarPose({
          x,
          y,
          angle: tangentAngle,
          turn: activeSeg.turn,
          isReverse: activeSeg.isReverse
        });

        if (progress < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          setIsDriving(false);
          const allowShortcut =
            mode === 'challenges' ? Boolean(currentChallenge.allowParkingShortcut) : false;
          const reqWaypoints =
            mode === 'challenges' ? currentChallenge.requiredWaypoints || [] : [];
          const result = validateNtsaRoute(
            pathIds,
            targetNodeId,
            blockedNodes,
            vehicleType,
            allowShortcut,
            reqWaypoints
          );
          setVerdict(result);
          playVerdictSound(result.isValid);
          if (!result.isValid) {
            // Automatically open the Solution & Failure Guide when the student fails!
            setShowSolutionGuide(true);
          } else if (mode === 'challenges') {
            setCompletedChallenges((prev) =>
              prev.includes(currentChallenge.id) ? prev : [...prev, currentChallenge.id]
            );
          }
        }
      };

      animRef.current = requestAnimationFrame(step);
    },
    [
      targetNodeId,
      blockedNodes,
      vehicleType,
      mode,
      currentChallenge,
      solutionCommentarySteps.length,
      playClick,
      playReverseBeep,
      playVerdictSound
    ]
  );

  // Watch Instructor Demonstrate the Official Solution
  const handleDemonstrateSolution = () => {
    if (isDriving) return;
    if (officialSolutionPath && officialSolutionPath.length >= 2) {
      setShowSolutionGuide(true);
      setPlottedPath(officialSolutionPath);
      animateCarAlongPath(officialSolutionPath, true);
    } else {
      setVerdict({
        isValid: false,
        score: 0,
        violations: [
          'No legal NTSA route exists between the selected Start and Target with the current roadblocks or vehicle restrictions. Try removing a closed-lane barrier or switching to a Saloon car.'
        ],
        passedRules: []
      });
      setShowSolutionGuide(true);
    }
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const inspectedNode = BOARD_NODES[inspectedNodeId] || BOARD_NODES.MS_N_L3_ENTRY;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* ==================== TOP HEADER BAR ==================== */}
      <header className="bg-slate-900/95 border-b border-emerald-800/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-md border border-emerald-300/30">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                KENYA MODEL TOWN BOARD
              </h1>
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                NTSA Exam &amp; Closed-Lane Trainer
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Move Car X Behind Car Y • Closed Lanes • Minor Lane 3 (5 Options) • Major Lane 4 (4 Options)
            </p>
          </div>
        </div>

        {/* Mode Switcher & Quick Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex items-center">
            <button
              onClick={() => {
                setMode('challenges');
                loadChallenge(activeChallengeIdx);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                mode === 'challenges'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              10 NTSA Challenges ({completedChallenges.length}/{NTSA_CHALLENGES.length})
            </button>
            <button
              onClick={() => {
                setMode('sandbox');
                setVerdict(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                mode === 'sandbox'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              Instructor Sandbox
            </button>
          </div>

          <button
            onClick={() => setShowSolutionGuide((s) => !s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              showSolutionGuide
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Show or Hide the Step-by-Step Solution Guide & Path Overlay"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {showSolutionGuide ? 'Solution Guide: ON' : 'Solution Guide'}
          </button>

          <button
            onClick={() => setShowRuleInspector((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              showRuleInspector
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Inspect any lane or roundabout ring to read its exact NTSA exam rule"
          >
            <Info className="w-3.5 h-3.5" />
            {showRuleInspector ? 'Rule Inspector: ON' : 'Inspect Rules'}
          </button>

          <button
            onClick={() => setShowWaypoints((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
            title="Toggle Interactive Waypoint Dots"
          >
            {showWaypoints ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Nodes
          </button>

          <button
            onClick={() => setMuted((m) => !m)}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
            title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 p-3 sm:p-4 max-w-[1680px] w-full mx-auto items-start">
        {/* LEFT / CENTER: PHYSICAL MODEL TOWN BOARD TABLETOP */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          {/* Action Control Strip Above Board */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                Steps: {plottedPath.length}
              </span>
              {blockedNodes.length > 0 && (
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-rose-950/90 text-rose-300 border border-rose-700/60 flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5" />
                  {blockedNodes.length} Closed {blockedNodes.length === 1 ? 'Lane' : 'Lanes'}
                </span>
              )}
              <span className="text-xs text-slate-300">
                {plottedPath.length === 1
                  ? 'Click glowing green dots ahead of your car (including broken-line lane shifts) to plot your route.'
                  : plottedPath[plottedPath.length - 1] === targetNodeId
                  ? 'Target reached! Click "Drive & Evaluate" to test your move.'
                  : `At: ${BOARD_NODES[lastPlottedNodeId]?.label}`}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleResetRoute}
                disabled={isDriving}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 disabled:opacity-50 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>

              <button
                onClick={handleDemonstrateSolution}
                disabled={isDriving}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 disabled:opacity-50 transition"
                title="Watch the NTSA Instructor demonstrate the step-by-step legal solution"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Watch Instructor Solution
              </button>

              <button
                onClick={() => animateCarAlongPath(plottedPath, false)}
                disabled={isDriving || plottedPath.length < 2}
                className="px-4 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 shadow-lg shadow-emerald-900/40 flex items-center gap-1.5 disabled:opacity-40 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isDriving ? 'Driving...' : 'Drive & Evaluate'}
              </button>
            </div>
          </div>

          {/* BoardCanvas Component */}
          <BoardCanvas
            mode={mode}
            setCarColor={setCarColor}
            playClick={playClick}
            showSolutionGuide={showSolutionGuide}
            activeDemoStepIdx={activeDemoStepIdx}
            solutionCommentarySteps={solutionCommentarySteps}
            officialSolutionPath={officialSolutionPath}
            plottedPath={plottedPath}
            startNodeId={startNodeId}
            targetNodeId={targetNodeId}
            blockedNodes={blockedNodes}
            showWaypoints={showWaypoints}
            validNextNodeIds={validNextNodeIds}
            showRuleInspector={showRuleInspector}
            inspectedNodeId={inspectedNodeId}
            carPose={carPose}
            carColor={carColor}
            vehicleType={vehicleType}
            currentChallenge={currentChallenge}
            handleNodeClick={handleNodeClick}
            lastPlottedNodeId={lastPlottedNodeId}
            isDriving={isDriving}
          />
        </div>

        {/* InstructorPanel Component */}
        <InstructorPanel
          mode={mode}
          activeChallengeIdx={activeChallengeIdx}
          currentChallenge={currentChallenge}
          completedChallenges={completedChallenges}
          loadChallenge={loadChallenge}
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
          handleDemonstrateSolution={handleDemonstrateSolution}
          solutionCommentarySteps={solutionCommentarySteps}
          activeDemoStepIdx={activeDemoStepIdx}
          showRuleInspector={showRuleInspector}
          inspectedNode={inspectedNode}
        />
      </div>
    </div>
  );
}
