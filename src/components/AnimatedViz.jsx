/**
 * AnimatedViz.jsx
 * Main orchestrator for the animated goal visualization
 *
 * Goals animate one-by-one, each splitting into particles that fly to:
 * - Shot map (center)
 * - Goalie bars (top-left)
 * - Team bars (top-right)
 * - Assister bars (bottom-left)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MiniRink from './MiniRink'
import StackingBar from './StackingBar'
import TimelineScrubber from './TimelineScrubber'
import CumulativeChart from './CumulativeChart'
import UniquesChart from './UniquesChart'
import PlayerHeadshot from './PlayerHeadshot'

const MILESTONES = [33, 500, 700, 767, 800, 802, 894, 895, 900]
const VIDEO_BASE = 'https://dbkseqndwgeyacafisjv.supabase.co/storage/v1/object/public/ovivideos'

export default function AnimatedViz({ goals = [], stats = {}, gamelog = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false) // Start paused until countdown finishes
  const [speed, setSpeed] = useState(30) // goals per second
  const [isPaused, setIsPaused] = useState(false) // milestone pause
  const [showVideo, setShowVideo] = useState(null) // which milestone video to show
  const [videoMuted, setVideoMuted] = useState(true) // video audio state
  const [skipAllVideos, setSkipAllVideos] = useState(false) // skip all milestone videos
  const [countdown, setCountdown] = useState(3) // countdown before starting
  const [showCountdown, setShowCountdown] = useState(true) // show countdown modal

  // Accumulated data up to current goal
  const [rinkGoals, setRinkGoals] = useState([])
  const [goalieAccum, setGoalieAccum] = useState({})
  const [teamAccum, setTeamAccum] = useState({})
  const [assisterAccum, setAssisterAccum] = useState({})

  // Active particles for animation
  const [activeParticles, setActiveParticles] = useState([])

  const animationRef = useRef(null)
  const lastTimeRef = useRef(0)
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile and scroll
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    const handleScroll = () => setScrolled(window.scrollY > 50)

    checkMobile()
    window.addEventListener('resize', checkMobile)
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!showCountdown) return

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      // Countdown finished, start the experience
      const timer = setTimeout(() => {
        setShowCountdown(false)
        setIsPlaying(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [countdown, showCountdown])

  // Filter to regular season only
  const regularGoals = goals.filter(g => !g.isPlayoffs)
  const totalGoals = regularGoals.length

  // Process a goal: add to accumulators and spawn particles
  const processGoal = useCallback((goalIndex) => {
    const goal = regularGoals[goalIndex]
    if (!goal) return

    // Add to rink
    if (goal.xCoord != null && goal.yCoord != null) {
      setRinkGoals(prev => [...prev, goal])
    }

    // Add to goalie
    if (goal.goalieName) {
      setGoalieAccum(prev => ({
        ...prev,
        [goal.goalieName]: (prev[goal.goalieName] || 0) + 1
      }))
    }

    // Add to team
    if (goal.opponent) {
      setTeamAccum(prev => ({
        ...prev,
        [goal.opponent]: (prev[goal.opponent] || 0) + 1
      }))
    }

    // Add to assister (track primary vs secondary separately)
    if (goal.primaryAssist) {
      setAssisterAccum(prev => ({
        ...prev,
        [goal.primaryAssist]: {
          primary: (prev[goal.primaryAssist]?.primary || 0) + 1,
          secondary: prev[goal.primaryAssist]?.secondary || 0
        }
      }))
    }
    if (goal.secondaryAssist) {
      setAssisterAccum(prev => ({
        ...prev,
        [goal.secondaryAssist]: {
          primary: prev[goal.secondaryAssist]?.primary || 0,
          secondary: (prev[goal.secondaryAssist]?.secondary || 0) + 1
        }
      }))
    }

    // Spawn particles that fly to different destinations
    const baseId = `particle-${goalIndex}-${Date.now()}`
    const particles = []

    // Particle to rink (shot location)
    if (goal.xCoord != null && goal.yCoord != null) {
      particles.push({
        id: `${baseId}-rink`,
        target: 'rink',
        goal,
      })
    }

    // Particle to goalie bar
    if (goal.goalieName) {
      particles.push({
        id: `${baseId}-goalie`,
        target: 'goalie',
        goal,
      })
    }

    // Particle to team bar
    if (goal.opponent) {
      particles.push({
        id: `${baseId}-team`,
        target: 'team',
        goal,
      })
    }

    // Particle to assister bar
    if (goal.primaryAssist) {
      particles.push({
        id: `${baseId}-assist`,
        target: 'assist',
        goal,
      })
    }

    setActiveParticles(prev => [...prev.slice(-50), ...particles])

    // Remove particles after animation
    setTimeout(() => {
      particles.forEach(p => {
        setActiveParticles(prev => prev.filter(ap => ap.id !== p.id))
      })
    }, 600)

    // Check for milestone pause
    if (MILESTONES.includes(goalIndex + 1)) {
      setIsPaused(true)
      // Goals with videos - let video control resume (unless skip all videos is enabled)
      // Other milestones auto-resume after 1.5s
      const videoMilestones = [33, 500, 700, 767, 800, 802, 895, 900]
      if (skipAllVideos || !videoMilestones.includes(goalIndex + 1)) {
        setTimeout(() => setIsPaused(false), 1500)
      }
    }
  }, [regularGoals, skipAllVideos])

  // Animation loop
  useEffect(() => {
    if (!isPlaying || isPaused || currentIndex >= totalGoals) {
      return
    }

    const interval = 1000 / speed

    const tick = () => {
      if (currentIndex < totalGoals) {
        processGoal(currentIndex)
        setCurrentIndex(prev => prev + 1)
      }
    }

    animationRef.current = setTimeout(tick, interval)

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [isPlaying, isPaused, currentIndex, totalGoals, speed, processGoal])

  // Seek to specific goal
  const handleSeek = useCallback((index) => {
    setCurrentIndex(0)
    setRinkGoals([])
    setGoalieAccum({})
    setTeamAccum({})
    setAssisterAccum({})
    setActiveParticles([])

    // Fast-forward to target
    const targetGoals = regularGoals.slice(0, index)
    const newRink = targetGoals.filter(g => g.xCoord != null)
    const newGoalies = {}
    const newTeams = {}
    const newAssisters = {}

    targetGoals.forEach(g => {
      if (g.goalieName) newGoalies[g.goalieName] = (newGoalies[g.goalieName] || 0) + 1
      if (g.opponent) newTeams[g.opponent] = (newTeams[g.opponent] || 0) + 1
      if (g.primaryAssist) {
        newAssisters[g.primaryAssist] = {
          primary: (newAssisters[g.primaryAssist]?.primary || 0) + 1,
          secondary: newAssisters[g.primaryAssist]?.secondary || 0
        }
      }
      if (g.secondaryAssist) {
        newAssisters[g.secondaryAssist] = {
          primary: newAssisters[g.secondaryAssist]?.primary || 0,
          secondary: (newAssisters[g.secondaryAssist]?.secondary || 0) + 1
        }
      }
    })

    setRinkGoals(newRink)
    setGoalieAccum(newGoalies)
    setTeamAccum(newTeams)
    setAssisterAccum(newAssisters)
    setCurrentIndex(index)
  }, [regularGoals])

  const currentGoal = regularGoals[currentIndex - 1]

  return (
    <div className="animated-viz">
      {/* Countdown modal */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            className="countdown-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="countdown-content">
              <div className="countdown-title">Ovi goal experience starting in</div>
              <motion.div
                className="countdown-number"
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {countdown > 0 ? countdown : 'GO!'}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating headshot in header area */}
      <div className="floating-headshot">
        <PlayerHeadshot
          currentGoal={currentIndex}
          totalGoals={totalGoals}
        />
      </div>

      {/* Mobile sticky goal counter */}
      <div className="mobile-goal-counter">
        <img
          src="/thegoal.png"
          alt=""
          className="mobile-decoration left"
          style={{ opacity: scrolled ? 0 : 1 }}
        />
        <button
          className="mobile-play-btn"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <motion.span
          className="mobile-goal-number"
          key={currentIndex}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1 }}
        >
          {currentIndex}
        </motion.span>
        <span className="mobile-goal-separator">/</span>
        <span className="mobile-goal-total">{totalGoals}</span>
        <label className="mobile-skip-toggle">
          <input
            type="checkbox"
            checked={skipAllVideos}
            onChange={(e) => setSkipAllVideos(e.target.checked)}
          />
          <span>Skip video</span>
        </label>
        <img
          src="/ovislide.png"
          alt=""
          className="mobile-decoration right"
          style={{ opacity: scrolled ? 0 : 1 }}
        />
      </div>

      {/* Flying particles - positioned relative to entire layout */}
      <AnimatePresence>
        {activeParticles.map(particle => {
          // Calculate target position as percentage of entire layout
          let targetX, targetY, targetColor

          if (isMobile) {
            // Mobile: particles shoot downward to stacked panels
            switch (particle.target) {
              case 'rink':
                targetX = `${30 + Math.random() * 40}%`
                targetY = `${15 + Math.random() * 15}%`
                targetColor = '#c8102e'
                break
              case 'goalie':
                // Goalies panel - below rink
                targetX = `${20 + Math.random() * 60}%`
                targetY = `${42 + Math.random() * 8}%`
                targetColor = '#c8102e'
                break
              case 'team':
                // Teams panel - below goalies
                targetX = `${20 + Math.random() * 60}%`
                targetY = `${58 + Math.random() * 8}%`
                targetColor = '#0033a0'
                break
              case 'assist':
                // Assisters panel - below teams
                targetX = `${20 + Math.random() * 60}%`
                targetY = `${74 + Math.random() * 8}%`
                targetColor = '#4CAF50'
                break
              default:
                targetX = '50%'
                targetY = '50%'
                targetColor = '#c8102e'
            }
          } else {
            // Desktop: original positions
            switch (particle.target) {
              case 'rink':
                // Center area - fly to shot location
                const nx = particle.goal.xCoord > 0 ? -particle.goal.xCoord : particle.goal.xCoord
                const ny = particle.goal.xCoord > 0 ? -particle.goal.yCoord : particle.goal.yCoord
                targetX = `${15 + ((nx + 100) / 200) * 70}%`
                targetY = `${10 + ((42.5 - ny) / 85) * 60}%`
                targetColor = '#c8102e'
                break
              case 'goalie':
                // Left panel top - goalies
                targetX = `${3 + Math.random() * 12}%`
                targetY = `${8 + Math.random() * 38}%`
                targetColor = '#c8102e'
                break
              case 'team':
                // Right panel top - teams
                targetX = `${85 + Math.random() * 12}%`
                targetY = `${8 + Math.random() * 38}%`
                targetColor = '#0033a0'
                break
              case 'assist':
                // Left panel bottom - assisters
                targetX = `${3 + Math.random() * 12}%`
                targetY = `${52 + Math.random() * 42}%`
                targetColor = '#4CAF50'
                break
              default:
                targetX = '50%'
                targetY = '50%'
                targetColor = '#c8102e'
            }
          }

          return (
            <motion.div
              key={particle.id}
              className="flying-particle"
              initial={{
                left: '50%',
                top: isMobile ? '20%' : '50%',
                scale: 1.5,
                opacity: 1,
              }}
              animate={{
                left: targetX,
                top: targetY,
                scale: 1,
                opacity: 0,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                duration: isMobile ? 0.5 : 0.4,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              style={{
                backgroundColor: targetColor,
                boxShadow: `0 0 6px ${targetColor}`,
              }}
            />
          )
        })}
      </AnimatePresence>

      {/* Top row */}
      <div className="viz-panel goalies">
        <StackingBar
          data={goalieAccum}
          title="Top Goalies Scored On"
          maxItems={10}
          color="#c8102e"
          dotSize={6}
          hideTotal
        />
        <img src="/lund.png" alt="" className="goalies-decoration" />
      </div>

      <div className="viz-panel rink-container">
        {/* Cumulative goals chart */}
        <div className="chart-area">
          <CumulativeChart
            gamelog={gamelog}
            currentGoalCount={currentIndex}
            height={180}
          />
        </div>

        {/* Rink */}
        <div className="rink-area">
          <MiniRink goals={rinkGoals} width={500} />
          <img src="/ovihoist.png" alt="" className="center-image hit" />
          <img src="/slap.png" alt="" className="center-image slap" />
          <img src="/ovihit.png" alt="" className="center-image hoist" />
        </div>

        {/* Timeline controls */}
        <div className="rink-controls">
          <TimelineScrubber
            currentGoal={currentIndex}
            totalGoals={totalGoals}
            isPlaying={isPlaying}
            speed={speed}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onSpeedChange={setSpeed}
            onSeek={handleSeek}
            currentDate={currentGoal?.gameDate}
            skipVideos={skipAllVideos}
            onSkipVideosChange={setSkipAllVideos}
          />
        </div>

        {/* Milestone overlay */}
        <AnimatePresence>
          {isPaused && MILESTONES.includes(currentIndex) && currentIndex !== 500 && (
            <motion.div
              className="milestone-overlay"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="milestone-content">
                <div className="milestone-number">{currentIndex}</div>
                <div className="milestone-label">
                  {currentIndex === 802 && "PASSES GORDIE HOWE"}
                  {currentIndex === 894 && "TIES WAYNE GRETZKY"}
                  {currentIndex === 895 && "ALL-TIME LEADER"}
                  {currentIndex === 900 && "900 GOALS"}
                  {![802, 894, 895, 900].includes(currentIndex) && "GOALS"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Goal 33 - "The Goal" - diving goal vs Phoenix */}
        <AnimatePresence>
          {isPaused && currentIndex === 33 && !skipAllVideos && (
            <motion.div
              className="video-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="video-wispy">
                <video
                  src={`${VIDEO_BASE}/thegoal.mp4`}
                  autoPlay
                  muted={videoMuted}
                  onTimeUpdate={(e) => {
                    if (e.target.currentTime >= 32) {
                      setIsPaused(false)
                    }
                  }}
                  onEnded={() => setIsPaused(false)}
                />
                <div className="video-vignette" />
              </div>
              <div className="video-milestone-text">
                <div className="milestone-label" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>THE GOAL</div>
                <div className="milestone-number">33</div>
              </div>
              <div className="video-controls">
                <div
                  className="audio-icon"
                  onClick={() => setVideoMuted(!videoMuted)}
                >
                  {videoMuted ? '🔇' : '🔊'}
                </div>
                <button
                  className="skip-video-btn"
                  onClick={() => setIsPaused(false)}
                >
                  Skip →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 500th goal video - autoplay first 60s with wispy edges */}
        <AnimatePresence>
          {isPaused && currentIndex === 500 && !skipAllVideos && (
            <motion.div
              className="video-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="video-wispy">
                <video
                  src={`${VIDEO_BASE}/500th.mp4`}
                  autoPlay
                  muted={videoMuted}
                  onTimeUpdate={(e) => {
                    if (e.target.currentTime >= 60) {
                      setIsPaused(false)
                    }
                  }}
                  onEnded={() => setIsPaused(false)}
                />
                <div className="video-vignette" />
              </div>
              <div className="video-milestone-text">
                <div className="milestone-number">500</div>
                <div className="milestone-label">GOALS</div>
              </div>
              <div className="video-controls">
                <div
                  className="audio-icon"
                  onClick={() => setVideoMuted(!videoMuted)}
                >
                  {videoMuted ? '🔇' : '🔊'}
                </div>
                <button
                  className="skip-video-btn"
                  onClick={() => setIsPaused(false)}
                >
                  Skip →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 700th goal video - autoplay first 60s with wispy edges */}
        <AnimatePresence>
          {isPaused && currentIndex === 700 && !skipAllVideos && (
            <motion.div
              className="video-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="video-wispy">
                <video
                  src={`${VIDEO_BASE}/700th.mp4`}
                  autoPlay
                  muted={videoMuted}
                  onTimeUpdate={(e) => {
                    if (e.target.currentTime >= 60) {
                      setIsPaused(false)
                    }
                  }}
                  onEnded={() => setIsPaused(false)}
                />
                <div className="video-vignette" />
              </div>
              <div className="video-milestone-text">
                <div className="milestone-number">700</div>
                <div className="milestone-label">GOALS</div>
              </div>
              <div className="video-controls">
                <div
                  className="audio-icon"
                  onClick={() => setVideoMuted(!videoMuted)}
                >
                  {videoMuted ? '🔇' : '🔊'}
                </div>
                <button
                  className="skip-video-btn"
                  onClick={() => setIsPaused(false)}
                >
                  Skip →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 767th goal video - passing Jagr */}
        <AnimatePresence>
          {isPaused && currentIndex === 767 && !skipAllVideos && (
            <motion.div
              className="video-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="video-wispy">
                <video
                  src={`${VIDEO_BASE}/passjagr.mp4`}
                  autoPlay
                  muted={videoMuted}
                  onTimeUpdate={(e) => {
                    if (e.target.currentTime >= 60) {
                      setIsPaused(false)
                    }
                  }}
                  onEnded={() => setIsPaused(false)}
                />
                <div className="video-vignette" />
              </div>
              <div className="video-milestone-text">
                <div className="milestone-number">767</div>
                <div className="milestone-label">PASSES JAROMÍR JÁGR</div>
              </div>
              <div className="video-controls">
                <div
                  className="audio-icon"
                  onClick={() => setVideoMuted(!videoMuted)}
                >
                  {videoMuted ? '🔇' : '🔊'}
                </div>
                <button
                  className="skip-video-btn"
                  onClick={() => setIsPaused(false)}
                >
                  Skip →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 800th goal video */}
        <AnimatePresence>
          {isPaused && currentIndex === 800 && !skipAllVideos && (
            <motion.div
              className="video-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="video-wispy">
                <video
                  src={`${VIDEO_BASE}/800th.mp4`}
                  autoPlay
                  muted={videoMuted}
                  onTimeUpdate={(e) => {
                    if (e.target.currentTime >= 60) {
                      setIsPaused(false)
                    }
                  }}
                  onEnded={() => setIsPaused(false)}
                />
                <div className="video-vignette" />
              </div>
              <div className="video-milestone-text">
                <div className="milestone-number">800</div>
                <div className="milestone-label">GOALS</div>
              </div>
              <div className="video-controls">
                <div
                  className="audio-icon"
                  onClick={() => setVideoMuted(!videoMuted)}
                >
                  {videoMuted ? '🔇' : '🔊'}
                </div>
                <button
                  className="skip-video-btn"
                  onClick={() => setIsPaused(false)}
                >
                  Skip →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 802nd goal video - passing Howe */}
        <AnimatePresence>
          {isPaused && currentIndex === 802 && !skipAllVideos && (
            <motion.div
              className="video-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="video-wispy">
                <video
                  src={`${VIDEO_BASE}/passhowe.mp4`}
                  autoPlay
                  muted={videoMuted}
                  onTimeUpdate={(e) => {
                    if (e.target.currentTime >= 60) {
                      setIsPaused(false)
                    }
                  }}
                  onEnded={() => setIsPaused(false)}
                />
                <div className="video-vignette" />
              </div>
              <div className="video-milestone-text">
                <div className="milestone-number">802</div>
                <div className="milestone-label">PASSES GORDIE HOWE</div>
              </div>
              <div className="video-controls">
                <div
                  className="audio-icon"
                  onClick={() => setVideoMuted(!videoMuted)}
                >
                  {videoMuted ? '🔇' : '🔊'}
                </div>
                <button
                  className="skip-video-btn"
                  onClick={() => setIsPaused(false)}
                >
                  Skip →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 895th goal video - passing Gretzky */}
        <AnimatePresence>
          {isPaused && currentIndex === 895 && !skipAllVideos && (
            <motion.div
              className="video-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="video-wispy">
                <video
                  src={`${VIDEO_BASE}/895.mp4`}
                  autoPlay
                  muted={videoMuted}
                  onTimeUpdate={(e) => {
                    if (e.target.currentTime >= 50) {
                      setIsPaused(false)
                    }
                  }}
                  onEnded={() => setIsPaused(false)}
                />
                <div className="video-vignette" />
              </div>
              <div className="video-milestone-text">
                <div className="milestone-number">895</div>
                <div className="milestone-label">ALL-TIME GOALS LEADER</div>
              </div>
              <div className="video-controls">
                <div
                  className="audio-icon"
                  onClick={() => setVideoMuted(!videoMuted)}
                >
                  {videoMuted ? '🔇' : '🔊'}
                </div>
                <button
                  className="skip-video-btn"
                  onClick={() => setIsPaused(false)}
                >
                  Skip →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 900th goal video */}
        <AnimatePresence>
          {isPaused && currentIndex === 900 && !skipAllVideos && (
            <motion.div
              className="video-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="video-wispy">
                <video
                  src={`${VIDEO_BASE}/900th.mp4`}
                  autoPlay
                  muted={videoMuted}
                  onTimeUpdate={(e) => {
                    if (e.target.currentTime >= 60) {
                      setIsPaused(false)
                    }
                  }}
                  onEnded={() => setIsPaused(false)}
                />
                <div className="video-vignette" />
              </div>
              <div className="video-milestone-text">
                <div className="milestone-number">900</div>
                <div className="milestone-label">GOALS</div>
              </div>
              <div className="video-controls">
                <div
                  className="audio-icon"
                  onClick={() => setVideoMuted(!videoMuted)}
                >
                  {videoMuted ? '🔇' : '🔊'}
                </div>
                <button
                  className="skip-video-btn"
                  onClick={() => setIsPaused(false)}
                >
                  Skip →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="viz-panel teams">
        <div className="teams-unique-counter">
          <span className="teams-current">{Object.keys(teamAccum).length}</span>
          <span className="teams-separator">/</span>
          <span className="teams-total">34</span>
          <span className="teams-label">TEAMS SCORED AGAINST</span>
        </div>
        <StackingBar
          data={teamAccum}
          title="Opponents"
          maxItems={10}
          color="#0033a0"
          dotSize={6}
          hideHeader
        />
      </div>

      {/* Bottom row */}
      <div className="viz-panel assisters">
        <StackingBar
          data={assisterAccum}
          title="Total Assists on Ovi Goals"
          maxItems={10}
          color="#4CAF50"
          secondaryColor="#81C784"
          dotSize={4}
        />
      </div>

      <div className="viz-panel info">
        {/* Uniques line chart */}
        <UniquesChart
          goals={regularGoals}
          currentIndex={currentIndex}
          height={140}
        />

        {currentGoal && (
          <div className="current-goal-info">
            <div className="info-row">
              <span className="info-label">vs</span>
              <span className="info-value">{currentGoal.opponent || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Goalie</span>
              <span className="info-value">{currentGoal.goalieName || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Assist</span>
              <span className="info-value">{currentGoal.primaryAssist || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Shot</span>
              <span className="info-value">{currentGoal.shotType || '—'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="viz-panel timeline">
        <TimelineScrubber
          currentGoal={currentIndex}
          totalGoals={totalGoals}
          isPlaying={isPlaying}
          speed={speed}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onSpeedChange={setSpeed}
          onSeek={handleSeek}
          currentDate={currentGoal?.gameDate}
        />
      </div>

      <style>{`
        .countdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 10, 10, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .countdown-content {
          text-align: center;
        }

        .countdown-title {
          font-size: 1.5rem;
          color: #888;
          margin-bottom: 1rem;
          letter-spacing: 0.05em;
        }

        .countdown-number {
          font-size: 8rem;
          font-weight: 900;
          color: #c8102e;
          line-height: 1;
          text-shadow: 0 4px 20px rgba(200, 16, 46, 0.5);
        }

        .animated-viz {
          display: grid;
          grid-template-columns: 280px 1fr 280px;
          grid-template-rows: 1fr 1fr;
          gap: 1rem;
          height: calc(100vh - 120px);
          padding: 1rem;
          position: relative;
          overflow: hidden;
        }

        .floating-headshot {
          display: none;
        }

        .mobile-goal-counter {
          display: none;
        }

        .flying-particle {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 100;
          transform: translate(-50%, -50%);
        }

        .viz-panel {
          background: #111;
          border: 1px solid #222;
          border-radius: 8px;
          overflow: hidden;
        }

        .rink-container {
          display: flex;
          flex-direction: column;
          position: relative;
          grid-row: 1 / 3;
          grid-column: 2;
          padding: 0.5rem;
        }

        .chart-area {
          flex-shrink: 0;
        }

        .rink-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
          padding: 1rem 0;
          position: relative;
        }

        .center-image {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(calc(-50% - 10px), calc(-50% - 150px));
          max-width: 200px;
          pointer-events: none;
          z-index: 10;
        }

        .center-image.hit {
          transform: translate(calc(-50% - 170px), calc(-50% - 190px));
          max-width: 240px;
        }

        .center-image.hoist {
          transform: translate(calc(-50% + 150px), calc(-50% - 180px));
          max-width: 147px;
        }

        .rink-area svg {
          max-height: 100%;
          width: auto;
        }

        .goalies {
          grid-column: 1;
          grid-row: 1;
          position: relative;
        }

        .goalies-decoration {
          display: none;
        }

        .teams {
          grid-column: 3;
          grid-row: 1;
        }

        .assisters {
          grid-column: 1;
          grid-row: 2;
        }

        .info {
          grid-column: 3;
          grid-row: 2;
          padding: 0.75rem;
        }

        .timeline {
          display: none; /* We'll put timeline in the rink area */
        }

        .rink-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.9));
          padding: 1rem;
          z-index: 5;
        }


        .milestone-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.85);
          z-index: 10;
        }

        .milestone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .milestone-number {
          font-size: 10rem;
          font-weight: 900;
          background: url('/cup.webp') center center / cover no-repeat;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          -webkit-text-stroke: 2px #ffd700;
          paint-order: stroke fill;
          filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))
                  drop-shadow(0 0 40px rgba(255, 215, 0, 0.5))
                  drop-shadow(0 0 60px rgba(200, 16, 46, 0.4));
        }

        .milestone-label {
          font-size: 1.5rem;
          color: #ffd700;
          letter-spacing: 0.2em;
          margin-top: 0.5rem;
        }

        .play-video-btn {
          margin-top: 1.5rem;
          padding: 0.75rem 1.5rem;
          background: #c8102e;
          border: none;
          border-radius: 4px;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .play-video-btn:hover {
          background: #a00d25;
        }

        .video-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .video-container {
          position: relative;
          max-width: 90%;
          max-height: 90%;
        }

        .video-container video {
          max-width: 100%;
          max-height: 80vh;
          border-radius: 8px;
        }

        .video-wispy {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-wispy video {
          max-width: 80vw;
          max-height: 60vh;
          border-radius: 20px;
          mask-image: radial-gradient(
            ellipse 80% 80% at center,
            black 40%,
            transparent 70%
          );
          -webkit-mask-image: radial-gradient(
            ellipse 80% 80% at center,
            black 40%,
            transparent 70%
          );
        }

        .video-vignette {
          position: absolute;
          inset: -20%;
          pointer-events: none;
          background: radial-gradient(
            ellipse 60% 60% at center,
            transparent 30%,
            rgba(0, 0, 0, 0.4) 50%,
            rgba(0, 0, 0, 0.95) 70%
          );
        }

        .video-milestone-text {
          position: absolute;
          bottom: 10%;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          pointer-events: none;
        }

        .video-milestone-text .milestone-number {
          font-size: 6rem;
          text-shadow: 0 0 40px rgba(0, 0, 0, 0.8);
        }

        .video-milestone-text .milestone-label {
          text-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
        }

        .video-controls {
          position: absolute;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          gap: 0.75rem;
        }

        .audio-icon {
          font-size: 1.5rem;
          cursor: pointer;
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))
                  drop-shadow(0 0 20px rgba(255, 255, 255, 0.4));
          transition: all 0.2s;
        }

        .audio-icon:hover {
          filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.9))
                  drop-shadow(0 0 30px rgba(255, 255, 255, 0.6));
          transform: scale(1.1);
        }

        .skip-video-btn {
          padding: 0.5rem 1.25rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .skip-video-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .close-video-btn {
          position: absolute;
          top: -40px;
          right: 0;
          background: none;
          border: none;
          color: #fff;
          font-size: 1.5rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .close-video-btn:hover {
          opacity: 1;
        }

        .stats-row {
          display: flex;
          gap: 0.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #333;
          margin-bottom: 0.75rem;
        }

        .stat-box {
          flex: 1;
          text-align: center;
        }

        .stat-number {
          font-size: 1.75rem;
          font-weight: 900;
          background: linear-gradient(135deg, #c8102e 0%, #ff6b6b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }

        .stat-number.assisters {
          background: linear-gradient(135deg, #4CAF50 0%, #81C784 100%);
          -webkit-background-clip: text;
          background-clip: text;
        }

        .stat-label {
          font-size: 0.55rem;
          color: #666;
          letter-spacing: 0.08em;
          margin-top: 0.25rem;
        }

        .current-goal-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
        }

        .info-label {
          color: #666;
        }

        .info-value {
          color: #fff;
          font-weight: 500;
        }

        .teams-unique-counter {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: rgba(0, 51, 160, 0.1);
          border-bottom: 1px solid #222;
        }

        .teams-unique-counter .teams-current {
          font-size: 1.5rem;
          font-weight: 900;
          background: linear-gradient(135deg, #0033a0 0%, #4a90d9 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }

        .teams-unique-counter .teams-separator {
          font-size: 1rem;
          color: #444;
          font-weight: 300;
        }

        .teams-unique-counter .teams-total {
          font-size: 1rem;
          color: #666;
          font-weight: 700;
        }

        .teams-unique-counter .teams-label {
          font-size: 0.6rem;
          color: #888;
          letter-spacing: 0.08em;
          margin-left: 0.5rem;
        }

        /* Mobile Styles */
        @media (max-width: 768px) {
          .animated-viz {
            display: flex;
            flex-direction: column;
            height: auto;
            min-height: calc(100vh - 60px);
            gap: 0.5rem;
            padding: 0.5rem;
            padding-top: 60px;
            overflow: visible;
          }

          .floating-headshot {
            display: none;
          }

          .mobile-goal-counter {
            display: flex;
            position: fixed;
            top: 45px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100;
            align-items: center;
            gap: 0.35rem;
            background: rgba(10, 10, 10, 0.95);
            padding: 0.5rem 1rem;
            border-radius: 25px;
            border: 1px solid #333;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            min-width: 200px;
            justify-content: center;
          }

          .mobile-goal-number {
            font-size: 1.5rem;
            font-weight: 900;
            background: linear-gradient(135deg, #c8102e 0%, #ff6b6b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1;
            min-width: 50px;
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          .mobile-goal-separator {
            font-size: 1rem;
            color: #444;
            font-weight: 300;
          }

          .mobile-goal-total {
            font-size: 1rem;
            color: #666;
            font-weight: 600;
          }

          .mobile-play-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 1px solid #444;
            background: #1a1a1a;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            flex-shrink: 0;
          }

          .mobile-play-btn:active {
            background: #c8102e;
            border-color: #c8102e;
          }

          .mobile-skip-toggle {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.6rem;
            color: #888;
            cursor: pointer;
            margin-left: 0.5rem;
            padding-left: 0.5rem;
            border-left: 1px solid #333;
          }

          .mobile-skip-toggle input {
            cursor: pointer;
            accent-color: #c8102e;
            width: 14px;
            height: 14px;
          }

          .mobile-skip-toggle span {
            white-space: nowrap;
          }

          .mobile-decoration {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            height: 50px;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }

          .mobile-decoration.left {
            right: 100%;
            margin-right: 0.25rem;
          }

          .mobile-decoration.right {
            left: 100%;
            margin-left: 0.25rem;
          }

          .flying-particle {
            display: block;
          }

          .viz-panel {
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #333;
            background: linear-gradient(180deg, #151515 0%, #111 100%);
          }

          .rink-container {
            order: 1;
            min-height: 350px;
          }

          .chart-area {
            display: none;
          }

          .rink-area {
            padding: 0.5rem 0;
          }

          .center-image {
            display: none;
          }

          .center-image.slap {
            display: block;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 100px;
            opacity: 1;
            z-index: 1;
          }

          .rink-controls {
            display: none;
          }

          .goalies {
            order: 2;
            max-height: 280px;
            position: relative;
            overflow: visible !important;
          }

          .goalies-decoration {
            display: block;
            position: absolute;
            bottom: 0;
            right: 30px;
            height: 110px;
            pointer-events: none;
            opacity: 1;
            z-index: 0;
            mask-image: linear-gradient(to right, transparent 0%, black 30%);
            -webkit-mask-image: linear-gradient(to right, transparent 0%, black 30%);
          }

          .teams {
            order: 3;
            max-height: 280px;
          }

          .assisters {
            order: 4;
            max-height: 280px;
          }

          .info {
            order: 5;
            padding: 0.5rem;
          }

          .timeline {
            display: none;
          }

          .milestone-overlay {
            position: fixed;
            inset: 0;
            z-index: 1000;
          }

          .milestone-number {
            font-size: 5rem;
            -webkit-text-stroke: 1.5px #ffd700;
          }

          .milestone-label {
            font-size: 1rem;
          }

          .video-wispy video {
            max-width: 95vw;
            max-height: 50vh;
          }

          .video-milestone-text .milestone-number {
            font-size: 3.5rem;
          }

          .video-milestone-text .milestone-label {
            font-size: 0.9rem;
          }

          .video-controls {
            bottom: 1rem;
            right: 1rem;
          }

          .skip-video-btn {
            padding: 0.4rem 1rem;
            font-size: 0.8rem;
          }

          .audio-icon {
            font-size: 1.25rem;
          }

          .stats-row {
            gap: 0.25rem;
          }

          .stat-number {
            font-size: 1.25rem;
          }

          .stat-label {
            font-size: 0.5rem;
          }

          .current-goal-info {
            gap: 0.35rem;
          }

          .info-row {
            font-size: 0.7rem;
          }

          .teams-unique-counter {
            padding: 0.4rem 0.5rem;
          }

          .teams-unique-counter .teams-current {
            font-size: 1.25rem;
          }

          .teams-unique-counter .teams-separator,
          .teams-unique-counter .teams-total {
            font-size: 0.85rem;
          }

          .teams-unique-counter .teams-label {
            font-size: 0.5rem;
          }
        }

        /* Extra small screens */
        @media (max-width: 400px) {
          .animated-viz {
            padding: 0.25rem;
            gap: 0.35rem;
          }

          .rink-container {
            min-height: 280px;
          }

          .goalies,
          .teams,
          .assisters {
            max-height: 160px;
          }

          .milestone-number {
            font-size: 4rem;
          }

          .video-milestone-text .milestone-number {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  )
}
