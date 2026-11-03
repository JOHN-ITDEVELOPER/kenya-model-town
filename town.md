import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Info,
  Volume2,
  VolumeX,
  Compass,
  Navigation,
  Car,
  Truck,
  Cone,
  HelpCircle,
  Award,
  Eye,
  EyeOff,
  ChevronRight,
  AlertTriangle,
  Flag,
  MousePointer,
  BookOpen,
  Footprints,
  Ban,
  Check
} from 'lucide-react';

/**
 * ============================================================================
 * KENYAN MODEL TOWN BOARD (NTSA / AA MOBILITY) RULES & GRAPH ENGINE
 * ============================================================================
 * Authentic 2D simulation of the physical Kenyan driving school tabletop board.
 * Coordinate Space: SVG viewBox="0 0 1200 820"
 * Keep-Left Traffic Rule: Vehicles drive on the LEFT side of all roads and
 * circulate CLOCKWISE around the 4-lane central roundabout.
 *
 * THE 3 GOLDEN RULES OF THE KENYAN MODEL TOWN BOARD:
 * - Rule 1: Use the shortest and most correct route without using parking.
 * - Rule 2: Use the longest and most correct route without using parking (when shortest is closed).
 * - Rule 3: Use parking as the last resort (only when all open road routes are closed).
 */

// Roundabout Center & Concentric Ring Radii
const RA_CX = 815;
const RA_CY = 470;
const RING_RADII = {
  1: 166, // Lane 1: Outermost ring
  2: 142, // Lane 2: 2nd outer ring
  3: 118, // Lane 3: 2nd inner ring
  4: 94   // Lane 4: Innermost ring next to central island
};

// Helper to compute coordinates on roundabout rings (0 deg = North, 90 deg = East, Clockwise)
const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: Math.round(cx + r * Math.cos(rad)),
    y: Math.round(cy + r * Math.sin(rad))
  };
};

/**
 * Complete Directed Graph Nodes representing every lane entry, roundabout quadrant,
 * median U-turn gap, controlled angle parking bay, flush parking bay, and exit.
 */
