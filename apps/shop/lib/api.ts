import { clearShopAuth } from "./auth";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Nest returns { message: string | string[] }; turn it into readable text.
function readErrorMessage(body: string, status: number) {
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(". ");
    if (parsed.message) return parsed.message;
  } catch {
    // Not JSON; fall through to the raw text.
  }
  return body || `Request failed with ${status}`;
}

/** Shown when no response arrives at all (offline, or the server failed before answering). */
function offlineMessage() {
  let lang = "bn";
  try {
    lang = window.localStorage.getItem("dorjee_lang") ?? "bn";
  } catch {
    // Storage blocked; use Bangla.
  }
  return lang === "en"
    ? "Couldn't connect to the server. Check your internet connection and try again."
    : "সার্ভারের সাথে সংযোগ হচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Reads are safe to repeat, so a dropped connection or a server that is still
// starting up is retried; changes are never retried, to avoid duplicate orders.
const RETRY_DELAYS_MS = [700, 2000];
const RETRY_STATUSES = [502, 503, 504];

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const canRetry = method === "GET" || method === "HEAD";
  for (let attempt = 0; ; attempt++) {
    const last = !canRetry || attempt >= RETRY_DELAYS_MS.length;
    try {
      const response = await fetch(url, init);
      if (last || !RETRY_STATUSES.includes(response.status)) return response;
    } catch (err) {
      if (last) throw err;
    }
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetchWithRetry(`${API_BASE}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error(offlineMessage());
  }

  if (!response.ok) {
    const message = readErrorMessage(await response.text(), response.status);
    // An expired session on any authenticated call sends the user back to login.
    if (response.status === 401 && token && typeof window !== "undefined") {
      clearShopAuth();
      window.location.href = "/login?expired=1";
    }
    // The shop's trial or plan ended: the app swaps the page for the subscribe screen.
    if (response.status === 402 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("dorjee:subscription-locked"));
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
