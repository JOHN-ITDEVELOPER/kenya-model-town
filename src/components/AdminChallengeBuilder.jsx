import React, { useState, useMemo, useCallback } from 'react';
import {
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Flag,
  Car,
  Trash2,
  Edit3,
  X,
  Plus,
  Compass,
  ArrowRight
} from 'lucide-react';
import { BOARD_NODES } from '../data/boardGraph';
import { findShortestValidNtsaRoute } from '../engine/bfsSolver';
import { saveCustomChallenge, deleteCustomChallenge } from '../services/challengeService';

const CAR_COLORS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'White', value: '#f8fafc' }
];

export default function AdminChallengeBuilder({
  user,
  customChallenges = [],
  onChallengeCreated,
  onChallengeDeleted,
  onSelectChallengeToPlay,
  // Board builder bridge props:
  builderState,
  setBuilderState,
  builderTool,
  setBuilderTool
}) {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'list'
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Local obstacle configuration
  const [newCarColor, setNewCarColor] = useState('#3b82f6');
  const [newCarLabel, setNewCarLabel] = useState('BLUE CAR');

  // BFS Verification Result
  const [verificationResult, setVerificationResult] = useState(null);

  // Run BFS to verify the challenge is legally solvable
  const handleVerifyRoute = useCallback(() => {
    setErrorMessage('');
    if (!builderState.startNode || !builderState.targetNode) {
      setErrorMessage('Please set both a Start Node and a Target Node first.');
      return;
    }

    const path = findShortestValidNtsaRoute(
      builderState.startNode,
      builderState.targetNode,
      builderState.blockedNodes,
      builderState.vehicleType,
      builderState.allowParkingShortcut,
      builderState.requiredWaypoints || []
    );

    if (path && path.length > 0) {
      // Auto-generate step-by-step commentary
      const steps = path.map((nid, idx) => {
        const node = BOARD_NODES[nid];
        if (idx === 0) return `Start on ${node?.road || 'road'} (${node?.label || nid}).`;
        if (idx === path.length - 1) return `Arrive and safely park at target: ${node?.label || nid}.`;
        return `Proceed through ${node?.label || nid} (${node?.road || 'lane'}).`;
      });

      setVerificationResult({
        isValid: true,
        path,
        steps,
        message: `Verified! Legal route found in ${path.length} steps.`
      });

      // Populate solution into state
      setBuilderState((prev) => ({
        ...prev,
        solutionPath: path,
        solutionSteps: steps
      }));
    } else {
      setVerificationResult({
        isValid: false,
        path: null,
        steps: [],
        message: 'No legal NTSA route exists! The car is either blocked by barriers or restricted by vehicle type.'
      });
    }
  }, [builderState, setBuilderState]);

  // Save Challenge to Firestore
  const handleSaveChallenge = async () => {
    setErrorMessage('');
    setSaveSuccess(false);

    if (!builderState.title?.trim()) {
      setErrorMessage('Please enter a Challenge Title.');
      return;
    }
    if (!builderState.startNode || !builderState.targetNode) {
      setErrorMessage('Please set both a Start Node and a Target Node.');
      return;
    }

    // Auto-verify if not done yet
    let path = builderState.solutionPath;
    let steps = builderState.solutionSteps;
    if (!path || path.length === 0) {
      path = findShortestValidNtsaRoute(
        builderState.startNode,
        builderState.targetNode,
        builderState.blockedNodes,
        builderState.vehicleType,
        builderState.allowParkingShortcut,
        builderState.requiredWaypoints || []
      );
      if (!path) {
        setErrorMessage('Cannot publish challenge: No legal NTSA route found. Please adjust roadblocks.');
        return;
      }
      steps = path.map((nid, idx) => {
        const node = BOARD_NODES[nid];
        if (idx === 0) return `Start at ${node?.label || nid}.`;
        if (idx === path.length - 1) return `Arrive at target: ${node?.label || nid}.`;
        return `Pass through ${node?.label || nid}.`;
      });
    }

    setSaving(true);
    try {
      const challengeToSave = {
        ...builderState,
        solutionPath: path,
        solutionSteps: steps
      };
      const saved = await saveCustomChallenge(challengeToSave, user);
      setSaving(false);
      setSaveSuccess(true);
      if (onChallengeCreated) onChallengeCreated(saved);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setSaving(false);
      setErrorMessage(err.message || 'Failed to save to Firestore. Check .env configuration.');
    }
  };

  // Reset Builder to clean state
  const handleResetBuilder = () => {
    setBuilderState({
      id: null,
      title: '',
      badge: 'Instructor Custom',
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
    setVerificationResult(null);
    setErrorMessage('');
    setSaveSuccess(false);
  };

  // Delete Challenge
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom challenge?')) return;
    try {
      await deleteCustomChallenge(id, user);
      if (onChallengeDeleted) onChallengeDeleted(id);
    } catch (err) {
      alert(`Error deleting challenge: ${err.message}`);
    }
  };

  // Edit existing custom challenge
  const handleEdit = (ch) => {
    setBuilderState({ ...ch });
    setActiveTab('editor');
    setVerificationResult({
      isValid: true,
      path: ch.solutionPath,
      steps: ch.solutionSteps,
      message: 'Loaded custom challenge into editor.'
    });
  };

  return (
    <div className="bg-slate-900 border-t border-emerald-800/80 p-4 text-slate-100 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        {/* Top Header / Mode Switcher */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                NTSA INSTRUCTOR CHALLENGE CREATOR
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  Admin Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Click directly on the board to place Start, Target, Roadblocks, and Obstacle cars.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Challenge Editor
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Published Challenges ({customChallenges.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Challenge Editor */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 4 Cols: Interactive Board Click Tools */}
            <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Flag className="w-4 h-4" />
                Step 1: Board Placement Tools
              </div>
              <p className="text-[11px] text-slate-400">
                Select a tool below, then click any circle/lane on the tabletop board:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {/* Tool 1: Start Node */}
                <button
                  type="button"
                  onClick={() => setBuilderTool('start')}
                  className={`p-2.5 rounded-lg text-left border transition flex items-center gap-2 text-xs font-bold ${
                    builderTool === 'start'
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <div>Set Start Node</div>
                    <div className="text-[10px] font-normal text-slate-400 truncate">
                      {builderState.startNode || 'None'}
                    </div>
                  </div>
                </button>

                {/* Tool 2: Target Node */}
                <button
                  type="button"
                  onClick={() => setBuilderTool('target')}
                  className={`p-2.5 rounded-lg text-left border transition flex items-center gap-2 text-xs font-bold ${
                    builderTool === 'target'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0" />
                  <div>
                    <div>Set Target Node</div>
                    <div className="text-[10px] font-normal text-slate-400 truncate">
                      {builderState.targetNode || 'None'}
                    </div>
                  </div>
                </button>

                {/* Tool 3: Toggle Roadblock */}
                <button
                  type="button"
                  onClick={() => setBuilderTool('barrier')}
                  className={`p-2.5 rounded-lg text-left border transition flex items-center gap-2 text-xs font-bold ${
                    builderTool === 'barrier'
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <div>
                    <div>Toggle Roadblock</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      {builderState.blockedNodes.length} closed
                    </div>
                  </div>
                </button>

                {/* Tool 4: Add Parked Obstacle Car */}
                <button
                  type="button"
                  onClick={() => setBuilderTool('obstacle')}
                  className={`p-2.5 rounded-lg text-left border transition flex items-center gap-2 text-xs font-bold ${
                    builderTool === 'obstacle'
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Car className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <div>Place Obstacle Car</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      {builderState.parkedCars.length} placed
                    </div>
                  </div>
                </button>
              </div>

              {/* Obstacle Car Picker Options */}
              {builderTool === 'obstacle' && (
                <div className="mt-1 p-2.5 rounded-lg bg-slate-900 border border-sky-800/50 flex flex-col gap-2">
                  <div className="text-[11px] font-bold text-sky-300">Obstacle Car Details (Click board to place):</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Color:</span>
                    <div className="flex items-center gap-1.5">
                      {CAR_COLORS.map((c) => {
                        const isSelected = (builderState.currentObstacleColor || newCarColor) === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => {
                              setNewCarColor(c.value);
                              const lbl = `${c.label.toUpperCase()} CAR`;
                              setNewCarLabel(lbl);
                              setBuilderState((prev) => ({
                                ...prev,
                                currentObstacleColor: c.value,
                                currentObstacleLabel: lbl
                              }));
                            }}
                            className={`w-5 h-5 rounded-full border transition ${
                              isSelected ? 'ring-2 ring-sky-400 scale-110 border-white' : 'opacity-70 border-slate-700'
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Label:</span>
                    <input
                      type="text"
                      value={builderState.currentObstacleLabel || newCarLabel}
                      onChange={(e) => {
                        setNewCarLabel(e.target.value);
                        setBuilderState((prev) => ({
                          ...prev,
                          currentObstacleLabel: e.target.value
                        }));
                      }}
                      className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white flex-1"
                      placeholder="e.g. YELLOW CAR"
                    />
                  </div>
                </div>
              )}

              {/* Active Obstacle List */}
              {builderState.parkedCars.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Placed Obstacle Cars:
                  </div>
                  <div className="max-h-24 overflow-y-auto flex flex-col gap-1 pr-1">
                    {builderState.parkedCars.map((pc, idx) => (
                      <div
                        key={pc.id || idx}
                        className="flex items-center justify-between px-2 py-1 bg-slate-900 rounded border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: pc.color }}
                          />
                          <span className="font-bold text-slate-200">{pc.label}</span>
                          <span className="text-[10px] text-slate-500">
                            ({Math.round(pc.x)}, {Math.round(pc.y)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBuilderState((prev) => ({
                              ...prev,
                              parkedCars: prev.parkedCars.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="text-rose-400 hover:text-rose-300 p-0.5"
                          title="Remove car"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Closed Lanes / Roadblocks Badges */}
              {builderState.blockedNodes.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
                    Active Roadblocks ({builderState.blockedNodes.length}):
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {builderState.blockedNodes.map((bid) => (
                      <span
                        key={bid}
                        className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-[10px] font-bold text-rose-300 flex items-center gap-1"
                      >
                        {BOARD_NODES[bid]?.label || bid}
                        <button
                          type="button"
                          onClick={() => {
                            setBuilderState((prev) => ({
                              ...prev,
                              blockedNodes: prev.blockedNodes.filter((id) => id !== bid)
                            }));
                          }}
                          className="hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 7 Cols: Metadata Form & BFS Auto-Verification */}
            <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                <span>Step 2: Challenge Metadata & Examiner Prompt</span>
                <span className="text-[10px] text-slate-400 font-semibold">Saloon / Lorry Rules</span>
              </div>

              {/* Active Driver Vehicle (Player's Car) Selector */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-800/40 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300">
                    Player Vehicle (Your Car) Color & Label:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Active: <strong style={{ color: builderState.carColor || '#ef4444' }}>{builderState.carLabel || 'RED CAR'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {CAR_COLORS.map((c) => {
                      const isSelected = (builderState.carColor || '#ef4444') === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() =>
                            setBuilderState((prev) => ({
                              ...prev,
                              carColor: c.value,
                              carLabel: `${c.label.toUpperCase()} CAR`
                            }))
                          }
                          className={`w-6 h-6 rounded-full border-2 transition ${
                            isSelected
                              ? 'ring-2 ring-emerald-400 scale-110 border-white'
                              : 'opacity-70 border-slate-700 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={`Select ${c.label} for player car`}
                        />
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={builderState.carLabel || 'RED CAR'}
                    onChange={(e) =>
                      setBuilderState((prev) => ({ ...prev, carLabel: e.target.value }))
                    }
                    className="bg-slate-950 border border-slate-700 px-2.5 py-1 rounded text-xs text-white flex-1"
                    placeholder="e.g. BLUE CAR"
                  />
                </div>
              </div>

              {/* Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Challenge Title *
                  </label>
                  <input
                    type="text"
                    value={builderState.title || ''}
                    onChange={(e) =>
                      setBuilderState((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Red Car Behind Blue Car"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Exam Badge / Category
                  </label>
                  <input
                    type="text"
                    value={builderState.badge || ''}
                    onChange={(e) =>
                      setBuilderState((prev) => ({ ...prev, badge: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Rule 2 • Closed Median"
                  />
                </div>
              </div>

              {/* Examiner Prompt */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Examiner Question / Prompt *
                </label>
                <textarea
                  rows="2"
                  value={builderState.prompt || ''}
                  onChange={(e) =>
                    setBuilderState((prev) => ({ ...prev, prompt: e.target.value }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder='e.g. "Move the RED CAR and park directly behind the BLUE CAR. Notice that Median Gap W1 is closed!"'
                />
              </div>

              {/* Rule & Hint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    NTSA Rule Applied
                  </label>
                  <input
                    type="text"
                    value={builderState.ruleApplied || ''}
                    onChange={(e) =>
                      setBuilderState((prev) => ({ ...prev, ruleApplied: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Rule 2: Longest route via Roundabout Ring 4"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Student Hint (Optional)
                  </label>
                  <input
                    type="text"
                    value={builderState.hint || ''}
                    onChange={(e) =>
                      setBuilderState((prev) => ({ ...prev, hint: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Do a 180° U-turn in Ring 4."
                  />
                </div>
              </div>

              {/* Vehicle Type & Parking Shortcut */}
              <div className="flex items-center gap-4 text-xs pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300">Vehicle:</span>
                  <select
                    value={builderState.vehicleType || 'saloon'}
                    onChange={(e) =>
                      setBuilderState((prev) => ({ ...prev, vehicleType: e.target.value }))
                    }
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="saloon">Saloon Car</option>
                    <option value="lorry">Lorry (Heavy Commercial)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(builderState.allowParkingShortcut)}
                    onChange={(e) =>
                      setBuilderState((prev) => ({
                        ...prev,
                        allowParkingShortcut: e.target.checked
                      }))
                    }
                    className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span className="text-slate-300 font-semibold">Allow Parking as Last Resort (Rule 3)</span>
                </label>
              </div>

              {/* BFS Solver Verification Box */}
              <div className="mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    NTSA Rule Feasibility Verification
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyRoute}
                    className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Verify with BFS Solver
                  </button>
                </div>

                {verificationResult && (
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      verificationResult.isValid
                        ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-700/60 text-rose-200'
                    }`}
                  >
                    {verificationResult.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">{verificationResult.message}</div>
                      {verificationResult.isValid && (
                        <div className="text-[11px] text-emerald-300/80 mt-1 truncate max-w-md">
                          Route: {verificationResult.path.join(' → ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status messages */}
              {errorMessage && (
                <div className="p-2 rounded bg-rose-950 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {errorMessage}
                </div>
              )}
              {saveSuccess && (
                <div className="p-2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Challenge successfully published to Firestore!
                </div>
              )}

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetBuilder}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Builder
                </button>

                <button
                  type="button"
                  onClick={handleSaveChallenge}
                  disabled={saving}
                  className="px-5 py-2 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 shadow-lg shadow-emerald-900/40 flex items-center gap-2 disabled:opacity-50 transition"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Publishing to Firebase...' : 'Save & Publish Challenge'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Published Custom Challenges List */}
        {activeTab === 'list' && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-xs font-bold text-slate-300">
                Custom Challenges Stored in Cloud Firestore ({customChallenges.length})
              </div>
              <button
                onClick={() => {
                  handleResetBuilder();
                  setActiveTab('editor');
                }}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Challenge
              </button>
            </div>

            {customChallenges.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No custom challenges created yet. Use the Challenge Editor tab to author your first NTSA test question!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {customChallenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3 hover:border-emerald-700/60 transition group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          {ch.badge || 'Custom'}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">
                          {ch.vehicleType || 'saloon'}
                        </span>
                      </div>
                      <h3 className="text-xs font-black text-white group-hover:text-emerald-300 transition line-clamp-1">
                        {ch.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {ch.prompt}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectChallengeToPlay) onSelectChallengeToPlay(ch);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1"
                      >
                        Play <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(ch)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ch.id)}
                          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/60"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

