import { useState } from 'react'
import type { ToolInfo } from './api'
import { ToolForm } from './ToolForm'

/** Every tool on every connected MCP server, with a form built from its schema. */
export function Console({ tools }: { tools: ToolInfo[] }) {
  const [filter, setFilter] = useState('')
  const [sel, setSel] = useState<ToolInfo | null>(null)
  const shown = tools.filter(t => (t.server + t.name + t.description).toLowerCase().includes(filter.toLowerCase()))
  const servers = [...new Set(shown.map(t => t.server))]
  return (
    <div className="console">
      <aside>
        <input placeholder="filter tools" value={filter} onChange={e => setFilter(e.target.value)} />
        {servers.map(s => (
          <div key={s}>
            <h4>{s}</h4>
            {shown.filter(t => t.server === s).map(t => (
              <button key={t.name} className={`toollink ${sel?.name === t.name && sel.server === s ? 'on' : ''}`}
                onClick={() => setSel(t)}>{t.name}</button>
            ))}
          </div>
        ))}
      </aside>
      <section className="card">
        {sel ? <><h3>{sel.name}</h3><ToolForm key={sel.server + sel.name} tool={sel} /></> : <p className="muted">Pick a tool.</p>}
      </section>
    </div>
  )
}
