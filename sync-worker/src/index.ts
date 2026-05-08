interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ALLOWED_EXTENSION_REDIRECT_ORIGINS?: string;
  ALLOWED_EXTENSION_ORIGINS?: string;
  SESSION_TTL_DAYS?: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  avatar_url?: string;
}

interface SessionRow {
  session_id: string;
  user_id: string;
  provider: 'github';
  provider_user_id: string;
  username: string;
  avatar_url?: string;
  revision?: number;
}

interface SnapshotRow {
  snapshot_json: string;
  revision: number;
  updated_at: string;
}

type SessionResult = { session: SessionRow } | { response: Response };

const MAX_ICON_URL_BYTES = 50 * 1024;
const ICON_URL_TOO_LARGE_MESSAGE = '图标 URL 不能超过 50KB，请改用更短的图片链接或清空图标 URL。';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
};

const parseCsv = (value?: string) => (
  value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []
);

const nowIso = () => new Date().toISOString();

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const base64UrlEncode = (bytes: ArrayBuffer) => (
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
);

const sha256 = async (value: string) => {
  const data = new TextEncoder().encode(value);
  return base64UrlEncode(await crypto.subtle.digest('SHA-256', data));
};

const getUtf8ByteLength = (value: string) => new TextEncoder().encode(value).length;

const validateIconUrlSize = (iconUrl: unknown) => {
  if (iconUrl === undefined || iconUrl === null || iconUrl === '') return undefined;
  if (typeof iconUrl !== 'string') return 'Invalid icon URL.';

  return getUtf8ByteLength(iconUrl) > MAX_ICON_URL_BYTES
    ? ICON_URL_TOO_LARGE_MESSAGE
    : undefined;
};

const validateSnapshotIconSizes = (snapshot: unknown) => {
  if (!snapshot || typeof snapshot !== 'object') return 'Invalid snapshot payload.';

  const candidate = snapshot as {
    bookmarks?: Array<{ icon?: unknown }>;
    categoryIconUrls?: Record<string, unknown>;
  };

  if (!Array.isArray(candidate.bookmarks)) return 'Invalid snapshot payload.';

  for (const bookmark of candidate.bookmarks) {
    const error = validateIconUrlSize(bookmark.icon);
    if (error) return error;
  }

  if (
    candidate.categoryIconUrls &&
    typeof candidate.categoryIconUrls === 'object' &&
    !Array.isArray(candidate.categoryIconUrls)
  ) {
    for (const iconUrl of Object.values(candidate.categoryIconUrls)) {
      const error = validateIconUrlSize(iconUrl);
      if (error) return error;
    }
  }

  return undefined;
};

const createAccessToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
};

const getAllowedOrigin = (request: Request, env: Env) => {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  const configuredOrigins = parseCsv(env.ALLOWED_EXTENSION_ORIGINS);
  if (
    configuredOrigins.includes(origin) ||
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('moz-extension://')
  ) {
    return origin;
  }

  return null;
};

const withCors = (response: Response, request: Request, env: Env) => {
  const origin = getAllowedOrigin(request, env);
  if (!origin) return response;

  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', origin);
  headers.set('access-control-allow-methods', 'GET,PUT,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'authorization,content-type');
  headers.set('vary', 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const json = (body: unknown, status = 200) => (
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  })
);

const errorJson = (message: string, status = 400) => json({ error: message }, status);

const isAllowedRedirectUri = (redirectUri: string, env: Env) => {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }

  const allowedOrigins = parseCsv(env.ALLOWED_EXTENSION_REDIRECT_ORIGINS);
  return (
    allowedOrigins.includes(url.origin) ||
    url.origin.endsWith('.chromiumapp.org') ||
    url.origin.endsWith('.extensions.allizom.org') ||
    url.origin.endsWith('.extensions.mozilla.org')
  );
};

const exchangeGitHubCode = async (code: string, env: Env) => {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await response.json() as GitHubTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'GitHub access token exchange failed.');
  }

  return data.access_token;
};

