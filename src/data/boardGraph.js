export const RA_CX = 815;
export const RA_CY = 470;
export const RING_RADII = {
  1: 166, // Lane 1: Outermost ring
  2: 142, // Lane 2: 2nd outer ring
  3: 118, // Lane 3: 2nd inner ring
  4: 94   // Lane 4: Innermost ring next to central island
};

// Helper to compute coordinates on roundabout rings (0 deg = North, 90 deg = East, Clockwise)
export const polarToCartesian = (cx, cy, r, angleDeg) => {
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
export const NODES = {
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

  // PRE column (x = 240, midway between START x=115 and MID x=364)
  MW_E_L1_PRE: { id: 'MW_E_L1_PRE', x: 240, y: 358, label: 'Major West L1 (Pre)', zone: 'major_west', lane: 1, road: 'Major Road West (Lane 1)', ruleInfo: 'Major Road Lane 1: Broken line zone. Maintain lane or indicate right to shift.' },
  MW_E_L2_PRE: { id: 'MW_E_L2_PRE', x: 240, y: 382, label: 'Major West L2 (Pre)', zone: 'major_west', lane: 2, road: 'Major Road West (Lane 2)', ruleInfo: 'Major Road Lane 2: Broken line zone. Maintain lane or shift across broken lines.' },
  MW_E_L3_PRE: { id: 'MW_E_L3_PRE', x: 240, y: 406, label: 'Major West L3 (Pre)', zone: 'major_west', lane: 3, road: 'Major Road West (Lane 3)', ruleInfo: 'Major Road Lane 3: Broken line zone. Maintain lane or shift across broken lines.' },
  MW_E_L4_PRE: { id: 'MW_E_L4_PRE', x: 240, y: 430, label: 'Major West L4 (Pre)', zone: 'major_west', lane: 4, road: 'Major Road West (Lane 4)', ruleInfo: 'Major Road Lane 4: Broken line zone. Proceed to roundabout or gap.' },

  MW_E_L1_MID: {
    id: 'MW_E_L1_MID', x: 364, y: 358, label: 'Major West L1 (Side Jct)',
    zone: 'major_west', lane: 1, road: 'Major Road West (Lane 1)',
    ruleInfo: 'Major Road Lane 1 at Side Road Junction: Can turn 90° Left into Side Access Road or continue to Roundabout Lane 1.'
  },
  MW_E_L2_MID: {
    id: 'MW_E_L2_MID', x: 364, y: 382, label: 'Major West L2 (Mid)',
    zone: 'major_west', lane: 2, road: 'Major Road West (Lane 2)',
    ruleInfo: 'Major Road Lane 2: Proceed straight towards Roundabout Lane 2. Shift lanes across broken lines.'
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

  // SHIFT column (x = 445, broken line lane change zone between MID and ENTRY)
  MW_E_L1_SHIFT: { id: 'MW_E_L1_SHIFT', x: 445, y: 358, label: 'Major West L1 (Shift)', zone: 'major_west', lane: 1, road: 'Major Road West (Lane 1)', ruleInfo: 'Major Road Lane 1: Indicate right to shift towards Lane 2, 3, or 4 across broken lines.' },
  MW_E_L2_SHIFT: { id: 'MW_E_L2_SHIFT', x: 445, y: 382, label: 'Major West L2 (Shift)', zone: 'major_west', lane: 2, road: 'Major Road West (Lane 2)', ruleInfo: 'Major Road Lane 2: Can shift towards Lane 1 or Lane 3/4 before the solid approach line.' },
  MW_E_L3_SHIFT: { id: 'MW_E_L3_SHIFT', x: 445, y: 406, label: 'Major West L3 (Shift)', zone: 'major_west', lane: 3, road: 'Major Road West (Lane 3)', ruleInfo: 'Major Road Lane 3: Shift to Lane 4 or proceed to Roundabout Lane 3.' },
  MW_E_L4_SHIFT: { id: 'MW_E_L4_SHIFT', x: 445, y: 430, label: 'Major West L4 (Shift)', zone: 'major_west', lane: 4, road: 'Major Road West (Lane 4)', ruleInfo: 'Major Road Lane 4: Approach to Roundabout Lane 4 or Median Gap W1.' },

  // APP column (x = 530, approach before solid stop line)
  MW_E_L1_APP: { id: 'MW_E_L1_APP', x: 530, y: 358, label: 'Major West L1 (Approach)', zone: 'major_west', lane: 1, road: 'Major Road West (Lane 1)', ruleInfo: 'Major Road Lane 1: Final approach to Roundabout Ring 1.' },
  MW_E_L2_APP: { id: 'MW_E_L2_APP', x: 530, y: 382, label: 'Major West L2 (Approach)', zone: 'major_west', lane: 2, road: 'Major Road West (Lane 2)', ruleInfo: 'Major Road Lane 2: Final approach to Roundabout Ring 2.' },
  MW_E_L3_APP: { id: 'MW_E_L3_APP', x: 530, y: 406, label: 'Major West L3 (Approach)', zone: 'major_west', lane: 3, road: 'Major Road West (Lane 3)', ruleInfo: 'Major Road Lane 3: Final approach to Roundabout Ring 3.' },
  MW_E_L4_APP: { id: 'MW_E_L4_APP', x: 530, y: 430, label: 'Major West L4 (Approach)', zone: 'major_west', lane: 4, road: 'Major Road West (Lane 4)', ruleInfo: 'Major Road Lane 4: Final approach to Roundabout Ring 4.' },

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

  // Westbound APP column (x = 530)
  MW_W_L4_APP: { id: 'MW_W_L4_APP', x: 530, y: 510, label: 'Major Westbound L4 (Approach)', zone: 'major_west', lane: 4, road: 'Major Road Westbound (Lane 4)', ruleInfo: 'Westbound Lane 4: Exiting roundabout. Can use Gap W1 or shift lanes.' },
  MW_W_L3_APP: { id: 'MW_W_L3_APP', x: 530, y: 534, label: 'Major Westbound L3 (Approach)', zone: 'major_west', lane: 3, road: 'Major Road Westbound (Lane 3)', ruleInfo: 'Westbound Lane 3: Exiting roundabout. Broken lines allow lane shifting.' },
  MW_W_L2_APP: { id: 'MW_W_L2_APP', x: 530, y: 558, label: 'Major Westbound L2 (Approach)', zone: 'major_west', lane: 2, road: 'Major Road Westbound (Lane 2)', ruleInfo: 'Westbound Lane 2: Exiting roundabout.' },
  MW_W_L1_APP: { id: 'MW_W_L1_APP', x: 530, y: 582, label: 'Major Westbound L1 (Approach)', zone: 'major_west', lane: 1, road: 'Major Road Westbound (Lane 1)', ruleInfo: 'Westbound Lane 1: Exiting roundabout.' },

  // Westbound SHIFT column (x = 445)
  MW_W_L4_SHIFT: { id: 'MW_W_L4_SHIFT', x: 445, y: 510, label: 'Major Westbound L4 (Shift)', zone: 'major_west', lane: 4, road: 'Major Road Westbound (Lane 4)', ruleInfo: 'Westbound Lane 4: Broken lines zone.' },
  MW_W_L3_SHIFT: { id: 'MW_W_L3_SHIFT', x: 445, y: 534, label: 'Major Westbound L3 (Shift)', zone: 'major_west', lane: 3, road: 'Major Road Westbound (Lane 3)', ruleInfo: 'Westbound Lane 3: Broken lines zone.' },
  MW_W_L2_SHIFT: { id: 'MW_W_L2_SHIFT', x: 445, y: 558, label: 'Major Westbound L2 (Shift)', zone: 'major_west', lane: 2, road: 'Major Road Westbound (Lane 2)', ruleInfo: 'Westbound Lane 2: Broken lines zone.' },
  MW_W_L1_SHIFT: { id: 'MW_W_L1_SHIFT', x: 445, y: 582, label: 'Major Westbound L1 (Shift)', zone: 'major_west', lane: 1, road: 'Major Road Westbound (Lane 1)', ruleInfo: 'Westbound Lane 1: Broken lines zone.' },

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

  // Westbound PRE column (x = 240)
  MW_W_L4_PRE: { id: 'MW_W_L4_PRE', x: 240, y: 510, label: 'Major Westbound L4 (Pre)', zone: 'major_west', lane: 4, road: 'Major Road Westbound (Lane 4)', ruleInfo: 'Westbound Lane 4 approaching far west.' },
  MW_W_L3_PRE: { id: 'MW_W_L3_PRE', x: 240, y: 534, label: 'Major Westbound L3 (Pre)', zone: 'major_west', lane: 3, road: 'Major Road Westbound (Lane 3)', ruleInfo: 'Westbound Lane 3 approaching far west.' },
  MW_W_L2_PRE: { id: 'MW_W_L2_PRE', x: 240, y: 558, label: 'Major Westbound L2 (Pre)', zone: 'major_west', lane: 2, road: 'Major Road Westbound (Lane 2)', ruleInfo: 'Westbound Lane 2 approaching far west.' },
  MW_W_L1_PRE: { id: 'MW_W_L1_PRE', x: 240, y: 582, label: 'Major Westbound L1 (Pre)', zone: 'major_west', lane: 1, road: 'Major Road Westbound (Lane 1)', ruleInfo: 'Westbound Lane 1 approaching far west.' },

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

  ME_E_L1_MID: { id: 'ME_E_L1_MID', x: 1080, y: 358, label: 'Major East L1 (Mid)', zone: 'major_east', lane: 1, road: 'Major Road Eastbound (Lane 1)', ruleInfo: 'Major Road Eastbound Lane 1 Intermediate.' },
  ME_E_L2_MID: { id: 'ME_E_L2_MID', x: 1080, y: 382, label: 'Major East L2 (Mid)', zone: 'major_east', lane: 2, road: 'Major Road Eastbound (Lane 2)', ruleInfo: 'Major Road Eastbound Lane 2 Intermediate.' },
  ME_E_L3_MID: { id: 'ME_E_L3_MID', x: 1080, y: 406, label: 'Major East L3 (Mid)', zone: 'major_east', lane: 3, road: 'Major Road Eastbound (Lane 3)', ruleInfo: 'Major Road Eastbound Lane 3 Intermediate.' },
  ME_E_L4_MID: { id: 'ME_E_L4_MID', x: 1080, y: 430, label: 'Major East L4 (Mid)', zone: 'major_east', lane: 4, road: 'Major Road Eastbound (Lane 4)', ruleInfo: 'Major Road Eastbound Lane 4 Intermediate.' },

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

  ME_W_L4_MID: { id: 'ME_W_L4_MID', x: 1070, y: 510, label: 'Major East L4 (Mid)', zone: 'major_east', lane: 4, road: 'Major Road East Approach (Lane 4)', ruleInfo: 'Major East Lane 4 Approach Mid.' },
  ME_W_L3_MID: { id: 'ME_W_L3_MID', x: 1070, y: 534, label: 'Major East L3 (Mid)', zone: 'major_east', lane: 3, road: 'Major Road East Approach (Lane 3)', ruleInfo: 'Major East Lane 3 Approach Mid.' },
  ME_W_L2_MID: { id: 'ME_W_L2_MID', x: 1070, y: 558, label: 'Major East L2 (Mid)', zone: 'major_east', lane: 2, road: 'Major Road East Approach (Lane 2)', ruleInfo: 'Major East Lane 2 Approach Mid.' },
  ME_W_L1_MID: { id: 'ME_W_L1_MID', x: 1070, y: 582, label: 'Major East L1 (Mid)', zone: 'major_east', lane: 1, road: 'Major Road East Approach (Lane 1)', ruleInfo: 'Major East Lane 1 Approach Mid.' },

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

  MS_N_L1_MID: { id: 'MS_N_L1_MID', x: 743, y: 705, label: 'Minor South L1 (Mid)', zone: 'minor_south', lane: 1, road: 'Minor Road South (Lane 1)', ruleInfo: 'Minor Road South Lane 1 Intermediate.' },
  MS_N_L2_MID: { id: 'MS_N_L2_MID', x: 767, y: 705, label: 'Minor South L2 (Mid)', zone: 'minor_south', lane: 2, road: 'Minor Road South (Lane 2)', ruleInfo: 'Minor Road South Lane 2 Intermediate.' },
  MS_N_L3_MID: { id: 'MS_N_L3_MID', x: 791, y: 705, label: 'Minor South L3 (Mid)', zone: 'minor_south', lane: 3, road: 'Minor Road South (Lane 3)', ruleInfo: 'Minor Road South Lane 3 Intermediate.' },

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

  MS_S_L3_MID: { id: 'MS_S_L3_MID', x: 839, y: 710, label: 'Minor South Exit L3 (Mid)', zone: 'minor_south_exit', lane: 3, road: 'Minor Road Southbound (Lane 3)', ruleInfo: 'Minor Road Southbound Lane 3 Intermediate.' },
  MS_S_L2_MID: { id: 'MS_S_L2_MID', x: 863, y: 710, label: 'Minor South Exit L2 (Mid)', zone: 'minor_south_exit', lane: 2, road: 'Minor Road Southbound (Lane 2)', ruleInfo: 'Minor Road Southbound Lane 2 Intermediate.' },
  MS_S_L1_MID: { id: 'MS_S_L1_MID', x: 887, y: 710, label: 'Minor South Exit L1 (Mid)', zone: 'minor_south_exit', lane: 1, road: 'Minor Road Southbound (Lane 1)', ruleInfo: 'Minor Road Southbound Lane 1 Intermediate.' },

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

  MN_N_L1_MID: { id: 'MN_N_L1_MID', x: 743, y: 218, label: 'Minor North Exit L1 (Mid)', zone: 'minor_north_exit', lane: 1, road: 'Minor Road Northbound (Lane 1)', ruleInfo: 'Minor Road Northbound Lane 1 Intermediate.' },
  MN_N_L2_MID: { id: 'MN_N_L2_MID', x: 767, y: 218, label: 'Minor North Exit L2 (Mid)', zone: 'minor_north_exit', lane: 2, road: 'Minor Road Northbound (Lane 2)', ruleInfo: 'Minor Road Northbound Lane 2 Intermediate.' },
  MN_N_L3_MID: { id: 'MN_N_L3_MID', x: 791, y: 218, label: 'Minor North Exit L3 (Mid)', zone: 'minor_north_exit', lane: 3, road: 'Minor Road Northbound (Lane 3)', ruleInfo: 'Minor Road Northbound Lane 3 Intermediate.' },

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

  MN_S_L3_MID: { id: 'MN_S_L3_MID', x: 839, y: 218, label: 'Minor North L3 (Mid)', zone: 'minor_north', lane: 3, road: 'Minor Road North Approach (Lane 3)', ruleInfo: 'Minor Road North Southbound Lane 3 Intermediate.' },
  MN_S_L2_MID: { id: 'MN_S_L2_MID', x: 863, y: 218, label: 'Minor North L2 (Mid)', zone: 'minor_north', lane: 2, road: 'Minor Road North Approach (Lane 2)', ruleInfo: 'Minor Road North Southbound Lane 2 Intermediate.' },
  MN_S_L1_MID: { id: 'MN_S_L1_MID', x: 887, y: 218, label: 'Minor North L1 (Mid)', zone: 'minor_north', lane: 1, road: 'Minor Road North Approach (Lane 1)', ruleInfo: 'Minor Road North Southbound Lane 1 Intermediate.' },

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
  // In Kenya (Keep Left): Northbound is West lane (x = 350), Southbound is East lane (x = 376)
  SIDE_N_BOT: {
    id: 'SIDE_N_BOT', x: 350, y: 312, label: 'Side Road Northbound (Bot)',
    zone: 'side_road', road: 'Side Access Road (Northbound)',
    ruleInfo: 'Two-Way Side Access Road (Northbound Left Lane). Strict NTSA Keep Left discipline.'
  },
  SIDE_N_LOWER: {
    id: 'SIDE_N_LOWER', x: 350, y: 270, label: 'Side Road North (Lower)',
    zone: 'side_road', road: 'Side Access Road (Northbound Lower)',
    ruleInfo: 'Side Access Road Northbound lower approach.'
  },
  SIDE_N_MID: {
    id: 'SIDE_N_MID', x: 350, y: 228, label: 'Side Road (Angle Parking Jct)',
    zone: 'side_road', road: 'Side Access Road (Angle Parking Entry)',
    ruleInfo: 'Side Access Road Junction: Turn right into Controlled Angle Parking entrance or continue North to Top Perimeter Road.'
  },
  SIDE_N_UPPER: {
    id: 'SIDE_N_UPPER', x: 350, y: 186, label: 'Side Road North (Upper)',
    zone: 'side_road', road: 'Side Access Road (Northbound Upper)',
    ruleInfo: 'Side Access Road Northbound upper approach.'
  },
  SIDE_N_TOP: {
    id: 'SIDE_N_TOP', x: 350, y: 145, label: 'Side Road Northbound (Top)',
    zone: 'side_road', road: 'Side Access Road (Northbound Top)',
    ruleInfo: 'Approaching Top Perimeter Two-Way Road. Turn right for Eastbound or left for Westbound.'
  },
  SIDE_S_TOP: {
    id: 'SIDE_S_TOP', x: 376, y: 145, label: 'Side Road Southbound (Top)',
    zone: 'side_road', road: 'Side Access Road (Southbound Top)',
    ruleInfo: 'Entering Side Access Road Southbound from Top Perimeter Road (East lane).'
  },
  SIDE_S_UPPER: {
    id: 'SIDE_S_UPPER', x: 376, y: 195, label: 'Side Road South (Upper)',
    zone: 'side_road', road: 'Side Access Road (Southbound Upper)',
    ruleInfo: 'Side Access Road Southbound upper approach.'
  },
  SIDE_S_MID: {
    id: 'SIDE_S_MID', x: 376, y: 245, label: 'Side Road Southbound (Mid)',
    zone: 'side_road', road: 'Side Access Road (Southbound Mid)',
    ruleInfo: 'Side Access Road Southbound (East lane, keeping left as you drive South).'
  },
  SIDE_S_LOWER: {
    id: 'SIDE_S_LOWER', x: 376, y: 280, label: 'Side Road South (Lower)',
    zone: 'side_road', road: 'Side Access Road (Southbound Lower)',
    ruleInfo: 'Side Access Road Southbound lower approach before Major West junction.'
  },
  SIDE_S_BOT: {
    id: 'SIDE_S_BOT', x: 376, y: 312, label: 'Side Road Southbound (Bot)',
    zone: 'side_road', road: 'Side Access Road (Southbound Exit)',
    ruleInfo: 'Yield before turning 90° Left onto Major Road West.'
  },

  // --- CONTROLLED ANGLE PARKING ZONE (All 14 Bays & Complete Central Aisle) ---
  AP_ENTRY: {
    id: 'AP_ENTRY', x: 425, y: 222, label: 'Angle Parking Entrance',
    zone: 'angle_parking', road: 'Controlled (Angle) Parking Entry',
    ruleInfo: 'Controlled (Angle) Parking Entrance: Strictly for Saloon/Small vehicles. Enter forward, park in the farthest empty bay, and NEVER drive straight through as a shortcut!'
  },
  AP_AISLE_1: {
    id: 'AP_AISLE_1', x: 472, y: 232, label: 'Angle Parking Aisle (Bay #1)',
    zone: 'angle_parking', road: 'Controlled Parking Central Aisle',
    ruleInfo: 'Controlled Parking Aisle opposite Bay #1.'
  },
  AP_AISLE_W: {
    id: 'AP_AISLE_W', x: 505, y: 232, label: 'Angle Parking Aisle (West)',
    zone: 'angle_parking', road: 'Controlled Parking Central Aisle',
    ruleInfo: 'Controlled Parking Aisle: Proceed forward to the farthest available diagonal parking bay.'
  },
  AP_AISLE_3: {
    id: 'AP_AISLE_3', x: 540, y: 232, label: 'Angle Parking Aisle (Bay #3)',
    zone: 'angle_parking', road: 'Controlled Parking Central Aisle',
    ruleInfo: 'Controlled Parking Aisle opposite Bay #3.'
  },
  AP_AISLE_4: {
    id: 'AP_AISLE_4', x: 574, y: 232, label: 'Angle Parking Aisle (Bay #4)',
    zone: 'angle_parking', road: 'Controlled Parking Central Aisle',
    ruleInfo: 'Controlled Parking Aisle opposite Bay #4.'
  },
  AP_AISLE_E: {
    id: 'AP_AISLE_E', x: 615, y: 232, label: 'Angle Parking Aisle (East)',
    zone: 'angle_parking', road: 'Controlled Parking Central Aisle',
    ruleInfo: 'Controlled Parking Aisle (East): Enter a diagonal bay forward, then reverse back into the aisle to exit.'
  },
  AP_AISLE_6: {
    id: 'AP_AISLE_6', x: 642, y: 232, label: 'Angle Parking Aisle (Bay #6)',
    zone: 'angle_parking', road: 'Controlled Parking Central Aisle',
    ruleInfo: 'Controlled Parking Aisle opposite Bay #6.'
  },
  AP_AISLE_7: {
    id: 'AP_AISLE_7', x: 676, y: 232, label: 'Angle Parking Aisle (Bay #7)',
    zone: 'angle_parking', road: 'Controlled Parking Central Aisle',
    ruleInfo: 'Controlled Parking Aisle opposite Bay #7.'
  },

  // 7 Top Row Angle Bays (1..7, Park Forward In, Reverse Out)
  AP_BAY_TOP_BAY1: {
    id: 'AP_BAY_TOP_BAY1', x: 472, y: 186, label: 'Angle Bay Top #1',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Top #1)',
    ruleInfo: 'Controlled Angle Parking Bay #1: Enter forward, exit in reverse.'
  },
  AP_BAY_TOP_BAY2: {
    id: 'AP_BAY_TOP_BAY2', x: 506, y: 186, label: 'Angle Bay Top #2',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Top #2)',
    ruleInfo: 'Controlled Angle Parking Bay #2: Enter forward, exit in reverse.'
  },
  AP_BAY_TOP_1: {
    id: 'AP_BAY_TOP_1', x: 540, y: 186, label: 'Angle Bay Top #3',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Top #3)',
    ruleInfo: 'Controlled Angle Parking Bay: Enter forward, exit in reverse.'
  },
  AP_BAY_TOP_BAY4: {
    id: 'AP_BAY_TOP_BAY4', x: 574, y: 186, label: 'Angle Bay Top #4',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Top #4)',
    ruleInfo: 'Controlled Angle Parking Bay #4: Enter forward, exit in reverse.'
  },
  AP_BAY_TOP_BAY5: {
    id: 'AP_BAY_TOP_BAY5', x: 608, y: 186, label: 'Angle Bay Top #5',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Top #5)',
    ruleInfo: 'Controlled Angle Parking Bay #5: Enter forward, exit in reverse.'
  },
  AP_BAY_TOP_2: {
    id: 'AP_BAY_TOP_2', x: 642, y: 186, label: 'Angle Bay Top #6',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Top #6)',
    ruleInfo: 'Controlled Angle Parking Bay: Enter forward, exit in reverse.'
  },
  AP_BAY_TOP_BAY7: {
    id: 'AP_BAY_TOP_BAY7', x: 676, y: 186, label: 'Angle Bay Top #7 (Farthest)',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Top #7 Farthest)',
    ruleInfo: 'Farthest Controlled Angle Parking Bay (Top Row): Enter forward, exit in reverse.'
  },

  // 7 Bottom Row Angle Bays (1..7, Park Forward In, Reverse Out)
  AP_BAY_BOT_BAY1: {
    id: 'AP_BAY_BOT_BAY1', x: 472, y: 278, label: 'Angle Bay Bottom #1',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Bottom #1)',
    ruleInfo: 'Controlled Angle Parking Bay: Enter forward, exit in reverse.'
  },
  AP_BAY_BOT_BAY2: {
    id: 'AP_BAY_BOT_BAY2', x: 506, y: 278, label: 'Angle Bay Bottom #2',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Bottom #2)',
    ruleInfo: 'Controlled Angle Parking Bay: Enter forward, exit in reverse.'
  },
  AP_BAY_BOT_1: {
    id: 'AP_BAY_BOT_1', x: 540, y: 278, label: 'Angle Bay Bottom #3',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Bottom #3)',
    ruleInfo: 'Controlled Angle Parking Bay: Enter forward, exit in reverse.'
  },
  AP_BAY_BOT_BAY4: {
    id: 'AP_BAY_BOT_BAY4', x: 574, y: 278, label: 'Angle Bay Bottom #4',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Bottom #4)',
    ruleInfo: 'Controlled Angle Parking Bay: Enter forward, exit in reverse.'
  },
  AP_BAY_BOT_BAY5: {
    id: 'AP_BAY_BOT_BAY5', x: 608, y: 278, label: 'Angle Bay Bottom #5',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Bottom #5)',
    ruleInfo: 'Controlled Angle Parking Bay: Enter forward, exit in reverse.'
  },
  AP_BAY_BOT_2: {
    id: 'AP_BAY_BOT_2', x: 642, y: 278, label: 'Angle Bay Bottom #6',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Bottom #6)',
    ruleInfo: 'Controlled Angle Parking Bay: Enter forward, exit in reverse.'
  },
  AP_BAY_BOT_BAY7: {
    id: 'AP_BAY_BOT_BAY7', x: 676, y: 278, label: 'Angle Bay Bottom #7 (Farthest)',
    zone: 'angle_parking_bay', road: 'Controlled Angle Parking Bay (Bottom #7 Farthest)',
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
  TOP_E_PRE: {
    id: 'TOP_E_PRE', x: 248, y: 76, label: 'Top Road Eastbound (West Approach)',
    zone: 'top_road', road: 'Top Perimeter Road (Eastbound Approach)',
    ruleInfo: 'Top Perimeter Road Eastbound approach to Side Road junction.'
  },
  TOP_E_JCT_W: {
    id: 'TOP_E_JCT_W', x: 350, y: 76, label: 'Top Road Eastbound (Side Jct)',
    zone: 'top_road', road: 'Top Perimeter Road (Side Jct)',
    ruleInfo: 'Top Road Junction with Side Access Road (Eastbound Left Lane).'
  },
  TOP_E_ZEBRA1: {
    id: 'TOP_E_ZEBRA1', x: 432, y: 76, label: 'Zebra Crossing #1 (Eastbound)',
    zone: 'zebra', road: 'Pedestrian Zebra Crossing #1',
    ruleInfo: 'White Pedestrian Zebra Crossing: Drivers must yield to pedestrians and NEVER park or stop on a zebra crossing.'
  },
  TOP_E_FLUSH_W: {
    id: 'TOP_E_FLUSH_W', x: 510, y: 76, label: 'Top Road Eastbound (Flush West)',
    zone: 'top_road', road: 'Top Perimeter Road (Eastbound Flush West)',
    ruleInfo: 'Top Perimeter Road Eastbound opposite Flush Parking West.'
  },
  TOP_E_MID: {
    id: 'TOP_E_MID', x: 585, y: 76, label: 'Top Road Eastbound (Mid)',
    zone: 'top_road', road: 'Top Perimeter Road (Eastbound Mid)',
    ruleInfo: 'Top Perimeter Road Eastbound passing Flush Parking zone.'
  },
  TOP_E_FLUSH_E: {
    id: 'TOP_E_FLUSH_E', x: 665, y: 76, label: 'Top Road Eastbound (Flush East)',
    zone: 'top_road', road: 'Top Perimeter Road (Eastbound Flush East)',
    ruleInfo: 'Top Perimeter Road Eastbound opposite Flush Parking East.'
  },
  TOP_E_JCT_N: {
    id: 'TOP_E_JCT_N', x: 767, y: 76, label: 'Top Road (Minor North Jct)',
    zone: 'top_road', road: 'Top Road / Minor North Junction',
    ruleInfo: 'Junction between Minor Road North and Top Two-Way Perimeter Road.'
  },
  TOP_E_APPROACH_E: {
    id: 'TOP_E_APPROACH_E', x: 900, y: 76, label: 'Top Road Eastbound (Far East Mid)',
    zone: 'top_road', road: 'Top Perimeter Road (Eastbound Far East Mid)',
    ruleInfo: 'Top Perimeter Road Eastbound approach to Zebra Crossing #2.'
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
  TOP_W_APPROACH_E: {
    id: 'TOP_W_APPROACH_E', x: 930, y: 100, label: 'Top Road Westbound (Far East Approach)',
    zone: 'top_road', road: 'Top Perimeter Road (Westbound Far East Approach)',
    ruleInfo: 'Top Perimeter Road Westbound approach to Minor North junction.'
  },
  TOP_W_JCT_N: {
    id: 'TOP_W_JCT_N', x: 839, y: 100, label: 'Top Road Westbound (Minor Jct)',
    zone: 'top_road', road: 'Top Road / Minor North Junction',
    ruleInfo: 'Turn left into Minor Road North (Southbound Lanes 1-3) or continue West towards Flush Parking.'
  },
  TOP_W_FLUSH_E: {
    id: 'TOP_W_FLUSH_E', x: 740, y: 100, label: 'Top Road Westbound (Flush East)',
    zone: 'top_road', road: 'Top Perimeter Road (Westbound Flush East)',
    ruleInfo: 'Top Perimeter Road Westbound approach to Flush Parking.'
  },
  TOP_W_FLUSH_APPROACH: {
    id: 'TOP_W_FLUSH_APPROACH', x: 648, y: 100, label: 'Flush Parking Approach',
    zone: 'top_road', road: 'Flush Parking Approach',
    ruleInfo: 'Flush (Uncontrolled) Parking Approach: Stop ahead of the bay, reverse into the Flush Parking bay, and drive forward when exiting!'
  },
  TOP_W_FLUSH_W: {
    id: 'TOP_W_FLUSH_W', x: 525, y: 100, label: 'Top Road Westbound (Flush West)',
    zone: 'top_road', road: 'Top Perimeter Road (Westbound Flush West)',
    ruleInfo: 'Top Perimeter Road Westbound past Flush Parking.'
  },
  TOP_W_ZEBRA1: {
    id: 'TOP_W_ZEBRA1', x: 432, y: 100, label: 'Zebra Crossing #1 (Westbound)',
    zone: 'zebra', road: 'Pedestrian Zebra Crossing #1',
    ruleInfo: 'West Pedestrian Zebra Crossing on Top Perimeter Road.'
  },
  TOP_W_JCT_W: {
    id: 'TOP_W_JCT_W', x: 376, y: 100, label: 'Top Road Westbound (Side Jct)',
    zone: 'top_road', road: 'Top Perimeter Road (Side Jct)',
    ruleInfo: 'Turn 90° Left into Side Access Road Southbound or continue West.'
  },
  TOP_W_POST: {
    id: 'TOP_W_POST', x: 248, y: 100, label: 'Top Road Westbound (Far West)',
    zone: 'top_road', road: 'Top Perimeter Road (Westbound Far West)',
    ruleInfo: 'Top Perimeter Road Westbound heading to far west end.'
  },
  TOP_W_WEST: {
    id: 'TOP_W_WEST', x: 145, y: 100, label: 'Top Road Westbound (End)',
    zone: 'top_road', road: 'Top Perimeter Road (Far West)',
    ruleInfo: 'Far West end of Top Perimeter Road.'
  },

  // 4 Flush Parking Bays (Reverse In, Forward Out)
  FLUSH_BAY_2: {
    id: 'FLUSH_BAY_2', x: 505, y: 120, label: 'Flush Parking Bay #1',
    zone: 'flush_parking_bay', road: 'Flush (Uncontrolled) Parking Bay #1',
    ruleInfo: 'Flush (Parallel/Uncontrolled) Parking Bay #1: Enter in reverse, exit forward.'
  },
  FLUSH_BAY_3: {
    id: 'FLUSH_BAY_3', x: 550, y: 120, label: 'Flush Parking Bay #2',
    zone: 'flush_parking_bay', road: 'Flush (Uncontrolled) Parking Bay #2',
    ruleInfo: 'Flush (Parallel/Uncontrolled) Parking Bay #2: Enter in reverse, exit forward.'
  },
  FLUSH_BAY_1: {
    id: 'FLUSH_BAY_1', x: 585, y: 120, label: 'Flush Parking Bay #3',
    zone: 'flush_parking_bay', road: 'Flush (Uncontrolled) Parking Bay #3',
    ruleInfo: 'Flush (Parallel/Uncontrolled) Parking Bay #3: NTSA Rule — Must enter by REVERSING and exit by driving FORWARD.'
  },
  FLUSH_BAY_4: {
    id: 'FLUSH_BAY_4', x: 650, y: 120, label: 'Flush Parking Bay #4',
    zone: 'flush_parking_bay', road: 'Flush (Uncontrolled) Parking Bay #4',
    ruleInfo: 'Flush (Parallel/Uncontrolled) Parking Bay #4: Enter in reverse, exit forward.'
  }
};

/**
 * Directed Edges connecting BOARD_NODES.
 * Includes both legal edges (`isLegal: true`) and common student mistake edges (`isLegal: false`)
 */
export const buildBoardEdges = () => {
  const edges = [];
  const addEdge = (from, to, opts = {}) => {
    edges.push({
      from,
      to,
      isLegal: opts.isLegal !== undefined ? opts.isLegal : true,
      violationReason: opts.violationReason || null,
      turn: opts.turn || 'none',
      isReverse: Boolean(opts.isReverse)
    });
  };

  // 1. Spawns onto Approaches
  [1, 2, 3, 4].forEach((l) => {
    addEdge('MW_SPAWN', `MW_E_L${l}_START`, { turn: l === 1 ? 'none' : 'right' });
    addEdge('MW_SPAWN', `MW_E_L${l}_PRE`, { turn: l === 1 ? 'none' : 'right' });
    addEdge('ME_SPAWN', `ME_W_L${l}_START`, { turn: l === 1 ? 'none' : 'right' });
  });
  addEdge('MS_SPAWN', 'MS_N_L1_START');
  addEdge('MS_SPAWN', 'MS_N_L2_START', { turn: 'right' });
  addEdge('MS_SPAWN', 'MS_N_L3_START', { turn: 'right' });

  // 2. Major Road West Eastbound progressions + Broken-Line Lane Changes
  [1, 2, 3, 4].forEach((l) => {
    // Legacy direct connections preserved
    addEdge(`MW_E_L${l}_START`, `MW_E_L${l}_MID`);
    addEdge(`MW_E_L${l}_MID`, `MW_E_L${l}_ENTRY`);

    // Progressive node sequence: START -> PRE -> MID -> SHIFT -> APP -> ENTRY
    addEdge(`MW_E_L${l}_START`, `MW_E_L${l}_PRE`);
    addEdge(`MW_E_L${l}_PRE`, `MW_E_L${l}_MID`);
    addEdge(`MW_E_L${l}_MID`, `MW_E_L${l}_SHIFT`);
    addEdge(`MW_E_L${l}_SHIFT`, `MW_E_L${l}_APP`);
    addEdge(`MW_E_L${l}_APP`, `MW_E_L${l}_ENTRY`);
  });

  // Broken-Line Lane Shifts: START <-> PRE
  addEdge('MW_E_L1_START', 'MW_E_L2_PRE', { turn: 'right' });
  addEdge('MW_E_L2_START', 'MW_E_L1_PRE', { turn: 'left' });
  addEdge('MW_E_L2_START', 'MW_E_L3_PRE', { turn: 'right' });
  addEdge('MW_E_L3_START', 'MW_E_L2_PRE', { turn: 'left' });
  addEdge('MW_E_L3_START', 'MW_E_L4_PRE', { turn: 'right' });
  addEdge('MW_E_L4_START', 'MW_E_L3_PRE', { turn: 'left' });

  // Broken-Line Lane Shifts: PRE <-> MID
  addEdge('MW_E_L1_PRE', 'MW_E_L2_MID', { turn: 'right' });
  addEdge('MW_E_L2_PRE', 'MW_E_L1_MID', { turn: 'left' });
  addEdge('MW_E_L2_PRE', 'MW_E_L3_MID', { turn: 'right' });
  addEdge('MW_E_L3_PRE', 'MW_E_L2_MID', { turn: 'left' });
  addEdge('MW_E_L3_PRE', 'MW_E_L4_MID', { turn: 'right' });
  addEdge('MW_E_L4_PRE', 'MW_E_L3_MID', { turn: 'left' });

  // Legacy shifts START <-> MID
  addEdge('MW_E_L1_START', 'MW_E_L2_MID', { turn: 'right' });
  addEdge('MW_E_L2_START', 'MW_E_L1_MID', { turn: 'left' });
  addEdge('MW_E_L2_START', 'MW_E_L3_MID', { turn: 'right' });
  addEdge('MW_E_L3_START', 'MW_E_L2_MID', { turn: 'left' });
  addEdge('MW_E_L3_START', 'MW_E_L4_MID', { turn: 'right' });
  addEdge('MW_E_L4_START', 'MW_E_L3_MID', { turn: 'left' });

  // Broken-Line Lane Shifts: MID <-> SHIFT
  addEdge('MW_E_L1_MID', 'MW_E_L2_SHIFT', { turn: 'right' });
  addEdge('MW_E_L2_MID', 'MW_E_L1_SHIFT', { turn: 'left' });
  addEdge('MW_E_L2_MID', 'MW_E_L3_SHIFT', { turn: 'right' });
  addEdge('MW_E_L3_MID', 'MW_E_L2_SHIFT', { turn: 'left' });
  addEdge('MW_E_L3_MID', 'MW_E_L4_SHIFT', { turn: 'right' });
  addEdge('MW_E_L4_MID', 'MW_E_L3_SHIFT', { turn: 'left' });

  // Broken-Line Lane Shifts: SHIFT <-> APP
  addEdge('MW_E_L1_SHIFT', 'MW_E_L2_APP', { turn: 'right' });
  addEdge('MW_E_L2_SHIFT', 'MW_E_L1_APP', { turn: 'left' });
  addEdge('MW_E_L2_SHIFT', 'MW_E_L3_APP', { turn: 'right' });
  addEdge('MW_E_L3_SHIFT', 'MW_E_L2_APP', { turn: 'left' });
  addEdge('MW_E_L3_SHIFT', 'MW_E_L4_APP', { turn: 'right' });
  addEdge('MW_E_L4_SHIFT', 'MW_E_L3_APP', { turn: 'left' });

  // Broken-Line Lane Shifts: APP <-> ENTRY
  addEdge('MW_E_L1_APP', 'MW_E_L2_ENTRY', { turn: 'right' });
  addEdge('MW_E_L2_APP', 'MW_E_L1_ENTRY', { turn: 'left' });
  addEdge('MW_E_L2_APP', 'MW_E_L3_ENTRY', { turn: 'right' });
  addEdge('MW_E_L3_APP', 'MW_E_L2_ENTRY', { turn: 'left' });
  addEdge('MW_E_L3_APP', 'MW_E_L4_ENTRY', { turn: 'right' });
  addEdge('MW_E_L4_APP', 'MW_E_L3_ENTRY', { turn: 'left' });

  // Direct diagonal shifts across broken lines for smooth driving
  addEdge('MW_E_L1_MID', 'MW_E_L2_ENTRY', { turn: 'right' });
  addEdge('MW_E_L2_MID', 'MW_E_L1_ENTRY', { turn: 'left' });
  addEdge('MW_E_L2_MID', 'MW_E_L3_ENTRY', { turn: 'right' });
  addEdge('MW_E_L3_MID', 'MW_E_L2_ENTRY', { turn: 'left' });
  addEdge('MW_E_L3_MID', 'MW_E_L4_ENTRY', { turn: 'right' });
  addEdge('MW_E_L4_MID', 'MW_E_L3_ENTRY', { turn: 'left' });
  addEdge('MW_E_L2_SHIFT', 'MW_E_L3_ENTRY', { turn: 'right' });
  addEdge('MW_E_L2_SHIFT', 'MW_E_L4_ENTRY', { turn: 'right' });
  addEdge('MW_E_L3_SHIFT', 'MW_E_L4_ENTRY', { turn: 'right' });

  // 3. Major Road West Westbound progressions + Broken-Line Lane Changes
  [1, 2, 3, 4].forEach((l) => {
    // Legacy direct connections preserved
    addEdge(`MW_W_L${l}_EXIT`, `MW_W_L${l}_MID`);
    addEdge(`MW_W_L${l}_MID`, `MW_W_L${l}_END`);

    // Progressive node sequence: EXIT -> APP -> SHIFT -> MID -> PRE -> END
    addEdge(`MW_W_L${l}_EXIT`, `MW_W_L${l}_APP`);
    addEdge(`MW_W_L${l}_APP`, `MW_W_L${l}_SHIFT`);
    addEdge(`MW_W_L${l}_SHIFT`, `MW_W_L${l}_MID`);
    addEdge(`MW_W_L${l}_MID`, `MW_W_L${l}_PRE`);
    addEdge(`MW_W_L${l}_PRE`, `MW_W_L${l}_END`);
  });

  // Westbound shifts: EXIT <-> APP
  addEdge('MW_W_L4_EXIT', 'MW_W_L3_APP', { turn: 'left' });
  addEdge('MW_W_L3_EXIT', 'MW_W_L4_APP', { turn: 'right' });
  addEdge('MW_W_L3_EXIT', 'MW_W_L2_APP', { turn: 'left' });
  addEdge('MW_W_L2_EXIT', 'MW_W_L3_APP', { turn: 'right' });
  addEdge('MW_W_L2_EXIT', 'MW_W_L1_APP', { turn: 'left' });
  addEdge('MW_W_L1_EXIT', 'MW_W_L2_APP', { turn: 'right' });

  // Westbound shifts: APP <-> SHIFT
  addEdge('MW_W_L4_APP', 'MW_W_L3_SHIFT', { turn: 'left' });
  addEdge('MW_W_L3_APP', 'MW_W_L4_SHIFT', { turn: 'right' });
  addEdge('MW_W_L3_APP', 'MW_W_L2_SHIFT', { turn: 'left' });
  addEdge('MW_W_L2_APP', 'MW_W_L3_SHIFT', { turn: 'right' });
  addEdge('MW_W_L2_APP', 'MW_W_L1_SHIFT', { turn: 'left' });
  addEdge('MW_W_L1_APP', 'MW_W_L2_SHIFT', { turn: 'right' });

  // Westbound shifts: SHIFT <-> MID
  addEdge('MW_W_L4_SHIFT', 'MW_W_L3_MID', { turn: 'left' });
  addEdge('MW_W_L3_SHIFT', 'MW_W_L4_MID', { turn: 'right' });
  addEdge('MW_W_L3_SHIFT', 'MW_W_L2_MID', { turn: 'left' });
  addEdge('MW_W_L2_SHIFT', 'MW_W_L3_MID', { turn: 'right' });
  addEdge('MW_W_L2_SHIFT', 'MW_W_L1_MID', { turn: 'left' });
  addEdge('MW_W_L1_SHIFT', 'MW_W_L2_MID', { turn: 'right' });

  // Legacy shifts EXIT <-> MID
  addEdge('MW_W_L4_EXIT', 'MW_W_L3_MID', { turn: 'left' });
  addEdge('MW_W_L3_EXIT', 'MW_W_L4_MID', { turn: 'right' });
  addEdge('MW_W_L3_EXIT', 'MW_W_L2_MID', { turn: 'left' });
  addEdge('MW_W_L2_EXIT', 'MW_W_L3_MID', { turn: 'right' });
  addEdge('MW_W_L2_EXIT', 'MW_W_L1_MID', { turn: 'left' });
  addEdge('MW_W_L1_EXIT', 'MW_W_L2_MID', { turn: 'right' });

  // Westbound shifts: MID <-> PRE
  addEdge('MW_W_L4_MID', 'MW_W_L3_PRE', { turn: 'left' });
  addEdge('MW_W_L3_MID', 'MW_W_L4_PRE', { turn: 'right' });
  addEdge('MW_W_L3_MID', 'MW_W_L2_PRE', { turn: 'left' });
  addEdge('MW_W_L2_MID', 'MW_W_L1_PRE', { turn: 'left' });

  // Westbound shifts: PRE <-> END
  addEdge('MW_W_L4_PRE', 'MW_W_L3_END', { turn: 'left' });
  addEdge('MW_W_L3_PRE', 'MW_W_L2_END', { turn: 'left' });
  addEdge('MW_W_L2_PRE', 'MW_W_L1_END', { turn: 'left' });

  // Legacy shifts MID <-> END
  addEdge('MW_W_L4_MID', 'MW_W_L3_END', { turn: 'left' });
  addEdge('MW_W_L3_MID', 'MW_W_L4_END', { turn: 'right' });
  addEdge('MW_W_L3_MID', 'MW_W_L2_END', { turn: 'left' });
  addEdge('MW_W_L2_MID', 'MW_W_L1_END', { turn: 'left' });

  // 4. Median Gaps (Legal U-Turns from Innermost Lanes)
  addEdge('MW_E_L4_MID', 'GAP_W1', { turn: 'right' });
  addEdge('MW_E_L4_SHIFT', 'GAP_W1', { turn: 'right' });
  addEdge('MW_E_L4_APP', 'GAP_W1', { turn: 'right' });
  addEdge('GAP_W1', 'MW_W_L4_MID', { turn: 'right' });
  addEdge('GAP_W1', 'MW_W_L4_SHIFT', { turn: 'right' });
  addEdge('GAP_W1', 'MW_W_L4_APP', { turn: 'right' });
  addEdge('MW_W_L4_EXIT', 'GAP_W1', { turn: 'right' });
  addEdge('GAP_W1', 'MW_E_L4_ENTRY', { turn: 'right' });

  addEdge('MW_W_L4_END', 'GAP_W2', { turn: 'right' });
  addEdge('MW_W_L1_END', 'GAP_W2', { turn: 'right' });
  addEdge('GAP_W2', 'MW_E_L4_START', { turn: 'right' });
  addEdge('GAP_W2', 'MW_E_L3_START', { turn: 'right' });
  addEdge('GAP_W2', 'MW_E_L2_START', { turn: 'right' });
  addEdge('GAP_W2', 'MW_E_L1_START', { turn: 'right' });

  addEdge('ME_E_L4_EXIT', 'GAP_E1', { turn: 'right' });
  addEdge('ME_E_L4_MID', 'GAP_E1', { turn: 'right' });
  addEdge('ME_E_L4_END', 'GAP_E1', { turn: 'right' });
  addEdge('GAP_E1', 'ME_W_L4_ENTRY', { turn: 'right' });
  addEdge('GAP_E1', 'ME_W_L3_ENTRY', { turn: 'right' });

  // Minor Road South Median Crossover Gap M1
  addEdge('MS_S_L3_EXIT', 'GAP_M1', { turn: 'right' });
  addEdge('MS_S_L3_MID', 'GAP_M1', { turn: 'right' });
  addEdge('MS_S_L3_END', 'GAP_M1', { turn: 'right' });
  addEdge('GAP_M1', 'MS_N_L3_START', { turn: 'right' });
  addEdge('GAP_M1', 'MS_N_L2_START', { turn: 'right' });
  addEdge('GAP_M1', 'MS_N_L1_START', { turn: 'right' });

  // 5. Major Road East progressions + Broken-Line Shifts
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`ME_E_L${l}_EXIT`, `ME_E_L${l}_END`);
    addEdge(`ME_E_L${l}_EXIT`, `ME_E_L${l}_MID`);
    addEdge(`ME_E_L${l}_MID`, `ME_E_L${l}_END`);

    addEdge(`ME_W_L${l}_START`, `ME_W_L${l}_ENTRY`);
    addEdge(`ME_W_L${l}_START`, `ME_W_L${l}_MID`);
    addEdge(`ME_W_L${l}_MID`, `ME_W_L${l}_ENTRY`);
  });
  addEdge('ME_W_L4_START', 'ME_W_L3_MID', { turn: 'left' });
  addEdge('ME_W_L3_START', 'ME_W_L4_MID', { turn: 'right' });
  addEdge('ME_W_L3_START', 'ME_W_L2_MID', { turn: 'left' });
  addEdge('ME_W_L2_START', 'ME_W_L3_MID', { turn: 'right' });
  addEdge('ME_W_L2_START', 'ME_W_L1_MID', { turn: 'left' });
  addEdge('ME_W_L1_START', 'ME_W_L2_MID', { turn: 'right' });

  addEdge('ME_W_L4_MID', 'ME_W_L3_ENTRY', { turn: 'left' });
  addEdge('ME_W_L3_MID', 'ME_W_L4_ENTRY', { turn: 'right' });
  addEdge('ME_W_L3_MID', 'ME_W_L2_ENTRY', { turn: 'left' });
  addEdge('ME_W_L2_MID', 'ME_W_L3_ENTRY', { turn: 'right' });
  addEdge('ME_W_L2_MID', 'ME_W_L1_ENTRY', { turn: 'left' });
  addEdge('ME_W_L1_MID', 'ME_W_L2_ENTRY', { turn: 'right' });

  // Legacy direct shifts on ME_W
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
    addEdge(`MS_N_L${l}_START`, `MS_N_L${l}_MID`);
    addEdge(`MS_N_L${l}_MID`, `MS_N_L${l}_ENTRY`);

    addEdge(`MS_S_L${l}_EXIT`, `MS_S_L${l}_END`);
    addEdge(`MS_S_L${l}_EXIT`, `MS_S_L${l}_MID`);
    addEdge(`MS_S_L${l}_MID`, `MS_S_L${l}_END`);
  });
  addEdge('MS_N_L1_START', 'MS_N_L2_MID', { turn: 'right' });
  addEdge('MS_N_L2_START', 'MS_N_L1_MID', { turn: 'left' });
  addEdge('MS_N_L2_START', 'MS_N_L3_MID', { turn: 'right' });
  addEdge('MS_N_L3_START', 'MS_N_L2_MID', { turn: 'left' });

  addEdge('MS_N_L1_MID', 'MS_N_L2_ENTRY', { turn: 'right' });
  addEdge('MS_N_L2_MID', 'MS_N_L1_ENTRY', { turn: 'left' });
  addEdge('MS_N_L2_MID', 'MS_N_L3_ENTRY', { turn: 'right' });
  addEdge('MS_N_L3_MID', 'MS_N_L2_ENTRY', { turn: 'left' });

  // Legacy direct shifts on MS_N
  addEdge('MS_N_L1_START', 'MS_N_L2_ENTRY', { turn: 'right' });
  addEdge('MS_N_L2_START', 'MS_N_L1_ENTRY', { turn: 'left' });
  addEdge('MS_N_L2_START', 'MS_N_L3_ENTRY', { turn: 'right' });
  addEdge('MS_N_L3_START', 'MS_N_L2_ENTRY', { turn: 'left' });

  addEdge('MS_S_L3_EXIT', 'MS_S_L2_MID', { turn: 'left' });
  addEdge('MS_S_L2_EXIT', 'MS_S_L3_MID', { turn: 'right' });
  addEdge('MS_S_L2_EXIT', 'MS_S_L1_MID', { turn: 'left' });
  addEdge('MS_S_L1_EXIT', 'MS_S_L2_MID', { turn: 'right' });

  addEdge('MS_S_L3_MID', 'MS_S_L2_END', { turn: 'left' });
  addEdge('MS_S_L2_MID', 'MS_S_L3_END', { turn: 'right' });
  addEdge('MS_S_L2_MID', 'MS_S_L1_END', { turn: 'left' });
  addEdge('MS_S_L1_MID', 'MS_S_L2_END', { turn: 'right' });

  // Legacy direct shifts on MS_S
  addEdge('MS_S_L3_EXIT', 'MS_S_L2_END', { turn: 'left' });
  addEdge('MS_S_L2_EXIT', 'MS_S_L3_END', { turn: 'right' });
  addEdge('MS_S_L2_EXIT', 'MS_S_L1_END', { turn: 'left' });
  addEdge('MS_S_L1_EXIT', 'MS_S_L2_END', { turn: 'right' });

  // 7. Minor Road North progressions + Broken-Line Shifts
  [1, 2, 3].forEach((l) => {
    addEdge(`MN_N_L${l}_EXIT`, `MN_N_L${l}_TOP`);
    addEdge(`MN_N_L${l}_EXIT`, `MN_N_L${l}_MID`);
    addEdge(`MN_N_L${l}_MID`, `MN_N_L${l}_TOP`);

    addEdge(`MN_S_L${l}_START`, `MN_S_L${l}_ENTRY`);
    addEdge(`MN_S_L${l}_START`, `MN_S_L${l}_MID`);
    addEdge(`MN_S_L${l}_MID`, `MN_S_L${l}_ENTRY`);
  });
  addEdge('MN_S_L1_START', 'MN_S_L2_MID', { turn: 'left' });
  addEdge('MN_S_L2_START', 'MN_S_L1_MID', { turn: 'right' });
  addEdge('MN_S_L2_START', 'MN_S_L3_MID', { turn: 'left' });
  addEdge('MN_S_L3_START', 'MN_S_L2_MID', { turn: 'right' });

  addEdge('MN_S_L1_MID', 'MN_S_L2_ENTRY', { turn: 'left' });
  addEdge('MN_S_L2_MID', 'MN_S_L1_ENTRY', { turn: 'right' });
  addEdge('MN_S_L2_MID', 'MN_S_L3_ENTRY', { turn: 'left' });
  addEdge('MN_S_L3_MID', 'MN_S_L2_ENTRY', { turn: 'right' });

  // Legacy direct shifts on MN_S
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
      violationReason: 'Roundabout Lane Change Offense: You shifted from Lane 1 to Lane 2 inside the roundabout! Under Kenyan NTSA rules, you must NEVER change lanes on a roundabout.'
    });
    addEdge(`RA_${curr}_L2`, `RA_${next}_L1`, {
      isLegal: false,
      violationReason: 'Roundabout Lane Change Offense: You shifted from Lane 2 to Lane 1 inside the roundabout!'
    });
    addEdge(`RA_${curr}_L2`, `RA_${next}_L3`, {
      isLegal: false,
      violationReason: 'Roundabout Lane Change Offense: You shifted from Lane 2 to Lane 3 inside the roundabout!'
    });
    addEdge(`RA_${curr}_L3`, `RA_${next}_L2`, {
      isLegal: false,
      violationReason: 'Roundabout Lane Change Offense: You shifted from Lane 3 to Lane 2 inside the roundabout!'
    });
    addEdge(`RA_${curr}_L3`, `RA_${next}_L4`, {
      isLegal: false,
      violationReason: 'Roundabout Lane Change Offense: You shifted from Lane 3 to Lane 4 inside the roundabout!'
    });
    addEdge(`RA_${curr}_L4`, `RA_${next}_L3`, {
      isLegal: false,
      violationReason: 'Roundabout Lane Change Offense: You shifted from Lane 4 to Lane 3 inside the roundabout!'
    });
  });

  // 9. Roundabout Entries from Major Road West (approaching from West)
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`MW_E_L${l}_ENTRY`, `RA_NW_L${l}`, { turn: l === 1 ? 'left' : 'none' });
  });

  // 11. Roundabout Entries from Major Road East (approaching from East)
  [1, 2, 3, 4].forEach((l) => {
    addEdge(`ME_W_L${l}_ENTRY`, `RA_SE_L${l}`, { turn: l === 1 ? 'left' : 'none' });
  });

  // 12. Roundabout Entries from Minor Road South (approaching from South)
  addEdge('MS_N_L1_ENTRY', 'RA_SW_L1', { turn: 'left' });
  addEdge('MS_N_L2_ENTRY', 'RA_SW_L2');
  addEdge('MS_N_L3_ENTRY', 'RA_SW_L3');
  addEdge('MS_N_L3_ENTRY', 'RA_SW_L4', { turn: 'right' });

  // 13. Roundabout Entries from Minor Road North (approaching from North)
  addEdge('MN_S_L1_ENTRY', 'RA_NE_L1', { turn: 'left' });
  addEdge('MN_S_L2_ENTRY', 'RA_NE_L2');
  addEdge('MN_S_L3_ENTRY', 'RA_NE_L3');
  addEdge('MN_S_L3_ENTRY', 'RA_NE_L4', { turn: 'right' });

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
  // Northbound (West lane x = 350)
  addEdge('MW_E_L1_MID', 'SIDE_N_BOT', { turn: 'left' });
  addEdge('SIDE_N_BOT', 'SIDE_N_LOWER');
  addEdge('SIDE_N_LOWER', 'SIDE_N_MID');
  addEdge('SIDE_N_MID', 'SIDE_N_UPPER');
  addEdge('SIDE_N_UPPER', 'SIDE_N_TOP');
  // Legacy direct connections preserved
  addEdge('SIDE_N_BOT', 'SIDE_N_MID');
  addEdge('SIDE_N_MID', 'SIDE_N_TOP');
  addEdge('SIDE_N_TOP', 'TOP_E_JCT_W', { turn: 'right' });
  addEdge('SIDE_N_TOP', 'TOP_W_WEST', { turn: 'left' });

  // Southbound (East lane x = 376)
  addEdge('TOP_W_JCT_W', 'SIDE_S_TOP', { turn: 'left' });
  addEdge('TOP_E_JCT_W', 'SIDE_S_TOP', { turn: 'right' });
  addEdge('SIDE_S_TOP', 'SIDE_S_UPPER');
  addEdge('SIDE_S_UPPER', 'SIDE_S_MID');
  addEdge('SIDE_S_MID', 'SIDE_S_LOWER');
  addEdge('SIDE_S_LOWER', 'SIDE_S_BOT');
  // Legacy direct connections preserved
  addEdge('SIDE_S_TOP', 'SIDE_S_MID');
  addEdge('SIDE_S_MID', 'SIDE_S_BOT');

  // Merging from Side Road Southbound onto Major Road West:
  // Can enter Lane 1 at MID, Lane 2 at MID, or merge directly into SHIFT column!
  addEdge('SIDE_S_BOT', 'MW_E_L1_MID', { turn: 'left' });
  addEdge('SIDE_S_BOT', 'MW_E_L2_MID', { turn: 'left' });
  addEdge('SIDE_S_BOT', 'MW_E_L1_SHIFT', { turn: 'left' });
  addEdge('SIDE_S_BOT', 'MW_E_L2_SHIFT', { turn: 'left' });
  addEdge('SIDE_S_BOT', 'MW_E_L1_ENTRY', { turn: 'left' });

  // Controlled Angle Parking Zone Entrance & Exit
  addEdge('SIDE_N_MID', 'AP_ENTRY', { turn: 'right' });
  addEdge('SIDE_N_LOWER', 'AP_ENTRY', { turn: 'right' });
  addEdge('SIDE_S_MID', 'AP_ENTRY', { turn: 'left' });
  addEdge('SIDE_S_LOWER', 'AP_ENTRY', { turn: 'left' });
  addEdge('MN_N_L1_EXIT', 'AP_EXIT_E', { turn: 'left' });
  addEdge('MN_N_L1_TOP', 'AP_EXIT_E', { turn: 'left' });
  addEdge('AP_EXIT_E', 'AP_AISLE_E');
  addEdge('AP_EXIT_E', 'AP_AISLE_7');
  addEdge('AP_EXIT_E', 'MN_N_L1_TOP', { turn: 'left' });

  // Central Aisle continuous chain (Bidirectional maneuvering)
  addEdge('AP_ENTRY', 'AP_AISLE_1');
  addEdge('AP_AISLE_1', 'AP_ENTRY');
  addEdge('AP_ENTRY', 'AP_AISLE_W');
  addEdge('AP_AISLE_W', 'AP_ENTRY');
  addEdge('AP_ENTRY', 'SIDE_S_MID', { turn: 'left' });
  addEdge('AP_ENTRY', 'SIDE_S_LOWER', { turn: 'left' });
  addEdge('AP_ENTRY', 'SIDE_N_MID', { turn: 'right' });
  addEdge('AP_ENTRY', 'SIDE_N_LOWER', { turn: 'right' });

  addEdge('AP_AISLE_1', 'AP_AISLE_W');
  addEdge('AP_AISLE_W', 'AP_AISLE_1');

  addEdge('AP_AISLE_W', 'AP_AISLE_3');
  addEdge('AP_AISLE_3', 'AP_AISLE_W');

  addEdge('AP_AISLE_3', 'AP_AISLE_4');
  addEdge('AP_AISLE_4', 'AP_AISLE_3');

  addEdge('AP_AISLE_4', 'AP_AISLE_E');
  addEdge('AP_AISLE_E', 'AP_AISLE_4');

  addEdge('AP_AISLE_E', 'AP_AISLE_6');
  addEdge('AP_AISLE_6', 'AP_AISLE_E');

  addEdge('AP_AISLE_6', 'AP_AISLE_7');
  addEdge('AP_AISLE_7', 'AP_AISLE_6');

  addEdge('AP_AISLE_7', 'AP_EXIT_E');
  addEdge('AP_EXIT_E', 'AP_AISLE_7');

  // Legacy direct aisle connection preserved
  addEdge('AP_AISLE_W', 'AP_AISLE_E');
  addEdge('AP_AISLE_E', 'AP_AISLE_W');
  addEdge('AP_AISLE_E', 'AP_EXIT_E');

  // All 7 Top Angle Bays (Park Forward In, Reverse Out)
  addEdge('AP_AISLE_1', 'AP_BAY_TOP_BAY1', { turn: 'left' });
  addEdge('AP_BAY_TOP_BAY1', 'AP_AISLE_1', { isReverse: true, turn: 'right' });

  addEdge('AP_AISLE_W', 'AP_BAY_TOP_BAY2', { turn: 'left' });
  addEdge('AP_BAY_TOP_BAY2', 'AP_AISLE_W', { isReverse: true, turn: 'right' });

  addEdge('AP_AISLE_3', 'AP_BAY_TOP_1', { turn: 'left' });
  addEdge('AP_BAY_TOP_1', 'AP_AISLE_3', { isReverse: true, turn: 'right' });
  // Legacy connection preserved
  addEdge('AP_AISLE_W', 'AP_BAY_TOP_1', { turn: 'left' });
  addEdge('AP_BAY_TOP_1', 'AP_AISLE_W', { isReverse: true, turn: 'right' });

  addEdge('AP_AISLE_4', 'AP_BAY_TOP_BAY4', { turn: 'left' });
  addEdge('AP_BAY_TOP_BAY4', 'AP_AISLE_4', { isReverse: true, turn: 'right' });

  addEdge('AP_AISLE_E', 'AP_BAY_TOP_BAY5', { turn: 'left' });
  addEdge('AP_BAY_TOP_BAY5', 'AP_AISLE_E', { isReverse: true, turn: 'right' });

  addEdge('AP_AISLE_6', 'AP_BAY_TOP_2', { turn: 'left' });
  addEdge('AP_BAY_TOP_2', 'AP_AISLE_6', { isReverse: true, turn: 'right' });
  // Legacy connection preserved
  addEdge('AP_AISLE_E', 'AP_BAY_TOP_2', { turn: 'left' });
  addEdge('AP_BAY_TOP_2', 'AP_AISLE_E', { isReverse: true, turn: 'right' });

  addEdge('AP_AISLE_7', 'AP_BAY_TOP_BAY7', { turn: 'left' });
  addEdge('AP_BAY_TOP_BAY7', 'AP_AISLE_7', { isReverse: true, turn: 'right' });

  // All 7 Bottom Angle Bays (Park Forward In, Reverse Out)
  addEdge('AP_AISLE_1', 'AP_BAY_BOT_BAY1', { turn: 'right' });
  addEdge('AP_BAY_BOT_BAY1', 'AP_AISLE_1', { isReverse: true, turn: 'left' });

  addEdge('AP_AISLE_W', 'AP_BAY_BOT_BAY2', { turn: 'right' });
  addEdge('AP_BAY_BOT_BAY2', 'AP_AISLE_W', { isReverse: true, turn: 'left' });

  addEdge('AP_AISLE_3', 'AP_BAY_BOT_1', { turn: 'right' });
  addEdge('AP_BAY_BOT_1', 'AP_AISLE_3', { isReverse: true, turn: 'left' });
  // Legacy connection preserved
  addEdge('AP_AISLE_W', 'AP_BAY_BOT_1', { turn: 'right' });
  addEdge('AP_BAY_BOT_1', 'AP_AISLE_W', { isReverse: true, turn: 'left' });

  addEdge('AP_AISLE_4', 'AP_BAY_BOT_BAY4', { turn: 'right' });
  addEdge('AP_BAY_BOT_BAY4', 'AP_AISLE_4', { isReverse: true, turn: 'left' });

  addEdge('AP_AISLE_E', 'AP_BAY_BOT_BAY5', { turn: 'right' });
  addEdge('AP_BAY_BOT_BAY5', 'AP_AISLE_E', { isReverse: true, turn: 'left' });

  addEdge('AP_AISLE_6', 'AP_BAY_BOT_2', { turn: 'right' });
  addEdge('AP_BAY_BOT_2', 'AP_AISLE_6', { isReverse: true, turn: 'left' });
  // Legacy connection preserved
  addEdge('AP_AISLE_E', 'AP_BAY_BOT_2', { turn: 'right' });
  addEdge('AP_BAY_BOT_2', 'AP_AISLE_E', { isReverse: true, turn: 'left' });

  addEdge('AP_AISLE_7', 'AP_BAY_BOT_BAY7', { turn: 'right' });
  addEdge('AP_BAY_BOT_BAY7', 'AP_AISLE_7', { isReverse: true, turn: 'left' });

  // 18. Top Perimeter Two-Way Road & Flush Parking Connections
  addEdge('MN_N_L1_TOP', 'TOP_W_JCT_N', { turn: 'left' });
  addEdge('MN_N_L1_TOP', 'TOP_W_FLUSH_APPROACH', { turn: 'left' });
  addEdge('MN_N_L2_TOP', 'TOP_W_FLUSH_APPROACH', { turn: 'left' });
  addEdge('MN_N_L2_TOP', 'TOP_E_JCT_N', { turn: 'right' });
  addEdge('MN_N_L3_TOP', 'TOP_E_JCT_N', { turn: 'right' });
  addEdge('MN_N_L3_TOP', 'MN_S_L3_START', { turn: 'right' });

  // Eastbound Top Road: WEST -> PRE -> JCT_W -> ZEBRA1 -> FLUSH_W -> MID -> FLUSH_E -> JCT_N -> APPROACH_E -> ZEBRA2 -> EAST
  addEdge('TOP_E_WEST', 'TOP_E_PRE');
  addEdge('TOP_E_PRE', 'TOP_E_JCT_W');
  addEdge('TOP_E_JCT_W', 'TOP_E_ZEBRA1');
  addEdge('TOP_E_ZEBRA1', 'TOP_E_FLUSH_W');
  addEdge('TOP_E_FLUSH_W', 'TOP_E_MID');
  addEdge('TOP_E_MID', 'TOP_E_FLUSH_E');
  addEdge('TOP_E_FLUSH_E', 'TOP_E_JCT_N');
  addEdge('TOP_E_JCT_N', 'TOP_E_APPROACH_E');
  addEdge('TOP_E_APPROACH_E', 'TOP_E_ZEBRA2');
  addEdge('TOP_E_ZEBRA2', 'TOP_E_EAST');

  // Legacy direct connections preserved
  addEdge('TOP_E_WEST', 'TOP_E_JCT_W');
  addEdge('TOP_E_ZEBRA1', 'TOP_E_MID');
  addEdge('TOP_E_MID', 'TOP_E_JCT_N');
  addEdge('TOP_E_JCT_N', 'TOP_E_ZEBRA2');

  addEdge('TOP_E_EAST', 'TOP_W_EAST', { turn: 'right' });
  addEdge('TOP_E_JCT_N', 'MN_S_L3_START', { turn: 'right' });
  addEdge('TOP_E_JCT_N', 'MN_S_L2_START', { turn: 'right' });
  addEdge('TOP_E_JCT_N', 'MN_S_L1_START', { turn: 'right' });

  // Westbound Top Road: EAST -> ZEBRA2 -> APPROACH_E -> JCT_N -> FLUSH_E -> FLUSH_APPROACH -> FLUSH_W -> ZEBRA1 -> JCT_W -> POST -> WEST
  addEdge('TOP_W_EAST', 'TOP_W_ZEBRA2');
  addEdge('TOP_W_ZEBRA2', 'TOP_W_APPROACH_E');
  addEdge('TOP_W_APPROACH_E', 'TOP_W_JCT_N');
  addEdge('TOP_W_JCT_N', 'TOP_W_FLUSH_E');
  addEdge('TOP_W_FLUSH_E', 'TOP_W_FLUSH_APPROACH');
  addEdge('TOP_W_FLUSH_APPROACH', 'TOP_W_FLUSH_W');
  addEdge('TOP_W_FLUSH_W', 'TOP_W_ZEBRA1');
  addEdge('TOP_W_ZEBRA1', 'TOP_W_JCT_W');
  addEdge('TOP_W_JCT_W', 'TOP_W_POST');
  addEdge('TOP_W_POST', 'TOP_W_WEST');

  // Legacy direct connections preserved
  addEdge('TOP_W_ZEBRA2', 'TOP_W_JCT_N');
  addEdge('TOP_W_JCT_N', 'TOP_W_FLUSH_APPROACH');
  addEdge('TOP_W_FLUSH_APPROACH', 'TOP_W_ZEBRA1');
  addEdge('TOP_W_JCT_W', 'TOP_W_WEST');

  addEdge('TOP_W_JCT_N', 'MN_S_L1_START', { turn: 'left' });
  addEdge('TOP_W_JCT_N', 'MN_S_L2_START', { turn: 'left' });
  addEdge('TOP_W_JCT_N', 'MN_S_L3_START', { turn: 'left' });
  addEdge('TOP_W_WEST', 'TOP_E_WEST', { turn: 'right' });

  // Flush Parking (All 4 Bays, Reverse In, Forward Out)
  // Bay 1 (FLUSH_BAY_2):
  addEdge('TOP_W_FLUSH_APPROACH', 'FLUSH_BAY_2', { isReverse: true, turn: 'left' });
  addEdge('TOP_W_FLUSH_W', 'FLUSH_BAY_2', { isReverse: true, turn: 'left' });
  addEdge('FLUSH_BAY_2', 'TOP_W_ZEBRA1', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_2', 'TOP_E_MID', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_2', 'TOP_E_FLUSH_W', { isReverse: false, turn: 'right' });

  // Bay 2 (FLUSH_BAY_3):
  addEdge('TOP_W_FLUSH_APPROACH', 'FLUSH_BAY_3', { isReverse: true, turn: 'left' });
  addEdge('FLUSH_BAY_3', 'TOP_W_FLUSH_W', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_3', 'TOP_W_ZEBRA1', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_3', 'TOP_E_MID', { isReverse: false, turn: 'right' });

  // Bay 3 (FLUSH_BAY_1):
  addEdge('TOP_W_FLUSH_APPROACH', 'FLUSH_BAY_1', { isReverse: true, turn: 'left' });
  addEdge('FLUSH_BAY_1', 'TOP_W_ZEBRA1', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_1', 'TOP_W_FLUSH_W', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_1', 'TOP_E_MID', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_1', 'TOP_E_FLUSH_E', { isReverse: false, turn: 'right' });

  // Bay 4 (FLUSH_BAY_4):
  addEdge('TOP_W_FLUSH_E', 'FLUSH_BAY_4', { isReverse: true, turn: 'left' });
  addEdge('TOP_W_FLUSH_APPROACH', 'FLUSH_BAY_4', { isReverse: true, turn: 'left' });
  addEdge('FLUSH_BAY_4', 'TOP_W_FLUSH_APPROACH', { isReverse: false, turn: 'right' });
  addEdge('FLUSH_BAY_4', 'TOP_E_FLUSH_E', { isReverse: false, turn: 'right' });

  // 19. Mistake Edges on Two-Way Single Carriageways (Kenyan Keep-Left Violations)
  // Driving against traffic on Side Access Road:
  addEdge('SIDE_S_MID', 'SIDE_S_TOP', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Northbound in the Southbound lane into oncoming traffic! On two-way roads, you must always keep left.'
  });
  addEdge('SIDE_S_BOT', 'SIDE_S_MID', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Northbound in the Southbound lane into oncoming traffic!'
  });
  addEdge('AP_ENTRY', 'SIDE_S_TOP', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): Exiting parking into the Southbound lane while heading North is illegal! Always keep left.'
  });
  addEdge('SIDE_N_TOP', 'SIDE_N_MID', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Southbound in the Northbound lane into oncoming traffic!'
  });
  addEdge('SIDE_N_MID', 'SIDE_N_BOT', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Southbound in the Northbound lane into oncoming traffic!'
  });

  // Driving against traffic on Top Perimeter Road:
  addEdge('TOP_E_EAST', 'TOP_E_ZEBRA2', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Westbound in the Eastbound lane on the Top Perimeter Road into oncoming traffic! Always keep left.'
  });
  addEdge('TOP_E_ZEBRA2', 'TOP_E_JCT_N', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Westbound in the Eastbound lane on the Top Perimeter Road into oncoming traffic!'
  });
  addEdge('TOP_E_JCT_N', 'TOP_E_MID', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Westbound in the Eastbound lane on the Top Perimeter Road into oncoming traffic!'
  });
  addEdge('TOP_E_MID', 'TOP_E_ZEBRA1', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Westbound in the Eastbound lane on the Top Perimeter Road into oncoming traffic!'
  });
  addEdge('TOP_E_ZEBRA1', 'TOP_E_JCT_W', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Westbound in the Eastbound lane on the Top Perimeter Road into oncoming traffic!'
  });
  addEdge('TOP_E_JCT_W', 'TOP_E_WEST', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Westbound in the Eastbound lane on the Top Perimeter Road into oncoming traffic!'
  });

  addEdge('TOP_W_WEST', 'TOP_W_JCT_W', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Eastbound in the Westbound lane on the Top Perimeter Road into oncoming traffic!'
  });
  addEdge('TOP_W_JCT_W', 'TOP_W_ZEBRA1', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Eastbound in the Westbound lane on the Top Perimeter Road into oncoming traffic!'
  });
  addEdge('TOP_W_ZEBRA1', 'TOP_W_FLUSH_APPROACH', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Eastbound in the Westbound lane on the Top Perimeter Road into oncoming traffic!'
  });
  addEdge('TOP_W_FLUSH_APPROACH', 'TOP_W_JCT_N', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Eastbound in the Westbound lane on the Top Perimeter Road into oncoming traffic!'
  });
  addEdge('TOP_W_JCT_N', 'TOP_W_ZEBRA2', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Eastbound in the Westbound lane on the Top Perimeter Road into oncoming traffic!'
  });
  addEdge('TOP_W_ZEBRA2', 'TOP_W_EAST', {
    isLegal: false,
    violationReason: 'NTSA Major Traffic Violation (Failed to Keep Left): You drove Eastbound in the Westbound lane on the Top Perimeter Road into oncoming traffic!'
  });

  return edges;
};

export const EDGES = buildBoardEdges();
export const ALL_EDGES = EDGES;
export const BOARD_NODES = NODES;
