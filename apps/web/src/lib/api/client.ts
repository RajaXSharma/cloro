let cachedToken: string | null = null;

export async function fetchToken(): Promise<string> {
  const res = await fetch('/api/auth/token');
  if (!res.ok) throw new Error('unauthenticated');
  const { token } = await res.json();
  cachedToken = token;
  return token;
}

export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  let token = cachedToken ?? (await fetchToken());

  const doFetch = (t: string) => {
    // one Headers object: setting the same header twice in a plain object merges
    // the values ("application/json, application/json") and the backend stops
    // parsing the body. ponytail: single case-insensitive setter below.
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('content-type')) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Authorization', `Bearer ${t}`);
    return fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${path}`, {
      ...init,
      headers,
    });
  };

  let res = await doFetch(token);
  if (res.status === 401) {
    cachedToken = null;
    token = await fetchToken();
    res = await doFetch(token);
  }
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('unauthenticated');
  }
  return res;
}
