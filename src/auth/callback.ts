export interface AuthCallback { code?: string; flowId?: string; failed?: boolean }

/** Only consume the app's own callback, and only the PKCE code (never URL access tokens). */
export function parseAuthCallback(input: string, redirectUrl: string): AuthCallback | null {
  let url: URL, expected: URL;
  try { url = new URL(input); expected = new URL(redirectUrl); } catch { return null; }
  if (url.protocol !== expected.protocol || url.hostname !== expected.hostname || url.port !== expected.port ||
      url.pathname !== expected.pathname || url.username || url.password || url.hash) return null;
  if (url.searchParams.has('error') || url.searchParams.has('error_code')) return { failed: true };
  const codes = url.searchParams.getAll('code');
  const code = codes[0];
  if (codes.length !== 1 || !code || code.length > 2048 || /\s/.test(code)) return null;
  const flows = url.searchParams.getAll('sb_flow_id');
  if (flows.length > 1 || (flows[0] && !/^[A-Za-z0-9_-]{1,200}$/.test(flows[0]))) return null;
  return { code, ...(flows[0] ? { flowId: flows[0] } : {}) };
}
