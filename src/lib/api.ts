const API_BASE = import.meta.env.VITE_API_URL || "";

export function getStoredToken(): string | null {
  return localStorage.getItem("mc_token");
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem("mc_token", token);
  else localStorage.removeItem("mc_token");
}

function buildUrl(path: string) {
  if (path.startsWith("http")) return path;
  if (API_BASE) return `${API_BASE.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  return path;
}

// CSRF token cache
let csrfToken: string | null = null;
let csrfFetchPromise: Promise<string> | null = null;

async function getCSRFToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (csrfFetchPromise) return csrfFetchPromise;
  csrfFetchPromise = fetch(buildUrl("/api/csrf-token"), { credentials: "include" })
    .then((r) => r.json())
    .then((data) => {
      csrfToken = data.token as string;
      csrfFetchPromise = null;
      // Refresh CSRF token every 20 minutes
      setTimeout(() => { csrfToken = null; }, 20 * 60 * 1000);
      return csrfToken!;
    })
    .catch(() => {
      csrfFetchPromise = null;
      return "";
    });
  return csrfFetchPromise;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authToken = getStoredToken();
  const method = (options.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  // Include CSRF token for state-mutating requests (non-auth routes)
  const isAuthRoute = path.includes("/auth/");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !isAuthRoute) {
    const csrf = await getCSRFToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  let res = await fetch(buildUrl(path), { ...options, headers, credentials: "include" });
  
  // Handle CSRF expiration/invalidity - Retry once with fresh token
  if (res.status === 403 && ["POST", "PUT", "PATCH", "DELETE"].includes(method) && !isAuthRoute) {
    const text = await res.clone().text();
    try {
      const errorData = JSON.parse(text);
      if (errorData.message?.toLowerCase().includes("csrf")) {
        console.warn("[API] CSRF token invalid, retrying with fresh token...");
        csrfToken = null; // Clear cached token
        const freshCsrf = await getCSRFToken();
        if (freshCsrf) {
          headers["X-CSRF-Token"] = freshCsrf;
          res = await fetch(buildUrl(path), { ...options, headers, credentials: "include" });
        }
      }
    } catch (e) {
      // Not JSON or parse error, proceed to standard error handling
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error || data?.message || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data as T;
}
