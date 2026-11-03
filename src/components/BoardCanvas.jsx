import React, { useRef, useState, useCallback, useEffect } from 'react';
import { NODES, BOARD_NODES, RA_CX, RA_CY, RING_RADII, polarToCartesian } from '../data/boardGraph';

export default function BoardCanvas({
  mode = 'challenges',
  setCarColor,
  playClick,
  showSolutionGuide,
  activeDemoStepIdx,
  solutionCommentarySteps = [],
  officialSolutionPath = [],
  plottedPath = [],
  startNodeId,
  targetNodeId,
  blockedNodes = [],
  showWaypoints = true,
  validNextNodeIds = [],
  showRuleInspector = false,
  inspectedNodeId,
  carPose = { x: 0, y: 0, angle: 90, turn: 'none', isReverse: false },
  carColor = '#ef4444',
  vehicleType = 'saloon',
  currentChallenge = {},
  handleNodeClick,
  lastPlottedNodeId: propLastPlottedNodeId,
  isDriving = false
}) {
  const lastPlottedNodeId = propLastPlottedNodeId !== undefined
    ? propLastPlottedNodeId
    : (plottedPath && plottedPath.length > 0 ? plottedPath[plottedPath.length - 1] : null);
  // Drag-and-Drive Interaction State
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState(null);
  const [dragAngle, setDragAngle] = useState(null);
  const lastSnappedNodeRef = useRef(null);

  // Convert Client Screen Coordinates to SVG Tabletop Coordinates
  const getSvgCoords = useCallback((e) => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }, []);

  // Grab the Toy Car (Pointer Down)
  const handleCarPointerDown = useCallback((e) => {
    if (isDriving) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const pt = getSvgCoords(e);
    if (pt) {
      setDragPos({ x: pt.x, y: pt.y });
    }
    setIsDragging(true);
    lastSnappedNodeRef.current = lastPlottedNodeId;
    if (playClick) playClick(640);
  }, [isDriving, getSvgCoords, lastPlottedNodeId, playClick]);

  // Drag the Toy Car along the Road & Roundabout (Pointer Move)
  const handleCarPointerMove = useCallback((e) => {
    if (!isDragging) return;
    const pt = getSvgCoords(e);
    if (!pt) return;

    setDragPos({ x: pt.x, y: pt.y });

    // Rotate car body towards drag movement direction
    const dx = pt.x - carPose.x;
    const dy = pt.y - carPose.y;
    if (Math.hypot(dx, dy) > 7) {
      const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      setDragAngle(rawAngle);
    }

    const SNAP_RADIUS = 36;
    let snappedId = null;

    // 1. Magnetically snap to any connected legal next waypoint
    for (const nextId of validNextNodeIds) {
      if (blockedNodes.includes(nextId)) continue;
      const node = BOARD_NODES[nextId];
      if (!node) continue;
      const dist = Math.hypot(node.x - pt.x, node.y - pt.y);
      if (dist <= SNAP_RADIUS) {
        snappedId = nextId;
        break;
      }
    }

    if (snappedId && snappedId !== lastSnappedNodeRef.current) {
      lastSnappedNodeRef.current = snappedId;
      handleNodeClick(snappedId);
      return;
    }

    // 2. Drag backwards to undo the previous step smoothly
    if (plottedPath.length >= 2) {
      const prevId = plottedPath[plottedPath.length - 2];
      const prevNode = BOARD_NODES[prevId];
      if (prevNode) {
        const dist = Math.hypot(prevNode.x - pt.x, prevNode.y - pt.y);
        if (dist <= SNAP_RADIUS && prevId !== lastSnappedNodeRef.current) {
          lastSnappedNodeRef.current = prevId;
          handleNodeClick(prevId);
          return;
        }
      }
    }
  }, [isDragging, getSvgCoords, carPose, validNextNodeIds, blockedNodes, plottedPath, handleNodeClick]);

  // Release the Toy Car (Pointer Up)
  const handleCarPointerUp = useCallback((e) => {
    if (!isDragging) return;
    try {
      if (e && e.currentTarget && e.pointerId) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    setIsDragging(false);
    setDragPos(null);
    setDragAngle(null);
    lastSnappedNodeRef.current = null;
    if (playClick) playClick(520);
  }, [isDragging, playClick]);

  // Global window pointerup safety
  useEffect(() => {
    const onGlobalPointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragPos(null);
        setDragAngle(null);
        lastSnappedNodeRef.current = null;
      }
    };
    window.addEventListener('pointerup', onGlobalPointerUp);
    return () => window.removeEventListener('pointerup', onGlobalPointerUp);
  }, [isDragging]);

  const activeCarX = isDragging && dragPos ? dragPos.x : carPose.x;
  const activeCarY = isDragging && dragPos ? dragPos.y : carPose.y;
  const activeCarAngle = isDragging && dragAngle !== null ? dragAngle : carPose.angle;


  return (
<div className="relative w-full rounded-2xl overflow-hidden border-4 border-amber-900/70 shadow-2xl bg-[#156c36]">
            {/* Live Instructor Commentary Banner during Solution Demo */}
            {showSolutionGuide && activeDemoStepIdx !== null && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-slate-950/95 border-2 border-amber-400 rounded-xl px-4 py-2.5 shadow-2xl max-w-xl w-[92%] flex items-center gap-3 pointer-events-none">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  {activeDemoStepIdx + 1}/{solutionCommentarySteps.length}
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                    Instructor Live Demonstration
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {solutionCommentarySteps[activeDemoStepIdx]}
                  </div>
                </div>
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox="0 0 1200 820"
              className="w-full h-auto block select-none"
              style={{ touchAction: 'none' }}
              onPointerMove={handleCarPointerMove}
              onPointerUp={handleCarPointerUp}
              onPointerCancel={handleCarPointerUp}
            >
              <defs>
                {/* Subtle Tabletop Board Matte Texture */}
                <pattern id="boardGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="0.6"
                    strokeOpacity="0.04"
                  />
                </pattern>

                {/* White Painted Road Arrow Marker */}
                <marker
                  id="roadArrowWhite"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="4.5"
                  markerHeight="4.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f8fafc" />
                </marker>

                {/* Plotted Route Arrow Marker */}
                <marker
                  id="routeArrowCyan"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
                </marker>

                {/* Solution Guide Arrow Marker (Gold) */}
                <marker
                  id="solutionArrowGold"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#facc15" />
                </marker>

                {/* Drop Shadow for 3D Toy Cars */}
                <filter id="carShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="1.5" dy="2.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.65" />
                </filter>
              </defs>

              {/* 1. GREEN TABLETOP SURFACE */}
              <rect x="0" y="0" width="1200" height="820" fill="#156c36" />
              <rect x="0" y="0" width="1200" height="820" fill="url(#boardGrid)" />

              {/* AA Mobility / NTSA Watermark in Bottom-Left */}
              <g transform="translate(36, 650)" opacity="0.82">
                <rect x="0" y="0" width="66" height="44" rx="4" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
                <text x="33" y="30" textAnchor="middle" fill="#1e293b" fontSize="24" fontWeight="900" fontFamily="sans-serif">
                  AA
                </text>
                <text x="82" y="34" fill="#e2e8f0" fontSize="32" fontWeight="500" fontFamily="sans-serif" letterSpacing="0.5">
                  Kenya Mobility
                </text>
                <text x="84" y="54" fill="#bbf7d0" fontSize="12" fontWeight="700" fontFamily="sans-serif" letterSpacing="1.5">
                  NTSA OFFICIAL MODEL TOWN TRAINING BOARD
                </text>
              </g>

              {/* 2. TOP PERIMETER TWO-WAY SINGLE CARRIAGEWAY (y = 62..112) */}
              <g id="top-perimeter-road">
                <rect x="20" y="62" width="1160" height="50" fill="#23272a" />
                <line x1="20" y1="63" x2="1180" y2="63" stroke="#facc15" strokeWidth="2.5" />
                <line x1="20" y1="111" x2="336" y2="111" stroke="#facc15" strokeWidth="2.5" />
                <line x1="390" y1="111" x2="728" y2="111" stroke="#facc15" strokeWidth="2.5" />
                <line x1="902" y1="111" x2="1180" y2="111" stroke="#facc15" strokeWidth="2.5" />
                <line x1="20" y1="87" x2="412" y2="87" stroke="#facc15" strokeWidth="2" />
                <line x1="452" y1="87" x2="1010" y2="87" stroke="#facc15" strokeWidth="2" strokeDasharray="8 6" />
                <line x1="1050" y1="87" x2="1180" y2="87" stroke="#facc15" strokeWidth="2" />

                {/* Zebra Crossing #1 */}
                <g id="zebra-crossing-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <rect key={i} x="416" y={65 + i * 6.5} width="32" height="3.8" fill="#f8fafc" />
                  ))}
                </g>

                {/* Zebra Crossing #2 */}
                <g id="zebra-crossing-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <rect key={i} x="1014" y={65 + i * 6.5} width="32" height="3.8" fill="#f8fafc" />
                  ))}
                </g>
              </g>

              {/* 3. FLUSH / UNCONTROLLED PARALLEL PARKING BAYS (y = 112..132, x = 468..696) */}
              <g id="flush-parking-bays">
                <rect x="468" y="112" width="228" height="20" fill="#23272a" stroke="#facc15" strokeWidth="2" />
                <line x1="525" y1="112" x2="525" y2="132" stroke="#facc15" strokeWidth="2" />
                <line x1="582" y1="112" x2="582" y2="132" stroke="#facc15" strokeWidth="2" />
                <line x1="639" y1="112" x2="639" y2="132" stroke="#facc15" strokeWidth="2" />
                <text x="582" y="145" textAnchor="middle" fill="#bbf7d0" fontSize="9.5" fontWeight="700">
                  FLUSH / UNCONTROLLED PARKING (REVERSE IN, FORWARD OUT)
                </text>
              </g>

              {/* 4. VERTICAL TWO-WAY SIDE ACCESS ROAD (x = 336..390, y = 111..346) */}
              <g id="side-access-road">
                <rect x="336" y="110" width="54" height="238" fill="#23272a" />
                <line x1="336" y1="111" x2="336" y2="346" stroke="#facc15" strokeWidth="2.5" />
                <line x1="390" y1="111" x2="390" y2="195" stroke="#facc15" strokeWidth="2.5" />
                <line x1="390" y1="265" x2="390" y2="346" stroke="#facc15" strokeWidth="2.5" />
                <line x1="363" y1="114" x2="363" y2="342" stroke="#facc15" strokeWidth="1.8" strokeDasharray="6 6" />
              </g>

              {/* 5. CONTROLLED ANGLE PARKING ZONE (Upper Center Sector, x = 390..728, y = 160..304) */}
              <g id="controlled-angle-parking">
                <polygon
                  points="390,196 445,196 475,162 692,162 692,202 728,202 728,262 692,262 692,302 445,302 445,264 390,264"
                  fill="#23272a"
                  stroke="#facc15"
                  strokeWidth="2.2"
                  strokeDasharray="10 5"
                />
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <line
                    key={`top-bay-${i}`}
                    x1={455 + i * 34}
                    y1="202"
                    x2={485 + i * 34}
                    y2="163"
                    stroke="#facc15"
                    strokeWidth="2.2"
                  />
                ))}
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <line
                    key={`bot-bay-${i}`}
                    x1={450 + i * 34}
                    y1="301"
                    x2={482 + i * 34}
                    y2="262"
                    stroke="#facc15"
                    strokeWidth="2.2"
                  />
                ))}
                <line
                  x1="398"
                  y1="214"
                  x2="432"
                  y2="214"
                  stroke="#f8fafc"
                  strokeWidth="2.2"
                  markerEnd="url(#roadArrowWhite)"
                />
                <line
                  x1="432"
                  y1="246"
                  x2="398"
                  y2="246"
                  stroke="#f8fafc"
                  strokeWidth="2.2"
                  markerEnd="url(#roadArrowWhite)"
                />
                <line
                  x1="690"
                  y1="218"
                  x2="722"
                  y2="218"
                  stroke="#f8fafc"
                  strokeWidth="2.2"
                  markerEnd="url(#roadArrowWhite)"
                />
                <line
                  x1="722"
                  y1="246"
                  x2="690"
                  y2="246"
                  stroke="#f8fafc"
                  strokeWidth="2.2"
                  markerEnd="url(#roadArrowWhite)"
                />
                <text x="568" y="320" textAnchor="middle" fill="#bbf7d0" fontSize="9.5" fontWeight="700">
                  CONTROLLED ANGLE PARKING (SALOON CARS ONLY • PARK FORWARD, REVERSE OUT)
                </text>
              </g>

              {/* 6. MAJOR ROAD HORIZONTAL 8-LANE DUAL CARRIAGEWAY (y = 346..594) */}
              <g id="major-road">
                {/* Continuous Dark Asphalt Roadbed across entire dual carriageway */}
                <rect x="20" y="346" width="1160" height="248" fill="#23272a" />

                {/* Outer Yellow Curbs bordering tabletop green */}
                <line x1="20" y1="346" x2="336" y2="346" stroke="#facc15" strokeWidth="2.5" />
                <line x1="390" y1="346" x2="650" y2="346" stroke="#facc15" strokeWidth="2.5" />
                <line x1="980" y1="346" x2="1180" y2="346" stroke="#facc15" strokeWidth="2.5" />

                <line x1="20" y1="594" x2="650" y2="594" stroke="#facc15" strokeWidth="2.5" />
                <line x1="980" y1="594" x2="1180" y2="594" stroke="#facc15" strokeWidth="2.5" />

                {/* ============================================================== */}
                {/* AUTHENTIC NTSA / AA KENYA MODEL TOWN BOARD MEDIAN ISLANDS     */}
                {/* Symmetrical tapered island with yellow tips & solid medians    */}
                {/* ============================================================== */}

                {/* --- 1. FAR-WEST MEDIAN HEAD (Left of Turning Point at x = 50) --- */}
                <path
                  d="M 20 444 L 50 444 Q 36 470 50 496 L 20 496 Z"
                  fill="#156c36"
                />
                <path
                  d="M 50 444 Q 36 470 50 496"
                  stroke="#facc15"
                  strokeWidth="3.2"
                  fill="none"
                  strokeLinecap="round"
                />
                <line x1="20" y1="444" x2="50" y2="444" stroke="#facc15" strokeWidth="2.5" />
                <line x1="20" y1="496" x2="50" y2="496" stroke="#facc15" strokeWidth="2.5" />

                {/* --- 2. CENTRAL TAPERED TURNING POINT ISLAND (Image 1 & Authentic MTB) --- */}
                {/* Symmetrical spindle island: narrow neck -> wide body -> narrow neck */}
                <path
                  d="
                    M 385 470
                    A 4 4 0 0 1 385 474
                    L 345 474
                    C 310 474, 290 496, 260 496
                    L 175 496
                    C 145 496, 125 474, 90 474
                    L 85 474
                    A 4 4 0 0 1 85 466
                    L 90 466
                    C 125 466, 145 444, 175 444
                    L 260 444
                    C 290 444, 310 466, 345 466
                    L 385 466
                    A 4 4 0 0 1 385 470
                    Z
                  "
                  fill="#156c36"
                />
                {/* Yellow rounded end-caps at tips of tapered necks */}
                <path
                  d="M 381 466 L 385 466 A 4 4 0 0 1 385 474 L 381 474"
                  stroke="#facc15"
                  strokeWidth="2.8"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 89 466 L 85 466 A 4 4 0 0 0 85 474 L 89 474"
                  stroke="#facc15"
                  strokeWidth="2.8"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* --- 3. ROUNDABOUT APPROACH SOLID MEDIAN ISLAND (Right of Turning Point to Roundabout) --- */}
                {/* Removed artificial right-side U-turn! Solid green median all the way to Roundabout entrance (x = 648) */}
                <path
                  d="M 420 444 L 648 444 L 648 496 L 420 496 Q 434 470 420 444 Z"
                  fill="#156c36"
                />
                <path
                  d="M 420 444 Q 434 470 420 496"
                  stroke="#facc15"
                  strokeWidth="3.2"
                  fill="none"
                  strokeLinecap="round"
                />
                <line x1="420" y1="444" x2="648" y2="444" stroke="#facc15" strokeWidth="2.5" />
                <line x1="420" y1="496" x2="648" y2="496" stroke="#facc15" strokeWidth="2.5" />

                {/* --- 4. MAJOR EAST SOLID MEDIAN (From Roundabout x = 982 to 1180) --- */}
                <rect x="982" y="444" width="198" height="52" fill="#156c36" />
                <line x1="982" y1="444" x2="1180" y2="444" stroke="#facc15" strokeWidth="2.5" />
                <line x1="982" y1="496" x2="1180" y2="496" stroke="#facc15" strokeWidth="2.5" />

                {/* White Dashed (Broken) & Solid Approach Lane Lines */}
                {[370, 394, 418, 522, 546, 570].map((yPos) => (
                  <g key={`major-lane-${yPos}`}>
                    <line
                      x1="20"
                      y1={yPos}
                      x2="555"
                      y2={yPos}
                      stroke="#f8fafc"
                      strokeWidth="1.7"
                      strokeDasharray="7 7"
                    />
                    <line x1="555" y1={yPos} x2="648" y2={yPos} stroke="#f8fafc" strokeWidth="2" />
                    <line x1="982" y1={yPos} x2="1065" y2={yPos} stroke="#f8fafc" strokeWidth="2" />
                    <line
                      x1="1065"
                      y1={yPos}
                      x2="1180"
                      y2={yPos}
                      stroke="#f8fafc"
                      strokeWidth="1.7"
                      strokeDasharray="7 7"
                    />
                  </g>
                ))}

                {/* Painted Lane Numbers & Directional Arrows on Major West Approach (2-1-2-4 Rule) */}
                {/* Lane 1: Straight + Left Turn */}
                <g key="mw-arrow-1">
                  <text x="560" y="362" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">1</text>
                  <path d="M 574 358 L 608 358" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 602 354 L 611 358 L 602 362 Z" fill="#f8fafc" />
                  <path d="M 586 358 Q 598 358 600 351 L 600 349" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 596 353 L 600 347 L 604 353 Z" fill="#f8fafc" />
                </g>
                {/* Lane 2: Straight Only */}
                <g key="mw-arrow-2">
                  <text x="560" y="386" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">2</text>
                  <path d="M 574 382 L 608 382" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 602 378 L 611 382 L 602 386 Z" fill="#f8fafc" />
                </g>
                {/* Lane 3: Straight + Right Turn */}
                <g key="mw-arrow-3">
                  <text x="560" y="410" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">3</text>
                  <path d="M 574 406 L 608 406" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 602 402 L 611 406 L 602 410 Z" fill="#f8fafc" />
                  <path d="M 586 406 Q 598 406 600 413 L 600 415" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 596 411 L 600 417 L 604 411 Z" fill="#f8fafc" />
                </g>
                {/* Lane 4: Right Turn + U-Turn Loop */}
                <g key="mw-arrow-4">
                  <text x="560" y="434" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">4</text>
                  {/* Right Turn Branch */}
                  <path d="M 574 430 L 590 430 Q 600 430 600 436 L 600 438" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 596 433 L 600 440 L 604 433 Z" fill="#f8fafc" />
                  {/* U-Turn Loop */}
                  <path d="M 586 430 Q 594 430 594 425 Q 594 422 585 422 Q 575 422 575 427 Q 575 432 581 435" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <path d="M 578 436 L 583 435 L 581 431 Z" fill="#f8fafc" />
                </g>

                {/* Painted Lane Numbers & Directional Arrows on Major East Approach */}
                {/* Lane 1: Straight + Left Turn */}
                <g key="me-arrow-1">
                  <text x="1056" y="586" textAnchor="end" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">1</text>
                  <path d="M 1042 582 L 1008 582" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 1014 578 L 1005 582 L 1014 586 Z" fill="#f8fafc" />
                  <path d="M 1030 582 Q 1018 582 1016 589 L 1016 591" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 1012 587 L 1016 593 L 1020 587 Z" fill="#f8fafc" />
                </g>
                {/* Lane 2: Straight Only */}
                <g key="me-arrow-2">
                  <text x="1056" y="562" textAnchor="end" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">2</text>
                  <path d="M 1042 558 L 1008 558" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 1014 554 L 1005 558 L 1014 562 Z" fill="#f8fafc" />
                </g>
                {/* Lane 3: Straight + Right Turn */}
                <g key="me-arrow-3">
                  <text x="1056" y="538" textAnchor="end" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">3</text>
                  <path d="M 1042 534 L 1008 534" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 1014 530 L 1005 534 L 1014 538 Z" fill="#f8fafc" />
                  <path d="M 1030 534 Q 1018 534 1016 527 L 1016 525" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 1012 529 L 1016 523 L 1020 529 Z" fill="#f8fafc" />
                </g>
                {/* Lane 4: Right Turn + U-Turn Loop */}
                <g key="me-arrow-4">
                  <text x="1056" y="514" textAnchor="end" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">4</text>
                  <path d="M 1042 510 L 1026 510 Q 1016 510 1016 504 L 1016 502" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 1012 506 L 1016 500 L 1020 506 Z" fill="#f8fafc" />
                  <path d="M 1030 510 Q 1022 510 1022 515.5 Q 1022 518.5 1030 518.5 Q 1040 518.5 1040 513 Q 1040 508 1034 505" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <path d="M 1037 504 L 1032 505 L 1034 509 Z" fill="#f8fafc" />
                </g>
              </g>

              {/* 7. MINOR ROAD VERTICAL 6-LANE DUAL CARRIAGEWAY (x = 731..899) */}
              <g id="minor-road">
                <rect x="731" y="111" width="168" height="205" fill="#23272a" />
                <rect x="731" y="625" width="168" height="180" fill="#23272a" />

                <line x1="731" y1="111" x2="731" y2="202" stroke="#facc15" strokeWidth="2.5" />
                <line x1="731" y1="262" x2="731" y2="310" stroke="#facc15" strokeWidth="2.5" />
                <line x1="899" y1="111" x2="899" y2="310" stroke="#facc15" strokeWidth="2.5" />

                <line x1="731" y1="630" x2="731" y2="805" stroke="#facc15" strokeWidth="2.5" />
                <line x1="899" y1="630" x2="899" y2="805" stroke="#facc15" strokeWidth="2.5" />

                {/* Central Double Yellow Divider with Minor South Median Gap M1 (y = 736..768) */}
                <rect x="807" y="114" width="16" height="196" fill="#156c36" stroke="#facc15" strokeWidth="2" />
                <rect x="807" y="630" width="16" height="106" fill="#156c36" stroke="#facc15" strokeWidth="2" />
                <rect x="807" y="768" width="16" height="37" fill="#156c36" stroke="#facc15" strokeWidth="2" />

                {[755, 779, 851, 875].map((xPos) => (
                  <g key={`minor-lane-${xPos}`}>
                    <line x1={xPos} y1="114" x2={xPos} y2="235" stroke="#f8fafc" strokeWidth="1.7" strokeDasharray="7 7" />
                    <line x1={xPos} y1="235" x2={xPos} y2="310" stroke="#f8fafc" strokeWidth="2" />
                    <line x1={xPos} y1="630" x2={xPos} y2="705" stroke="#f8fafc" strokeWidth="2" />
                    <line x1={xPos} y1="705" x2={xPos} y2="805" stroke="#f8fafc" strokeWidth="1.7" strokeDasharray="7 7" />
                  </g>
                ))}

                {/* Minor South Approach Arrows */
                /* Lane 1: Straight + Left Turn */}
                <g key="ms-arrow-1">
                  <text x="743" y="704" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">1</text>
                  <path d="M 743 690 L 743 656" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 739 663 L 743 654 L 747 663 Z" fill="#f8fafc" />
                  <path d="M 743 676 Q 743 664 736 662 L 734 662" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 738 658 L 732 662 L 738 666 Z" fill="#f8fafc" />
                </g>
                {/* Lane 2: Straight Only */}
                <g key="ms-arrow-2">
                  <text x="767" y="704" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">2</text>
                  <path d="M 767 690 L 767 656" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 763 663 L 767 654 L 771 663 Z" fill="#f8fafc" />
                </g>
                {/* Lane 3: Straight + Right Turn */}
                <g key="ms-arrow-3">
                  <text x="791" y="704" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">3</text>
                  <path d="M 791 690 L 791 656" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 787 663 L 791 654 L 795 663 Z" fill="#f8fafc" />
                  <path d="M 791 676 Q 791 664 798 662 L 800 662" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 796 658 L 802 662 L 796 666 Z" fill="#f8fafc" />
                </g>

                {/* Minor North Approach Arrows */}
                {/* Lane 1: Straight + Left Turn */}
                <g key="mn-arrow-1">
                  <text x="887" y="244" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">1</text>
                  <path d="M 887 256 L 887 290" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 883 283 L 887 292 L 891 283 Z" fill="#f8fafc" />
                  <path d="M 887 270 Q 887 282 894 284 L 896 284" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 892 280 L 898 284 L 892 288 Z" fill="#f8fafc" />
                </g>
                {/* Lane 2: Straight Only */}
                <g key="mn-arrow-2">
                  <text x="863" y="244" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">2</text>
                  <path d="M 863 256 L 863 290" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 859 283 L 863 292 L 867 283 Z" fill="#f8fafc" />
                </g>
                {/* Lane 3: Straight + Right Turn */}
                <g key="mn-arrow-3">
                  <text x="839" y="244" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="900" fontFamily="sans-serif">3</text>
                  <path d="M 839 256 L 839 290" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 835 283 L 839 292 L 843 283 Z" fill="#f8fafc" />
                  <path d="M 839 270 Q 839 282 832 284 L 830 284" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M 834 280 L 828 284 L 834 288 Z" fill="#f8fafc" />
                </g>
              </g>

              {/* 8. CENTRAL 4-LANE CONCENTRIC ROUNDABOUT (cx = 815, cy = 470) */}
              <g id="central-roundabout">
                <circle cx={RA_CX} cy={RA_CY} r="180" fill="#23272a" stroke="#facc15" strokeWidth="2.5" />
                <circle
                  cx={RA_CX}
                  cy={RA_CY}
                  r="154"
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="2"
                  strokeDasharray="8 7"
                />
                <circle
                  cx={RA_CX}
                  cy={RA_CY}
                  r="130"
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="2"
                  strokeDasharray="8 7"
                />
                <circle
                  cx={RA_CX}
                  cy={RA_CY}
                  r="106"
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="2"
                  strokeDasharray="8 7"
                />
                <circle cx={RA_CX} cy={RA_CY} r="80" fill="#f8fafc" stroke="#23272a" strokeWidth="3" />
                <circle
                  cx={RA_CX}
                  cy={RA_CY}
                  r="66"
                  fill="none"
                  stroke="#23272a"
                  strokeWidth="6"
                  strokeDasharray="14 6"
                />
                <circle cx={RA_CX} cy={RA_CY} r="46" fill="#15803d" stroke="#facc15" strokeWidth="3.5" />

                {[0, 90, 180, 270].map((deg) => {
                  const p = polarToCartesian(RA_CX, RA_CY, 56, deg);
                  return (
                    <text
                      key={`cw-${deg}`}
                      x={p.x}
                      y={p.y + 3}
                      textAnchor="middle"
                      fill="#bbf7d0"
                      fontSize="8"
                      fontWeight="900"
                    >
                      CW
                    </text>
                  );
                })}
              </g>

              {/* 9. VIRTUAL TOY CAR TRAY IN BOTTOM-LEFT */}
              <g id="toy-car-tray" transform="translate(26, 725)">
                <rect
                  x="0"
                  y="0"
                  width="285"
                  height="72"
                  rx="10"
                  fill="#0f172a"
                  fillOpacity="0.82"
                  stroke="#facc15"
                  strokeWidth="1.5"
                />
                <text x="14" y="18" fill="#fde047" fontSize="10" fontWeight="800" letterSpacing="0.8">
                  INSTRUCTOR TOY CAR TRAY (SELECT COLOR)
                </text>
                {[
                  { color: '#ef4444', name: 'Red', x: 28 },
                  { color: '#3b82f6', name: 'Blue', x: 72 },
                  { color: '#eab308', name: 'Yellow', x: 116 },
                  { color: '#f97316', name: 'Orange', x: 160 },
                  { color: '#22c55e', name: 'Green', x: 204 },
                  { color: '#f8fafc', name: 'White', x: 248 }
                ].map((c) => (
                  <g
                    key={c.name}
                    transform={`translate(${c.x}, 44)`}
                    className="cursor-pointer"
                    onClick={() => {
                      setCarColor(c.color);
                      playClick(740);
                    }}
                  >
                    <rect
                      x="-15"
                      y="-11"
                      width="30"
                      height="22"
                      rx="5"
                      fill={c.color}
                      stroke={carColor === c.color ? '#38bdf8' : '#1e293b'}
                      strokeWidth={carColor === c.color ? '3' : '1.5'}
                    />
                    <rect x="-7" y="-8" width="14" height="16" rx="2" fill="#0f172a" fillOpacity="0.65" />
                  </g>
                ))}
              </g>

              {/* 10. PARKED REFERENCE TOY CARS ("Move Car X Behind Car Y") */}
              {mode === 'challenges' &&
                currentChallenge.parkedCars.map((pc) => (
                  <g key={pc.id} transform={`translate(${pc.x}, ${pc.y})`}>
                    <g transform={`rotate(${pc.angle})`} filter="url(#carShadow)">
                      <rect
                        x="-11"
                        y="-20"
                        width="22"
                        height="40"
                        rx="5.5"
                        fill={pc.color}
                        stroke="#0f172a"
                        strokeWidth="1.8"
                      />
                      <rect x="-8" y="-10" width="16" height="19" rx="3" fill="#0f172a" />
                      <rect x="-6.5" y="-4" width="13" height="9" rx="2" fill={pc.color} fillOpacity="0.85" />
                      <rect x="-9" y="-20" width="5" height="2.8" rx="1" fill="#fef08a" />
                      <rect x="4" y="-20" width="5" height="2.8" rx="1" fill="#fef08a" />
                      <rect x="-9" y="17.5" width="5" height="2.8" rx="1" fill="#dc2626" />
                      <rect x="4" y="17.5" width="5" height="2.8" rx="1" fill="#dc2626" />
                    </g>
                    {/* Floating Car Label Tag */}
                    <g transform="translate(0, -28)">
                      <rect
                        x="-36"
                        y="-12"
                        width="72"
                        height="14"
                        rx="4"
                        fill="#0f172a"
                        stroke={pc.color}
                        strokeWidth="1.4"
                      />
                      <text
                        x="0"
                        y="-2.5"
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="8.5"
                        fontWeight="900"
                      >
                        {pc.label}
                      </text>
                    </g>
                  </g>
                ))}

              {/* 11A. SOLUTION GUIDE VISUAL OVERLAY PATH (GOLD GLOWING PATH WHEN GUIDE IS ON) */}
              {showSolutionGuide && officialSolutionPath && officialSolutionPath.length > 1 && (
                <g id="solution-guide-overlay">
                  {officialSolutionPath.map((nodeId, idx) => {
                    if (idx === officialSolutionPath.length - 1) return null;
                    const u = BOARD_NODES[nodeId];
                    const v = BOARD_NODES[officialSolutionPath[idx + 1]];
                    if (!u || !v) return null;

                    let dPath = `M ${u.x} ${u.y} L ${v.x} ${v.y}`;
                    if (u.zone === 'roundabout' && v.zone === 'roundabout' && u.ring === v.ring) {
                      const r = RING_RADII[u.ring];
                      dPath = `M ${u.x} ${u.y} A ${r} ${r} 0 0 1 ${v.x} ${v.y}`;
                    }

                    return (
                      <g key={`sol-seg-${idx}-${nodeId}-${officialSolutionPath[idx + 1]}`}>
                        <path
                          d={dPath}
                          fill="none"
                          stroke="#facc15"
                          strokeWidth="9"
                          strokeLinecap="round"
                          strokeOpacity="0.28"
                        />
                        <path
                          d={dPath}
                          fill="none"
                          stroke="#facc15"
                          strokeWidth="3.5"
                          strokeDasharray="8 5"
                          strokeLinecap="round"
                          markerEnd="url(#solutionArrowGold)"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 11B. PLAYER PLOTTED ROUTE GLOWING LINE & SEGMENTS */}
              {plottedPath.length > 1 && (
                <g id="plotted-route-overlay">
                  {plottedPath.map((nodeId, idx) => {
                    if (idx === plottedPath.length - 1) return null;
                    const u = BOARD_NODES[nodeId];
                    const v = BOARD_NODES[plottedPath[idx + 1]];
                    if (!u || !v) return null;

                    let dPath = `M ${u.x} ${u.y} L ${v.x} ${v.y}`;
                    if (u.zone === 'roundabout' && v.zone === 'roundabout' && u.ring === v.ring) {
                      const r = RING_RADII[u.ring];
                      dPath = `M ${u.x} ${u.y} A ${r} ${r} 0 0 1 ${v.x} ${v.y}`;
                    }

                    return (
                      <g key={`seg-${idx}-${nodeId}-${plottedPath[idx + 1]}`}>
                        <path
                          d={dPath}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="7"
                          strokeLinecap="round"
                          strokeOpacity="0.3"
                        />
                        <path
                          d={dPath}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="3.2"
                          strokeDasharray="6 4"
                          strokeLinecap="round"
                          markerEnd="url(#routeArrowCyan)"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 12. INTERACTIVE GRAPH WAYPOINT NODES & CLOSED-LANE BARRIERS */}
              {Object.values(BOARD_NODES).map((node) => {
                const isStart = node.id === startNodeId;
                const isTarget = node.id === targetNodeId;
                const isBlocked = blockedNodes.includes(node.id);
                const stepIndex = plottedPath.indexOf(node.id);
                const isInPath = stepIndex !== -1;
                const solIndex = showSolutionGuide ? officialSolutionPath.indexOf(node.id) : -1;
                const isInSolution = solIndex !== -1;
                const isValidNext = validNextNodeIds.includes(node.id) && !isBlocked;
                const isInspected = showRuleInspector && inspectedNodeId === node.id;

                // Never render GAP_W1 or GAP_E1 waypoints/barriers across the solid medians
                if (node.id === 'GAP_W1' || node.id === 'GAP_E1') {
                  return null;
                }

                if (
                  !showWaypoints &&
                  !isStart &&
                  !isTarget &&
                  !isBlocked &&
                  !isInPath &&
                  !isInSolution &&
                  !isValidNext &&
                  !isInspected
                ) {
                  return null;
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => handleNodeClick(node.id)}
                    className="cursor-pointer group"
                  >
                    {/* Pulse Ring for Target or Valid Next Waypoints */}
                    {isTarget && (
                      <circle
                        r="16"
                        fill="#facc15"
                        fillOpacity="0.28"
                        stroke="#facc15"
                        strokeWidth="2.2"
                        strokeDasharray="4 2"
                      />
                    )}
                    {isValidNext && !showRuleInspector && (
                      <circle
                        r="13"
                        fill="#4ade80"
                        fillOpacity="0.32"
                        stroke="#4ade80"
                        strokeWidth="1.8"
                      />
                    )}
                    {isInspected && (
                      <circle r="15" fill="#38bdf8" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="2.5" />
                    )}

                    {/* Main Node Dot */}
                    <circle
                      r={isStart || isTarget ? 8.5 : isValidNext || isInPath || isInSolution ? 7.5 : 5}
                      fill={
                        isBlocked
                          ? '#ef4444'
                          : isTarget
                          ? '#facc15'
                          : isStart
                          ? '#22c55e'
                          : isInPath
                          ? '#0ea5e9'
                          : isInSolution
                          ? '#eab308'
                          : isValidNext
                          ? '#4ade80'
                          : '#94a3b8'
                      }
                      fillOpacity={
                        isValidNext || isInPath || isInSolution || isStart || isTarget || isBlocked
                          ? 0.95
                          : 0.45
                      }
                      stroke="#0f172a"
                      strokeWidth="1.8"
                    />

                    {/* Realistic Striped Roadblock Barrier & "CLOSED" Sign if Blocked */}
                    {isBlocked && (
                      <g transform="translate(0, 0)">
                        <rect
                          x="-18"
                          y="-7"
                          width="36"
                          height="14"
                          rx="3"
                          fill="#dc2626"
                          stroke="#ffffff"
                          strokeWidth="1.6"
                        />
                        <line x1="-12" y1="-6" x2="-6" y2="6" stroke="#ffffff" strokeWidth="2.2" />
                        <line x1="8" y1="-6" x2="14" y2="6" stroke="#ffffff" strokeWidth="2.2" />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="7"
                          fontWeight="900"
                        >
                          CLOSED
                        </text>
                      </g>
                    )}

                    {/* Target Flag Badge */}
                    {isTarget && !isBlocked && (
                      <g transform="translate(0, -16)">
                        <rect
                          x="-34"
                          y="-14"
                          width="68"
                          height="15"
                          rx="4"
                          fill="#facc15"
                          stroke="#0f172a"
                          strokeWidth="1.4"
                        />
                        <text
                          x="0"
                          y="-3.5"
                          textAnchor="middle"
                          fill="#0f172a"
                          fontSize="8.2"
                          fontWeight="900"
                        >
                          PARK HERE
                        </text>
                      </g>
                    )}

                    {/* Step Number inside Plotted Path or Solution Path */}
                    {(isInPath || isInSolution) && !isStart && !isBlocked && (
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill={isInPath ? '#ffffff' : '#0f172a'}
                        fontSize="8.5"
                        fontWeight="900"
                        pointerEvents="none"
                      >
                        {isInPath ? stepIndex : solIndex}
                      </text>
                    )}

                    {/* Hover Tooltip Label */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <rect
                        x="-75"
                        y="-29"
                        width="150"
                        height="17"
                        rx="4"
                        fill="#0f172a"
                        stroke="#475569"
                        strokeWidth="1"
                      />
                      <text x="0" y="-17.5" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="700">
                        {node.label}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* 12B. MAGNETIC ATTRACTOR BEAMS & GUIDANCE HALOS WHILE DRAGGING THE CAR */}
              {isDragging && (
                <g id="drag-magnetic-attractors" pointerEvents="none">
                  {/* Attractor beams to valid forward waypoints */}
                  {validNextNodeIds.map((nextId) => {
                    if (blockedNodes.includes(nextId)) return null;
                    const node = BOARD_NODES[nextId];
                    if (!node) return null;
                    const isTarget = nextId === targetNodeId;
                    return (
                      <g key={`attractor-${nextId}`}>
                        <line
                          x1={activeCarX}
                          y1={activeCarY}
                          x2={node.x}
                          y2={node.y}
                          stroke={isTarget ? '#facc15' : '#4ade80'}
                          strokeWidth="2.8"
                          strokeDasharray="6 4"
                          strokeOpacity="0.85"
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="18"
                          fill={isTarget ? '#facc15' : '#4ade80'}
                          fillOpacity="0.28"
                          stroke={isTarget ? '#facc15' : '#4ade80'}
                          strokeWidth="2.2"
                        />
                        <g transform={`translate(${node.x}, ${node.y - 20})`}>
                          <rect
                            x="-24"
                            y="-7"
                            width="48"
                            height="14"
                            rx="3"
                            fill="#0f172a"
                            fillOpacity="0.9"
                            stroke={isTarget ? '#facc15' : '#4ade80'}
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fill={isTarget ? '#facc15' : '#4ade80'}
                            fontSize="7"
                            fontWeight="900"
                          >
                            {isTarget ? 'TARGET' : 'SNAP'}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Attractor beam to previous waypoint for smooth undo */}
                  {plottedPath.length >= 2 && (() => {
                    const prevId = plottedPath[plottedPath.length - 2];
                    const prevNode = BOARD_NODES[prevId];
                    if (!prevNode) return null;
                    return (
                      <g key="attractor-undo">
                        <line
                          x1={activeCarX}
                          y1={activeCarY}
                          x2={prevNode.x}
                          y2={prevNode.y}
                          stroke="#f59e0b"
                          strokeWidth="2.2"
                          strokeDasharray="5 3"
                          strokeOpacity="0.75"
                        />
                        <circle
                          cx={prevNode.x}
                          cy={prevNode.y}
                          r="16"
                          fill="#f59e0b"
                          fillOpacity="0.25"
                          stroke="#f59e0b"
                          strokeWidth="1.8"
                        />
                        <g transform={`translate(${prevNode.x}, ${prevNode.y + 22})`}>
                          <rect
                            x="-22"
                            y="-6"
                            width="44"
                            height="13"
                            rx="3"
                            fill="#0f172a"
                            fillOpacity="0.9"
                            stroke="#f59e0b"
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fill="#f59e0b"
                            fontSize="6.5"
                            fontWeight="900"
                          >
                            UNDO
                          </text>
                        </g>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* 13. ACTIVE PLAYER 3D-STYLED TOY CAR (WITH DRAG-TO-STEER INTERACTION) */}
              <g
                id="player-active-car"
                transform={`translate(${activeCarX}, ${activeCarY}) scale(${isDragging ? 1.15 : 1})`}
                onPointerDown={handleCarPointerDown}
                style={{
                  pointerEvents: isDriving ? 'none' : 'auto',
                  cursor: isDriving ? 'default' : isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none'
                }}
                className="select-none transition-transform duration-75"
              >
                {/* Tactile Lift / Drag Ring beneath car when grabbed */}
                {isDragging && (
                  <circle
                    r="28"
                    fill="#4ade80"
                    fillOpacity="0.18"
                    stroke="#4ade80"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />
                )}

                <g transform={`rotate(${activeCarAngle})`} filter="url(#carShadow)">
                  {/* Headlight Beams */}
                  <polygon
                    points="-8,-20 -16,-44 -2,-44"
                    fill="#fef08a"
                    fillOpacity={isDriving ? '0.35' : '0.15'}
                  />
                  <polygon
                    points="8,-20 2,-44 16,-44"
                    fill="#fef08a"
                    fillOpacity={isDriving ? '0.35' : '0.15'}
                  />

                  {vehicleType === 'lorry' ? (
                    <g>
                      <rect
                        x="-12"
                        y="-24"
                        width="24"
                        height="48"
                        rx="4"
                        fill="#f8fafc"
                        stroke="#0f172a"
                        strokeWidth="1.8"
                      />
                      <rect
                        x="-11"
                        y="-23"
                        width="22"
                        height="14"
                        rx="3"
                        fill={carColor}
                        stroke="#0f172a"
                        strokeWidth="1.2"
                      />
                      <rect x="-9" y="-19" width="18" height="6" rx="1.5" fill="#1e293b" />
                      <text
                        x="0"
                        y="6"
                        textAnchor="middle"
                        fill="#1e293b"
                        fontSize="7"
                        fontWeight="900"
                        transform="rotate(90)"
                      >
                        LORRY
                      </text>
                    </g>
                  ) : (
                    <g>
                      <rect
                        x="-11"
                        y="-20"
                        width="22"
                        height="40"
                        rx="6"
                        fill={carColor}
                        stroke="#0f172a"
                        strokeWidth="1.8"
                      />
                      <rect x="-8" y="-10" width="16" height="19" rx="3" fill="#0f172a" />
                      <rect x="-6.5" y="-4" width="13" height="9" rx="2" fill={carColor} fillOpacity="0.85" />
                      <rect x="-13.5" y="-9" width="2.5" height="5" rx="1" fill={carColor} />
                      <rect x="11" y="-9" width="2.5" height="5" rx="1" fill={carColor} />
                    </g>
                  )}

                  {/* Front Headlights */}
                  <rect x="-9" y="-20" width="5" height="2.8" rx="1" fill="#fef08a" />
                  <rect x="4" y="-20" width="5" height="2.8" rx="1" fill="#fef08a" />

                  {/* Rear Brake / White Reverse Lights */}
                  <rect
                    x="-9"
                    y="17.5"
                    width="5"
                    height="2.8"
                    rx="1"
                    fill={carPose.isReverse ? '#ffffff' : '#ef4444'}
                  />
                  <rect
                    x="4"
                    y="17.5"
                    width="5"
                    height="2.8"
                    rx="1"
                    fill={carPose.isReverse ? '#ffffff' : '#ef4444'}
                  />

                  {/* Flashing Left Indicator Blinker */}
                  {carPose.turn === 'left' && (
                    <g className="animate-ping">
                      <circle cx="-11" cy="-18" r="4.5" fill="#f59e0b" />
                      <circle cx="-11" cy="18" r="4.5" fill="#f59e0b" />
                    </g>
                  )}

                  {/* Flashing Right Indicator Blinker */}
                  {carPose.turn === 'right' && (
                    <g className="animate-ping">
                      <circle cx="11" cy="-18" r="4.5" fill="#f59e0b" />
                      <circle cx="11" cy="18" r="4.5" fill="#f59e0b" />
                    </g>
                  )}
                </g>

                {/* Floating Active Car Badge */}
                {!isDriving && (
                  <g transform="translate(0, 29)">
                    <rect
                      x="-44"
                      y="-8"
                      width="88"
                      height="15"
                      rx="4"
                      fill="#0f172a"
                      fillOpacity="0.95"
                      stroke={isDragging ? '#38bdf8' : '#4ade80'}
                      strokeWidth="1.4"
                    />
                    <text
                      x="0"
                      y="2.5"
                      textAnchor="middle"
                      fill={isDragging ? '#38bdf8' : '#4ade80'}
                      fontSize="7.5"
                      fontWeight="900"
                      letterSpacing="0.4"
                    >
                      {isDragging
                        ? 'STEER CAR • SNAP'
                        : mode === 'challenges'
                        ? `${currentChallenge.carLabel} • DRAG ME`
                        : 'YOUR CAR • DRAG ME'}
                    </text>
                  </g>
                )}
              </g>

              {/* 14. INSTRUCTOR WHITE POINTER STICK */}
              {lastPlottedNodeId && BOARD_NODES[lastPlottedNodeId] && !isDriving && !isDragging && (
                <g
                  transform={`translate(${BOARD_NODES[lastPlottedNodeId].x}, ${BOARD_NODES[lastPlottedNodeId].y})`}
                  style={{ pointerEvents: 'none' }}
                >
                  <line
                    x1="4"
                    y1="4"
                    x2="78"
                    y2="68"
                    stroke="#000000"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeOpacity="0.35"
                  />
                  <line
                    x1="2"
                    y1="2"
                    x2="75"
                    y2="65"
                    stroke="#f8fafc"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <circle cx="2" cy="2" r="3" fill="#ef4444" />
                </g>
              )}
            </svg>

            {/* Floating Legend Badge on Bottom-Right of Board */}
            <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 text-[11px] text-slate-300 flex flex-wrap items-center gap-3 shadow-lg pointer-events-none">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                Next Valid Move
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                Your Route
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Target / Solution Guide
              </span>
              <span className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black">
                  CLOSED
                </span>
                Blocked Lane
              </span>
            </div>
          </div>
  );
}
