const TOKEN_KEY = 'wvl_spotify_access_token';
const EXPIRY_KEY = 'wvl_spotify_token_expiry';
const REFRESH_KEY = 'wvl_spotify_refresh_token';
const VERIFIER_KEY = 'wvl_spotify_code_verifier';

const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'playlist-read-private',
  'user-library-read'
].join(' ');

// Generate a random string for PKCE code verifier
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

// SHA-256 hash
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

// Base64-url encode
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

export async function initiateSpotifyLogin() {
  if (typeof window === 'undefined') return;

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    console.warn('NEXT_PUBLIC_SPOTIFY_CLIENT_ID not set. Please configure in .env.local');
    alert('Spotify Client ID not configured. Please add NEXT_PUBLIC_SPOTIFY_CLIENT_ID to your environment variables to connect live Spotify account.');
    return;
  }

  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  window.localStorage.setItem(VERIFIER_KEY, codeVerifier);

  const redirectUri = window.location.origin + '/callback';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function handleSpotifyCallback(code: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const codeVerifier = window.localStorage.getItem(VERIFIER_KEY);
  const redirectUri = window.location.origin + '/callback';

  if (!clientId || !codeVerifier) {
    console.error('Missing clientId or codeVerifier');
    return false;
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
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Spotify token exchange failed', err);
      return false;
    }

    const data = await response.json();
    const expiryTime = Date.now() + (data.expires_in * 1000);

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
    if (data.refresh_token) {
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
    }
    localStorage.removeItem(VERIFIER_KEY);
    return true;
  } catch (error) {
    console.error('Error during token exchange', error);
    return false;
  }
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);

  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) {
    // Token expired
    return null;
  }
  return token;
}

export function isSpotifyConnected(): boolean {
  return !!getStoredAccessToken();
}

export function logoutSpotify() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(VERIFIER_KEY);
}
