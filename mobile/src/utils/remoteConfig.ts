// Backend address the app falls back to if the remote config can't be
// reached for any reason — exactly what was hardcoded directly into
// api.ts/socket.ts before this existed. Centralized here so both files
// read the same default instead of keeping their own copies in sync by hand.
export const DEFAULT_API_BASE_URL = 'https://ride-campus-cool-production.up.railway.app/api';
export const DEFAULT_SOCKET_URL = 'https://ride-campus-cool-production.up.railway.app';

// A tiny JSON file in this same repo, fetched from GitHub's raw-content
// host — infrastructure entirely independent of wherever the backend
// itself is hosted. If that host (Railway, or whatever it gets migrated
// to later) has an outage, a fresh backend can be stood up elsewhere and
// every already-installed app will pick up the new address here on its
// next cold launch — no app store resubmission needed, which is otherwise
// the only way to change a URL baked into the app bundle.
const CONFIG_URL = 'https://raw.githubusercontent.com/Campus-Chauffer/ride-campus-cool/main/mobile/remote-config.json';
const FETCH_TIMEOUT_MS = 4000;

export interface RemoteBackendConfig {
  apiBaseUrl?: string;
  socketUrl?: string;
}

// Fetches the remote config with a hard timeout, and fails silently (returns
// null) on any problem — a slow/unreachable GitHub, malformed JSON, or a
// missing field. This must never be able to make the app worse off than
// just using the hardcoded defaults above; it can only improve things.
export async function fetchRemoteBackendConfig(): Promise<RemoteBackendConfig | null> {
  try {
    const response = await Promise.race([
      fetch(CONFIG_URL, { cache: 'no-store' as any }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MS)),
    ]);
    if (!response.ok) return null;
    const data = await response.json();
    const config: RemoteBackendConfig = {};
    if (typeof data?.apiBaseUrl === 'string' && data.apiBaseUrl.startsWith('https://')) {
      config.apiBaseUrl = data.apiBaseUrl;
    }
    if (typeof data?.socketUrl === 'string' && data.socketUrl.startsWith('https://')) {
      config.socketUrl = data.socketUrl;
    }
    return config;
  } catch (err) {
    console.log('Remote backend config fetch failed, using default:', err);
    return null;
  }
}
