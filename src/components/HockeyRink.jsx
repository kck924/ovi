/**
 * HockeyRink.jsx
 * SVG hockey rink with NHL regulation dimensions
 *
 * NHL Coordinate System:
 * - x: -100 to 100 (left to right boards)
 * - y: -42.5 to 42.5 (bottom to top boards)
 * - Goals at: (-89, 0) and (89, 0)
 */

const RINK = {
  width: 200,      // -100 to 100
  height: 85,      // -42.5 to 42.5
  cornerRadius: 28,

  // Lines
  centerLineX: 0,
  blueLineOffset: 25,  // 25 feet from center
  goalLineX: 89,

  // Circles
  centerCircleRadius: 15,
  faceoffCircleRadius: 15,
  faceoffDotRadius: 1,

  // Faceoff dot positions (from center)
  neutralZoneDotY: 22,
  zoneDotX: 69,
  zoneDotY: 22,

  // Goal crease
  creaseWidth: 8,
  creaseDepth: 4,
}

export default function HockeyRink({ children, width = 900, showZones = true }) {
  // Scale factor to convert NHL coords to SVG
  const scale = width / RINK.width
  const height = RINK.height * scale

  // Transform NHL coordinates (-100,100) x (-42.5,42.5) to SVG coordinates
  const toSvgX = (x) => (x + 100) * scale / 2
  const toSvgY = (y) => (42.5 - y) * scale  // Flip Y axis

  return (
    <div className="rink-container">
      <svg
        className="rink-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Ice surface */}
        <rect
          className="rink-ice"
          x={0}
          y={0}
          width={width}
          height={height}
          rx={RINK.cornerRadius * scale / 2}
        />

        {/* Boards */}
        <rect
          className="rink-boards"
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          rx={RINK.cornerRadius * scale / 2}
        />

        {/* Center line */}
        <line
          className="center-line"
          x1={toSvgX(0)}
          y1={0}
          x2={toSvgX(0)}
          y2={height}
        />

        {/* Blue lines */}
        <line
          className="blue-line"
          x1={toSvgX(-25)}
          y1={0}
          x2={toSvgX(-25)}
          y2={height}
        />
        <line
          className="blue-line"
          x1={toSvgX(25)}
          y1={0}
          x2={toSvgX(25)}
          y2={height}
        />

        {/* Goal lines */}
        <line
          className="goal-line"
          x1={toSvgX(-89)}
          y1={toSvgY(42.5)}
          x2={toSvgX(-89)}
          y2={toSvgY(-42.5)}
        />
        <line
          className="goal-line"
          x1={toSvgX(89)}
          y1={toSvgY(42.5)}
          x2={toSvgX(89)}
          y2={toSvgY(-42.5)}
        />

        {/* Center circle */}
        <circle
          className="faceoff-circle"
          cx={toSvgX(0)}
          cy={toSvgY(0)}
          r={RINK.centerCircleRadius * scale / 2}
        />
        <circle
          className="faceoff-dot"
          cx={toSvgX(0)}
          cy={toSvgY(0)}
          r={RINK.faceoffDotRadius * scale}
        />

        {/* Neutral zone faceoff dots */}
        <circle className="faceoff-dot" cx={toSvgX(-22)} cy={toSvgY(22)} r={RINK.faceoffDotRadius * scale} />
        <circle className="faceoff-dot" cx={toSvgX(-22)} cy={toSvgY(-22)} r={RINK.faceoffDotRadius * scale} />
        <circle className="faceoff-dot" cx={toSvgX(22)} cy={toSvgY(22)} r={RINK.faceoffDotRadius * scale} />
        <circle className="faceoff-dot" cx={toSvgX(22)} cy={toSvgY(-22)} r={RINK.faceoffDotRadius * scale} />

        {/* Zone faceoff circles - Left */}
        <circle className="faceoff-circle" cx={toSvgX(-69)} cy={toSvgY(22)} r={RINK.faceoffCircleRadius * scale / 2} />
        <circle className="faceoff-dot" cx={toSvgX(-69)} cy={toSvgY(22)} r={RINK.faceoffDotRadius * scale} />
        <circle className="faceoff-circle" cx={toSvgX(-69)} cy={toSvgY(-22)} r={RINK.faceoffCircleRadius * scale / 2} />
        <circle className="faceoff-dot" cx={toSvgX(-69)} cy={toSvgY(-22)} r={RINK.faceoffDotRadius * scale} />

        {/* Zone faceoff circles - Right */}
        <circle className="faceoff-circle" cx={toSvgX(69)} cy={toSvgY(22)} r={RINK.faceoffCircleRadius * scale / 2} />
        <circle className="faceoff-dot" cx={toSvgX(69)} cy={toSvgY(22)} r={RINK.faceoffDotRadius * scale} />
        <circle className="faceoff-circle" cx={toSvgX(69)} cy={toSvgY(-22)} r={RINK.faceoffCircleRadius * scale / 2} />
        <circle className="faceoff-dot" cx={toSvgX(69)} cy={toSvgY(-22)} r={RINK.faceoffDotRadius * scale} />

        {/* Goal creases */}
        <path
          className="goal-crease"
          d={`M ${toSvgX(-89)} ${toSvgY(4)}
              L ${toSvgX(-85)} ${toSvgY(4)}
              A ${4 * scale / 2} ${4 * scale / 2} 0 0 1 ${toSvgX(-85)} ${toSvgY(-4)}
              L ${toSvgX(-89)} ${toSvgY(-4)} Z`}
        />
        <path
          className="goal-crease"
          d={`M ${toSvgX(89)} ${toSvgY(4)}
              L ${toSvgX(85)} ${toSvgY(4)}
              A ${4 * scale / 2} ${4 * scale / 2} 0 0 0 ${toSvgX(85)} ${toSvgY(-4)}
              L ${toSvgX(89)} ${toSvgY(-4)} Z`}
        />

        {/* Goal nets (simplified rectangles) */}
        <rect
          fill="#ddd"
          stroke="#333"
          strokeWidth="1"
          x={toSvgX(-93)}
          y={toSvgY(3)}
          width={4 * scale / 2}
          height={6 * scale / 2}
        />
        <rect
          fill="#ddd"
          stroke="#333"
          strokeWidth="1"
          x={toSvgX(89)}
          y={toSvgY(3)}
          width={4 * scale / 2}
          height={6 * scale / 2}
        />

        {/* Children (goal markers, etc.) */}
        {children && children({ toSvgX, toSvgY, scale })}
      </svg>
    </div>
  )
}

export { RINK }
