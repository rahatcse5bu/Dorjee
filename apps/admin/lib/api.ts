export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Reads are retried when the connection drops or the server is still starting up;
// changes (approve, reject) are never retried.
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
  token?: string,
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
    throw new Error(`Couldn't connect to the server (${API_BASE}). Check your connection and try again.`);
  }

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      // Nest sends { message: string | string[] }.
      const parsed = JSON.parse(body) as { message?: string | string[] };
      if (parsed.message) message = Array.isArray(parsed.message) ? parsed.message.join(". ") : parsed.message;
    } catch {
      // Not JSON; use the raw text.
    }
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
