import { useEffect, useState } from 'react'
import { call, firstId, type Result, type ToolInfo } from './api'
import { Output } from './Output'
import { ToolForm } from './ToolForm'

/**
 * Specification → research → RTL blocks, as four steps. Each step is the
 * Auralis MCP tool itself; ids flow from one step into the next.
 */
export function DesignFlow({ tools }: { tools: ToolInfo[] }) {
  const tool = (n: string) => tools.find(t => t.name === n)
  const [problemId, setProblemId] = useState('')
  const [designId, setDesignId] = useState('')
  const [status, setStatus] = useState<Result | null>(null)
  const [watch, setWatch] = useState(false)

  useEffect(() => {
    if (!watch || !problemId) return
    let live = true
    const tick = async () => {
      const r = await call('auralis', 'problem_status', { problemId })
      if (live) setStatus(r)
    }
    tick()
    const t = setInterval(tick, 15000)
    return () => { live = false; clearInterval(t) }
  }, [watch, problemId])

  const start = tool('problem_start')
  const blocks = tool('problem_design_blocks')
  const kaggle = tool('problem_design_kaggle')
  const dstatus = tool('design_status')
  if (!start) return <p className="muted">Auralis core is not connected, so the design tools are unavailable.</p>

  return (
    <div className="flow">
      <Step n={1} title="Specify the chip" hint="Goals, interfaces, PPA targets and constraints. Auralis splits it into parts and collects sources for each.">
        <ToolForm tool={start} compact onResult={r => { const id = firstId(r.text); if (id) { setProblemId(id); setWatch(true) } }} />
      </Step>

      <Step n={2} title="Research progress" hint="Breakdown and per-part source collection, refreshed every 15 s.">
        <div className="row">
          <label className="inline">Problem id <input className="mono wide" value={problemId} onChange={e => setProblemId(e.target.value.trim())} /></label>
          <button disabled={!problemId} onClick={() => setWatch(w => !w)}>{watch ? 'Stop watching' : 'Watch'}</button>
        </div>
        {status && <Output result={status} />}
      </Step>

      <Step n={3} title="Generate RTL blocks" hint="Laya decides PASS/FIX for every version; each block is linted, simulated and synthesized.">
        {problemId ? (
          <div className="split">
            {blocks && <div><h4>Local</h4><ToolForm key={'b' + problemId} tool={blocks} compact preset={{ problemId }} onResult={r => setDesignId(firstId(r.text) || designId)} /></div>}
            {kaggle && <div><h4>Kaggle GPU</h4><ToolForm key={'k' + problemId} tool={kaggle} compact preset={{ problemId }} /></div>}
          </div>
        ) : <p className="muted">Start or paste a problem first.</p>}
      </Step>

      <Step n={4} title="Inspect a design" hint="Versions, verification results and, optionally, the full files.">
        {dstatus && <ToolForm key={'d' + designId} tool={dstatus} compact preset={{ designId }} />}
      </Step>
    </div>
  )
}

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="card step">
      <div className="step-head"><span className="step-n">{n}</span><div><h3>{title}</h3><p className="muted">{hint}</p></div></div>
      {children}
    </section>
  )
}
