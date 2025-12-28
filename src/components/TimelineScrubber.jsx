/**
 * TimelineScrubber.jsx
 * Playback controls and timeline for the goal animation
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'


export default function TimelineScrubber({
  currentGoal = 0,
  totalGoals = 915,
  isPlaying = true,
  speed = 30,
  onPlayPause,
  onSpeedChange,
  onSeek,
  currentDate = null,
  skipVideos = false,
  onSkipVideosChange,
}) {
  const progress = (currentGoal / totalGoals) * 100
  const trackRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleSeekFromEvent = useCallback((e) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek?.(Math.floor(pct * totalGoals))
  }, [onSeek, totalGoals])

  const handleMouseDown = useCallback((e) => {
    if (isPlaying) return // Only allow dragging when paused
    setIsDragging(true)
    handleSeekFromEvent(e)
  }, [isPlaying, handleSeekFromEvent])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    handleSeekFromEvent(e)
  }, [isDragging, handleSeekFromEvent])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add global mouse listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div className="timeline-scrubber">
      {/* Counter */}
      <div className="counter-section">
        <motion.div
          className="goal-number"
          key={currentGoal}
          initial={{ scale: 1.2, color: '#ff6b6b' }}
          animate={{ scale: 1, color: '#c8102e' }}
          transition={{ duration: 0.15 }}
        >
          {currentGoal}
        </motion.div>
        <div className="goal-label">GOALS</div>
        {currentDate && (
          <div className="current-date">
            {new Date(currentDate).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            })}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress-section">
        <div
          ref={trackRef}
          className={`progress-track ${!isPlaying ? 'draggable' : ''}`}
          onClick={(e) => {
            if (isPlaying) {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = (e.clientX - rect.left) / rect.width
              onSeek?.(Math.floor(pct * totalGoals))
            }
          }}
          onMouseDown={handleMouseDown}
        >
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
          {!isPlaying && (
            <div
              className="progress-thumb"
              style={{ left: `${progress}%` }}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="controls-section">
        <button
          className="play-btn"
          onClick={onPlayPause}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="speed-control">
          <span className="speed-label">Speed</span>
          <input
            type="range"
            min={5}
            max={100}
            value={speed}
            onChange={(e) => onSpeedChange?.(parseInt(e.target.value))}
          />
          <span className="speed-value">{speed}/s</span>
        </div>

        <button
          className="reset-btn"
          onClick={() => onSeek?.(0)}
        >
          ↺
        </button>

        <label className="skip-videos-toggle">
          <input
            type="checkbox"
            checked={skipVideos}
            onChange={(e) => onSkipVideosChange?.(e.target.checked)}
          />
          <span>Skip videos</span>
        </label>
      </div>

      <style>{`
        .timeline-scrubber {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.75rem;
          height: 100%;
        }

        .counter-section {
          text-align: center;
        }

        .goal-number {
          font-size: 3rem;
          font-weight: 900;
          line-height: 1;
        }

        .goal-label {
          font-size: 0.65rem;
          color: #666;
          letter-spacing: 0.1em;
        }

        .current-date {
          font-size: 0.7rem;
          color: #888;
          margin-top: 0.25rem;
        }

        .progress-section {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .progress-track {
          flex: 1;
          height: 8px;
          background: #1a1a1a;
          border-radius: 4px;
          position: relative;
          cursor: pointer;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #c8102e, #ff6b6b);
          border-radius: 4px;
          transition: width 0.1s linear;
        }

        .progress-track.draggable {
          cursor: grab;
        }

        .progress-track.draggable:active {
          cursor: grabbing;
        }

        .progress-thumb {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: #fff;
          border: 2px solid #c8102e;
          border-radius: 50%;
          cursor: grab;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .progress-thumb:active {
          cursor: grabbing;
          transform: translate(-50%, -50%) scale(1.1);
        }

        .controls-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .play-btn, .reset-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #333;
          background: #1a1a1a;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
        }

        .play-btn:hover, .reset-btn:hover {
          border-color: #c8102e;
        }

        .speed-control {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .speed-label {
          font-size: 0.6rem;
          color: #666;
        }

        .speed-control input {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: #333;
          border-radius: 2px;
          cursor: pointer;
        }

        .speed-control input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: #c8102e;
          border-radius: 50%;
          cursor: pointer;
        }

        .speed-value {
          font-size: 0.6rem;
          color: #888;
          min-width: 30px;
        }

        .skip-videos-toggle {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6rem;
          color: #888;
          cursor: pointer;
          margin-left: 0.5rem;
        }

        .skip-videos-toggle input {
          cursor: pointer;
          accent-color: #c8102e;
        }

        .skip-videos-toggle:hover {
          color: #fff;
        }

        /* Mobile Styles */
        @media (max-width: 768px) {
          .timeline-scrubber {
            gap: 0.5rem;
            padding: 0.5rem;
          }

          .counter-section {
            display: none;
          }

          .progress-track {
            height: 12px;
          }

          .progress-thumb {
            width: 20px;
            height: 20px;
          }

          .controls-section {
            flex-wrap: wrap;
            gap: 0.5rem;
            justify-content: center;
          }

          .play-btn, .reset-btn {
            width: 36px;
            height: 36px;
            font-size: 0.9rem;
          }

          .speed-control {
            flex: 1;
            min-width: 120px;
          }

          .speed-label {
            font-size: 0.55rem;
          }

          .speed-value {
            font-size: 0.55rem;
          }

          .speed-control input {
            height: 6px;
          }

          .speed-control input::-webkit-slider-thumb {
            width: 16px;
            height: 16px;
          }

          .skip-videos-toggle {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
