/** Keep PKCE S256 on native runtimes that lack WebCrypto's subtle.digest. */
export function createPkceFetch(baseFetch: typeof fetch, authUrl: string, sha256Base64: (value: string) => Promise<string>): typeof fetch {
  const expected = new URL(authUrl);
  return async (input, init) => {
    const address = typeof input === 'string' ? input : 'url' in input ? input.url : String(input);
    let url: URL;
    try { url = new URL(address); } catch { return baseFetch(input, init); }
    if (url.origin !== expected.origin || !url.pathname.startsWith('/auth/v1/') || typeof init?.body !== 'string') return baseFetch(input, init);
    let body: Record<string, unknown>;
    try { body = JSON.parse(init.body); } catch { return baseFetch(input, init); }
    if (!body || body.code_challenge_method !== 'plain') return baseFetch(input, init);
    if (typeof body.code_challenge !== 'string' || body.code_challenge.length < 43 || body.code_challenge.length > 2048) throw new Error('Could not prepare a secure sign-in link. Please try again.');
    const digest = await sha256Base64(body.code_challenge);
    const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return baseFetch(input, { ...init, body: JSON.stringify({ ...body, code_challenge: challenge, code_challenge_method: 's256' }) });
  };
}
