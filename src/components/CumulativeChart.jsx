/**
 * CumulativeChart.jsx
 * Animated line chart showing cumulative goals over career games
 * with reference lines for milestones and all-time leaders
 */

import { useMemo } from 'react'

const REFERENCE_LINES = [
  { value: 100, label: '100', color: '#444' },
  { value: 300, label: '300', color: '#444' },
  { value: 500, label: '500', color: '#555' },
  { value: 700, label: '700', color: '#555' },
  { value: 766, label: 'Jagr (766)', color: '#888' },
  { value: 801, label: 'Howe (801)', color: '#d4af37' },
  { value: 894, label: 'Gretzky (894)', color: '#ffd700' },
]

export default function CumulativeChart({
  gamelog = [],
  currentGoalCount = 0,
  height = 180,
}) {
  const totalGames = gamelog.length || 1500
  const maxY = 920

  // Find the game index where we've reached currentGoalCount
  const currentGameIndex = useMemo(() => {
    if (gamelog.length === 0) return 0
    for (let i = 0; i < gamelog.length; i++) {
      if (gamelog[i].cumulativeGoals >= currentGoalCount) {
        return i
      }
    }
    return gamelog.length - 1
  }, [gamelog, currentGoalCount])

  // Build the line path from gamelog data
  const linePath = useMemo(() => {
    if (gamelog.length === 0 || currentGameIndex < 1) return ''

    const points = []
    // Sample to keep path manageable
    const step = Math.max(1, Math.floor(currentGameIndex / 200))

    for (let i = 0; i <= currentGameIndex; i += step) {
      const game = gamelog[i]
      const x = (i / totalGames) * 100
      const y = 100 - (game.cumulativeGoals / maxY) * 100
      points.push({ x, y })
    }

    // Always include current point
    const currentGame = gamelog[currentGameIndex]
    if (currentGame) {
      points.push({
        x: (currentGameIndex / totalGames) * 100,
        y: 100 - (currentGame.cumulativeGoals / maxY) * 100,
      })
    }

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }, [gamelog, currentGameIndex, totalGames])

  const getY = (goalValue) => 100 - (goalValue / maxY) * 100

  const currentGame = gamelog[currentGameIndex]

  return (
    <div className="cumulative-chart" style={{ height }}>
      {/* Y-axis labels */}
      <div className="y-axis">
        <span>900</span>
        <span>800</span>
        <span>700</span>
        <span>600</span>
        <span>500</span>
        <span>400</span>
        <span>300</span>
        <span>200</span>
        <span>100</span>
        <span>0</span>
      </div>

      <div className="chart-main">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg">
          {/* Baseline at 0 */}
          <line
            x1="0"
            y1={getY(0)}
            x2="100"
            y2={getY(0)}
            stroke="#666"
            strokeWidth="0.8"
          />

          {/* Reference lines */}
          {REFERENCE_LINES.map(ref => {
            const y = getY(ref.value)
            const isPassed = currentGoalCount >= ref.value
            return (
              <line
                key={ref.value}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke={ref.color}
                strokeWidth="0.3"
                opacity={isPassed ? 0.9 : 0.3}
              />
            )
          })}

          {/* Cumulative line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#c8102e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Current position dot */}
          {currentGame && (
            <circle
              cx={(currentGameIndex / totalGames) * 100}
              cy={getY(currentGame.cumulativeGoals)}
              r="1.5"
              fill="#fff"
            />
          )}
        </svg>

        {/* Reference labels on right */}
        <div className="ref-labels">
          {REFERENCE_LINES.map(ref => {
            const top = getY(ref.value)
            const isPassed = currentGoalCount >= ref.value
            return (
              <span
                key={ref.value}
                className="ref-label"
                style={{
                  top: `${top}%`,
                  color: isPassed ? ref.color : '#444',
                  fontWeight: isPassed ? 600 : 400,
                }}
              >
                {ref.label}
              </span>
            )
          })}
        </div>
      </div>

      <style>{`
        .cumulative-chart {
          width: 100%;
          display: flex;
          gap: 4px;
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
          padding: 4px;
        }

        .y-axis {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-size: 8px;
          color: #555;
          padding: 2px 0;
          width: 24px;
          text-align: right;
        }

        .chart-main {
          flex: 1;
          position: relative;
          display: flex;
        }

        .chart-svg {
          flex: 1;
          height: 100%;
        }

        .ref-labels {
          position: relative;
          width: 80px;
          font-size: 8px;
        }

        .ref-label {
          position: absolute;
          left: 4px;
          transform: translateY(-50%);
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}
