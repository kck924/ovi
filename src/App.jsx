import { useState, useEffect } from 'react'
import AnimatedViz from './components/AnimatedViz'

function App() {
  const [goals, setGoals] = useState([])
  const [gamelog, setGamelog] = useState([])
  const [stats, setStats] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      // Load goals data
      const goalFiles = [
        '/data/ovechkin_goals_complete.json',
        '/data/ovechkin_goals.json',
      ]

      for (const file of goalFiles) {
        try {
          const res = await fetch(file)
          if (res.ok) {
            const data = await res.json()
            setGoals(data.goals || [])
            setStats(data.stats || null)
            setMetadata(data.metadata || null)
            console.log(`Loaded ${data.goals?.length} goals from ${file}`)
            break
          }
        } catch (err) {
          console.log(`Could not load ${file}`)
        }
      }

      // Load gamelog data
      try {
        const res = await fetch('/data/ovechkin_gamelog.json')
        if (res.ok) {
          const data = await res.json()
          setGamelog(data.games || [])
          console.log(`Loaded ${data.games?.length} games from gamelog`)
        }
      } catch (err) {
        console.log('Could not load gamelog')
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const regularSeasonGoals = goals.filter(g => !g.isPlayoffs)

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-number">8</div>
          <div className="loading-text">Loading Ovechkin's Goals...</div>
        </div>
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="error-screen">
        <h1>The Great 8</h1>
        <p>No goal data found. Run:</p>
        <pre>npm run collect:nhl</pre>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="player-number">8</div>
          <div className="player-info">
            <div className="player-name">ALEX OVECHKIN</div>
            <div className="player-subtitle">WASHINGTON CAPITALS</div>
          </div>
        </div>

        <img src="/ovihoist.png" alt="" className="mobile-header-image" />

        <div className="mobile-goals-count">
          <span className="mobile-goals-number">{regularSeasonGoals.length}</span>
          <span className="mobile-goals-text">goals and counting</span>
        </div>

        <div className="header-center">
          <img src="/thegoal.png" alt="" className="header-decoration left" />
          <div className="total-goals">{regularSeasonGoals.length}</div>
          <div className="total-label">CAREER GOALS</div>
          <div className="total-sublabel">and counting...</div>
          <img src="/ovislide.png" alt="" className="header-decoration right" />
        </div>

        <div className="header-right">
        </div>
      </header>

      <AnimatedViz goals={goals} stats={stats} gamelog={gamelog} />

      <footer className="app-footer">
        <span>Data visualization by Kevin Klein</span>
        <span className="data-attribution">Data: NHL.com & Moneypuck</span>
      </footer>
    </div>
  )
}

export default App