const BOARD_NODES = {
  // --- MAJOR ROAD WEST: EASTBOUND (Approaching Roundabout, Top 4 Lanes) ---
  MW_SPAWN: {
    id: 'MW_SPAWN', x: 36, y: 394, label: 'Major Rd West (Start)',
    zone: 'major_west', road: 'Major Road West',
    ruleInfo: 'Starting point on Major Road West (4 lanes approaching roundabout). Pick Lane 1, 2, 3, or 4 depending on your destination.'
  },
  MW_E_L1_START: {
    id: 'MW_E_L1_START', x: 115, y: 358, label: 'Major West L1 (Start)',
    zone: 'major_west', lane: 1, road: 'Major Road West (Lane 1)',
    ruleInfo: 'Major Road Lane 1 (Outermost Left): Allowed 90° Left (1st exit) or 0° Straight (2nd exit) via Roundabout Lane 1.'
  },
  MW_E_L2_START: {
    id: 'MW_E_L2_START', x: 115, y: 382, label: 'Major West L2 (Start)',
    zone: 'major_west', lane: 2, road: 'Major Road West (Lane 2)',
    ruleInfo: 'Major Road Lane 2: Allowed 0° Straight ONLY (2nd exit) via Roundabout Lane 2.'
  },
  MW_E_L3_START: {
    id: 'MW_E_L3_START', x: 115, y: 406, label: 'Major West L3 (Start)',
    zone: 'major_west', lane: 3, road: 'Major Road West (Lane 3)',
    ruleInfo: 'Major Road Lane 3: Allowed 0° Straight (2nd exit) or 90° Right (3rd exit) via Roundabout Lane 3.'
  },
  MW_E_L4_START: {
    id: 'MW_E_L4_START', x: 115, y: 430, label: 'Major West L4 (Start)',
    zone: 'major_west', lane: 4, road: 'Major Road West (Lane 4)',
    ruleInfo: 'Major Road Lane 4 (Innermost Right): Allowed 90° Right (3rd exit), 180° U-Turn (4th exit), or 270° Left (5th exit) via Roundabout Lane 4.'
  },

  MW_E_L1_MID: {
    id: 'MW_E_L1_MID', x: 364, y: 358, label: 'Major West L1 (Side Jct)',
    zone: 'major_west', lane: 1, road: 'Major Road West (Lane 1)',
    ruleInfo: 'Major Road Lane 1 at Side Road Junction: Can turn 90° Left into Side Access Road or continue to Roundabout Lane 1.'
  },
  MW_E_L2_MID: {
    id: 'MW_E_L2_MID', x: 364, y: 382, label: 'Major West L2 (Mid)',
    zone: 'major_west', lane: 2, road: 'Major Road West (Lane 2)',
    ruleInfo: 'Major Road Lane 2: Proceed straight towards Roundabout Lane 2. No lane changing across solid lines.'
  },
  MW_E_L3_MID: {
    id: 'MW_E_L3_MID', x: 364, y: 406, label: 'Major West L3 (Mid)',
    zone: 'major_west', lane: 3, road: 'Major Road West (Lane 3)',
    ruleInfo: 'Major Road Lane 3: Proceed towards Roundabout Lane 3 for 0° Straight or 90° Right.'
  },
  MW_E_L4_MID: {
    id: 'MW_E_L4_MID', x: 364, y: 430, label: 'Major West L4 (Mid)',
    zone: 'major_west', lane: 4, road: 'Major Road West (Lane 4)',
    ruleInfo: 'Major Road Lane 4: Can use Median Gap W1 for an early U-turn or proceed to Roundabout Lane 4.'
  },

  MW_E_L1_ENTRY: {
    id: 'MW_E_L1_ENTRY', x: 615, y: 358, label: 'Major West L1 Entry',
    zone: 'major_west_entry', approach: 'MW', lane: 1, road: 'Major West Roundabout Entry L1',
    ruleInfo: 'Roundabout Entry (Major West Lane 1): Enter Roundabout Ring 1 ONLY. Go 90° Left (1st exit) or 0° Straight (2nd exit).'
  },
  MW_E_L2_ENTRY: {
    id: 'MW_E_L2_ENTRY', x: 615, y: 382, label: 'Major West L2 Entry',
    zone: 'major_west_entry', approach: 'MW', lane: 2, road: 'Major West Roundabout Entry L2',
    ruleInfo: 'Roundabout Entry (Major West Lane 2): Enter Roundabout Ring 2 ONLY. Go 0° Straight (2nd exit) ONLY.'
  },
  MW_E_L3_ENTRY: {
    id: 'MW_E_L3_ENTRY', x: 615, y: 406, label: 'Major West L3 Entry',
    zone: 'major_west_entry', approach: 'MW', lane: 3, road: 'Major West Roundabout Entry L3',
    ruleInfo: 'Roundabout Entry (Major West Lane 3): Enter Roundabout Ring 3 ONLY. Go 0° Straight (2nd exit) or 90° Right (3rd exit).'
  },
  MW_E_L4_ENTRY: {
    id: 'MW_E_L4_ENTRY', x: 615, y: 430, label: 'Major West L4 Entry',
    zone: 'major_west_entry', approach: 'MW', lane: 4, road: 'Major West Roundabout Entry L4',
    ruleInfo: 'Roundabout Entry (Major West Lane 4): Enter Roundabout Ring 4 ONLY. Go 90° Right (3rd), 180° U-Turn (4th), or 270° (5th).'
  },

  // --- MAJOR ROAD WEST: WESTBOUND (Exiting Roundabout, Bottom 4 Lanes) ---
  MW_W_L4_EXIT: {
    id: 'MW_W_L4_EXIT', x: 615, y: 510, label: 'Major West Exit L4',
    zone: 'major_west_exit', exitRoad: 'MW', lane: 4, road: 'Major Road Westbound (Lane 4)',
    ruleInfo: 'Major Road Westbound Innermost Lane 4: Receives traffic from Roundabout Ring 4.'
  },
  MW_W_L3_EXIT: {
    id: 'MW_W_L3_EXIT', x: 615, y: 534, label: 'Major West Exit L3',
    zone: 'major_west_exit', exitRoad: 'MW', lane: 3, road: 'Major Road Westbound (Lane 3)',
    ruleInfo: 'Major Road Westbound Lane 3: Receives traffic from Roundabout Ring 3.'
  },
  MW_W_L2_EXIT: {
    id: 'MW_W_L2_EXIT', x: 615, y: 558, label: 'Major West Exit L2',
    zone: 'major_west_exit', exitRoad: 'MW', lane: 2, road: 'Major Road Westbound (Lane 2)',
    ruleInfo: 'Major Road Westbound Lane 2: Receives traffic from Roundabout Ring 2.'
  },
  MW_W_L1_EXIT: {
    id: 'MW_W_L1_EXIT', x: 615, y: 582, label: 'Major West Exit L1',
    zone: 'major_west_exit', exitRoad: 'MW', lane: 1, road: 'Major Road Westbound (Lane 1)',
    ruleInfo: 'Major Road Westbound Outermost Lane 1: Receives traffic from Roundabout Ring 1.'
  },

  MW_W_L4_MID: {
    id: 'MW_W_L4_MID', x: 364, y: 510, label: 'Major Westbound L4 (Mid)',
    zone: 'major_west', lane: 4, road: 'Major Road Westbound (Lane 4)',
    ruleInfo: 'Westbound Innermost Lane 4 (Target spot behind the Green Car in Challenge 3).'
  },
  MW_W_L3_MID: {
    id: 'MW_W_L3_MID', x: 364, y: 534, label: 'Major Westbound L3 (Mid)',
    zone: 'major_west', lane: 3, road: 'Major Road Westbound (Lane 3)',
    ruleInfo: 'Westbound Lane 3.'
  },
  MW_W_L2_MID: {
    id: 'MW_W_L2_MID', x: 364, y: 558, label: 'Major Westbound L2 (Mid)',
    zone: 'major_west', lane: 2, road: 'Major Road Westbound (Lane 2)',
    ruleInfo: 'Westbound Lane 2.'
  },
  MW_W_L1_MID: {
    id: 'MW_W_L1_MID', x: 364, y: 582, label: 'Major Westbound L1 (Mid)',
    zone: 'major_west', lane: 1, road: 'Major Road Westbound (Lane 1)',
    ruleInfo: 'Westbound Outermost Lane 1.'
  },

  MW_W_L4_END: {
    id: 'MW_W_L4_END', x: 115, y: 510, label: 'Major Westbound L4 (End)',
    zone: 'major_west', lane: 4, road: 'Major Road Westbound (Lane 4)',
    ruleInfo: 'Westbound Lane 4 near Far-West Median Gap W2.'
  },
  MW_W_L3_END: {
    id: 'MW_W_L3_END', x: 115, y: 534, label: 'Major Westbound L3 (End)',
    zone: 'major_west', lane: 3, road: 'Major Road Westbound (Lane 3)',
    ruleInfo: 'Westbound Lane 3 End.'
  },
  MW_W_L2_END: {
    id: 'MW_W_L2_END', x: 115, y: 558, label: 'Major Westbound L2 (End)',
    zone: 'major_west', lane: 2, road: 'Major Road Westbound (Lane 2)',
    ruleInfo: 'Westbound Lane 2 End.'
  },
  MW_W_L1_END: {
    id: 'MW_W_L1_END', x: 115, y: 582, label: 'Major Westbound L1 (End)',
    zone: 'major_west', lane: 1, road: 'Major Road Westbound (Lane 1)',
    ruleInfo: 'Westbound Lane 1 End.'
  },

  // --- MEDIAN GAPS ON MAJOR ROAD ---
  GAP_W1: {
    id: 'GAP_W1', x: 512, y: 470, label: 'Median U-Turn Gap W1',
    zone: 'median_gap', road: 'Central Median Crossover W1',
    ruleInfo: 'Yellow-bordered Median Crossover Gap W1: Allows inner Lane 4 traffic to execute a direct U-turn between Eastbound L4 and Westbound L4 when unobstructed.'
  },
  GAP_W2: {
    id: 'GAP_W2', x: 64, y: 470, label: 'Far-West Median Gap W2',
    zone: 'median_gap', road: 'Far-West Median Crossover W2',
    ruleInfo: 'Far-West Median Crossover Gap W2 around the tapered central traffic island.'
  },
  GAP_E1: {
    id: 'GAP_E1', x: 1068, y: 470, label: 'East Median Gap E1',
    zone: 'median_gap', road: 'East Median Crossover E1',
    ruleInfo: 'East Median Crossover Gap E1: Connects Eastbound Inner Lane 4 to Westbound Inner Lane 4.'
  },
  GAP_M1: {
    id: 'GAP_M1', x: 815, y: 752, label: 'Minor South Median Gap M1',
    zone: 'median_gap', road: 'Minor Road South Median Gap M1',
    ruleInfo: 'Minor Road South Median Crossover Gap M1: Allows inner Lane 3 traffic on Minor Road South to U-turn between Southbound L3 and Northbound L3.'
  },

  // --- MAJOR ROAD EAST (Right of Roundabout) ---
  ME_E_L1_EXIT: {
    id: 'ME_E_L1_EXIT', x: 1010, y: 358, label: 'Major East Exit L1',
    zone: 'major_east_exit', exitRoad: 'ME', lane: 1, road: 'Major Road Eastbound (Lane 1)',
    ruleInfo: 'Major Road Eastbound Outermost Lane 1 Exit.'
  },
  ME_E_L2_EXIT: {
    id: 'ME_E_L2_EXIT', x: 1010, y: 382, label: 'Major East Exit L2',
    zone: 'major_east_exit', exitRoad: 'ME', lane: 2, road: 'Major Road Eastbound (Lane 2)',
    ruleInfo: 'Major Road Eastbound Lane 2 Exit.'
  },
  ME_E_L3_EXIT: {
    id: 'ME_E_L3_EXIT', x: 1010, y: 406, label: 'Major East Exit L3',
    zone: 'major_east_exit', exitRoad: 'ME', lane: 3, road: 'Major Road Eastbound (Lane 3)',
    ruleInfo: 'Major Road Eastbound Lane 3 Exit.'
  },
  ME_E_L4_EXIT: {
    id: 'ME_E_L4_EXIT', x: 1010, y: 430, label: 'Major East Exit L4',
    zone: 'major_east_exit', exitRoad: 'ME', lane: 4, road: 'Major Road Eastbound (Lane 4)',
    ruleInfo: 'Major Road Eastbound Innermost Lane 4 Exit (Receives 90° Right turn from Minor Road South Lane 3 via Ring 4).'
  },

  ME_E_L1_END: {
    id: 'ME_E_L1_END', x: 1148, y: 358, label: 'Major East L1 (End)',
    zone: 'major_east', lane: 1, road: 'Major Road Eastbound (Lane 1)',
    ruleInfo: 'Major Road Eastbound Lane 1 Destination.'
  },
  ME_E_L2_END: {
    id: 'ME_E_L2_END', x: 1148, y: 382, label: 'Major East L2 (End)',
    zone: 'major_east', lane: 2, road: 'Major Road Eastbound (Lane 2)',
    ruleInfo: 'Major Road Eastbound Lane 2 Destination.'
  },
  ME_E_L3_END: {
    id: 'ME_E_L3_END', x: 1148, y: 406, label: 'Major East L3 (End)',
    zone: 'major_east', lane: 3, road: 'Major Road Eastbound (Lane 3)',
    ruleInfo: 'Major Road Eastbound Lane 3 Destination.'
  },
  ME_E_L4_END: {
    id: 'ME_E_L4_END', x: 1148, y: 430, label: 'Major East L4 (End)',
    zone: 'major_east', lane: 4, road: 'Major Road Eastbound (Lane 4)',
    ruleInfo: 'Major Road Eastbound Lane 4 Destination.'
  },

  // Major East Westbound (Approaching Roundabout, Bottom 4 Lanes)
  ME_SPAWN: {
    id: 'ME_SPAWN', x: 1175, y: 546, label: 'Major Rd East (Start)',
    zone: 'major_east', road: 'Major Road East Approach',
    ruleInfo: 'Starting point on Major Road East. Select Lane 1 (bottom outer) to Lane 4 (top inner).'
  },
  ME_W_L4_START: {
    id: 'ME_W_L4_START', x: 1130, y: 510, label: 'Major East L4 (Start)',
    zone: 'major_east', lane: 4, road: 'Major Road East Approach (Lane 4)',
    ruleInfo: 'Major East Lane 4 (Innermost Right): 90° Right, 180° U-turn, or 270° turn via Roundabout Ring 4.'
  },
  ME_W_L3_START: {
    id: 'ME_W_L3_START', x: 1130, y: 534, label: 'Major East L3 (Start)',
    zone: 'major_east', lane: 3, road: 'Major Road East Approach (Lane 3)',
    ruleInfo: 'Major East Lane 3: 0° Straight or 90° Right via Roundabout Ring 3.'
  },
  ME_W_L2_START: {
    id: 'ME_W_L2_START', x: 1130, y: 558, label: 'Major East L2 (Start)',
    zone: 'major_east', lane: 2, road: 'Major Road East Approach (Lane 2)',
    ruleInfo: 'Major East Lane 2: 0° Straight ONLY via Roundabout Ring 2.'
  },
  ME_W_L1_START: {
    id: 'ME_W_L1_START', x: 1130, y: 582, label: 'Major East L1 (Start)',
    zone: 'major_east', lane: 1, road: 'Major Road East Approach (Lane 1)',
    ruleInfo: 'Major East Lane 1 (Outermost Left): 90° Left or 0° Straight via Roundabout Ring 1.'
  },

  ME_W_L4_ENTRY: {
    id: 'ME_W_L4_ENTRY', x: 1010, y: 510, label: 'Major East L4 Entry',
    zone: 'major_east_entry', approach: 'ME', lane: 4, road: 'Major East Entry L4',
    ruleInfo: 'Major East Entry Lane 4 -> Enter Roundabout Ring 4.'
  },
  ME_W_L3_ENTRY: {
    id: 'ME_W_L3_ENTRY', x: 1010, y: 534, label: 'Major East L3 Entry',
    zone: 'major_east_entry', approach: 'ME', lane: 3, road: 'Major East Entry L3',
    ruleInfo: 'Major East Entry Lane 3 -> Enter Roundabout Ring 3.'
  },
  ME_W_L2_ENTRY: {
    id: 'ME_W_L2_ENTRY', x: 1010, y: 558, label: 'Major East L2 Entry',
    zone: 'major_east_entry', approach: 'ME', lane: 2, road: 'Major East Entry L2',
    ruleInfo: 'Major East Entry Lane 2 -> Enter Roundabout Ring 2.'
  },
  ME_W_L1_ENTRY: {
    id: 'ME_W_L1_ENTRY', x: 1010, y: 582, label: 'Major East L1 Entry',
    zone: 'major_east_entry', approach: 'ME', lane: 1, road: 'Major East Entry L1',
    ruleInfo: 'Major East Entry Lane 1 -> Enter Roundabout Ring 1.'
  },

  // --- MINOR ROAD SOUTH (Bottom of Roundabout, 3 Lanes Each Way) ---
  MS_SPAWN: {
    id: 'MS_SPAWN', x: 767, y: 796, label: 'Minor Rd South (Start)',
    zone: 'minor_south', road: 'Minor Road South Approach',
    ruleInfo: 'Starting point on Minor Road South (3 Lanes). Remember: Lane 3 must skip Roundabout Ring 3 and enter Ring 4!'
  },
  MS_N_L1_START: {
    id: 'MS_N_L1_START', x: 743, y: 752, label: 'Minor South L1 (Start)',
    zone: 'minor_south', lane: 1, road: 'Minor Road South (Lane 1)',
    ruleInfo: 'Minor Road South Lane 1 (Outermost Left): Allowed 90° Left (West) or 0° Straight (North) via Roundabout Ring 1.'
  },
  MS_N_L2_START: {
    id: 'MS_N_L2_START', x: 767, y: 752, label: 'Minor South L2 (Start)',
    zone: 'minor_south', lane: 2, road: 'Minor Road South (Lane 2)',
    ruleInfo: 'Minor Road South Lane 2 (Middle): Allowed 0° Straight ONLY (North) via Roundabout Ring 2.'
  },
  MS_N_L3_START: {
    id: 'MS_N_L3_START', x: 791, y: 752, label: 'Minor South L3 (Start)',
    zone: 'minor_south', lane: 3, road: 'Minor Road South (Lane 3)',
    ruleInfo: 'Minor Road South Lane 3 (Innermost Right): CRITICAL NTSA RULE — Must skip Roundabout Ring 3 and enter innermost Ring 4! Allowed 90° Right (East), 180° U-Turn, or 270°.'
  },

  MS_N_L1_ENTRY: {
    id: 'MS_N_L1_ENTRY', x: 743, y: 658, label: 'Minor South L1 Entry',
    zone: 'minor_south_entry', approach: 'MS', lane: 1, road: 'Minor South Entry L1',
    ruleInfo: 'Minor South Lane 1 Entry -> Enter Roundabout Ring 1.'
  },
  MS_N_L2_ENTRY: {
    id: 'MS_N_L2_ENTRY', x: 767, y: 658, label: 'Minor South L2 Entry',
    zone: 'minor_south_entry', approach: 'MS', lane: 2, road: 'Minor South Entry L2',
    ruleInfo: 'Minor South Lane 2 Entry -> Enter Roundabout Ring 2 (0° Straight ONLY).'
  },
  MS_N_L3_ENTRY: {
    id: 'MS_N_L3_ENTRY', x: 791, y: 658, label: 'Minor South L3 Entry',
    zone: 'minor_south_entry', approach: 'MS', lane: 3, road: 'Minor South Entry L3',
    ruleInfo: 'Minor South Lane 3 Entry -> MUST skip Ring 3 and enter Roundabout Ring 4 (Innermost)!'
  },

  MS_S_L3_EXIT: {
    id: 'MS_S_L3_EXIT', x: 839, y: 658, label: 'Minor South Exit L3',
    zone: 'minor_south_exit', exitRoad: 'MS', lane: 3, road: 'Minor Road Southbound (Inner L3)',
    ruleInfo: 'Minor Road Southbound Inner Lane 3 Exit (Receives traffic from Roundabout Ring 4).'
  },
  MS_S_L2_EXIT: {
    id: 'MS_S_L2_EXIT', x: 863, y: 658, label: 'Minor South Exit L2',
    zone: 'minor_south_exit', exitRoad: 'MS', lane: 2, road: 'Minor Road Southbound (Middle L2)',
    ruleInfo: 'Minor Road Southbound Middle Lane 2 Exit (Receives traffic from Roundabout Ring 2 or Ring 3).'
  },
  MS_S_L1_EXIT: {
    id: 'MS_S_L1_EXIT', x: 887, y: 658, label: 'Minor South Exit L1',
    zone: 'minor_south_exit', exitRoad: 'MS', lane: 1, road: 'Minor Road Southbound (Outer L1)',
    ruleInfo: 'Minor Road Southbound Outer Lane 1 Exit (Receives traffic from Roundabout Ring 1).'
  },

  MS_S_L3_END: {
    id: 'MS_S_L3_END', x: 839, y: 762, label: 'Minor Southbound L3 (End)',
    zone: 'minor_south', lane: 3, road: 'Minor Road Southbound (Lane 3)',
    ruleInfo: 'Minor Road Southbound Inner Lane 3 Destination.'
  },
  MS_S_L2_END: {
    id: 'MS_S_L2_END', x: 863, y: 762, label: 'Minor Southbound L2 (End)',
    zone: 'minor_south', lane: 2, road: 'Minor Road Southbound (Lane 2)',
    ruleInfo: 'Minor Road Southbound Middle Lane 2 Destination.'
  },
  MS_S_L1_END: {
    id: 'MS_S_L1_END', x: 887, y: 762, label: 'Minor Southbound L1 (End)',
    zone: 'minor_south', lane: 1, road: 'Minor Road Southbound (Lane 1)',
    ruleInfo: 'Minor Road Southbound Outer Lane 1 Destination.'
  },

  // --- MINOR ROAD NORTH (Top of Roundabout, 3 Lanes Each Way) ---
  MN_N_L1_EXIT: {
    id: 'MN_N_L1_EXIT', x: 743, y: 282, label: 'Minor North Exit L1',
    zone: 'minor_north_exit', exitRoad: 'MN', lane: 1, road: 'Minor Road Northbound (Outer L1)',
    ruleInfo: 'Minor Road Northbound Outer Lane 1 Exit.'
  },
  MN_N_L2_EXIT: {
    id: 'MN_N_L2_EXIT', x: 767, y: 282, label: 'Minor North Exit L2',
    zone: 'minor_north_exit', exitRoad: 'MN', lane: 2, road: 'Minor Road Northbound (Middle L2)',
    ruleInfo: 'Minor Road Northbound Middle Lane 2 Exit.'
  },
  MN_N_L3_EXIT: {
    id: 'MN_N_L3_EXIT', x: 791, y: 282, label: 'Minor North Exit L3',
    zone: 'minor_north_exit', exitRoad: 'MN', lane: 3, road: 'Minor Road Northbound (Inner L3)',
    ruleInfo: 'Minor Road Northbound Inner Lane 3 Exit.'
  },

  MN_N_L1_TOP: {
    id: 'MN_N_L1_TOP', x: 743, y: 155, label: 'Minor North L1 (Top Jct)',
    zone: 'minor_north', lane: 1, road: 'Minor Road Northbound (Lane 1)',
    ruleInfo: 'Minor Road Northbound Lane 1 approaching Top Perimeter Road (Receives Controlled Angle Parking exit).'
  },
  MN_N_L2_TOP: {
    id: 'MN_N_L2_TOP', x: 767, y: 155, label: 'Minor North L2 (Top Jct)',
    zone: 'minor_north', lane: 2, road: 'Minor Road Northbound (Lane 2)',
    ruleInfo: 'Minor Road Northbound Lane 2 approaching Top Perimeter Road.'
  },
  MN_N_L3_TOP: {
    id: 'MN_N_L3_TOP', x: 791, y: 155, label: 'Minor North L3 (Top Jct)',
    zone: 'minor_north', lane: 3, road: 'Minor Road Northbound (Lane 3)',
    ruleInfo: 'Minor Road Northbound Lane 3 approaching Top Perimeter Road.'
  },

  MN_S_L3_START: {
    id: 'MN_S_L3_START', x: 839, y: 155, label: 'Minor North L3 (Start)',
    zone: 'minor_north', lane: 3, road: 'Minor Road North Approach (Lane 3)',
    ruleInfo: 'Minor North Southbound Lane 3 (Innermost Right): Must skip Roundabout Ring 3 and enter Ring 4!'
  },
  MN_S_L2_START: {
    id: 'MN_S_L2_START', x: 863, y: 155, label: 'Minor North L2 (Start)',
    zone: 'minor_north', lane: 2, road: 'Minor Road North Approach (Lane 2)',
    ruleInfo: 'Minor North Southbound Lane 2 (Middle): 0° Straight ONLY via Roundabout Ring 2.'
  },
  MN_S_L1_START: {
    id: 'MN_S_L1_START', x: 887, y: 155, label: 'Minor North L1 (Start)',
    zone: 'minor_north', lane: 1, road: 'Minor Road North Approach (Lane 1)',
    ruleInfo: 'Minor North Southbound Lane 1 (Outermost Left): 90° Left (East) or 0° Straight (South) via Roundabout Ring 1.'
  },

  MN_S_L3_ENTRY: {
    id: 'MN_S_L3_ENTRY', x: 839, y: 282, label: 'Minor North L3 Entry',
    zone: 'minor_north_entry', approach: 'MN', lane: 3, road: 'Minor North Entry L3',
    ruleInfo: 'Minor North Lane 3 (Yellow Car spot in photo): Must skip Ring 3 and enter Roundabout Ring 4!'
  },
  MN_S_L2_ENTRY: {
    id: 'MN_S_L2_ENTRY', x: 863, y: 282, label: 'Minor North L2 Entry',
    zone: 'minor_north_entry', approach: 'MN', lane: 2, road: 'Minor North Entry L2',
    ruleInfo: 'Minor North Lane 2 Entry -> Enter Roundabout Ring 2.'
  },
  MN_S_L1_ENTRY: {
    id: 'MN_S_L1_ENTRY', x: 887, y: 282, label: 'Minor North L1 Entry',
    zone: 'minor_north_entry', approach: 'MN', lane: 1, road: 'Minor North Entry L1',
    ruleInfo: 'Minor North Lane 1 Entry -> Enter Roundabout Ring 1.'
  },

  // --- ROUNDABOUT 4 CONCENTRIC RINGS (NW=315°, NE=45°, SE=135°, SW=225°) ---
  ...[1, 2, 3, 4].reduce((acc, ring) => {
    const r = RING_RADII[ring];
    const quads = [
      { key: 'NW', angle: 315, name: 'Top-Left (NW)' },
      { key: 'NE', angle: 45, name: 'Top-Right (NE)' },
      { key: 'SE', angle: 135, name: 'Bottom-Right (SE)' },
      { key: 'SW', angle: 225, name: 'Bottom-Left (SW)' }
    ];
    quads.forEach((q) => {
      const pos = polarToCartesian(RA_CX, RA_CY, r, q.angle);
      const id = `RA_${q.key}_L${ring}`;
      acc[id] = {
        id,
        x: pos.x,
        y: pos.y,
        label: `Roundabout Ring ${ring} (${q.key})`,
        zone: 'roundabout',
        ring,
        quad: q.key,
        road: `Roundabout Lane ${ring} (${q.name})`,
        ruleInfo:
          ring === 1
            ? 'Roundabout Ring 1 (Outermost): For 90° Left (1st exit) or 0° Straight (2nd exit). No lane changing inside roundabout!'
            : ring === 2
            ? 'Roundabout Ring 2: Strictly for 0° Straight (2nd exit). No lane changing inside roundabout!'
            : ring === 3
            ? 'Roundabout Ring 3: For Major Road Lane 3 (0° Straight or 90° Right). Skipped by Minor Road Lane 3!'
            : 'Roundabout Ring 4 (Innermost): For Major Road Lane 4 AND Minor Road Lane 3! Allows 90° Right (3rd exit), 180° U-Turn (4th exit), and 270° (5th exit).'
      };
    });
    return acc;
  }, {}),

  // --- SIDE ACCESS TWO-WAY ROAD (Left Vertical Connector) ---
  SIDE_N_BOT: {
    id: 'SIDE_N_BOT', x: 376, y: 312, label: 'Side Road Northbound (Bot)',
    zone: 'side_road', road: 'Side Access Road (Northbound)',
    ruleInfo: 'Two-Way Side Access Road (Northbound Lane). Green & Red toy cars park along the curb here.'
  },
  SIDE_N_MID: {
    id: 'SIDE_N_MID', x: 376, y: 228, label: 'Side Road (Angle Parking Jct)',
    zone: 'side_road', road: 'Side Access Road (Angle Parking Entry)',
    ruleInfo: 'Side Access Road Junction: Turn right into Controlled Angle Parking entrance or continue North to Top Perimeter Road.'
  },
  SIDE_N_TOP: {
    id: 'SIDE_N_TOP', x: 376, y: 145, label: 'Side Road Northbound (Top)',
    zone: 'side_road', road: 'Side Access Road (Northbound Top)',
    ruleInfo: 'Approaching Top Perimeter Two-Way Road.'
  },
  SIDE_S_TOP: {
    id: 'SIDE_S_TOP', x: 350, y: 145, label: 'Side Road Southbound (Top)',
    zone: 'side_road', road: 'Side Access Road (Southbound Top)',
    ruleInfo: 'Entering Side Access Road Southbound from Top Perimeter Road.'
  },
  SIDE_S_MID: {
    id: 'SIDE_S_MID', x: 350, y: 245, label: 'Side Road Southbound (Mid)',
    zone: 'side_road', road: 'Side Access Road (Southbound Mid)',
    ruleInfo: 'Side Access Road Southbound.'
  },
  SIDE_S_BOT: {
    id: 'SIDE_S_BOT', x: 350, y: 312, label: 'Side Road Southbound (Bot)',
    zone: 'side_road', road: 'Side Access Road (Southbound Exit)',
    ruleInfo: 'Yield before turning 90° Left onto Major Road West (Lane 1).'
  },

  // --- CONTROLLED ANGLE PARKING ZONE (Upper Center Sector) ---
  AP_ENTRY: {
    id: 'AP_ENTRY', x: 425, y: 222, label: 'Angle Parking Entrance',
    zone: 'angle_parking', road: 'Controlled (Angle) Parking Entry',
    ruleInfo: 'Controlled (Angle) Parking Entrance: Strictly for Saloon/Small vehicles. Enter forward, park in the farthest empty bay, and NEVER drive straight through as a shortcut!'
  },
  AP_AISLE_W: {
    id: 'AP_AISLE_W', x: 505, y: 232, label: 'Angle Parking Aisle (West)',
    zone: 'angle_parking', road: 'Controlled Parking Central Aisle',
    ruleInfo: 'Controlled Parking Aisle: Proceed forward to the farthest available diagonal parking bay.'
  },
  AP_AISLE_E: {
    id: 'AP_AISLE_E', x: 615, y: 232, label: 'Angle Parking Aisle (East)',
    zone: 'angle_parking', road: 'Controlled Parking Central Aisle',
    ruleInfo: 'Controlled Parking Aisle (East): Enter a diagonal bay forward, then reverse back into the aisle to exit.'
  },
  AP_BAY_TOP_1: {
    id: 'AP_BAY_TOP_1', x: 540, y: 186, label: 'Angle Bay Top #1',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Top Mid)',
    ruleInfo: 'Controlled Angle Parking Bay: Enter forward, exit in reverse.'
  },
  AP_BAY_TOP_2: {
    id: 'AP_BAY_TOP_2', x: 642, y: 186, label: 'Angle Bay Top #2 (Farthest)',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Top Farthest)',
    ruleInfo: 'Farthest Controlled Angle Parking Bay (Top Row): Correct NTSA target bay when all bays are empty! Enter forward, exit in reverse.'
  },
  AP_BAY_BOT_1: {
    id: 'AP_BAY_BOT_1', x: 540, y: 278, label: 'Angle Bay Bottom #1',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Bottom Mid)',
    ruleInfo: 'Controlled Angle Parking Bay (Bottom Row): Enter forward, exit in reverse.'
  },
  AP_BAY_BOT_2: {
    id: 'AP_BAY_BOT_2', x: 642, y: 278, label: 'Angle Bay Bottom #2 (Farthest)',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Bottom Farthest)',
    ruleInfo: 'Farthest Controlled Angle Parking Bay (Bottom Row): Enter forward, exit in reverse.'
  },
  AP_EXIT_E: {
    id: 'AP_EXIT_E', x: 705, y: 222, label: 'Angle Parking East Exit',
    zone: 'angle_parking', road: 'Controlled Parking Exit',
    ruleInfo: 'Controlled Angle Parking Exit onto North Minor Road (Lane 1).'
  },

  // --- TOP PERIMETER TWO-WAY ROAD & FLUSH (UNCONTROLLED) PARKING ---
  TOP_E_WEST: {
    id: 'TOP_E_WEST', x: 145, y: 76, label: 'Top Road Eastbound (West)',
    zone: 'top_road', road: 'Top Perimeter Road (Eastbound)',
    ruleInfo: 'Top Two-Way Perimeter Road (Eastbound Left Lane).'
  },
  TOP_E_JCT_W: {
    id: 'TOP_E_JCT_W', x: 376, y: 76, label: 'Top Road Eastbound (Side Jct)',
    zone: 'top_road', road: 'Top Perimeter Road (Side Jct)',
    ruleInfo: 'Top Road Junction with Side Access Road.'
  },
  TOP_E_ZEBRA1: {
    id: 'TOP_E_ZEBRA1', x: 432, y: 76, label: 'Zebra Crossing #1 (Eastbound)',
    zone: 'zebra', road: 'Pedestrian Zebra Crossing #1',
    ruleInfo: 'White Pedestrian Zebra Crossing: Drivers must yield to pedestrians and NEVER park or stop on a zebra crossing.'
  },
  TOP_E_MID: {
    id: 'TOP_E_MID', x: 585, y: 76, label: 'Top Road Eastbound (Mid)',
    zone: 'top_road', road: 'Top Perimeter Road (Eastbound Mid)',
    ruleInfo: 'Top Perimeter Road Eastbound passing Flush Parking zone.'
  },
  TOP_E_JCT_N: {
    id: 'TOP_E_JCT_N', x: 767, y: 76, label: 'Top Road (Minor North Jct)',
    zone: 'top_road', road: 'Top Road / Minor North Junction',
    ruleInfo: 'Junction between Minor Road North and Top Two-Way Perimeter Road.'
  },
  TOP_E_ZEBRA2: {
    id: 'TOP_E_ZEBRA2', x: 1030, y: 76, label: 'Zebra Crossing #2 (Eastbound)',
    zone: 'zebra', road: 'Pedestrian Zebra Crossing #2',
    ruleInfo: 'East Pedestrian Zebra Crossing on Top Perimeter Road.'
  },
  TOP_E_EAST: {
    id: 'TOP_E_EAST', x: 1140, y: 76, label: 'Top Road Eastbound (End)',
    zone: 'top_road', road: 'Top Perimeter Road (Far East)',
    ruleInfo: 'Far East end of Top Perimeter Road.'
  },

  TOP_W_EAST: {
    id: 'TOP_W_EAST', x: 1140, y: 100, label: 'Top Road Westbound (Start)',
    zone: 'top_road', road: 'Top Perimeter Road (Westbound)',
    ruleInfo: 'Top Perimeter Road Westbound (South side lane).'
  },
  TOP_W_ZEBRA2: {
    id: 'TOP_W_ZEBRA2', x: 1030, y: 100, label: 'Zebra Crossing #2 (Westbound)',
    zone: 'zebra', road: 'Pedestrian Zebra Crossing #2',
    ruleInfo: 'Yield to pedestrians at Zebra Crossing #2.'
  },
  TOP_W_JCT_N: {
    id: 'TOP_W_JCT_N', x: 839, y: 100, label: 'Top Road Westbound (Minor Jct)',
    zone: 'top_road', road: 'Top Road / Minor North Junction',
    ruleInfo: 'Turn left into Minor Road North (Southbound Lanes 1-3) or continue West towards Flush Parking.'
  },
  TOP_W_FLUSH_APPROACH: {
    id: 'TOP_W_FLUSH_APPROACH', x: 648, y: 100, label: 'Flush Parking Approach',
    zone: 'top_road', road: 'Flush Parking Approach',
    ruleInfo: 'Flush (Uncontrolled) Parking Approach: Stop ahead of the bay, reverse into the Flush Parking bay, and drive forward when exiting!'
  },
  FLUSH_BAY_1: {
    id: 'FLUSH_BAY_1', x: 585, y: 120, label: 'Flush Parking Bay #1',
    zone: 'flush_parking_bay', road: 'Flush (Uncontrolled) Parking Bay #1',
    ruleInfo: 'Flush (Parallel/Uncontrolled) Parking Bay: NTSA Rule — Must enter by REVERSING and exit by driving FORWARD.'
  },
  FLUSH_BAY_2: {
    id: 'FLUSH_BAY_2', x: 505, y: 120, label: 'Flush Parking Bay #2',
    zone: 'flush_parking_bay', road: 'Flush (Uncontrolled) Parking Bay #2',
    ruleInfo: 'Flush (Parallel/Uncontrolled) Parking Bay #2: Enter in reverse, exit forward.'
  },
  TOP_W_ZEBRA1: {
    id: 'TOP_W_ZEBRA1', x: 432, y: 100, label: 'Zebra Crossing #1 (Westbound)',
    zone: 'zebra', road: 'Pedestrian Zebra Crossing #1',
    ruleInfo: 'West Pedestrian Zebra Crossing on Top Perimeter Road.'
  },
  TOP_W_JCT_W: {
    id: 'TOP_W_JCT_W', x: 350, y: 100, label: 'Top Road Westbound (Side Jct)',
    zone: 'top_road', road: 'Top Perimeter Road (Side Jct)',
    ruleInfo: 'Turn 90° Left into Side Access Road Southbound or continue West.'
  },
  TOP_W_WEST: {
    id: 'TOP_W_WEST', x: 145, y: 100, label: 'Top Road Westbound (End)',
    zone: 'top_road', road: 'Top Perimeter Road (Far West)',
    ruleInfo: 'Far West end of Top Perimeter Road.'
  }
};