const fetchGitHubUser = async (accessToken: string) => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${accessToken}`,
      'user-agent': 'bookmark-nav-sync-worker',
    },
  });

  if (!response.ok) {
    throw new Error('GitHub user lookup failed.');
  }

  return response.json() as Promise<GitHubUserResponse>;
};

const upsertGitHubUser = async (githubUser: GitHubUserResponse, env: Env) => {
  const timestamp = nowIso();
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE provider = ? AND provider_user_id = ?',
  ).bind('github', String(githubUser.id)).first<{ id: string }>();
  const userId = existing?.id ?? crypto.randomUUID();

  if (existing) {
    await env.DB.prepare(
      'UPDATE users SET username = ?, avatar_url = ?, updated_at = ? WHERE id = ?',
    ).bind(githubUser.login, githubUser.avatar_url ?? null, timestamp, userId).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO users
        (id, provider, provider_user_id, username, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      userId,
      'github',
      String(githubUser.id),
      githubUser.login,
      githubUser.avatar_url ?? null,
      timestamp,
      timestamp,
    ).run();
  }

  return userId;
};

const createSession = async (userId: string, env: Env) => {
  const accessToken = createAccessToken();
  const tokenHash = await sha256(`${env.SESSION_SECRET}:${accessToken}`);
  const timestamp = nowIso();
  const ttlDays = Number(env.SESSION_TTL_DAYS ?? '30');
  const expiresAt = addDays(Number.isFinite(ttlDays) ? ttlDays : 30);

  await env.DB.prepare(
    `INSERT INTO sessions
      (id, user_id, token_hash, expires_at, revoked_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?)`,
  ).bind(crypto.randomUUID(), userId, tokenHash, expiresAt, timestamp, timestamp).run();

  return { accessToken, expiresAt };
};

const authenticate = async (request: Request, env: Env) => {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const tokenHash = await sha256(`${env.SESSION_SECRET}:${match[1]}`);
  return env.DB.prepare(
    `SELECT
      sessions.id AS session_id,
      users.id AS user_id,
      users.provider AS provider,
      users.provider_user_id AS provider_user_id,
      users.username AS username,
      users.avatar_url AS avatar_url,
      sync_snapshots.revision AS revision
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     LEFT JOIN sync_snapshots ON sync_snapshots.user_id = users.id
     WHERE sessions.token_hash = ?
       AND sessions.revoked_at IS NULL
       AND sessions.expires_at > ?`,
  ).bind(tokenHash, nowIso()).first<SessionRow>();
};

const requireSession = async (request: Request, env: Env): Promise<SessionResult> => {
  const session = await authenticate(request, env);
  if (!session) {
    return { response: errorJson('Unauthorized', 401) };
  }

  return { session };
};

const handleAuthStart = (url: URL, env: Env) => {
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');

  if (!redirectUri || !state) {
    return errorJson('Missing redirect_uri or state.', 400);
  }

  if (!isAllowedRedirectUri(redirectUri, env)) {
    return errorJson('Redirect URI is not allowed.', 400);
  }

  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubUrl.searchParams.set('redirect_uri', `${url.origin}/auth/github/callback`);
  githubUrl.searchParams.set('scope', 'read:user');
  githubUrl.searchParams.set('state', JSON.stringify({ appState: state, redirectUri }));
  return Response.redirect(githubUrl.toString(), 302);
};

const handleAuthCallback = async (url: URL, env: Env) => {
  const code = url.searchParams.get('code');
  const rawState = url.searchParams.get('state');

  if (!code || !rawState) {
    return errorJson('Missing code or state.', 400);
  }

  let state: { appState?: string; redirectUri?: string };
  try {
    state = JSON.parse(rawState) as { appState?: string; redirectUri?: string };
  } catch {
    return errorJson('Invalid OAuth state.', 400);
  }

  if (!state.redirectUri || !state.appState || !isAllowedRedirectUri(state.redirectUri, env)) {
    return errorJson('Invalid redirect URI.', 400);
  }

  const githubToken = await exchangeGitHubCode(code, env);
  const githubUser = await fetchGitHubUser(githubToken);
  const userId = await upsertGitHubUser(githubUser, env);
  const session = await createSession(userId, env);
  const snapshot = await env.DB.prepare(
    'SELECT revision FROM sync_snapshots WHERE user_id = ?',
  ).bind(userId).first<{ revision: number }>();

  const redirectUrl = new URL(state.redirectUri);
  redirectUrl.hash = new URLSearchParams({
    access_token: session.accessToken,
    expires_at: session.expiresAt,
    state: state.appState,
    user_id: userId,
    username: githubUser.login,
    avatar_url: githubUser.avatar_url ?? '',
    revision: String(snapshot?.revision ?? 0),
  }).toString();

  return Response.redirect(redirectUrl.toString(), 302);
};

const handleMe = async (request: Request, env: Env) => {
  const result = await requireSession(request, env);
  if ('response' in result) return result.response;

  return json({
    user: {
      id: result.session.user_id,
      provider: 'github',
      username: result.session.username,
      avatarUrl: result.session.avatar_url,
    },
    revision: result.session.revision ?? 0,
  });
};

const handleGetSnapshot = async (request: Request, env: Env) => {
  const result = await requireSession(request, env);
  if ('response' in result) return result.response;

  const row = await env.DB.prepare(
    'SELECT snapshot_json, revision, updated_at FROM sync_snapshots WHERE user_id = ?',
  ).bind(result.session.user_id).first<SnapshotRow>();

  if (!row) {
    return json({ snapshot: null, revision: 0 });
  }

  return json({
    snapshot: JSON.parse(row.snapshot_json),
    revision: row.revision,
    updatedAt: row.updated_at,
  });
};

const handlePutSnapshot = async (request: Request, env: Env) => {
  const result = await requireSession(request, env);
  if ('response' in result) return result.response;

  const body = await request.json().catch(() => null) as { snapshot?: unknown } | null;
  if (!body || typeof body.snapshot !== 'object' || body.snapshot === null) {
    return errorJson('Invalid snapshot payload.', 400);
  }

  const iconValidationError = validateSnapshotIconSizes(body.snapshot);
  if (iconValidationError) {
    return errorJson(iconValidationError, 400);
  }

  const timestamp = nowIso();
  const snapshotJson = JSON.stringify(body.snapshot);
  const existing = await env.DB.prepare(
    'SELECT revision FROM sync_snapshots WHERE user_id = ?',
  ).bind(result.session.user_id).first<{ revision: number }>();
  const revision = (existing?.revision ?? 0) + 1;

  if (existing) {
    await env.DB.prepare(
      'UPDATE sync_snapshots SET snapshot_json = ?, revision = ?, updated_at = ? WHERE user_id = ?',
    ).bind(snapshotJson, revision, timestamp, result.session.user_id).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO sync_snapshots (user_id, snapshot_json, revision, updated_at) VALUES (?, ?, ?, ?)',
    ).bind(result.session.user_id, snapshotJson, revision, timestamp).run();
  }

  return json({ revision, updatedAt: timestamp });
};

const handleLogout = async (request: Request, env: Env) => {
  const result = await requireSession(request, env);
  if ('response' in result) return result.response;

  await env.DB.prepare(
    'UPDATE sessions SET revoked_at = ?, updated_at = ? WHERE id = ?',
  ).bind(nowIso(), nowIso(), result.session.session_id).run();

  return json({ ok: true });
};

const route = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method === 'GET' && url.pathname === '/auth/github/start') {
    return handleAuthStart(url, env);
  }

  if (request.method === 'GET' && url.pathname === '/auth/github/callback') {
    return handleAuthCallback(url, env);
  }

  if (request.method === 'GET' && url.pathname === '/api/me') {
    return handleMe(request, env);
  }

  if (request.method === 'GET' && url.pathname === '/api/snapshot') {
    return handleGetSnapshot(request, env);
  }

  if (request.method === 'PUT' && url.pathname === '/api/snapshot') {
    return handlePutSnapshot(request, env);
  }

  if (request.method === 'POST' && url.pathname === '/api/logout') {
    return handleLogout(request, env);
  }

  return errorJson('Not found.', 404);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return withCors(await route(request, env), request, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error.';
      return withCors(errorJson(message, 500), request, env);
    }
  },
};
