import { SpotifyUser } from '@/types/auth';

const TOKEN_KEY = 'wvl_spotify_access_token';
const EXPIRY_KEY = 'wvl_spotify_token_expiry';
const REFRESH_KEY = 'wvl_spotify_refresh_token';
const VERIFIER_KEY = 'wvl_spotify_code_verifier';
const STATE_KEY = 'wvl_spotify_oauth_state';
const USER_KEY = 'wvl_spotify_user_profile';
const CUSTOM_CLIENT_ID_KEY = 'wvl_custom_client_id';

export const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'streaming',
].join(' ');

export function getSpotifyClientId(): string | null {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || null;
  const envId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (envId && envId.trim() && envId !== 'your_spotify_client_id_here') {
    return envId.trim();
  }
  const customId = localStorage.getItem(CUSTOM_CLIENT_ID_KEY);
  if (customId && customId.trim()) {
    return customId.trim();
  }
  return null;
}

export function setCustomSpotifyClientId(clientId: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = clientId.trim();
  if (trimmed) {
    localStorage.setItem(CUSTOM_CLIENT_ID_KEY, trimmed);
  } else {
    localStorage.removeItem(CUSTOM_CLIENT_ID_KEY);
  }
}

export function clearCustomSpotifyClientId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CUSTOM_CLIENT_ID_KEY);
}

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < values.length; i++) {
    result += possible[values[i] % possible.length];
  }
  return result;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function getRedirectUri(): string {
  if (typeof window === 'undefined') {
    return (process.env.NEXT_PUBLIC_APP_URL || 'https://web-fawn-five-77.vercel.app') + '/callback';
  }
  return window.location.origin + '/callback';
}

export async function initiateSpotifyLogin(overrideClientId?: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') return { ok: false, error: 'Window unavailable' };

  const clientId = overrideClientId?.trim() || getSpotifyClientId();
  if (!clientId) {
    return {
      ok: false,
      error: 'CLIENT_ID_MISSING',
    };
  }

  // Generate cryptographic PKCE code verifier, challenge and OAuth state
  const codeVerifier = generateRandomString(64);
  const state = generateRandomString(32);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  // Store in sessionStorage and localStorage for durability across redirects
  try {
    sessionStorage.setItem(VERIFIER_KEY, codeVerifier);
    sessionStorage.setItem(STATE_KEY, state);
    localStorage.setItem(VERIFIER_KEY, codeVerifier);
    localStorage.setItem(STATE_KEY, state);
  } catch (e) {
    console.warn('Storage warning during PKCE setup:', e);
  }

  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
    state: state,
    show_dialog: 'true', // Ensure user selects their own account
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  return { ok: true };
}

export interface CallbackResult {
  success: boolean;
  error?: string;
  user?: SpotifyUser;
}

export async function handleSpotifyCallback(code: string, returnedState: string | null): Promise<CallbackResult> {
  if (typeof window === 'undefined') return { success: false, error: 'Window unavailable' };

  const clientId = getSpotifyClientId();
  const storedVerifier = sessionStorage.getItem(VERIFIER_KEY) || localStorage.getItem(VERIFIER_KEY);
  const storedState = sessionStorage.getItem(STATE_KEY) || localStorage.getItem(STATE_KEY);
  const redirectUri = getRedirectUri();

  if (!clientId) {
    return { success: false, error: 'Spotify Client ID missing. Please configure it in settings.' };
  }

  if (!storedVerifier) {
    return { success: false, error: 'PKCE code verifier expired or missing. Please try signing in again.' };
  }

  // Validate state to protect against CSRF attacks
  if (storedState && returnedState && storedState !== returnedState) {
    return { success: false, error: 'State validation failed (possible CSRF attack). Authentication aborted.' };
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: storedVerifier,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = 'Failed to exchange token with Spotify';
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error_description || parsed.error || msg;
      } catch {}
      return { success: false, error: msg };
    }

    const data = await response.json();
    const expiryTime = Date.now() + (data.expires_in * 1000);

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
    if (data.refresh_token) {
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
    }

    // Clean up temporary PKCE values
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    localStorage.removeItem(VERIFIER_KEY);
    localStorage.removeItem(STATE_KEY);

    // Fetch user profile immediately to establish authenticated identity
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    if (profileRes.ok) {
      const profile = await profileRes.json();
      const user: SpotifyUser = {
        id: profile.id,
        displayName: profile.display_name || profile.id,
        email: profile.email,
        images: profile.images || [],
        product: profile.product,
        country: profile.country,
        followers: profile.followers,
        uri: profile.uri,
        externalUrls: profile.external_urls,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { success: true, user };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error during token exchange:', error);
    return { success: false, error: error?.message || 'Network error during authorization' };
  }
}

export async function refreshSpotifyToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const clientId = getSpotifyClientId();

  if (!refreshToken || !clientId) {
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      // Refresh token is revoked or invalid; clear session
      logoutSpotify();
      return null;
    }

    const data = await response.json();
    const expiryTime = Date.now() + (data.expires_in * 1000);

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
    if (data.refresh_token) {
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
    }

    return data.access_token;
  } catch (err) {
    console.error('Failed to refresh Spotify token:', err);
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);

  if (!token || !expiry) {
    return null;
  }

  const expiryMs = parseInt(expiry, 10);
  const now = Date.now();

  // If token has at least 60 seconds left, use it
  if (now < expiryMs - 60000) {
    return token;
  }

  // Token is expired or expiring soon; try to refresh
  return await refreshSpotifyToken();
}

export function getStoredUser(): SpotifyUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: SpotifyUser | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function isSpotifyConnected(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
}

export function logoutSpotify(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(USER_KEY);
}
