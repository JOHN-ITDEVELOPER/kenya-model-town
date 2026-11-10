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
  Ban,
  LogIn,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  PlusCircle,
  HelpCircle,
  Users,
  Lock
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './services/firebase';
import { subscribeToCustomChallenges, isUserAdmin } from './services/challengeService';
import {
  syncUserProfileOnLogin,
  subscribeToUserProfile,
  subscribeToMonetizationSettings,
  recordChallengeAttempt,
  canAccessChallenge,
  hasActive90DayPass,
  getRemainingPassDays,
  DEFAULT_PASS_PRICE_KES
} from './services/userService';
import { NODES, BOARD_NODES, EDGES, ALL_EDGES, RA_CX, RA_CY, RING_RADII } from './data/boardGraph';
import { CHALLENGES, NTSA_CHALLENGES } from './data/challenges';
import { validateNtsaRoute, findShortestValidNtsaRoute } from './engine/bfsSolver';
import BoardCanvas from './components/BoardCanvas';
import InstructorPanel from './components/InstructorPanel';
import AdminChallengeBuilder from './components/AdminChallengeBuilder';
import AdminDashboard from './components/AdminDashboard';
import ChallengeUnlockModal from './components/ChallengeUnlockModal';

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
  // Firestore Custom Challenges
  const [customChallenges, setCustomChallenges] = useState([]);

  // Subscribe to Cloud Firestore custom challenges in real-time
  useEffect(() => {
    const unsubscribe = subscribeToCustomChallenges(
      (challenges) => {
        setCustomChallenges(challenges);
      },
      (err) => {
        console.warn('Custom challenges subscription warning:', err);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Combined challenges list: 10 built-in NTSA + custom Firestore challenges
  const allChallenges = useMemo(() => {
    return [...NTSA_CHALLENGES, ...customChallenges];
  }, [customChallenges]);

  // Active Challenge or Sandbox State
  const [mode, setMode] = useState('challenges'); // 'challenges' | 'sandbox'
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const currentChallenge = allChallenges[activeChallengeIdx] || allChallenges[0] || NTSA_CHALLENGES[0];

  // Firebase Auth, User Profile & Monetization State
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAdminBuilder, setShowAdminBuilder] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [unlockModalChallenge, setUnlockModalChallenge] = useState(null);
  const [monetizationSettings, setMonetizationSettings] = useState({
    passPriceKes: DEFAULT_PASS_PRICE_KES,
    passDurationDays: 90
  });

  const isAdmin = useMemo(() => isUserAdmin(user), [user]);

  // Listen to monetization settings (90-day pass price)
  useEffect(() => {
    const unsub = subscribeToMonetizationSettings(setMonetizationSettings);
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        syncUserProfileOnLogin(u).catch((err) =>
          console.warn('User profile sync skipped:', err?.message)
        );
      } else {
        setUserProfile(null);
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Subscribe to signed-in user's profile & unlocks
  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }
    const unsub = subscribeToUserProfile(user.uid, (prof) => {
      setUserProfile(prof);
      if (Array.isArray(prof?.completedChallenges) && prof.completedChallenges.length > 0) {
        setCompletedChallenges((prev) =>
          Array.from(new Set([...prev, ...prof.completedChallenges]))
        );
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user?.uid]);

  const isCurrentChallengeLocked = useMemo(
    () => mode === 'challenges' && !canAccessChallenge(currentChallenge, userProfile, isAdmin),
    [mode, currentChallenge, userProfile, isAdmin]
  );

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      alert('Firebase credentials not detected. Please verify your Firebase environment variables on Vercel or in .env.');
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'your Vercel domain';
        alert(
          'Google Sign In Blocked: Unauthorized Domain!\n\n' +
          'Firebase Authentication requires your deployment domain to be whitelisted.\n\n' +
          'To fix this in 30 seconds:\n' +
          '1. Go to Firebase Console -> Authentication -> Settings -> Authorized domains.\n' +
          '2. Click "Add domain".\n' +
          '3. Enter: ' + hostname + '\n' +
          '4. Click Save and try signing in again!'
        );
      } else {
        alert(`Google Sign In failed: ${err.message}`);
      }
    }
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      setShowAdminBuilder(false);
      setShowAdminDashboard(false);
      setUnlockModalChallenge(null);
    }
  };

  // Admin Challenge Builder State
  const [builderTool, setBuilderTool] = useState('start');
  const [builderState, setBuilderState] = useState({
    id: null,
    title: '',
    badge: 'Instructor Custom',
    price: 0,
    ruleApplied: 'Rule 1: Use the shortest and most correct route without using parking.',
    prompt: '',
    hint: '',
    carColor: '#ef4444',
    carLabel: 'RED CAR',
    currentObstacleColor: '#eab308',
    currentObstacleLabel: 'YELLOW CAR',
    vehicleType: 'saloon',
    startNode: 'MW_E_L4_START',
    targetNode: 'MW_W_L4_MID',
    blockedNodes: [],
    parkedCars: [],
    allowParkingShortcut: false,
    requiredWaypoints: [],
    solutionPath: [],
    solutionSteps: []
  });

  // Board State
  const [startNodeId, setStartNodeId] = useState(currentChallenge.startNode);
  const [targetNodeId, setTargetNodeId] = useState(currentChallenge.targetNode);
  const [blockedNodes, setBlockedNodes] = useState(currentChallenge.blockedNodes);
  const [carColor, setCarColor] = useState(currentChallenge.carColor || '#ef4444');
  const [carLabel, setCarLabel] = useState(currentChallenge.carLabel || 'RED CAR');
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

  // Verify any pre-saved solution still matches start/target/barriers & current NTSA rules
  const isSavedSolutionValid = useMemo(() => {
    if (
      mode !== 'challenges' ||
      !Array.isArray(currentChallenge?.solutionPath) ||
      currentChallenge.solutionPath.length < 2 ||
      (currentChallenge.blockedNodes?.length || 0) !== blockedNodes.length ||
      currentChallenge.solutionPath[0] !== startNodeId ||
      currentChallenge.solutionPath[currentChallenge.solutionPath.length - 1] !== targetNodeId
    ) {
      return false;
    }
    return validateNtsaRoute(
      currentChallenge.solutionPath,
      targetNodeId,
      blockedNodes,
      vehicleType,
      Boolean(currentChallenge.allowParkingShortcut),
      currentChallenge.requiredWaypoints || []
    ).isValid;
  }, [mode, currentChallenge, startNodeId, targetNodeId, blockedNodes, vehicleType]);

  // Compute Official Solution Path for active challenge or custom sandbox setup
  const officialSolutionPath = useMemo(() => {
    if (isSavedSolutionValid) {
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
  }, [isSavedSolutionValid, mode, currentChallenge, startNodeId, targetNodeId, blockedNodes, vehicleType]);

  // Generate human-readable step-by-step commentary for any solution path
  const solutionCommentarySteps = useMemo(() => {
    if (
      isSavedSolutionValid &&
      Array.isArray(currentChallenge.solutionSteps) &&
      currentChallenge.solutionSteps.length > 0
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
      const ch = allChallenges[idx] || allChallenges[0] || NTSA_CHALLENGES[0];
      setActiveChallengeIdx(idx);
      setStartNodeId(ch.startNode);
      setTargetNodeId(ch.targetNode);
      setBlockedNodes(ch.blockedNodes || []);
      setCarColor(ch.carColor || '#ef4444');
      setCarLabel(ch.carLabel || 'RED CAR');
      setVehicleType(ch.vehicleType || 'saloon');
      setPlottedPath([ch.startNode]);
      setVerdict(null);
      setShowHint(false);
      setShowSolutionGuide(false);
      setActiveDemoStepIdx(null);
      const startNode = BOARD_NODES[ch.startNode];
      if (startNode) {
        setCarPose({
          x: startNode.x,
          y: startNode.y,
          angle: getInitialNodeAngle(ch.startNode),
          turn: 'none',
          isReverse: false
        });
      }
    },
    [allChallenges, getInitialNodeAngle]
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
    if (isCurrentChallengeLocked && !showAdminBuilder) return [];
    if (!lastPlottedNodeId) return [];
    return ALL_EDGES.filter((e) => e.from === lastPlottedNodeId && e.isLegal).map((e) => e.to);
  }, [lastPlottedNodeId, isCurrentChallengeLocked, showAdminBuilder]);

  // Handle clicking a node on the board
  const handleNodeClick = (nodeId) => {
    if (isDriving) return;
    if (isCurrentChallengeLocked && !showAdminBuilder) {
      setUnlockModalChallenge(currentChallenge);
      return;
    }
    setInspectedNodeId(nodeId);

    // If Admin Builder mode is active, handle builder placement tools
    if (showAdminBuilder) {
      if (builderTool === 'start') {
        setBuilderState((prev) => ({ ...prev, startNode: nodeId, solutionPath: [], solutionSteps: [] }));
        setPlottedPath([nodeId]);
        playClick(720);
      } else if (builderTool === 'target') {
        setBuilderState((prev) => ({ ...prev, targetNode: nodeId, solutionPath: [], solutionSteps: [] }));
        playClick(840);
      } else if (builderTool === 'barrier') {
        setBuilderState((prev) => ({
          ...prev,
          blockedNodes: prev.blockedNodes.includes(nodeId)
            ? prev.blockedNodes.filter((id) => id !== nodeId)
            : [...prev.blockedNodes, nodeId],
          solutionPath: [],
          solutionSteps: []
        }));
        playClick(500);
      } else if (builderTool === 'obstacle') {
        const n = BOARD_NODES[nodeId];
        if (n) {
          setBuilderState((prev) => ({
            ...prev,
            parkedCars: [
              ...prev.parkedCars,
              {
                id: `car_${Date.now()}`,
                x: n.x,
                y: n.y,
                angle: 90,
                color: builderState.currentObstacleColor || '#eab308',
                label: builderState.currentObstacleLabel || 'YELLOW CAR'
              }
            ]
          }));
          playClick(600);
        }
      }
      return;
    }

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
    // STRICT NTSA ENFORCEMENT: Never allow changing lanes on the roundabout
    const currNode = BOARD_NODES[lastPlottedNodeId];
    const clickedNode = BOARD_NODES[nodeId];
    if (
      currNode &&
      clickedNode &&
      currNode.zone === 'roundabout' &&
      clickedNode.zone === 'roundabout' &&
      currNode.ring !== clickedNode.ring
    ) {
      setVerdict({
        isValid: false,
        score: 0,
        violations: [
          `NTSA Instant Exam Disqualification: You cannot change lanes inside the roundabout (Ring ${currNode.ring} → Ring ${clickedNode.ring})! Once you enter a concentric ring, you are strictly prohibited from switching rings until your exit.`
        ],
        passedRules: []
      });
      playVerdictSound(false);
      return;
    }
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
      const speedPxPerMs = isInstructorDemo ? 0.17 : 0.23; // Smooth calibrated speed
      const totalDuration = Math.max(1000, totalDist / speedPxPerMs);
      let startTime = null;
      let lastBlinkerTick = 0;
      let smoothedAngle = null;
      let lastIsReverse = null;
      let lastMappedIdx = -1;

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

        if (isInstructorDemo && solutionCommentarySteps.length > 0) {
          const stepCount = solutionCommentarySteps.length;
          const mappedIdx = Math.min(
            stepCount - 1,
            Math.floor((activeSeg.segIndex / Math.max(1, segments.length)) * stepCount)
          );
          if (mappedIdx !== lastMappedIdx) { lastMappedIdx = mappedIdx; setActiveDemoStepIdx(mappedIdx); }
        }

        let x, y, rawAngle;

        if (activeSeg.bothRoundabout && activeSeg.u.ring === activeSeg.v.ring) {
          const r = RING_RADII[activeSeg.u.ring];
          const a1 = Math.atan2(activeSeg.u.y - RA_CY, activeSeg.u.x - RA_CX);
          let a2 = Math.atan2(activeSeg.v.y - RA_CY, activeSeg.v.x - RA_CX);
          while (a2 < a1) a2 += Math.PI * 2;
          const currA = a1 + (a2 - a1) * segT;
          x = RA_CX + r * Math.cos(currA);
          y = RA_CY + r * Math.sin(currA);
          const tangent = (Math.atan2(Math.cos(currA), -Math.sin(currA)) * 180) / Math.PI + 90;
          rawAngle = (tangent % 360 + 360) % 360;
        } else {
          x = activeSeg.u.x + (activeSeg.v.x - activeSeg.u.x) * segT;
          y = activeSeg.u.y + (activeSeg.v.y - activeSeg.u.y) * segT;
          const angle =
            (Math.atan2(activeSeg.v.y - activeSeg.u.y, activeSeg.v.x - activeSeg.u.x) * 180) /
              Math.PI +
            90;
          const finalAngle = activeSeg.isReverse ? angle + 180 : angle;
          rawAngle = (finalAngle % 360 + 360) % 360;
        }

        // Steer smoothly into the direction of travel without angular snapping or reverse flips
        if (smoothedAngle === null || lastIsReverse !== activeSeg.isReverse) {
          smoothedAngle = rawAngle;
          lastIsReverse = activeSeg.isReverse;
        } else {
          let diff = ((rawAngle - smoothedAngle + 540) % 360) - 180;
          smoothedAngle += diff * 0.28;
        }

        const renderAngle = (smoothedAngle % 360 + 360) % 360;

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
          angle: renderAngle,
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
          if (mode === 'challenges' && user && !isInstructorDemo) {
            recordChallengeAttempt(user, currentChallenge.id, result.isValid);
          }
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
      user,
      solutionCommentarySteps.length,
      playClick,
      playReverseBeep,
      playVerdictSound
    ]
  );

  // Watch Instructor Demonstrate the Official Solution
  const handleDemonstrateSolution = () => {
    if (isDriving) return;
    if (isCurrentChallengeLocked) {
      setUnlockModalChallenge(currentChallenge);
      return;
    }
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

          {/* Firebase Authentication & Admin Dashboard Button */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        setShowAdminDashboard((prev) => !prev);
                        setShowAdminBuilder(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                        showAdminDashboard
                          ? 'bg-emerald-500 border-emerald-300 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                          : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
                      }`}
                      title="View registered users, unlocks, and manage 90-day passes"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {showAdminDashboard ? 'Close Users' : 'Dashboard'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAdminBuilder((prev) => !prev);
                        setShowAdminDashboard(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                        showAdminBuilder
                          ? 'bg-amber-500 border-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                          : 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      {showAdminBuilder ? 'Close Creator' : 'Create Challenge'}
                    </button>
                  </>
                )}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs"
                  title={user.email}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="avatar"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="font-bold text-slate-200 hidden sm:inline truncate max-w-[100px]">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                  {isAdmin ? (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Admin
                    </span>
                  ) : hasActive90DayPass(userProfile) ? (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      90d Pass ({getRemainingPassDays(userProfile)}d)
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 shadow transition"
                title="Sign in with Google to save progress and unlock custom challenges"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>
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
                disabled={isDriving || isCurrentChallengeLocked}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 disabled:opacity-40 transition"
                title={isCurrentChallengeLocked ? 'Unlock this challenge to view the solution' : 'Watch the NTSA Instructor demonstrate the step-by-step legal solution'}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Watch Instructor Solution
              </button>

              <button
                onClick={() => animateCarAlongPath(plottedPath, false)}
                disabled={isDriving || plottedPath.length < 2 || isCurrentChallengeLocked}
                className="px-4 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 shadow-lg shadow-emerald-900/40 flex items-center gap-1.5 disabled:opacity-40 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isDriving ? 'Driving...' : 'Drive & Evaluate'}
              </button>
            </div>
          </div>

          {/* Admin User & Revenue Dashboard */}
          {showAdminDashboard && isAdmin && (
            <AdminDashboard
              user={user}
              customChallenges={customChallenges}
              monetizationSettings={monetizationSettings}
              onClose={() => setShowAdminDashboard(false)}
            />
          )}

          {/* Admin Challenge Builder Dock when active */}
          {showAdminBuilder && isAdmin && (
            <AdminChallengeBuilder
              user={user}
              customChallenges={customChallenges}
              onChallengeCreated={(saved) => {
                const newIdx = allChallenges.length;
                loadChallenge(newIdx);
              }}
              onChallengeDeleted={(id) => {
                loadChallenge(0);
              }}
              onSelectChallengeToPlay={(ch) => {
                const targetIdx = allChallenges.findIndex((c) => c.id === ch.id);
                if (targetIdx !== -1) {
                  loadChallenge(targetIdx);
                  setShowAdminBuilder(false);
                }
              }}
              builderState={builderState}
              setBuilderState={setBuilderState}
              builderTool={builderTool}
              setBuilderTool={setBuilderTool}
            />
          )}

          {/* BoardCanvas Component with Paywall Overlay if Paid Challenge is Locked */}
          <div className="relative">
            <BoardCanvas
              mode={mode}
              setCarColor={setCarColor}
              playClick={playClick}
              showSolutionGuide={isCurrentChallengeLocked ? false : showSolutionGuide}
              activeDemoStepIdx={activeDemoStepIdx}
              solutionCommentarySteps={isCurrentChallengeLocked ? [] : solutionCommentarySteps}
              officialSolutionPath={isCurrentChallengeLocked ? [] : officialSolutionPath}
              plottedPath={plottedPath}
              startNodeId={showAdminBuilder ? builderState.startNode : startNodeId}
              targetNodeId={showAdminBuilder ? builderState.targetNode : targetNodeId}
              blockedNodes={showAdminBuilder ? builderState.blockedNodes : blockedNodes}
              parkedCars={showAdminBuilder ? builderState.parkedCars : (currentChallenge?.parkedCars || [])}
              showWaypoints={showWaypoints}
              validNextNodeIds={validNextNodeIds}
              showRuleInspector={showRuleInspector}
              inspectedNodeId={inspectedNodeId}
              carPose={carPose}
              carColor={showAdminBuilder ? (builderState.carColor || '#ef4444') : (currentChallenge?.carColor || carColor)}
              carLabel={showAdminBuilder ? (builderState.carLabel || 'RED CAR') : (currentChallenge?.carLabel || carLabel)}
              vehicleType={showAdminBuilder ? builderState.vehicleType : vehicleType}
              currentChallenge={currentChallenge}
              handleNodeClick={handleNodeClick}
              lastPlottedNodeId={lastPlottedNodeId}
              isDriving={isDriving}
            />

            {isCurrentChallengeLocked && !showAdminBuilder && (
              <div className="absolute inset-0 z-20 rounded-2xl bg-slate-950/70 backdrop-blur-[3px] flex items-center justify-center p-4">
                <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 max-w-md w-full text-center shadow-2xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      Locked Custom Challenge • KES {currentChallenge.price}
                    </div>
                    <h3 className="text-base font-black text-white mt-0.5">{currentChallenge.title}</h3>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Official Q1–Q10 are free. Unlock this custom NTSA scenario for{' '}
                      <strong className="text-amber-300">KES {currentChallenge.price}</strong> or get a{' '}
                      <strong className="text-emerald-300">
                        90-Day Pass (KES {monetizationSettings.passPriceKes})
                      </strong>{' '}
                      to unlock every custom challenge for your entire 3-month driving class!
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setUnlockModalChallenge(currentChallenge)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      Unlock Now (M-Pesa)
                    </button>
                    <button
                      type="button"
                      onClick={() => loadChallenge(0)}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                    >
                      Back to Free Q1–Q10
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* InstructorPanel Component */}
        <InstructorPanel
          mode={mode}
          challengesList={allChallenges}
          user={user}
          userProfile={userProfile}
          isAdmin={isAdmin}
          showAdminBuilder={showAdminBuilder}
          setShowAdminBuilder={setShowAdminBuilder}
          onOpenUnlockModal={(ch) => setUnlockModalChallenge(ch)}
          passPriceKes={monetizationSettings.passPriceKes}
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

      {unlockModalChallenge && (
        <ChallengeUnlockModal
          challenge={unlockModalChallenge}
          passPriceKes={monetizationSettings.passPriceKes}
          user={user}
          onSignIn={handleGoogleSignIn}
          onClose={() => setUnlockModalChallenge(null)}
        />
      )}
    </div>
  );
}
