/**
 * Timeline.jsx
 * Season-by-season goal accumulation chart
 * Shows Ovechkin's career goal progression with milestones
 */

import { useMemo, useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'

const MILESTONES = [
  { goals: 100, label: '100' },
  { goals: 500, label: '500' },
  { goals: 700, label: '700' },
  { goals: 802, label: 'Howe (802)' },
  { goals: 894, label: 'Gretzky (894)' },
  { goals: 900, label: '900' },
]

export default function Timeline({ goals, width = 800, height = 400 }) {
  const svgRef = useRef(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)

  // Process goals into cumulative timeline data
  const timelineData = useMemo(() => {
    if (!goals || goals.length === 0) return []

    // Filter to regular season only and sort by date
    const regularGoals = goals
      .filter(g => !g.isPlayoffs && g.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    // Build cumulative data points
    let cumulative = 0
    const points = regularGoals.map(goal => {
      cumulative++
      return {
        date: new Date(goal.date),
        totalGoals: cumulative,
        goal: goal,
        season: goal.seasonDisplay || goal.season,
      }
    })

    return points
  }, [goals])

  // Season summary for bar chart
  const seasonData = useMemo(() => {
    if (!goals || goals.length === 0) return []

    const bySeason = {}
    goals
      .filter(g => !g.isPlayoffs)
      .forEach(g => {
        const season = g.seasonDisplay || g.season
        if (season) {
          bySeason[season] = (bySeason[season] || 0) + 1
        }
      })

    return Object.entries(bySeason)
      .map(([season, count]) => ({ season, count }))
      .sort((a, b) => a.season.localeCompare(b.season))
  }, [goals])

  // D3 rendering
  useEffect(() => {
    if (!timelineData.length || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 30, bottom: 50, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(timelineData, d => d.date))
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(timelineData, d => d.totalGoals) * 1.05])
      .range([innerHeight, 0])

    // Area generator
    const area = d3.area()
      .x(d => xScale(d.date))
      .y0(innerHeight)
      .y1(d => yScale(d.totalGoals))
      .curve(d3.curveMonotoneX)

    // Line generator
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.totalGoals))
      .curve(d3.curveMonotoneX)

    // Gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'areaGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#c8102e')
      .attr('stop-opacity', 0.4)

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#c8102e')
      .attr('stop-opacity', 0.05)

    // Draw area
    g.append('path')
      .datum(timelineData)
      .attr('fill', 'url(#areaGradient)')
      .attr('d', area)

    // Draw line
    g.append('path')
      .datum(timelineData)
      .attr('fill', 'none')
      .attr('stroke', '#c8102e')
      .attr('stroke-width', 2)
      .attr('d', line)

    // Milestone lines
    MILESTONES.forEach(milestone => {
      if (milestone.goals <= d3.max(timelineData, d => d.totalGoals)) {
        // Find the point where this milestone was reached
        const milestonePoint = timelineData.find(d => d.totalGoals >= milestone.goals)

        if (milestonePoint) {
          // Horizontal dashed line
          g.append('line')
            .attr('x1', 0)
            .attr('x2', xScale(milestonePoint.date))
            .attr('y1', yScale(milestone.goals))
            .attr('y2', yScale(milestone.goals))
            .attr('stroke', '#666')
            .attr('stroke-dasharray', '4,4')
            .attr('stroke-width', 1)

          // Milestone label
          g.append('text')
            .attr('x', -10)
            .attr('y', yScale(milestone.goals))
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('fill', milestone.goals >= 894 ? '#ffd700' : '#888')
            .attr('font-size', '11px')
            .attr('font-weight', milestone.goals >= 894 ? 'bold' : 'normal')
            .text(milestone.label)

          // Circle at milestone point
          g.append('circle')
            .attr('cx', xScale(milestonePoint.date))
            .attr('cy', yScale(milestone.goals))
            .attr('r', milestone.goals >= 894 ? 6 : 4)
            .attr('fill', milestone.goals >= 894 ? '#ffd700' : '#c8102e')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
        }
      }
    })

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeYear.every(2))
      .tickFormat(d3.timeFormat('%Y'))

    const yAxis = d3.axisLeft(yScale)
      .ticks(10)

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#888')

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#888')

    // Axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#888')
      .attr('font-size', '12px')
      .text('Season')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#888')
      .attr('font-size', '12px')
      .text('Career Goals')

    // Style axis lines
    g.selectAll('.domain').attr('stroke', '#444')
    g.selectAll('.tick line').attr('stroke', '#444')

    // Hover interaction - invisible overlay for mouse events
    const bisect = d3.bisector(d => d.date).left

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event)
        const date = xScale.invert(mx)
        const index = bisect(timelineData, date)
        const point = timelineData[Math.min(index, timelineData.length - 1)]
        setHoveredPoint(point)
      })
      .on('mouseleave', () => setHoveredPoint(null))

  }, [timelineData, width, height])

  if (!goals || goals.length === 0) {
    return <div className="timeline-empty">No goal data available</div>
  }

  return (
    <div className="timeline-container">
      <h3>Career Goal Progression</h3>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="timeline-svg"
      />

      {hoveredPoint && (
        <div className="timeline-tooltip">
          <div className="tooltip-date">
            {hoveredPoint.date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
          <div className="tooltip-goals">
            Goal #{hoveredPoint.totalGoals}
          </div>
          <div className="tooltip-season">{hoveredPoint.season}</div>
        </div>
      )}

      {/* Season breakdown bar chart */}
      <div className="season-bars">
        <h4>Goals by Season</h4>
        <div className="bars-container">
          {seasonData.map(({ season, count }) => (
            <div key={season} className="season-bar-wrapper">
              <div
                className="season-bar"
                style={{ height: `${(count / 65) * 100}%` }}
                title={`${season}: ${count} goals`}
              >
                <span className="bar-count">{count}</span>
              </div>
              <span className="bar-label">{season.slice(-2)}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .timeline-container {
          width: 100%;
          max-width: 900px;
        }

        .timeline-container h3 {
          text-align: center;
          color: #fff;
          margin-bottom: 1rem;
        }

        .timeline-svg {
          display: block;
          margin: 0 auto;
        }

        .timeline-tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid #c8102e;
          padding: 0.75rem;
          border-radius: 4px;
          pointer-events: none;
          top: 50%;
          right: 2rem;
          transform: translateY(-50%);
        }

        .tooltip-date {
          color: #888;
          font-size: 0.75rem;
        }

        .tooltip-goals {
          color: #c8102e;
          font-size: 1.25rem;
          font-weight: bold;
        }

        .tooltip-season {
          color: #666;
          font-size: 0.75rem;
        }

        .season-bars {
          margin-top: 2rem;
        }

        .season-bars h4 {
          text-align: center;
          color: #888;
          margin-bottom: 1rem;
          font-weight: normal;
        }

        .bars-container {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          height: 120px;
          gap: 4px;
        }

        .season-bar-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 28px;
        }

        .season-bar {
          width: 100%;
          background: linear-gradient(to top, #c8102e, #ff4d6d);
          border-radius: 2px 2px 0 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          min-height: 4px;
          transition: opacity 0.2s;
        }

        .season-bar:hover {
          opacity: 0.8;
        }

        .bar-count {
          font-size: 0.625rem;
          color: #fff;
          margin-top: 2px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .season-bar:hover .bar-count {
          opacity: 1;
        }

        .bar-label {
          font-size: 0.625rem;
          color: #666;
          margin-top: 4px;
        }

        .timeline-empty {
          text-align: center;
          color: #666;
          padding: 2rem;
        }
      `}</style>
    </div>
  )
}
