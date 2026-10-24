import type { Result } from './api'

/** Tool output with EDA-style highlighting: PASS/FAIL, warnings, graph paths, terms. */
export function Output({ result }: { result: Result }) {
  const lines = result.text.split('\n')
  return (
    <pre className={`output ${result.error ? 'err' : ''}`}>
      {lines.map((l, i) => {
        let cls = ''
        if (/\b(FAIL|ERROR|%Error)\b/.test(l)) cls = 'bad'
        else if (/\b(PASS|ALL TESTS PASSED|SUFFICIENT|passed)\b/.test(l)) cls = 'good'
        else if (/%Warning|\bWARN/i.test(l)) cls = 'warn'
        else if (/^\s*path:/.test(l)) cls = 'path'
        else if (/^\[\d+\]/.test(l)) cls = 'head'
        return <span key={i} className={cls}>{cls === 'path' ? terms(l) : l}{'\n'}</span>
      })}
    </pre>
  )
}

function terms(line: string) {
  return line.split(/(\[[A-Z0-9_-]+\]|-[A-Z_]+->|<-[A-Z_]+-|-[A-Z_]+<-)/).map((p, i) =>
    /^\[[A-Z0-9_-]+\]$/.test(p) ? <b key={i} className="term">{p}</b>
      : /[A-Z_]+-?>|<-|-[A-Z_]+<-/.test(p) ? <i key={i} className="rel">{p}</i> : p)
}
