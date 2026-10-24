// Thin client for the VSD server, which forwards every call to an MCP server.

export type Server = 'auralis' | 'semiconductor'

export interface ServerState { name: string; url: string; connected: boolean; serverName: string | null; detail: string }
export interface JsonSchema { type?: string; description?: string; properties?: Record<string, JsonSchema>; required?: string[] }
export interface ToolInfo { server: Server; name: string; description: string; inputSchema: JsonSchema }
export interface Result { text: string; error: boolean }

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json() as Promise<T>
}

export const servers = () => fetch('/api/servers').then(r => json<ServerState[]>(r))
export const tools = () => fetch('/api/tools').then(r => json<ToolInfo[]>(r))

export async function call(server: Server, tool: string, args: Record<string, unknown> = {}): Promise<Result> {
  try {
    const r = await fetch(`/api/call/${server}/${tool}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args),
    })
    return await json<Result>(r)
  } catch (e) {
    return { text: `VSD server unreachable: ${(e as Error).message}`, error: true }
  }
}

/** First UUID-looking id in a tool's text answer (problem, design ids). */
export const firstId = (text: string) => text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? ''
