export const CHALLENGES = [
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

export const NTSA_CHALLENGES = CHALLENGES;
export default CHALLENGES;
