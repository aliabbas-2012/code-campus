'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';

const PING_INTERVAL_MS = 60_000;

/** Pings the server periodically while the user has an active tab open, so notifications can tell online from offline. */
export function usePresenceHeartbeat(): void {
  useEffect(() => {
    api.presence.ping().catch(() => {});
    const interval = setInterval(() => {
      api.presence.ping().catch(() => {});
    }, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
