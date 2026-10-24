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
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Cannot reach server. Start API on http://localhost:4000 and ensure MongoDB is running.",
    );
  }

  if (!response.ok) {
    const message = readErrorMessage(await response.text(), response.status);
    // An expired session on any authenticated call sends the user back to login.
    if (response.status === 401 && token && typeof window !== "undefined") {
      clearShopAuth();
      window.location.href = "/login?expired=1";
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
