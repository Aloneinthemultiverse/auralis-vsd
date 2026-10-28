import type { ReactNode } from 'react'

// Small Markdown renderer for design docs: headings, paragraphs, lists, tables, code, inline code/bold.

function inline(text: string, key: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith('`') && p.endsWith('`') ? <code key={key + i}>{p.slice(1, -1)}</code>
      : p.startsWith('**') && p.endsWith('**') ? <b key={key + i}>{p.slice(2, -2)}</b> : p)
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (l.startsWith('```')) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      i++
      out.push(<pre key={i} className="md-code">{body.join('\n')}</pre>)
      continue
    }
    const h = l.match(/^(#{1,4})\s+(.*)/)
    if (h) {
      const lvl = h[1].length
      const H = (lvl === 1 ? 'h2' : lvl === 2 ? 'h3' : 'h4') as 'h2'
      out.push(<H key={i}>{inline(h[2], 'h' + i)}</H>)
      i++
      continue
    }
    if (l.trim().startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        if (!cells.every(c => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      out.push(
        <div key={i} className="md-table"><table>
          <thead><tr>{rows[0]?.map((c, j) => <th key={j}>{inline(c, `t${i}h${j}`)}</th>)}</tr></thead>
          <tbody>{rows.slice(1).map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c, `t${i}${k}${j}`)}</td>)}</tr>)}</tbody>
        </table></div>)
      continue
    }
    if (/^\s*[-*]\s+/.test(l)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*[-*]\s+/, '')
        i++
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) item += ' ' + lines[i++].trim()
        items.push(item)
      }
      out.push(<ul key={i}>{items.map((t, k) => <li key={k}>{inline(t, `l${i}${k}`)}</li>)}</ul>)
      continue
    }
    if (!l.trim()) { i++; continue }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#|```|\s*[-*]\s|\s*\|)/.test(lines[i])) para.push(lines[i++])
    out.push(<p key={i}>{inline(para.join(' '), 'p' + i)}</p>)
  }
  return <div className="md">{out}</div>
}
