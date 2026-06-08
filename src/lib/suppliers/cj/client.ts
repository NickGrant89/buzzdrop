import { getSetting, setSetting } from "@/lib/db";
import { cjConfig, isCjConfigured } from "@/lib/config";

type CjResponse<T> = {
  code: number;
  result: boolean;
  message: string;
  data: T;
  success?: boolean;
};

type TokenData = {
  accessToken: string;
  accessTokenExpiryDate: string;
  refreshToken: string;
  refreshTokenExpiryDate: string;
};

const TOKEN_KEY = "cj_access_token";
const REFRESH_KEY = "cj_refresh_token";
const TOKEN_EXPIRY_KEY = "cj_token_expiry";

async function cjFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<CjResponse<T>> {
  const url = `${cjConfig.baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15_000),
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const json = (await res.json()) as CjResponse<T>;
  if (json.code !== 200 || !json.result) {
    throw new Error(json.message || `CJ API error (${json.code})`);
  }
  return json;
}

function isTokenValid(): boolean {
  const expiry = getSetting(TOKEN_EXPIRY_KEY);
  if (!expiry) return false;
  return new Date(expiry).getTime() > Date.now() + 60_000;
}

export async function getCjAccessToken(): Promise<string> {
  const cached = getSetting(TOKEN_KEY);
  if (cached && isTokenValid()) return cached;

  const refreshToken = getSetting(REFRESH_KEY);
  if (refreshToken) {
    try {
      const res = await cjFetch<TokenData>("/authentication/refreshAccessToken", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      saveTokens(res.data);
      return res.data.accessToken;
    } catch {
      /* fall through to full auth */
    }
  }

  if (!cjConfig.apiKey && !(cjConfig.email && cjConfig.password)) {
    throw new Error("CJ not configured — add CJ_API_KEY or CJ_EMAIL + CJ_PASSWORD to .env.local");
  }

  const authBody = cjConfig.apiKey
    ? { apiKey: cjConfig.apiKey }
    : { email: cjConfig.email, password: cjConfig.password };

  const res = await cjFetch<TokenData>("/authentication/getAccessToken", {
    method: "POST",
    body: JSON.stringify(authBody),
  });

  saveTokens(res.data);
  return res.data.accessToken;
}

function saveTokens(data: TokenData) {
  setSetting(TOKEN_KEY, data.accessToken);
  setSetting(REFRESH_KEY, data.refreshToken);
  setSetting(TOKEN_EXPIRY_KEY, data.accessTokenExpiryDate);
}

export async function cjAuthenticatedFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<CjResponse<T>> {
  const token = await getCjAccessToken();
  return cjFetch<T>(path, {
    ...options,
    headers: {
      "CJ-Access-Token": token,
      platformToken: token,
      ...(options.headers ?? {}),
    },
  });
}

export async function testCjConnection(): Promise<{
  connected: boolean;
  email?: string;
  isSandbox?: boolean;
  message: string;
}> {
  if (!isCjConfigured()) {
    return {
      connected: false,
      message: "Add CJ_API_KEY or CJ_EMAIL + CJ_PASSWORD to .env.local",
    };
  }

  try {
    const res = await cjAuthenticatedFetch<{
      openEmail?: string;
      isSandbox?: boolean;
    }>("/setting/get");

    return {
      connected: true,
      email: res.data.openEmail,
      isSandbox: res.data.isSandbox,
      message: "Connected to CJ Dropshipping",
    };
  } catch (err) {
    return {
      connected: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
