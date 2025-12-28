/**
 * UniquesChart.jsx
 * Line chart showing cumulative unique goalies and assisters over career
 */

import { useMemo } from 'react'

export default function UniquesChart({
  goals = [],
  currentIndex = 0,
  height = 120,
}) {
  // Build cumulative unique counts up to currentIndex
  const { goalieData, assisterData, maxValue } = useMemo(() => {
    const goalies = new Set()
    const assisters = new Set()
    const goaliePoints = []
    const assisterPoints = []

    const step = Math.max(1, Math.floor(currentIndex / 100))

    for (let i = 0; i < currentIndex; i++) {
      const goal = goals[i]
      if (!goal) continue

      if (goal.goalieName) goalies.add(goal.goalieName)
      if (goal.primaryAssist) assisters.add(goal.primaryAssist)
      if (goal.secondaryAssist) assisters.add(goal.secondaryAssist)

      if (i % step === 0 || i === currentIndex - 1) {
        goaliePoints.push({ x: i, y: goalies.size })
        assisterPoints.push({ x: i, y: assisters.size })
      }
    }

    // Add 15% headroom to max value for better visualization
    const rawMax = Math.max(goalies.size, assisters.size, 1)
    const max = Math.ceil(rawMax * 1.15)

    return {
      goalieData: goaliePoints,
      assisterData: assisterPoints,
      maxValue: max,
    }
  }, [goals, currentIndex])

  const totalGoals = goals.length || 915

  // Build SVG paths
  const buildPath = (data) => {
    if (data.length < 2) return ''
    return data
      .map((p, i) => {
        const x = (p.x / totalGoals) * 100
        const y = 100 - (p.y / maxValue) * 100
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  const goaliePath = buildPath(goalieData)
  const assisterPath = buildPath(assisterData)

  const currentGoalies = goalieData[goalieData.length - 1]?.y || 0
  const currentAssisters = assisterData[assisterData.length - 1]?.y || 0

  return (
    <div className="uniques-chart" style={{ height }}>
      <div className="chart-header">
        <div className="legend-row">
          <div className="legend-item">
            <span className="legend-dot goalie" />
            <span className="legend-label">Goalies Scored On</span>
            <span className="legend-value goalie">{currentGoalies}</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot assister" />
            <span className="legend-label">Assisters</span>
            <span className="legend-value assister">{currentAssisters}</span>
          </div>
        </div>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg">
        {/* Goalie line */}
        {goaliePath && (
          <path
            d={goaliePath}
            fill="none"
            stroke="#c8102e"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Assister line */}
        {assisterPath && (
          <path
            d={assisterPath}
            fill="none"
            stroke="#4CAF50"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Current position dots */}
        {goalieData.length > 0 && (
          <circle
            cx={(goalieData[goalieData.length - 1].x / totalGoals) * 100}
            cy={100 - (goalieData[goalieData.length - 1].y / maxValue) * 100}
            r="2"
            fill="#c8102e"
          />
        )}
        {assisterData.length > 0 && (
          <circle
            cx={(assisterData[assisterData.length - 1].x / totalGoals) * 100}
            cy={100 - (assisterData[assisterData.length - 1].y / maxValue) * 100}
            r="2"
            fill="#4CAF50"
          />
        )}
      </svg>

      <style>{`
        .uniques-chart {
          display: flex;
          flex-direction: column;
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
          padding: 8px;
        }

        .chart-header {
          margin-bottom: 8px;
        }

        .legend-row {
          display: flex;
          justify-content: space-between;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-dot.goalie {
          background: #c8102e;
        }

        .legend-dot.assister {
          background: #4CAF50;
        }

        .legend-label {
          font-size: 0.6rem;
          color: #888;
        }

        .legend-value {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .legend-value.goalie {
          color: #c8102e;
        }

        .legend-value.assister {
          color: #4CAF50;
        }

        .chart-svg {
          flex: 1;
          width: 100%;
        }
      `}</style>
    </div>
  )
}
