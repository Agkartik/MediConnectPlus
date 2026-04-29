import { io, Socket } from "socket.io-client";
import { getStoredToken } from "@/lib/api";

/** Socket.IO URL: same origin in dev (Vite proxies /socket.io) or explicit API URL */
export function createSignalingSocket(): Socket {
  const base = import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return io(base, {
    path: "/socket.io",
    auth: { token: getStoredToken() },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
}
