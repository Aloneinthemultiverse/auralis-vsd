import { useState } from 'react'
import { call, type Result, type ToolInfo } from './api'
import { Output } from './Output'

const LONG = /statement|objective|rtl|testbench|files|state|query|constraint|text|content/i

/** A form generated from a tool's JSON input schema, plus its result. */
export function ToolForm({ tool, preset = {}, onResult, compact }: {
  tool: ToolInfo
  preset?: Record<string, string>
  onResult?: (r: Result) => void
  compact?: boolean
}) {
  const props = tool.inputSchema.properties ?? {}
  const required = new Set(tool.inputSchema.required ?? [])
  const [values, setValues] = useState<Record<string, string>>(preset)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [ms, setMs] = useState(0)

  async function run() {
    const args: Record<string, unknown> = {}
    for (const [k, s] of Object.entries(props)) {
      const v = (values[k] ?? '').trim()
      if (!v) continue
      args[k] = s.type === 'integer' || s.type === 'number' ? Number(v) : s.type === 'boolean' ? v === 'true' : v
    }
    setBusy(true)
    const t0 = performance.now()
    const r = await call(tool.server, tool.name, args)
    setMs(performance.now() - t0)
    setBusy(false)
    setResult(r)
    onResult?.(r)
  }

  const missing = [...required].some(k => !(values[k] ?? '').trim())
  return (
    <div className="toolform">
      {!compact && <p className="muted desc">{tool.description}</p>}
      {Object.entries(props).map(([k, s]) => (
        <label key={k} className="field">
          <span>{k}{required.has(k) && <b className="req">*</b>} <i className="muted">{s.description}</i></span>
          {s.type === 'boolean' ? (
            <select value={values[k] ?? ''} onChange={e => setValues({ ...values, [k]: e.target.value })}>
              <option value="">default</option><option value="true">true</option><option value="false">false</option>
            </select>
          ) : LONG.test(k) && s.type !== 'integer' ? (
            <textarea rows={k.match(/rtl|testbench|files/i) ? 12 : 4} spellCheck={false}
              value={values[k] ?? ''} onChange={e => setValues({ ...values, [k]: e.target.value })} />
          ) : (
            <input type={s.type === 'integer' || s.type === 'number' ? 'number' : 'text'}
              value={values[k] ?? ''} onChange={e => setValues({ ...values, [k]: e.target.value })} />
          )}
        </label>
      ))}
      <div className="row">
        <button className="primary" disabled={busy || missing} onClick={run}>
          {busy ? 'Running…' : `Run ${tool.name}`}
        </button>
        <span className="muted mono">{tool.server}</span>
        {result && !busy && <span className="muted mono">{(ms / 1000).toFixed(1)} s</span>}
      </div>
      {result && <Output result={result} />}
    </div>
  )
}