/**
 * Directed Edges connecting BOARD_NODES.
 * Includes both legal edges (`isLegal: true`) and common student mistake edges (`isLegal: false`)
 * so learners can make real mistakes and receive detailed NTSA Examiner feedback, while the
 * BFS Auto-Solver strictly uses `isLegal: true` edges.
 */
const buildBoardEdges = () => {
  const edges = [];
  const addEdge = (from, to, opts = {}) => {
    edges.push({
      from,
      to,
      isLegal: opts.isLegal !== undefined ? opts.isLegal : true,
      violationReason: opts.violationReason || null,
      turn: opts.turn || 'none', // 'left' | 'right' | 'none'
      isReverse: Boolean(opts.isReverse)
    });
  };

  // 1. Spawns to Lane Starts
  addEdge('MW_SPAWN', 'MW_E_L1_START', { turn: 'left' });
  addEdge('MW_SPAWN', 'MW_E_L2_START');
  addEdge('MW_SPAWN', 'MW_E_L3_START');
  addEdge('MW_SPAWN', 'MW_E_L4_START', { turn: 'right' });

  addEdge('ME_SPAWN', 'ME_W_L1_START', { turn: 'left' });
  addEdge('ME_SPAWN', 'ME_W_L2_START');
  addEdge('ME_SPAWN', 'ME_W_L3_START');
  addEdge('ME_SPAWN', 'ME_W_L4_START', { turn: 'right' });

  addEdge('MS_SPAWN', 'MS_N_L1_START', { turn: 'left' });
  addEdge('MS_SPAWN', 'MS_N_L2_START');
  addEdge('MS_SPAWN', 'MS_N_L3_START', { turn: 'right' });

  // 2. Major Road West Eastbound progressions + Broken-Line Lane Changes
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`MW_E_L${l}_START`, `MW_E_L${l}_MID`);
    addEdge(`MW_E_L${l}_MID`, `MW_E_L${l}_ENTRY`);
  });
  // Legal Broken-Line Lane Shifts on Major West Eastbound (before solid approach lines)
  addEdge('MW_E_L1_START', 'MW_E_L2_MID', { turn: 'right' });
  addEdge('MW_E_L2_START', 'MW_E_L1_MID', { turn: 'left' });
  addEdge('MW_E_L2_START', 'MW_E_L3_MID', { turn: 'right' });
  addEdge('MW_E_L3_START', 'MW_E_L2_MID', { turn: 'left' });
  addEdge('MW_E_L3_START', 'MW_E_L4_MID', { turn: 'right' });
  addEdge('MW_E_L4_START', 'MW_E_L3_MID', { turn: 'left' });

  addEdge('MW_E_L1_MID', 'MW_E_L2_ENTRY', { turn: 'right' });
  addEdge('MW_E_L2_MID', 'MW_E_L1_ENTRY', { turn: 'left' });
  addEdge('MW_E_L2_MID', 'MW_E_L3_ENTRY', { turn: 'right' });
  addEdge('MW_E_L3_MID', 'MW_E_L2_ENTRY', { turn: 'left' });
  addEdge('MW_E_L3_MID', 'MW_E_L4_ENTRY', { turn: 'right' });
  addEdge('MW_E_L4_MID', 'MW_E_L3_ENTRY', { turn: 'left' });

  // 3. Major Road West Westbound progressions + Broken-Line Lane Changes
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`MW_W_L${l}_EXIT`, `MW_W_L${l}_MID`);
    addEdge(`MW_W_L${l}_MID`, `MW_W_L${l}_END`);
  });
  addEdge('MW_W_L4_EXIT', 'MW_W_L3_MID', { turn: 'left' });
  addEdge('MW_W_L3_EXIT', 'MW_W_L4_MID', { turn: 'right' });
  addEdge('MW_W_L3_EXIT', 'MW_W_L2_MID', { turn: 'left' });
  addEdge('MW_W_L2_EXIT', 'MW_W_L3_MID', { turn: 'right' });
  addEdge('MW_W_L2_EXIT', 'MW_W_L1_MID', { turn: 'left' });
  addEdge('MW_W_L1_EXIT', 'MW_W_L2_MID', { turn: 'right' });

  addEdge('MW_W_L4_MID', 'MW_W_L3_END', { turn: 'left' });
  addEdge('MW_W_L3_MID', 'MW_W_L4_END', { turn: 'right' });
  addEdge('MW_W_L3_MID', 'MW_W_L2_END', { turn: 'left' });
  addEdge('MW_W_L2_MID', 'MW_W_L1_END', { turn: 'left' });

  // 4. Median Gaps (Legal U-Turns from Innermost Lanes)
  addEdge('MW_E_L4_MID', 'GAP_W1', { turn: 'right' });
  addEdge('GAP_W1', 'MW_W_L4_MID', { turn: 'right' });
  addEdge('MW_W_L4_EXIT', 'GAP_W1', { turn: 'right' });
  addEdge('GAP_W1', 'MW_E_L4_ENTRY', { turn: 'right' });

  addEdge('MW_W_L4_END', 'GAP_W2', { turn: 'right' });
  addEdge('MW_W_L1_END', 'GAP_W2', { turn: 'right' });
  addEdge('GAP_W2', 'MW_E_L4_START', { turn: 'right' });
  addEdge('GAP_W2', 'MW_E_L3_START', { turn: 'right' });
  addEdge('GAP_W2', 'MW_E_L2_START', { turn: 'right' });
  addEdge('GAP_W2', 'MW_E_L1_START', { turn: 'right' });

  addEdge('ME_E_L4_EXIT', 'GAP_E1', { turn: 'right' });
  addEdge('ME_E_L4_END', 'GAP_E1', { turn: 'right' });
  addEdge('GAP_E1', 'ME_W_L4_ENTRY', { turn: 'right' });
  addEdge('GAP_E1', 'ME_W_L3_ENTRY', { turn: 'right' });

  // Minor Road South Median Crossover Gap M1
  addEdge('MS_S_L3_EXIT', 'GAP_M1', { turn: 'right' });
  addEdge('MS_S_L3_END', 'GAP_M1', { turn: 'right' });
  addEdge('GAP_M1', 'MS_N_L3_START', { turn: 'right' });
  addEdge('GAP_M1', 'MS_N_L2_START', { turn: 'right' });
  addEdge('GAP_M1', 'MS_N_L1_START', { turn: 'right' });

  // 5. Major Road East progressions + Broken-Line Shifts
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`ME_E_L${l}_EXIT`, `ME_E_L${l}_END`);
    addEdge(`ME_W_L${l}_START`, `ME_W_L${l}_ENTRY`);
  });
  addEdge('ME_W_L4_START', 'ME_W_L3_ENTRY', { turn: 'left' });
  addEdge('ME_W_L3_START', 'ME_W_L4_ENTRY', { turn: 'right' });
  addEdge('ME_W_L3_START', 'ME_W_L2_ENTRY', { turn: 'left' });
  addEdge('ME_W_L2_START', 'ME_W_L3_ENTRY', { turn: 'right' });
  addEdge('ME_W_L2_START', 'ME_W_L1_ENTRY', { turn: 'left' });
  addEdge('ME_W_L1_START', 'ME_W_L2_ENTRY', { turn: 'right' });

  addEdge('ME_E_L4_EXIT', 'ME_E_L3_END', { turn: 'left' });
  addEdge('ME_E_L3_EXIT', 'ME_E_L4_END', { turn: 'right' });
  addEdge('ME_E_L2_EXIT', 'ME_E_L3_END', { turn: 'right' });

  // 6. Minor Road South progressions + Broken-Line Shifts
  [1, 2, 3].forEach((l) => {
    addEdge(`MS_N_L${l}_START`, `MS_N_L${l}_ENTRY`);
    addEdge(`MS_S_L${l}_EXIT`, `MS_S_L${l}_END`);
  });
  addEdge('MS_N_L1_START', 'MS_N_L2_ENTRY', { turn: 'right' });
  addEdge('MS_N_L2_START', 'MS_N_L1_ENTRY', { turn: 'left' });
  addEdge('MS_N_L2_START', 'MS_N_L3_ENTRY', { turn: 'right' });
  addEdge('MS_N_L3_START', 'MS_N_L2_ENTRY', { turn: 'left' });

  addEdge('MS_S_L3_EXIT', 'MS_S_L2_END', { turn: 'left' });
  addEdge('MS_S_L2_EXIT', 'MS_S_L3_END', { turn: 'right' });
  addEdge('MS_S_L2_EXIT', 'MS_S_L1_END', { turn: 'left' });
  addEdge('MS_S_L1_EXIT', 'MS_S_L2_END', { turn: 'right' });

  // 7. Minor Road North progressions + Broken-Line Shifts
  [1, 2, 3].forEach((l) => {
    addEdge(`MN_N_L${l}_EXIT`, `MN_N_L${l}_TOP`);
    addEdge(`MN_S_L${l}_START`, `MN_S_L${l}_ENTRY`);
  });
  addEdge('MN_S_L1_START', 'MN_S_L2_ENTRY', { turn: 'left' });
  addEdge('MN_S_L2_START', 'MN_S_L1_ENTRY', { turn: 'right' });
  addEdge('MN_S_L2_START', 'MN_S_L3_ENTRY', { turn: 'left' });
  addEdge('MN_S_L3_START', 'MN_S_L2_ENTRY', { turn: 'right' });

  // 8. Roundabout Clockwise Ring Progression (NW -> NE -> SE -> SW -> NW)
  const quadOrder = ['NW', 'NE', 'SE', 'SW'];
  [1, 2, 3, 4].forEach((ring) => {
    for (let i = 0; i < 4; i++) {
      const curr = quadOrder[i];
      const next = quadOrder[(i + 1) % 4];
      addEdge(`RA_${curr}_L${ring}`, `RA_${next}_L${ring}`, {
        turn: ring >= 3 ? 'right' : 'none'
      });
    }
  });

  // Mistake Edges: Changing lanes inside Roundabout (Strictly Illegal!)
  quadOrder.forEach((curr, i) => {
    const next = quadOrder[(i + 1) % 4];
    addEdge(`RA_${curr}_L1`, `RA_${next}_L2`, {
      isLegal: false,
      violationReason: 'Changing lanes inside the roundabout (Ring 1 to Ring 2) is strictly prohibited by NTSA rules.'
    });
    addEdge(`RA_${curr}_L2`, `RA_${next}_L1`, {
      isLegal: false,
      violationReason: 'Changing lanes inside the roundabout (Ring 2 to Ring 1) is strictly prohibited by NTSA rules.'
    });
    addEdge(`RA_${curr}_L3`, `RA_${next}_L4`, {
      isLegal: false,
      violationReason: 'Changing lanes inside the roundabout (Ring 3 to Ring 4) is strictly prohibited by NTSA rules.'
    });
    addEdge(`RA_${curr}_L4`, `RA_${next}_L3`, {
      isLegal: false,
      violationReason: 'Changing lanes inside the roundabout (Ring 4 to Ring 3) is strictly prohibited by NTSA rules.'
    });
  });

  // 9. Roundabout Entries from Major Road West (4 Lanes -> Rings 1..4 at NW)
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`MW_E_L${l}_ENTRY`, `RA_NW_L${l}`, {
      turn: l === 1 ? 'left' : l >= 3 ? 'right' : 'none'
    });
  });

  // 10. Roundabout Entries from Major Road East (4 Lanes -> Rings 1..4 at SE)
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`ME_W_L${l}_ENTRY`, `RA_SE_L${l}`, {
      turn: l === 1 ? 'left' : l >= 3 ? 'right' : 'none'
    });
  });

  // 11. Roundabout Entries from Minor Road South (3 Lanes -> SW Quadrant)
  // NTSA 5 Options for Minor Road Lane 3:
  // - Can enter Ring 3 (for 0° Straight or 90° Right into Major Road Lane 3)
  // - Can enter Ring 4 (for 90° Right into Major Road Lane 4, 180° U-turn, or 270° Q-turn)
  addEdge('MS_N_L1_ENTRY', 'RA_SW_L1', { turn: 'left' });
  addEdge('MS_N_L2_ENTRY', 'RA_SW_L2', { turn: 'none' });
  addEdge('MS_N_L3_ENTRY', 'RA_SW_L3', { turn: 'right', isLegal: true });
  addEdge('MS_N_L3_ENTRY', 'RA_SW_L4', { turn: 'right', isLegal: true });

  // 12. Roundabout Entries from Minor Road North (3 Lanes -> NE Quadrant)
  addEdge('MN_S_L1_ENTRY', 'RA_NE_L1', { turn: 'left' });
  addEdge('MN_S_L2_ENTRY', 'RA_NE_L2', { turn: 'none' });
  addEdge('MN_S_L3_ENTRY', 'RA_NE_L3', { turn: 'right', isLegal: true });
  addEdge('MN_S_L3_ENTRY', 'RA_NE_L4', { turn: 'right', isLegal: true });

  // 13. Roundabout Exits to Major Road East (from NE Quadrant)
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`RA_NE_L${l}`, `ME_E_L${l}_EXIT`, { turn: 'left' });
  });

  // 14. Roundabout Exits to Major Road West (from SW Quadrant)
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`RA_SW_L${l}`, `MW_W_L${l}_EXIT`, { turn: 'left' });
  });

  // 15. Roundabout Exits to Minor Road South (from SE Quadrant - 3 Exit Lanes)
  addEdge('RA_SE_L1', 'MS_S_L1_EXIT', { turn: 'left' });
  addEdge('RA_SE_L2', 'MS_S_L2_EXIT', { turn: 'left' });
  addEdge('RA_SE_L3', 'MS_S_L2_EXIT', { turn: 'left' });
  addEdge('RA_SE_L3', 'MS_S_L3_EXIT', { turn: 'left' });
  addEdge('RA_SE_L4', 'MS_S_L3_EXIT', { turn: 'left' });

  // 16. Roundabout Exits to Minor Road North (from NW Quadrant - 3 Exit Lanes)
  addEdge('RA_NW_L1', 'MN_N_L1_EXIT', { turn: 'left' });
  addEdge('RA_NW_L2', 'MN_N_L2_EXIT', { turn: 'left' });
  addEdge('RA_NW_L3', 'MN_N_L2_EXIT', { turn: 'left' });
  addEdge('RA_NW_L3', 'MN_N_L3_EXIT', { turn: 'left' });
  addEdge('RA_NW_L4', 'MN_N_L3_EXIT', { turn: 'left' });

  // 17. Side Access Road & Controlled Angle Parking Connections
  addEdge('MW_E_L1_MID', 'SIDE_N_BOT', { turn: 'left' });
  addEdge('SIDE_N_BOT', 'SIDE_N_MID');
  addEdge('SIDE_N_MID', 'SIDE_N_TOP');
  addEdge('SIDE_N_TOP', 'TOP_E_JCT_W', { turn: 'right' });
  addEdge('SIDE_N_TOP', 'TOP_W_JCT_W', { turn: 'left' });

  addEdge('TOP_W_JCT_W', 'SIDE_S_TOP', { turn: 'left' });
  addEdge('TOP_E_JCT_W', 'SIDE_S_TOP', { turn: 'right' });
  addEdge('SIDE_S_TOP', 'SIDE_S_MID');
  addEdge('SIDE_S_MID', 'SIDE_S_BOT');
  addEdge('SIDE_S_BOT', 'MW_E_L1_MID', { turn: 'left' });
  addEdge('SIDE_S_BOT', 'MW_E_L1_ENTRY', { turn: 'left' });

  // Controlled Angle Parking Zone (Can enter from Side Road OR from Minor North L1!)
  addEdge('SIDE_N_MID', 'AP_ENTRY', { turn: 'right' });
  addEdge('SIDE_S_MID', 'AP_ENTRY', { turn: 'left' });
  addEdge('MN_N_L1_EXIT', 'AP_EXIT_E', { turn: 'left' });
  addEdge('MN_N_L1_TOP', 'AP_EXIT_E', { turn: 'left' });
  addEdge('AP_EXIT_E', 'AP_AISLE_E');

  addEdge('AP_ENTRY', 'AP_AISLE_W');
  addEdge('AP_AISLE_W', 'AP_AISLE_E');
  addEdge('AP_AISLE_E', 'AP_AISLE_W');

  // Entering Angle Bays (Forward) & Exiting Angle Bays (Reverse!)
  addEdge('AP_AISLE_W', 'AP_BAY_TOP_1', { turn: 'left' });
  addEdge('AP_BAY_TOP_1', 'AP_AISLE_W', { isReverse: true, turn: 'right' });
  addEdge('AP_AISLE_W', 'AP_BAY_BOT_1', { turn: 'right' });
  addEdge('AP_BAY_BOT_1', 'AP_AISLE_W', { isReverse: true, turn: 'left' });

  addEdge('AP_AISLE_E', 'AP_BAY_TOP_2', { turn: 'left' });
  addEdge('AP_BAY_TOP_2', 'AP_AISLE_E', { isReverse: true, turn: 'right' });
  addEdge('AP_AISLE_E', 'AP_BAY_BOT_2', { turn: 'right' });
  addEdge('AP_BAY_BOT_2', 'AP_AISLE_E', { isReverse: true, turn: 'left' });

  // Exiting Controlled Angle Parking onto Minor Road North OR Side Access Road
  addEdge('AP_AISLE_E', 'AP_EXIT_E');
  addEdge('AP_EXIT_E', 'MN_N_L1_TOP', { turn: 'left' });
  addEdge('AP_AISLE_W', 'AP_ENTRY');
  addEdge('AP_ENTRY', 'SIDE_S_MID', { turn: 'left' });
  addEdge('AP_ENTRY', 'SIDE_N_MID', { turn: 'right' });

  // 18. Top Perimeter Two-Way Road & Flush Parking Connections
  addEdge('MN_N_L1_TOP', 'TOP_W_JCT_N', { turn: 'left' });
  addEdge('MN_N_L1_TOP', 'TOP_W_FLUSH_APPROACH', { turn: 'left' });
  addEdge('MN_N_L2_TOP', 'TOP_W_FLUSH_APPROACH', { turn: 'left' });
  addEdge('MN_N_L2_TOP', 'TOP_E_JCT_N', { turn: 'right' });
  addEdge('MN_N_L3_TOP', 'TOP_E_JCT_N', { turn: 'right' });
  addEdge('MN_N_L3_TOP', 'MN_S_L3_START', { turn: 'right' });

  // Eastbound Top Road
  addEdge('TOP_E_WEST', 'TOP_E_JCT_W');
  addEdge('TOP_E_JCT_W', 'TOP_E_ZEBRA1');
  addEdge('TOP_E_ZEBRA1', 'TOP_E_MID');
  addEdge('TOP_E_MID', 'TOP_E_JCT_N');
  addEdge('TOP_E_JCT_N', 'TOP_E_ZEBRA2');
  addEdge('TOP_E_ZEBRA2', 'TOP_E_EAST');
  addEdge('TOP_E_EAST', 'TOP_W_EAST', { turn: 'right' });
  addEdge('TOP_E_JCT_N', 'MN_S_L3_START', { turn: 'right' });
  addEdge('TOP_E_JCT_N', 'MN_S_L2_START', { turn: 'right' });
  addEdge('TOP_E_JCT_N', 'MN_S_L1_START', { turn: 'right' });

  // Westbound Top Road
  addEdge('TOP_W_EAST', 'TOP_W_ZEBRA2');
  addEdge('TOP_W_ZEBRA2', 'TOP_W_JCT_N');
  addEdge('TOP_W_JCT_N', 'MN_S_L1_START', { turn: 'left' });
  addEdge('TOP_W_JCT_N', 'MN_S_L2_START', { turn: 'left' });
  addEdge('TOP_W_JCT_N', 'MN_S_L3_START', { turn: 'left' });
  addEdge('TOP_W_JCT_N', 'TOP_W_FLUSH_APPROACH');
  addEdge('TOP_W_FLUSH_APPROACH', 'TOP_W_ZEBRA1');
  addEdge('TOP_W_ZEBRA1', 'TOP_W_JCT_W');
  addEdge('TOP_W_JCT_W', 'TOP_W_WEST');
  addEdge('TOP_W_WEST', 'TOP_E_WEST', { turn: 'right' });

  // Flush Parking (Enter in Reverse, Exit Forward!)
  addEdge('TOP_W_FLUSH_APPROACH', 'FLUSH_BAY_1', { isReverse: true, turn: 'left' });
  addEdge('FLUSH_BAY_1', 'TOP_W_ZEBRA1', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_1', 'TOP_E_MID', { isReverse: false, turn: 'right' });
  addEdge('TOP_W_FLUSH_APPROACH', 'FLUSH_BAY_2', { isReverse: true, turn: 'left' });
  addEdge('FLUSH_BAY_2', 'TOP_W_ZEBRA1', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_2', 'TOP_E_MID', { isReverse: false, turn: 'right' });

  return edges;
};

const ALL_EDGES = buildBoardEdges();

/**
 * ============================================================================
 * STRICT NTSA TRAFFIC RULE VALIDATOR (WITH 3 GOLDEN RULES & CLOSED LANES)
 * ============================================================================
 */
const validateNtsaRoute = (
  pathIds,
  targetId,
  blockedNodes,
  vehicleType = 'saloon',
  allowParkingShortcut = false,
  requiredWaypoints = []
) => {
  const violations = [];
  const passedRules = [];

  if (!pathIds || pathIds.length < 2) {
    return {
      isValid: false,
      score: 0,
      violations: ['Route is incomplete. Click connected waypoints from your car to the target spot.'],
      passedRules: []
    };
  }

  // 1. Check if destination was reached
  const reachedTarget = !targetId || pathIds[pathIds.length - 1] === targetId;
  if (!reachedTarget) {
    violations.push(
      `Destination Not Reached: Your car stopped at "${BOARD_NODES[pathIds[pathIds.length - 1]]?.label}", instead of "${BOARD_NODES[targetId]?.label}".`
    );
  } else {
    passedRules.push('Stopped accurately at the target position behind the reference car.');
  }

  // 1b. Check required intermediate waypoints (e.g. must park in a bay first)
  requiredWaypoints.forEach((reqId) => {
    if (!pathIds.includes(reqId)) {
      violations.push(
        `Missed Required Maneuver: You did not visit "${BOARD_NODES[reqId]?.label}" as instructed by the NTSA Examiner.`
      );
    } else {
      passedRules.push(`Completed required maneuver at "${BOARD_NODES[reqId]?.label}".`);
    }
  });

  // 2. Check for Closed Lane / Roadblock collisions
  pathIds.forEach((nid) => {
    if (blockedNodes.includes(nid)) {
      violations.push(
        `Closed Lane Violation (Rule 2): You drove through a CLOSED lane / barrier at "${BOARD_NODES[nid]?.label}". When a lane or gap is closed, you must shift lanes across broken lines or use the longest legal route!`
      );
    }
  });

  // 3. Check individual edge legality
  for (let i = 0; i < pathIds.length - 1; i++) {
    const u = pathIds[i];
    const v = pathIds[i + 1];
    const edge = ALL_EDGES.find((e) => e.from === u && e.to === v);
    if (!edge) {
      violations.push(`Invalid maneuver between "${BOARD_NODES[u]?.label}" and "${BOARD_NODES[v]?.label}".`);
    } else if (!edge.isLegal && edge.violationReason) {
      violations.push(edge.violationReason);
    }
  }

  // 4. Inspect Roundabout traversals (Entry -> RA Quads -> Exit)
  // Supports:
  // - 1 quad = 90° Left (1st Exit)
  // - 2 quads = 0° Straight (2nd Exit)
  // - 3 quads = 90° Right (3rd Exit)
  // - 4 quads = 180° U-Turn (4th Exit)
  // - 5 quads = 270° Q-Turn (5th Exit)
  // - 6 quads = 360° O-Turn (Full Circle back to Straight Exit!)
  let idx = 0;
  while (idx < pathIds.length) {
    const node = BOARD_NODES[pathIds[idx]];
    if (node && node.zone === 'roundabout') {
      const entryNode = idx > 0 ? BOARD_NODES[pathIds[idx - 1]] : null;
      const raSegment = [];
      while (idx < pathIds.length && BOARD_NODES[pathIds[idx]]?.zone === 'roundabout') {
        raSegment.push(BOARD_NODES[pathIds[idx]]);
        idx++;
      }
      const exitNode = idx < pathIds.length ? BOARD_NODES[pathIds[idx]] : null;
      const quadCount = raSegment.length;
      const turnLabels = {
        1: '90° Left Turn (1st Exit)',
        2: '0° Straight Ahead (2nd Exit)',
        3: '90° Right Turn (3rd Exit)',
        4: '180° U-Turn (4th Exit)',
        5: '270° Q-Turn (5th Exit)',
        6: '360° Full Roundabout O-Turn (6th Exit)'
      };
      const turnDesc = turnLabels[quadCount] || `${quadCount} quadrants`;

      const ringsUsed = new Set(raSegment.map((n) => n.ring));
      if (ringsUsed.size > 1) {
        violations.push(
          'Roundabout Lane Change Offense: You switched concentric rings inside the roundabout. Stay in your designated ring until exit.'
        );
      } else {
        passedRules.push(`Maintained strict lane discipline inside Roundabout Ring ${raSegment[0].ring}.`);
      }

      if (entryNode && exitNode) {
        const isMajor = entryNode.approach === 'MW' || entryNode.approach === 'ME';
        const isMinor = entryNode.approach === 'MS' || entryNode.approach === 'MN';
        const lane = entryNode.lane;
        const ringUsed = raSegment[0].ring;

        if (isMajor) {
          if (lane === 1 && ![1, 2].includes(quadCount)) {
            violations.push(
              `NTSA Major Road Lane 1 Violation: You executed a ${turnDesc} from Lane 1. Major Road Lane 1 ONLY allows 90° Left (1st exit) or 0° Straight (2nd exit).`
            );
          } else if (lane === 2 && quadCount !== 2) {
            violations.push(
              `NTSA Major Road Lane 2 Violation: You executed a ${turnDesc} from Lane 2. Major Road Lane 2 is strictly for going 0° Straight Ahead (2nd exit) ONLY!`
            );
          } else if (lane === 3 && ![2, 3].includes(quadCount)) {
            violations.push(
              `NTSA Major Road Lane 3 Violation: You executed a ${turnDesc} from Lane 3. Major Road Lane 3 ONLY allows 0° Straight (2nd exit) or 90° Right (3rd exit).`
            );
          } else if (lane === 4 && ![3, 4, 5, 6].includes(quadCount)) {
            violations.push(
              `NTSA Major Road Lane 4 Violation: You executed a ${turnDesc} from Innermost Lane 4. Major Road Lane 4 has 4 options via Ring 4: 90° Right, 180° U-Turn, 270° Q-Turn, or 360° O-Turn.`
            );
          } else {
            passedRules.push(
              `Correct Major Road Lane ${lane} maneuver: Executed legal ${turnDesc} via Roundabout Ring ${ringUsed}.`
            );
          }
        } else if (isMinor) {
          if (lane === 1 && ![1, 2].includes(quadCount)) {
            violations.push(
              `NTSA Minor Road Lane 1 Violation: You executed a ${turnDesc} from Minor Lane 1. Minor Road Lane 1 ONLY allows 90° Left or 0° Straight.`
            );
          } else if (lane === 2 && quadCount !== 2) {
            violations.push(
              `NTSA Minor Road Lane 2 Violation: You executed a ${turnDesc} from Minor Lane 2. Minor Road Lane 2 is strictly for 0° Straight ONLY!`
            );
          } else if (lane === 3) {
            // Minor Road Lane 3 has 5 options:
            // - Via Ring 3: 0° Straight (2 quads) or 90° Right (3 quads to Major L3)
            // - Via Ring 4: 90° Right (3 quads to Major L4), 180° U-Turn (4 quads), or 270° Q-Turn (5 quads)
            if (ringUsed === 3 && ![2, 3].includes(quadCount)) {
              violations.push(
                `NTSA Minor Road Lane 3 (Ring 3) Violation: When Minor Lane 3 enters Roundabout Ring 3, it can ONLY go 0° Straight or 90° Right (into Major Lane 3). For U-turns (180°) or 270° turns, you must enter Innermost Ring 4!`
              );
            } else if (ringUsed === 4 && ![3, 4, 5, 6].includes(quadCount)) {
              violations.push(
                `NTSA Minor Road Lane 3 (Ring 4) Violation: When Minor Lane 3 skips Ring 3 to enter Innermost Ring 4, it cannot go straight (0°); it must turn 90° Right, 180° U-Turn, or 270° Q-Turn.`
              );
            } else {
              passedRules.push(
                `Mastered Minor Road Lane 3 (5-Options Rule): Executed ${turnDesc} via Roundabout Ring ${ringUsed}!`
              );
            }
          }
        }
      }
    } else {
      idx++;
    }
  }

  // 5. Check Controlled Angle Parking & Rule 3 (Parking as Last Resort)
  const startInParking =
    BOARD_NODES[pathIds[0]]?.zone === 'angle_parking' ||
    BOARD_NODES[pathIds[0]]?.zone === 'angle_parking_bay';
  const targetInParking =
    BOARD_NODES[targetId]?.zone === 'angle_parking' ||
    BOARD_NODES[targetId]?.zone === 'angle_parking_bay' ||
    requiredWaypoints.some((w) => BOARD_NODES[w]?.zone === 'angle_parking_bay');

  const visitedAngleZone = pathIds.some((id) => BOARD_NODES[id]?.zone === 'angle_parking');
  const visitedAngleBay = pathIds.some((id) => BOARD_NODES[id]?.zone === 'angle_parking_bay');

  if (visitedAngleZone || visitedAngleBay) {
    if (vehicleType === 'lorry') {
      violations.push(
        'Controlled Angle Parking Violation: Lorries/Buses are prohibited from entering Controlled Angle Parking! Only saloon cars are permitted.'
      );
    }
    if (!startInParking && !targetInParking && !allowParkingShortcut) {
      violations.push(
        'NTSA Rule 1 & Rule 3 Violation (Illegal Parking Shortcut): You drove through the Controlled Angle Parking zone when an open road route was available! Under Rule 3, parking may ONLY be used as the last resort when all other road routes are closed.'
      );
    } else if (allowParkingShortcut && visitedAngleZone) {
      passedRules.push(
        'Applied NTSA Rule 3 (Parking as Last Resort): Correctly used the Controlled Parking route because all alternative road routes were closed!'
      );
    } else if (visitedAngleBay || startInParking) {
      passedRules.push('Executed proper Controlled Angle Parking discipline (Forward In, Reverse Out).');
    }
  }

  // 6. Check Flush Parking Rules
  const visitedFlushBay = pathIds.some((id) => BOARD_NODES[id]?.zone === 'flush_parking_bay');
  if (visitedFlushBay) {
    passedRules.push('Properly executed Flush Parking (Reversed into bay, drove forward to exit).');
  }

  // 7. Check Stopping on Pedestrian Zebra Crossing
  const lastNode = BOARD_NODES[pathIds[pathIds.length - 1]];
  if (lastNode?.zone === 'zebra') {
    violations.push(
      'Zebra Crossing Offense: You stopped your vehicle directly on a Pedestrian Zebra Crossing!'
    );
  }

  const uniqueViolations = Array.from(new Set(violations));
  const uniquePassed = Array.from(new Set(passedRules));
  const isValid = uniqueViolations.length === 0;
  const score = isValid ? 100 : Math.max(0, 100 - uniqueViolations.length * 35);

  return {
    isValid,
    score,
    violations: uniqueViolations,
    passedRules: uniquePassed
  };
};

/**
 * ============================================================================
 * BREADTH-FIRST SEARCH (BFS) AUTO-SOLVER FOR SHORTEST LEGAL NTSA ROUTE
 * ============================================================================
 */
const findShortestValidNtsaRoute = (
  startId,
  targetId,
  blockedNodes = [],
  vehicleType = 'saloon',
  allowParkingShortcut = false,
  requiredWaypoints = []
) => {
  if (!startId || !targetId) return null;
  if (startId === targetId) return [startId];

  const queue = [[startId]];
  const MAX_ITERATIONS = 12000;
  let iterations = 0;

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const currentPath = queue.shift();
    const lastNodeId = currentPath[currentPath.length - 1];

    if (lastNodeId === targetId) {
      const check = validateNtsaRoute(
        currentPath,
        targetId,
        blockedNodes,
        vehicleType,
        allowParkingShortcut,
        requiredWaypoints
      );
      if (check.isValid) {
        return currentPath;
      }
      continue;
    }

    if (currentPath.length > 17) continue;

    const outgoing = ALL_EDGES.filter((e) => e.from === lastNodeId && e.isLegal);
    for (const edge of outgoing) {
      const nextId = edge.to;
      if (blockedNodes.includes(nextId)) continue;

      // Allow full 360° O-turn on Roundabout Ring 4, otherwise prevent repeating the same directed edge
      const edgeRepeatCount = currentPath.filter(
        (nid, i) => i < currentPath.length - 1 && nid === lastNodeId && currentPath[i + 1] === nextId
      ).length;
      const isRing4 = BOARD_NODES[lastNodeId]?.ring === 4 && BOARD_NODES[nextId]?.ring === 4;
      if (edgeRepeatCount >= (isRing4 ? 2 : 1)) continue;

      queue.push([...currentPath, nextId]);
    }
  }
  return null;
};

