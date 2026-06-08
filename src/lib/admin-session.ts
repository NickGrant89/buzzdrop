export const ADMIN_COOKIE = "buzzdrop_admin_session";
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export async function getSessionSecretHex(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(`buzzdrop-session:${password}`)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "hex"))
    .join("");
}

export async function verifyAdminSessionToken(
  token: string | undefined,
  password: string | undefined
): Promise<boolean> {
  if (!token || !password || password.length < 8) return false;

  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;

  const expires = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expiresMs = Number(expires);

  if (!Number.isFinite(expiresMs) || Date.now() > expiresMs) return false;

  const secret = await getSessionSecretHex(password);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expectedBuf = await crypto.subtle.sign("HMAC", key, enc.encode(expires));
  const expected = Array.from(new Uint8Array(expectedBuf))
    .map((b) => b.toString(16).padStart(2, "hex"))
    .join("");

  if (sig.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createAdminSessionToken(password: string): Promise<string | null> {
  if (!password || password.length < 8) return null;

  const secret = await getSessionSecretHex(password);
  const expires = String(Date.now() + SESSION_MS);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(expires));
  const sig = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "hex"))
    .join("");

  return `${expires}.${sig}`;
}

export function isAdminPasswordConfigured(): boolean {
  return (process.env.ADMIN_PASSWORD ?? "").length >= 8;
}

export function isAdminAutoLoginEnabled(): boolean {
  return process.env.ADMIN_AUTO_LOGIN === "true";
}

export function isAdminProtectionEnabled(): boolean {
  return isAdminPasswordConfigured() && !isAdminAutoLoginEnabled();
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || expected.length < 8) return false;
  if (password.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
