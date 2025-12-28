/**
 * MiniRink.jsx
 * Compact hockey rink for the animated visualization
 * Goals appear as dots at their shot coordinates
 */

import { useMemo } from 'react'

const RINK = {
  width: 200,
  height: 85,
  cornerRadius: 28,
  goalLineX: 89,
}

export default function MiniRink({ goals = [], width = 400 }) {
  const scale = width / RINK.width
  const height = RINK.height * scale

  const toSvgX = (x) => ((x + 100) / 200) * width
  const toSvgY = (y) => ((42.5 - y) / 85) * height

  // Show goals at their actual positions (no normalization)
  const normalizedGoals = useMemo(() => {
    return goals
      .filter(g => g.xCoord != null && g.yCoord != null)
      .map(goal => ({ ...goal, x: goal.xCoord, y: goal.yCoord }))
  }, [goals])

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mini-rink"
      style={{ width: '100%', height: 'auto' }}
    >
      {/* Ice */}
      <rect
        x={0} y={0}
        width={width} height={height}
        rx={RINK.cornerRadius * scale / 2}
        fill="#f8f8f8"
        stroke="#666"
        strokeWidth={1}
      />

      {/* Center line */}
      <line
        x1={width / 2} y1={0}
        x2={width / 2} y2={height}
        stroke="#c8102e"
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Blue lines */}
      <line
        x1={toSvgX(-25)} y1={0}
        x2={toSvgX(-25)} y2={height}
        stroke="#0033a0"
        strokeWidth={2}
        opacity={0.5}
      />
      <line
        x1={toSvgX(25)} y1={0}
        x2={toSvgX(25)} y2={height}
        stroke="#0033a0"
        strokeWidth={2}
        opacity={0.5}
      />

      {/* Goal lines */}
      <line
        x1={toSvgX(-89)} y1={toSvgY(42.5)}
        x2={toSvgX(-89)} y2={toSvgY(-42.5)}
        stroke="#c8102e"
        strokeWidth={1}
        opacity={0.3}
      />
      <line
        x1={toSvgX(89)} y1={toSvgY(42.5)}
        x2={toSvgX(89)} y2={toSvgY(-42.5)}
        stroke="#c8102e"
        strokeWidth={2}
        opacity={0.7}
      />

      {/* Faceoff circles - right side */}
      <circle
        cx={toSvgX(69)} cy={toSvgY(22)}
        r={15 * scale / 2}
        fill="none"
        stroke="#c8102e"
        strokeWidth={0.5}
        opacity={0.3}
      />
      <circle
        cx={toSvgX(69)} cy={toSvgY(-22)}
        r={15 * scale / 2}
        fill="none"
        stroke="#c8102e"
        strokeWidth={0.5}
        opacity={0.3}
      />

      {/* Faceoff circles - left side */}
      <circle
        cx={toSvgX(-69)} cy={toSvgY(22)}
        r={15 * scale / 2}
        fill="none"
        stroke="#c8102e"
        strokeWidth={0.5}
        opacity={0.3}
      />
      <circle
        cx={toSvgX(-69)} cy={toSvgY(-22)}
        r={15 * scale / 2}
        fill="none"
        stroke="#c8102e"
        strokeWidth={0.5}
        opacity={0.3}
      />

      {/* Goal crease - right */}
      <path
        d={`M ${toSvgX(89)} ${toSvgY(4)}
            L ${toSvgX(85)} ${toSvgY(4)}
            A ${4 * scale / 2} ${4 * scale / 2} 0 0 0 ${toSvgX(85)} ${toSvgY(-4)}
            L ${toSvgX(89)} ${toSvgY(-4)} Z`}
        fill="#e0f0ff"
        stroke="#c8102e"
        strokeWidth={0.5}
        opacity={0.5}
      />

      {/* Goal crease - left */}
      <path
        d={`M ${toSvgX(-89)} ${toSvgY(4)}
            L ${toSvgX(-85)} ${toSvgY(4)}
            A ${4 * scale / 2} ${4 * scale / 2} 0 0 1 ${toSvgX(-85)} ${toSvgY(-4)}
            L ${toSvgX(-89)} ${toSvgY(-4)} Z`}
        fill="#e0f0ff"
        stroke="#c8102e"
        strokeWidth={0.5}
        opacity={0.5}
      />

      {/* Goal markers */}
      {normalizedGoals.map((goal, i) => (
        <circle
          key={goal.careerGoalNum || i}
          cx={toSvgX(goal.x)}
          cy={toSvgY(goal.y)}
          r={3}
          fill="#c8102e"
          opacity={0.6}
          className="goal-dot"
        />
      ))}

      {/* "Ovi Spot" highlights - both sides */}
      <ellipse
        cx={toSvgX(68)}
        cy={toSvgY(-22)}
        rx={12 * scale / 2}
        ry={10 * scale / 2}
        fill="#c8102e"
        opacity={0.1}
      />
      <ellipse
        cx={toSvgX(-68)}
        cy={toSvgY(22)}
        rx={12 * scale / 2}
        ry={10 * scale / 2}
        fill="#c8102e"
        opacity={0.1}
      />
    </svg>
  )
}

export { RINK }