/**
 * ============================================================================
 * 10 AUTHENTIC KENYAN DRIVING SCHOOL (NTSA & YOUTUBE) CHALLENGES
 * ("Move Car X Behind Car Y" with Closed Lanes & Step-by-Step Solutions)
 * ============================================================================
 */
const NTSA_CHALLENGES = [
  {
    id: 'challenge_1',
    number: 1,
    title: 'Red Car Behind Blue Car (Median Gap Closed)',
    badge: 'Rule 2 • Closed Gap',
    ruleApplied: 'Rule 2: Use the longest and most correct route without using parking.',
    carColor: '#ef4444',
    carLabel: 'RED CAR',
    vehicleType: 'saloon',
    startNode: 'MW_E_L4_START',
    targetNode: 'MW_W_L4_MID',
    blockedNodes: ['GAP_W1'],
    allowParkingShortcut: false,
    requiredWaypoints: [],
    parkedCars: [
      { id: 'blue_target_1', x: 300, y: 510, angle: 270, color: '#3b82f6', label: 'BLUE CAR' }
    ],
    prompt:
      'Examiner Question: "Move the RED CAR from Major Road West (Lane 4) and park it directly behind the BLUE CAR on the opposite Westbound carriageway. Notice that Median Gap W1 is CLOSED by a barrier!"',
    hint: 'Since the shortest U-turn at Median Gap W1 is closed, apply Rule 2: continue straight into Roundabout Ring 4 and execute a 180° U-turn (4 quadrants: NW → NE → SE → SW) to exit onto Major Westbound Lane 4 behind the Blue Car.',
    solutionPath: [
      'MW_E_L4_START',
      'MW_E_L4_MID',
      'MW_E_L4_ENTRY',
      'RA_NW_L4',
      'RA_NE_L4',
      'RA_SE_L4',
      'RA_SW_L4',
      'MW_W_L4_EXIT',
      'MW_W_L4_MID'
    ],
    solutionSteps: [
      'Start in Major Road Eastbound Lane 4 (innermost lane).',
      'Proceed past the CLOSED Median Gap W1 towards the roundabout.',
      'Enter Roundabout Innermost Ring 4 (RA_NW_L4) with your right indicator on.',
      'Circulate clockwise through 4 quadrants (NW → NE → SE → SW) for a legal 180° U-Turn.',
      'Exit from Ring 4 into Major Road Westbound Lane 4 and stop directly behind the Blue Car.'
    ]
  },
  {
    id: 'challenge_2',
    number: 2,
    title: 'Red Car Behind Yellow Car (Parking as Last Resort)',
    badge: 'Rule 3 • Last Resort',
    ruleApplied: 'Rule 3: Use controlled parking as the last resort when all road routes are closed.',
    carColor: '#ef4444',
    carLabel: 'RED CAR',
    vehicleType: 'saloon',
    startNode: 'MN_N_L1_TOP',
    targetNode: 'SIDE_S_BOT',
    blockedNodes: ['TOP_W_FLUSH_APPROACH', 'RA_NE_L4'],
    allowParkingShortcut: true,
    requiredWaypoints: [],
    parkedCars: [
      { id: 'yellow_target_2', x: 350, y: 335, angle: 180, color: '#eab308', label: 'YELLOW CAR' }
    ],
    prompt:
      'Examiner Question (Famous YouTube Exam Trick): "Move the RED CAR from Minor Road North (Lane 1) to stop behind the YELLOW CAR on the Side Access Road. Both the Top Perimeter Westbound road AND Roundabout Ring 4 are CLOSED!"',
    hint: 'Normally driving through Controlled Angle Parking without parking is an instant fail. However, because BOTH road routes (Top Westbound Road and Roundabout Ring 4) are closed, NTSA Rule 3 allows using Controlled Angle Parking as your last resort!',
    solutionPath: [
      'MN_N_L1_TOP',
      'AP_EXIT_E',
      'AP_AISLE_E',
      'AP_AISLE_W',
      'AP_ENTRY',
      'SIDE_S_MID',
      'SIDE_S_BOT'
    ],
    solutionSteps: [
      'Inspect the board: Top Road Westbound is CLOSED, and Roundabout Ring 4 is CLOSED.',
      'Invoke NTSA Rule 3 (Use Parking as Last Resort).',
      'Turn left from Minor Road North Lane 1 into the Controlled Parking zone (AP_EXIT_E).',
      'Pass carefully through the parking aisle (AP_AISLE_E → AP_AISLE_W → AP_ENTRY).',
      'Turn left onto the Side Access Road Southbound and stop directly behind the Yellow Car.'
    ]
  },
  {
    id: 'challenge_3',
    number: 3,
    title: 'Blue Car (In Angle Parking) Behind Orange Car',
    badge: 'Dynasty Exam Classic',
    ruleApplied: 'Controlled Parking Exit + Minor Road Lane 2 Straight Rule.',
    carColor: '#3b82f6',
    carLabel: 'BLUE CAR',
    vehicleType: 'saloon',
    startNode: 'AP_BAY_TOP_2',
    targetNode: 'MS_S_L3_END',
    blockedNodes: ['MW_E_L4_ENTRY'],
    allowParkingShortcut: false,
    requiredWaypoints: [],
    parkedCars: [
      { id: 'orange_target_3', x: 839, y: 792, angle: 180, color: '#f97316', label: 'ORANGE CAR' }
    ],
    prompt:
      'Examiner Question: "Move the BLUE CAR currently parked inside Controlled Angle Parking (Bay #2) and park it behind the ORANGE CAR on Minor Road South (Inner Lane 3). Major West Lane 4 is CLOSED!"',
    hint: 'First reverse out of Angle Bay #2 into the aisle (AP_AISLE_E), exit left onto Minor Road North (MN_N_L1_TOP), turn onto the Top Perimeter Road to join Minor North Southbound Lane 2 (MN_S_L2_START), go 0° Straight across the roundabout via Ring 2, and shift across the broken line into Minor South Lane 3 behind the Orange Car!',
    solutionPath: [
      'AP_BAY_TOP_2',
      'AP_AISLE_E',
      'AP_EXIT_E',
      'MN_N_L1_TOP',
      'TOP_W_JCT_N',
      'MN_S_L2_START',
      'MN_S_L2_ENTRY',
      'RA_NE_L2',
      'RA_SE_L2',
      'MS_S_L2_EXIT',
      'MS_S_L3_END'
    ],
    solutionSteps: [
      'Reverse out of Controlled Angle Parking Bay #2 into the eastern aisle (AP_AISLE_E).',
      'Drive forward out of the parking exit (AP_EXIT_E) and turn left onto Minor Road North (MN_N_L1_TOP).',
      'At the Top Perimeter Road junction (TOP_W_JCT_N), turn left into Minor Road North Southbound Lane 2 (MN_S_L2_START).',
      'Proceed 0° Straight across the roundabout via Concentric Ring 2 (RA_NE_L2 → RA_SE_L2).',
      'Exit into Minor Road South (MS_S_L2_EXIT) and shift across the broken white line into Lane 3 (MS_S_L3_END) behind the Orange Car.'
    ]
  },
  {
    id: 'challenge_4',
    number: 4,
    title: 'Red Car Behind Green Car (Lane 3 Closed Ahead)',
    badge: 'Broken Line Shift',
    ruleApplied: 'Lane Changing Rule: You may only change lanes across broken white lines before the solid approach lines.',
    carColor: '#ef4444',
    carLabel: 'RED CAR',
    vehicleType: 'saloon',
    startNode: 'MW_E_L3_START',
    targetNode: 'ME_E_L3_END',
    blockedNodes: ['MW_E_L3_ENTRY'],
    allowParkingShortcut: false,
    requiredWaypoints: [],
    parkedCars: [
      { id: 'green_target_4', x: 1178, y: 406, angle: 90, color: '#22c55e', label: 'GREEN CAR' }
    ],
    prompt:
      'Examiner Question: "Move the RED CAR from Major Road West (Lane 3) to stop behind the GREEN CAR on Major Road East (Lane 3). Observe that Major West Lane 3 Entry at the roundabout is CLOSED!"',
    hint: 'Because Lane 3 is closed at the roundabout entrance, shift left across the broken white lines into Lane 2 (MW_E_L2_MID), go 0° Straight through Roundabout Ring 2 (NW → NE), exit at ME_E_L2_EXIT, and shift right across the broken white lines into ME_E_L3_END behind the Green Car!',
    solutionPath: [
      'MW_E_L3_START',
      'MW_E_L2_MID',
      'MW_E_L2_ENTRY',
      'RA_NW_L2',
      'RA_NE_L2',
      'ME_E_L2_EXIT',
      'ME_E_L3_END'
    ],
    solutionSteps: [
      'Start on Major Road West Lane 3 (MW_E_L3_START) and spot the roadblock ahead at Lane 3 Entry.',
      'Signal left and shift across the broken white line into Lane 2 (MW_E_L2_MID) before the solid line begins.',
      'Enter Roundabout Ring 2 (RA_NW_L2) and drive 0° Straight Ahead (to RA_NE_L2).',
      'Exit the roundabout onto Major Road East Lane 2 (ME_E_L2_EXIT).',
      'Signal right and shift across the broken white line into Lane 3 (ME_E_L3_END) behind the Green Car.'
    ]
  },
  {
    id: 'challenge_5',
    number: 5,
    title: 'Yellow Car Behind Blue Car (Minor Lane 3 • Ring 3 Closed)',
    badge: 'Minor L3 • 5 Options',
    ruleApplied: 'Minor Road Lane 3 has 5 options: it can enter Ring 3 OR skip directly into Ring 4!',
    carColor: '#eab308',
    carLabel: 'YELLOW CAR',
    vehicleType: 'saloon',
    startNode: 'MN_S_L3_START',
    targetNode: 'MW_W_L4_END',
    blockedNodes: ['RA_NE_L3'],
    allowParkingShortcut: false,
    requiredWaypoints: [],
    parkedCars: [
      { id: 'blue_target_5', x: 82, y: 510, angle: 270, color: '#3b82f6', label: 'BLUE CAR' }
    ],
    prompt:
      'Examiner Question: "Drive the YELLOW CAR from Minor Road North (Innermost Lane 3) to stop behind the BLUE CAR on Major Road Westbound (Lane 4). Roundabout Ring 3 is CLOSED!"',
    hint: 'On the 3-lane Minor Road, Lane 3 has 5 options! Since Roundabout Ring 3 is closed and your target is on Major Road Lane 4, enter Roundabout Ring 4 directly (RA_NE_L4 → RA_SE_L4 → RA_SW_L4) for a 90° Right Turn into Major Westbound Lane 4!',
    solutionPath: [
      'MN_S_L3_START',
      'MN_S_L3_ENTRY',
      'RA_NE_L4',
      'RA_SE_L4',
      'RA_SW_L4',
      'MW_W_L4_EXIT',
      'MW_W_L4_MID',
      'MW_W_L4_END'
    ],
    solutionSteps: [
      'Start on Minor Road North Southbound Lane 3 (MN_S_L3_START) and approach the roundabout.',
      'Use Minor Road Lane 3’s direct entry into Innermost Roundabout Ring 4 (RA_NE_L4), bypassing the closed Ring 3.',
      'Travel clockwise through 3 quadrants (NE → SE → SW) for a 90° Right Turn.',
      'Exit Ring 4 onto Major Road Westbound Inner Lane 4 (MW_W_L4_EXIT).',
      'Continue straight along Lane 4 to stop behind the Blue Car (MW_W_L4_END).'
    ]
  },
  {
    id: 'challenge_6',
    number: 6,
    title: 'Orange Car Behind Red Car (Full 360° O-Turn Exam Trick)',
    badge: '360° O-Turn Trick',
    ruleApplied: 'Major Road Lane 4 has 4 options via Ring 4: 90° Right, 180° U-Turn, 270° Q-Turn, and 360° O-Turn!',
    carColor: '#f97316',
    carLabel: 'ORANGE CAR',
    vehicleType: 'saloon',
    startNode: 'MW_E_L4_MID',
    targetNode: 'ME_E_L4_END',
    blockedNodes: ['GAP_W1', 'RA_NE_L3'],
    allowParkingShortcut: false,
    requiredWaypoints: ['RA_SW_L4'],
    parkedCars: [
      { id: 'red_target_6', x: 1178, y: 430, angle: 90, color: '#ef4444', label: 'RED CAR' }
    ],
    prompt:
      'Examiner Question: "Move the ORANGE CAR from Major Road West (Lane 4) to stop behind the RED CAR on Major Road East (Lane 4). Remember: Major Road Lane 4 CANNOT go 0° Straight directly! Execute a full 360° O-Turn around Roundabout Ring 4 first!"',
    hint: 'Major Road Lane 4 is strictly forbidden from going 0° Straight (2 quadrants). To reach Major Road East from Lane 4, enter Ring 4 at NW and complete a full 360° O-Turn (NW → NE → SE → SW → NW → NE, 6 quadrants) before exiting into Major East Lane 4!',
    solutionPath: [
      'MW_E_L4_MID',
      'MW_E_L4_ENTRY',
      'RA_NW_L4',
      'RA_NE_L4',
      'RA_SE_L4',
      'RA_SW_L4',
      'RA_NW_L4',
      'RA_NE_L4',
      'ME_E_L4_EXIT',
      'ME_E_L4_END'
    ],
    solutionSteps: [
      'Recall the NTSA rule: Major Road Lane 4 CANNOT go 0° Straight across the roundabout (only 90° R, 180° U, 270° Q, or 360° O).',
      'Enter Roundabout Innermost Ring 4 at RA_NW_L4.',
      'Stay in Ring 4 for a full 360° clockwise revolution (NW → NE → SE → SW → NW → NE).',
      'After completing the 360° O-Turn at RA_NE_L4, exit left into Major Road East Lane 4 (ME_E_L4_EXIT).',
      'Proceed to stop directly behind the Red Car at ME_E_L4_END.'
    ]
  },
  {
    id: 'challenge_7',
    number: 7,
    title: 'Green Car Behind White Car (270° Q-Turn + Median U-Turn)',
    badge: '270° Q-Turn',
    ruleApplied: 'Combining a 270° Q-Turn on Ring 4 with a Median Crossover U-Turn when direct exits are closed.',
    carColor: '#22c55e',
    carLabel: 'GREEN CAR',
    vehicleType: 'saloon',
    startNode: 'ME_W_L4_START',
    targetNode: 'MW_E_L4_MID',
    blockedNodes: ['MW_W_L4_EXIT', 'GAP_E1'],
    allowParkingShortcut: false,
    requiredWaypoints: [],
    parkedCars: [
      { id: 'white_target_7', x: 410, y: 430, angle: 90, color: '#f8fafc', label: 'WHITE CAR' }
    ],
    prompt:
      'Examiner Question: "Move the GREEN CAR from Major Road East (Westbound Lane 4) to stop behind the WHITE CAR on Major Road West (Eastbound Lane 4). Major Westbound Exit L4 and East Gap E1 are CLOSED!"',
    hint: 'Since you cannot exit directly onto Major Westbound Lane 4 (MW_W_L4_EXIT is closed), exit earlier onto Minor Road South Lane 3 (MS_S_L3_EXIT), use the Minor South Median Gap (GAP_M1) to U-turn into Minor Northbound Lane 3, enter Ring 4 (RA_SW_L4), and do a 270° Q-turn to MW_W_L3_MID or use the open West route!',
    solutionPath: [
      'ME_W_L4_START',
      'ME_W_L3_ENTRY',
      'RA_SE_L3',
      'RA_SW_L3',
      'MW_W_L3_EXIT',
      'MW_W_L4_MID',
      'MW_W_L4_END',
      'GAP_W2',
      'MW_E_L4_START',
      'MW_E_L4_MID'
    ],
    solutionSteps: [
      'Start on Major Road East Westbound Lane 4 (ME_W_L4_START).',
      'Because Major Westbound Exit Lane 4 is CLOSED, shift across the broken line into Lane 3 Entry (ME_W_L3_ENTRY).',
      'Go 0° Straight through Roundabout Ring 3 (RA_SE_L3 → RA_SW_L3) and exit into Major Westbound Lane 3 (MW_W_L3_EXIT).',
      'Shift back into Inner Lane 4 across the broken line (MW_W_L4_MID → MW_W_L4_END).',
      'Make a U-turn through Far-West Median Gap W2 (GAP_W2) into Eastbound Lane 4 and stop behind the White Car (MW_E_L4_MID).'
    ]
  },
  {
    id: 'challenge_8',
    number: 8,
    title: 'Controlled Angle Parking (Furthest Free Bay Rule)',
    badge: 'Parking Discipline',
    ruleApplied: 'Angle Parking Rule: Park in the furthest unoccupied bay (Forward In, Reverse Out).',
    carColor: '#ef4444',
    carLabel: 'RED CAR',
    vehicleType: 'saloon',
    startNode: 'MW_E_L1_START',
    targetNode: 'MN_N_L1_TOP',
    blockedNodes: ['AP_BAY_TOP_1'],
    allowParkingShortcut: false,
    requiredWaypoints: ['AP_BAY_TOP_2'],
    parkedCars: [
      { id: 'yellow_target_8', x: 743, y: 125, angle: 0, color: '#eab308', label: 'YELLOW CAR' }
    ],
    prompt:
      'Examiner Question: "Take the RED CAR from Major Road West (Lane 1), turn into Controlled Angle Parking, park forward in the furthest free Top Bay (Bay #2, since Bay #1 is closed/occupied), reverse out, and stop behind the YELLOW CAR on Minor Road North."',
    hint: 'Turn left from MW_E_L1_MID onto Side Access Road (SIDE_N_BOT → SIDE_N_MID), turn right into Angle Parking (AP_ENTRY → AP_AISLE_W → AP_AISLE_E), enter AP_BAY_TOP_2 forward, reverse back to AP_AISLE_E, and exit via AP_EXIT_E to MN_N_L1_TOP.',
    solutionPath: [
      'MW_E_L1_START',
      'MW_E_L1_MID',
      'SIDE_N_BOT',
      'SIDE_N_MID',
      'AP_ENTRY',
      'AP_AISLE_W',
      'AP_AISLE_E',
      'AP_BAY_TOP_2',
      'AP_AISLE_E',
      'AP_EXIT_E',
      'MN_N_L1_TOP'
    ],
    solutionSteps: [
      'Drive along Major Road West Outermost Lane 1 (MW_E_L1_START → MW_E_L1_MID).',
      'Turn 90° Left onto the Side Access Road Northbound (SIDE_N_BOT → SIDE_N_MID).',
      'Turn right into the Controlled Angle Parking Entrance (AP_ENTRY) and drive to the eastern aisle (AP_AISLE_E).',
      'Park forward into the furthest available bay (AP_BAY_TOP_2), then reverse back out into AP_AISLE_E.',
      'Exit via AP_EXIT_E and turn left onto Minor Road North (MN_N_L1_TOP) behind the Yellow Car.'
    ]
  },
  {
    id: 'challenge_9',
    number: 9,
    title: 'White Car Flush Parking & Stop Behind Red Car',
    badge: 'Flush Reverse In',
    ruleApplied: 'Flush (Uncontrolled) Parking Rule: Drive past the bay, reverse in, and exit forward.',
    carColor: '#f8fafc',
    carLabel: 'WHITE CAR',
    vehicleType: 'saloon',
    startNode: 'MS_N_L1_START',
    targetNode: 'SIDE_S_BOT',
    blockedNodes: ['FLUSH_BAY_2'],
    allowParkingShortcut: false,
    requiredWaypoints: ['FLUSH_BAY_1'],
    parkedCars: [
      { id: 'red_target_9', x: 350, y: 335, angle: 180, color: '#ef4444', label: 'RED CAR' }
    ],
    prompt:
      'Examiner Question: "Move the WHITE CAR from Minor Road South (Lane 1) straight across the roundabout, reverse into Flush Parking Bay #1, then exit forward and stop behind the RED CAR on the Side Access Road."',
    hint: 'Go 0° Straight from Minor South Lane 1 via Roundabout Ring 1 (RA_SW_L1 → RA_NW_L1) to Minor North Lane 1, turn left onto Top Westbound Road (TOP_W_FLUSH_APPROACH), reverse into FLUSH_BAY_1, drive forward to TOP_W_ZEBRA1 → TOP_W_JCT_W, and turn left down the Side Road to SIDE_S_BOT!',
    solutionPath: [
      'MS_N_L1_START',
      'MS_N_L1_ENTRY',
      'RA_SW_L1',
      'RA_NW_L1',
      'MN_N_L1_EXIT',
      'MN_N_L1_TOP',
      'TOP_W_FLUSH_APPROACH',
      'FLUSH_BAY_1',
      'TOP_W_ZEBRA1',
      'TOP_W_JCT_W',
      'SIDE_S_TOP',
      'SIDE_S_MID',
      'SIDE_S_BOT'
    ],
    solutionSteps: [
      'Start on Minor Road South Lane 1 and enter Roundabout Ring 1 (RA_SW_L1).',
      'Proceed 0° Straight to RA_NW_L1 and exit onto Minor Road North Lane 1 (MN_N_L1_EXIT → MN_N_L1_TOP).',
      'Turn left onto the Top Perimeter Road (TOP_W_FLUSH_APPROACH) and reverse into Flush Parking Bay #1 (FLUSH_BAY_1).',
      'Drive forward out of Flush Bay #1 across Zebra Crossing #1 to the Side Road junction (TOP_W_JCT_W).',
      'Turn left onto the Side Access Road Southbound and stop behind the Red Car (SIDE_S_BOT).'
    ]
  },
  {
    id: 'challenge_10',
    number: 10,
    title: 'Examiner’s Ultimate Closed-Board Marathon',
    badge: 'Mastery Exam',
    ruleApplied: 'Rule 2 Mastery: Combining Perimeter Road detours, Broken-Line shifts, and Roundabout Ring 4.',
    carColor: '#22c55e',
    carLabel: 'GREEN CAR',
    vehicleType: 'saloon',
    startNode: 'MW_E_L1_START',
    targetNode: 'MW_W_L4_MID',
    blockedNodes: ['MW_E_L1_ENTRY', 'MW_E_L2_MID', 'GAP_W1'],
    allowParkingShortcut: false,
    requiredWaypoints: [],
    parkedCars: [
      { id: 'blue_target_10', x: 300, y: 510, angle: 270, color: '#3b82f6', label: 'BLUE CAR' }
    ],
    prompt:
      'Examiner Question: "Ultimate NTSA Mastery Test! Move the GREEN CAR from Major Road West (Lane 1) to stop behind the BLUE CAR on Major Road Westbound (Lane 4). Notice that Major West Lane 1 Entry, Major West Lane 2 Mid, AND Median Gap W1 are all CLOSED!"',
    hint: 'Since Lane 1 Entry and Lane 2 Mid are closed ahead on Major West, turn left at MW_E_L1_MID onto the Side Access Road (SIDE_N_BOT → SIDE_N_TOP), follow the Top Perimeter Road Eastbound (TOP_E_JCT_W → TOP_E_JCT_N), turn right into Minor Road North Southbound Lane 3 (MN_S_L3_START), enter Roundabout Ring 4 (RA_NE_L4), and turn 90° Right onto Major Westbound Lane 4 behind the Blue Car!',
    solutionPath: [
      'MW_E_L1_START',
      'MW_E_L1_MID',
      'SIDE_N_BOT',
      'SIDE_N_MID',
      'SIDE_N_TOP',
      'TOP_E_JCT_W',
      'TOP_E_ZEBRA1',
      'TOP_E_MID',
      'TOP_E_JCT_N',
      'MN_S_L3_START',
      'MN_S_L3_ENTRY',
      'RA_NE_L4',
      'RA_SE_L4',
      'RA_SW_L4',
      'MW_W_L4_EXIT',
      'MW_W_L4_MID'
    ],
    solutionSteps: [
      'Start on Major Road West Lane 1 (MW_E_L1_START) and advance to the Side Road junction (MW_E_L1_MID).',
      'Because Major West Lane 1 Entry and Lane 2 are CLOSED ahead, turn 90° Left onto the Side Access Road Northbound (SIDE_N_BOT → SIDE_N_TOP).',
      'Turn right onto the Top Perimeter Road Eastbound (TOP_E_JCT_W → TOP_E_ZEBRA1 → TOP_E_MID → TOP_E_JCT_N) without using Controlled Parking.',
      'Turn 90° Right into Minor Road North Southbound Innermost Lane 3 (MN_S_L3_START → MN_S_L3_ENTRY).',
      'Enter Roundabout Innermost Ring 4 (RA_NE_L4 → RA_SE_L4 → RA_SW_L4) and exit into Major Road Westbound Lane 4 behind the Blue Car!'
    ]
  }
];

