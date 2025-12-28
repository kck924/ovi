/**
 * NHL Coordinate System Utilities
 *
 * NHL rink coordinates:
 * - x: -100 to 100 (left to right boards)
 * - y: -42.5 to 42.5 (bottom to top boards)
 * - Goals at: (-89, 0) and (89, 0)
 * - Center ice at: (0, 0)
 */

export const RINK_DIMENSIONS = {
  width: 200,       // -100 to 100 feet
  height: 85,       // -42.5 to 42.5 feet
  cornerRadius: 28, // radius of rounded corners

  // Key lines
  centerLineX: 0,
  blueLineOffset: 25,  // blue lines at +/-25 from center
  goalLineX: 89,       // goal lines at +/-89

  // Circles
  centerCircleRadius: 15,
  faceoffCircleRadius: 15,

  // Faceoff positions
  zoneFaceoffX: 69,
  zoneFaceoffY: 22,
  neutralFaceoffY: 22,
}

/**
 * The "Ovi Spot" - left faceoff circle area
 * This is where Ovechkin scores a disproportionate number of goals
 */
export const OVI_SPOT = {
  xMin: -75,
  xMax: -60,
  yMin: 15,
  yMax: 30,
}

/**
 * Check if a shot came from the "Ovi Spot"
 */
export function isFromOviSpot(x, y) {
  // Handle both sides of the ice (normalize to left side)
  const normX = x > 0 ? -x : x
  const normY = x > 0 ? -y : y

  return (
    normX >= OVI_SPOT.xMin &&
    normX <= OVI_SPOT.xMax &&
    normY >= OVI_SPOT.yMin &&
    normY <= OVI_SPOT.yMax
  )
}

/**
 * Normalize coordinates to attacking zone (left side for left-handed shooter)
 * Ovechkin is a left-handed shooter, so his "natural" side is the left circle
 */
export function normalizeToAttackingZone(x, y) {
  // If shot was from right side (positive x), mirror to left side
  if (x > 0) {
    return { x: -x, y: -y }
  }
  return { x, y }
}

/**
 * Calculate distance from goal
 */
export function distanceFromGoal(x, y, goalX = -89) {
  return Math.sqrt(Math.pow(x - goalX, 2) + Math.pow(y, 2))
}

/**
 * Calculate shot angle (degrees from goal line)
 */
export function shotAngle(x, y, goalX = -89) {
  const dx = x - goalX
  const angle = Math.atan2(Math.abs(y), Math.abs(dx)) * (180 / Math.PI)
  return angle
}

/**
 * Categorize shot location into zones
 */
export function getShotZone(x, y) {
  const normX = x > 0 ? -x : x
  const normY = x > 0 ? -y : y

  // Slot (high danger area in front of net)
  if (normX >= -89 && normX <= -69 && Math.abs(normY) <= 9) {
    return 'slot'
  }

  // Left circle (Ovi's office)
  if (normX >= -75 && normX <= -55 && normY >= 10 && normY <= 35) {
    return 'left_circle'
  }

  // Right circle
  if (normX >= -75 && normX <= -55 && normY <= -10 && normY >= -35) {
    return 'right_circle'
  }

  // High slot
  if (normX >= -65 && normX <= -45 && Math.abs(normY) <= 15) {
    return 'high_slot'
  }

  // Point (blue line area)
  if (normX >= -55 && normX <= -25) {
    return 'point'
  }

  // Behind the net
  if (normX < -89) {
    return 'behind_net'
  }

  return 'other'
}

/**
 * Convert NHL coordinates to SVG coordinates
 * @param {number} nhlX - NHL x coordinate (-100 to 100)
 * @param {number} nhlY - NHL y coordinate (-42.5 to 42.5)
 * @param {number} svgWidth - SVG canvas width
 * @param {number} svgHeight - SVG canvas height
 */
export function nhlToSvg(nhlX, nhlY, svgWidth, svgHeight) {
  const x = ((nhlX + 100) / 200) * svgWidth
  const y = ((42.5 - nhlY) / 85) * svgHeight
  return { x, y }
}

/**
 * Convert SVG coordinates back to NHL coordinates
 */
export function svgToNhl(svgX, svgY, svgWidth, svgHeight) {
  const x = (svgX / svgWidth) * 200 - 100
  const y = 42.5 - (svgY / svgHeight) * 85
  return { x, y }
}

export default {
  RINK_DIMENSIONS,
  OVI_SPOT,
  isFromOviSpot,
  normalizeToAttackingZone,
  distanceFromGoal,
  shotAngle,
  getShotZone,
  nhlToSvg,
  svgToNhl,
}
