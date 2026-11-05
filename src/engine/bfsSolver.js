import { NODES, BOARD_NODES, EDGES, ALL_EDGES } from '../data/boardGraph.js';

/**
 * ============================================================================
 * STRICT NTSA TRAFFIC RULE VALIDATOR (WITH 3 GOLDEN RULES & CLOSED LANES)
 * ============================================================================
 */
export const validateNtsaRoute = (
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

  // 8. Strict Kenyan Keep-Left Rule Enforcement on Two-Way Single Carriageways
  let droveOnTwoWay = false;
  for (let i = 0; i < pathIds.length - 1; i++) {
    const u = pathIds[i];
    const v = pathIds[i + 1];

    if (u.startsWith('SIDE_') || u.startsWith('TOP_') || v.startsWith('SIDE_') || v.startsWith('TOP_')) {
      droveOnTwoWay = true;
    }

    // Side Access Road (West lane x=350 is Northbound; East lane x=376 is Southbound)
    if (u.startsWith('SIDE_S_') && v.startsWith('SIDE_S_')) {
      const uY = BOARD_NODES[u]?.y ?? 0;
      const vY = BOARD_NODES[v]?.y ?? 0;
      if (vY < uY) {
        violations.push(
          'NTSA Major Traffic Violation (Failed to Keep Left): You drove North in the Southbound lane on the Side Access Road into oncoming traffic! Under Kenyan Highway Code, you must always keep left.'
        );
      }
    }
    if (u.startsWith('SIDE_N_') && v.startsWith('SIDE_N_')) {
      const uY = BOARD_NODES[u]?.y ?? 0;
      const vY = BOARD_NODES[v]?.y ?? 0;
      if (vY > uY) {
        violations.push(
          'NTSA Major Traffic Violation (Failed to Keep Left): You drove South in the Northbound lane on the Side Access Road into oncoming traffic! Under Kenyan Highway Code, you must always keep left.'
        );
      }
    }
    // Top Perimeter Road (North lane y=76 is Eastbound; South lane y=100 is Westbound)
    if (u.startsWith('TOP_E_') && v.startsWith('TOP_E_')) {
      const uX = BOARD_NODES[u]?.x ?? 0;
      const vX = BOARD_NODES[v]?.x ?? 0;
      if (vX < uX) {
        violations.push(
          'NTSA Major Traffic Violation (Failed to Keep Left): You drove West in the Eastbound lane on the Top Perimeter Road into oncoming traffic! Under Kenyan Highway Code, you must always keep left.'
        );
      }
    }
    if (u.startsWith('TOP_W_') && v.startsWith('TOP_W_')) {
      const uX = BOARD_NODES[u]?.x ?? 0;
      const vX = BOARD_NODES[v]?.x ?? 0;
      if (vX > uX) {
        violations.push(
          'NTSA Major Traffic Violation (Failed to Keep Left): You drove East in the Westbound lane on the Top Perimeter Road into oncoming traffic! Under Kenyan Highway Code, you must always keep left.'
        );
      }
    }
  }

  if (droveOnTwoWay && !violations.some((v) => v.includes('Keep Left'))) {
    passedRules.push('Strictly adhered to the Kenyan Keep-Left rule on two-way single carriageways.');
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
export const findShortestValidNtsaRoute = (
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