/**
 * ============================================================================
 * WEB AUDIO SYNTHESIZER FOR REALISTIC CAR BLINKERS & EXAM FEEDBACK
 * ============================================================================
 */
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

          {/* ==================== THE SVG MODEL TOWN BOARD ==================== */}
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
              viewBox="0 0 1200 820"
              className="w-full h-auto block"
              style={{ touchAction: 'manipulation' }}
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
                <rect x="20" y="346" width="1160" height="96" fill="#23272a" />
                <rect x="20" y="498" width="1160" height="96" fill="#23272a" />
                <rect x="20" y="442" width="1160" height="56" fill="#156c36" />

                {/* Median Crossover Gap W2 */}
                <rect x="44" y="440" width="40" height="60" fill="#23272a" />
                <path
                  d="M 86 470 Q 150 446 230 456 L 395 466 L 395 474 L 230 484 Q 150 494 86 470 Z"
                  fill="#1f8a4c"
                  stroke="#facc15"
                  strokeWidth="1.5"
                />

                {/* Median Crossover Gap W1 */}
                <rect x="492" y="440" width="42" height="60" fill="#23272a" />
                <path d="M 492 442 L 492 498 M 534 442 L 534 498" stroke="#facc15" strokeWidth="2.5" />

                {/* Median Crossover Gap E1 */}
                <rect x="1048" y="440" width="40" height="60" fill="#23272a" />
                <path d="M 1048 442 L 1048 498 M 1088 442 L 1088 498" stroke="#facc15" strokeWidth="2.5" />

                {/* Outer & Median Curbs */}
                <line x1="20" y1="346" x2="336" y2="346" stroke="#facc15" strokeWidth="2.5" />
                <line x1="390" y1="346" x2="650" y2="346" stroke="#facc15" strokeWidth="2.5" />
                <line x1="980" y1="346" x2="1180" y2="346" stroke="#facc15" strokeWidth="2.5" />

                <line x1="20" y1="594" x2="650" y2="594" stroke="#facc15" strokeWidth="2.5" />
                <line x1="980" y1="594" x2="1180" y2="594" stroke="#facc15" strokeWidth="2.5" />

                <line x1="84" y1="442" x2="492" y2="442" stroke="#facc15" strokeWidth="2.2" />
                <line x1="534" y1="442" x2="645" y2="442" stroke="#facc15" strokeWidth="2.2" />
                <line x1="985" y1="442" x2="1048" y2="442" stroke="#facc15" strokeWidth="2.2" />
                <line x1="1088" y1="442" x2="1180" y2="442" stroke="#facc15" strokeWidth="2.2" />

                <line x1="84" y1="498" x2="492" y2="498" stroke="#facc15" strokeWidth="2.2" />
                <line x1="534" y1="498" x2="645" y2="498" stroke="#facc15" strokeWidth="2.2" />
                <line x1="985" y1="498" x2="1048" y2="498" stroke="#facc15" strokeWidth="2.2" />
                <line x1="1088" y1="498" x2="1180" y2="498" stroke="#facc15" strokeWidth="2.2" />

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

                {/* Painted Lane Numbers & Directional Arrows on Major West Approach */}
                {[
                  { lane: 1, y: 358 },
                  { lane: 2, y: 382 },
                  { lane: 3, y: 406 },
                  { lane: 4, y: 430 }
                ].map((item) => (
                  <g key={`mw-label-${item.lane}`}>
                    <text
                      x="568"
                      y={item.y + 4}
                      fill="#f8fafc"
                      fontSize="13"
                      fontWeight="900"
                      fontFamily="sans-serif"
                    >
                      {item.lane}
                    </text>
                    <line
                      x1="585"
                      y1={item.y}
                      x2="612"
                      y2={item.y}
                      stroke="#f8fafc"
                      strokeWidth="2.2"
                      markerEnd="url(#roadArrowWhite)"
                    />
                  </g>
                ))}

                {/* Painted Lane Numbers & Directional Arrows on Major East Approach */}
                {[
                  { lane: 4, y: 510 },
                  { lane: 3, y: 534 },
                  { lane: 2, y: 558 },
                  { lane: 1, y: 582 }
                ].map((item) => (
                  <g key={`me-label-${item.lane}`}>
                    <text
                      x="1052"
                      y={item.y + 4}
                      fill="#f8fafc"
                      fontSize="13"
                      fontWeight="900"
                      fontFamily="sans-serif"
                    >
                      {item.lane}
                    </text>
                    <line
                      x1="1044"
                      y1={item.y}
                      x2="1018"
                      y2={item.y}
                      stroke="#f8fafc"
                      strokeWidth="2.2"
                      markerEnd="url(#roadArrowWhite)"
                    />
                  </g>
                ))}
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

                {[
                  { lane: 1, x: 743 },
                  { lane: 2, x: 767 },
                  { lane: 3, x: 791 }
                ].map((item) => (
                  <g key={`ms-label-${item.lane}`}>
                    <text
                      x={item.x}
                      y="702"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="13"
                      fontWeight="900"
                    >
                      {item.lane}
                    </text>
                    <line
                      x1={item.x}
                      y1="686"
                      x2={item.x}
                      y2="658"
                      stroke="#f8fafc"
                      strokeWidth="2.2"
                      markerEnd="url(#roadArrowWhite)"
                    />
                  </g>
                ))}

                {[
                  { lane: 3, x: 839 },
                  { lane: 2, x: 863 },
                  { lane: 1, x: 887 }
                ].map((item) => (
                  <g key={`mn-label-${item.lane}`}>
                    <text
                      x={item.x}
                      y="244"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="13"
                      fontWeight="900"
                    >
                      {item.lane}
                    </text>
                    <line
                      x1={item.x}
                      y1="252"
                      x2={item.x}
                      y2="278"
                      stroke="#f8fafc"
                      strokeWidth="2.2"
                      markerEnd="url(#roadArrowWhite)"
                    />
                  </g>
                ))}
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

              {/* 13. ACTIVE PLAYER 3D-STYLED TOY CAR (WITH BLINKERS, REVERSE LIGHTS & LABEL) */}
              <g
                id="player-active-car"
                transform={`translate(${carPose.x}, ${carPose.y})`}
                style={{ pointerEvents: 'none' }}
              >
                <g transform={`rotate(${carPose.angle})`} filter="url(#carShadow)">
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
                      x="-40"
                      y="-8"
                      width="80"
                      height="14"
                      rx="4"
                      fill="#0f172a"
                      stroke="#4ade80"
                      strokeWidth="1.4"
                    />
                    <text
                      x="0"
                      y="1.5"
                      textAnchor="middle"
                      fill="#4ade80"
                      fontSize="8"
                      fontWeight="900"
                    >
                      {mode === 'challenges' ? `${currentChallenge.carLabel} (YOU)` : 'YOUR CAR'}
                    </text>
                  </g>
                )}
              </g>

              {/* 14. INSTRUCTOR WHITE POINTER STICK */}
              {lastPlottedNodeId && BOARD_NODES[lastPlottedNodeId] && !isDriving && (
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
        </div>

        {/* ==================== RIGHT SIDEBAR: EXAMINER PANEL, CHALLENGES & SOLUTION GUIDE ==================== */}
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
                  Question {currentChallenge.number} of {NTSA_CHALLENGES.length}
                </span>
              </div>

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

              {/* Active Challenge Prompt */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-extrabold text-white">{currentChallenge.title}</h2>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    {currentChallenge.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{currentChallenge.prompt}</p>

                <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
                  <strong>NTSA Rule Focus:</strong> {currentChallenge.ruleApplied}
                </div>

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

                  {activeChallengeIdx < NTSA_CHALLENGES.length - 1 && (
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
                  activeChallengeIdx < NTSA_CHALLENGES.length - 1 && (
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
          {showSolutionGuide && (
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
      </div>
    </div>
  );
}