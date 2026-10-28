import { useEffect, useState, type ReactNode } from 'react'
import { servers as fetchServers, tools as fetchTools, type ServerState, type ToolInfo } from './api'
import { Console } from './Console'
import { DesignFlow } from './DesignFlow'
import { Knowledge } from './Knowledge'
import { Showcase } from './Showcase'
import { Workbench } from './Workbench'

type View = 'showcase' | 'flow' | 'bench' | 'knowledge' | 'console'

const ICONS: Record<View, ReactNode> = {
  showcase: <path d="M4 5h16v14H4zM8 9h8M8 13h5" />,
  flow: <path d="M5 6h5v4H5zM14 14h5v4h-5zM10 8h2a2 2 0 0 1 2 2v4" />,
  bench: <path d="M8 6 3 12l5 6M16 6l5 6-5 6M14 4l-4 16" />,
  knowledge: <path d="M6 7a2 2 0 1 0 0 .1M18 7a2 2 0 1 0 0 .1M12 17a2 2 0 1 0 0 .1M7.5 8.5l3.5 7M16.5 8.5 13 15.5M8 7h8" />,
  console: <path d="M4 5h16v14H4zM7 10l3 2-3 2M12 15h5" />,
}

const VIEWS: [View, string, string][] = [
  ['showcase', 'Showcase', 'The SoC we designed'],
  ['flow', 'Design flow', 'Spec → research → RTL'],
  ['bench', 'RTL workbench', 'Lint · simulate · synthesize'],
  ['knowledge', 'Knowledge', 'TurboVec-HippoRAG'],
  ['console', 'MCP console', 'Every tool'],
]

export default function App() {
  const [view, setView] = useState<View>(() => {
    try { return (localStorage.getItem('vsd.view') as View) || 'showcase' } catch { return 'showcase' }
  })
  const [servers, setServers] = useState<ServerState[]>([])
  const [tools, setTools] = useState<ToolInfo[]>([])

  async function refresh() {
    try {
      const [s, t] = await Promise.all([fetchServers(), fetchTools()])
      setServers(s)
      setTools(t)
    } catch {
      setServers([])
    }
  }

  useEffect(() => { refresh(); const t = setInterval(refresh, 30000); return () => clearInterval(t) }, [])
  useEffect(() => { try { localStorage.setItem('vsd.view', view) } catch { /* private mode */ } }, [view])

  const current = VIEWS.find(v => v[0] === view)!
  return (
    <div className="app">
      <nav className="rail" aria-label="Views">
        <div className="brand">
          <Chip />
          <div><b>Auralis VSD</b><span>semiconductor design studio</span></div>
        </div>
        <div className="navlist">
          {VIEWS.map(([v, label, sub]) => (
            <button key={v} className={`navlink ${view === v ? 'on' : ''}`} onClick={() => setView(v)} aria-current={view === v}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[v]}</svg>
              <span><b>{label}</b><small>{sub}</small></span>
            </button>
          ))}
        </div>
        <div className="servers">
          <div className="eyebrow">MCP servers</div>
          {servers.length === 0 && <p className="muted small">VSD server offline</p>}
          {servers.map(s => (
            <div key={s.name} className="server" title={s.detail}>
              <span className={`dot ${s.connected ? 'good' : 'bad'}`} />
              <div><b>{s.name}</b><small className="mono">{s.connected ? `${tools.filter(t => t.server === s.name).length} tools · ${s.url.replace('http://', '')}` : 'offline'}</small></div>
            </div>
          ))}
          <button className="ghost" onClick={refresh}>Reconnect</button>
        </div>
      </nav>
      <main>
        <header className="viewhead">
          <div className="eyebrow">{current[2]}</div>
          <h1>{current[1]}</h1>
        </header>
        {view === 'showcase' && <Showcase />}
        {view === 'flow' && <DesignFlow tools={tools} />}
        {view === 'bench' && <Workbench tools={tools} />}
        {view === 'knowledge' && <Knowledge />}
        {view === 'console' && <Console tools={tools} />}
      </main>
    </div>
  )
}

function Chip() {
  return (
    <svg className="chip" width="38" height="38" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" className="chip-bg" />
      <rect x="9" y="9" width="14" height="14" rx="2" className="chip-die" />
      <path d="M12 9V5M16 9V5M20 9V5M12 27v-4M16 27v-4M20 27v-4M9 12H5M9 16H5M9 20H5M27 12h-4M27 16h-4M27 20h-4" className="chip-pins" />
    </svg>
  )
}
