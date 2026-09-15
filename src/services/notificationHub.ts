import * as signalR from "@microsoft/signalr";
import endpoints from "../utilities/endpoint";
import { getAccessToken } from "./axiosInstance";
import type { RealtimeNotificationPayload } from "../types/notification";

const NEW_NOTIFICATION_EVENT = "notification:new";

// Module-scoped singleton — same rationale as accessToken/tenantId in axiosInstance.ts: one
// connection for the whole app, not per-component, and importing the redux store here to gate
// on isAuthenticated would create the same import cycle axiosInstance.ts already avoids.
// accessTokenFactory re-reads getAccessToken() on every (re)connect attempt, so a token
// rotated by axiosInstance's 401 refresh flow is picked up automatically without this module
// needing to know that happened.
let connection: signalR.HubConnection | null = null;
let startPromise: Promise<void> | null = null;

function buildConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(endpoints.hubs.notifications, {
      accessTokenFactory: () => getAccessToken() ?? "",
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}

/** Idempotent — safe to call from multiple places (e.g. re-render); only the first call connects. */
export function startNotificationHub(): Promise<void> {
  if (!connection) connection = buildConnection();
  if (connection.state === signalR.HubConnectionState.Connected) return Promise.resolve();

  if (!startPromise) {
    startPromise = connection.start().catch((err) => {
      startPromise = null;
      throw err;
    });
  }
  return startPromise;
}

/** Call on logout — drops the connection so a stale/anonymous connection doesn't linger. */
export async function stopNotificationHub(): Promise<void> {
  startPromise = null;
  const toStop = connection;
  connection = null;
  if (toStop) {
    try {
      await toStop.stop();
    } catch {
      // Already disconnected/disconnecting — nothing more to do.
    }
  }
}

/** Subscribe to realtime "notification:new" pushes. Returns an unsubscribe function. */
export function onNewNotification(handler: (payload: RealtimeNotificationPayload) => void): () => void {
  if (!connection) connection = buildConnection();
  connection.on(NEW_NOTIFICATION_EVENT, handler);
  const target = connection;
  return () => target.off(NEW_NOTIFICATION_EVENT, handler);
}
