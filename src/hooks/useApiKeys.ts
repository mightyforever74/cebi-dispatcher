import { useState, useEffect, useCallback } from "react";

import { ENTERPRISE_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";

// B2B API Key Dashboard, slice 4 (Cem, 2026-10-11): self-service Tier A key
// management for /subscription/b2b-api. Mirrors useHgvTollReport.ts's hook
// pattern (fetch + loading/error state, token-gated). Contracts
// (tulipfleet-enterprise-backend, routes/apiKeys.js):
//   GET    /api/subscription/api-keys      -> { api_keys: ApiKeyMeta[] }
//   POST   /api/subscription/api-keys      -> 201 { api_key: CreatedApiKey }
//   DELETE /api/subscription/api-keys/:id  -> { revoked: true } | 404
//
// Honesty: list/refresh never carries the plaintext key or key_hash — only
// key_prefix (see lib/apiKeys/listApiKeys.js). The plaintext is available
// exactly once, in `newKey`, right after a successful createKey() call.

export interface ApiKeyMeta {
  id: string;
  key_prefix: string;
  label: string | null;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

export interface CreatedApiKey extends ApiKeyMeta {
  key: string;
}

export function useApiKeys() {
  const token = useAuthStore((s) => s.token);
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newKey, setNewKey] = useState<CreatedApiKey | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [revokingId, setRevokingId] = useState<string | null>(null);

  function authHeaders(): Record<string, string> {
    return {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    };
  }

  const refresh = useCallback(async () => {
    if (!token) {
      setKeys([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ENTERPRISE_API_URL}/api/subscription/api-keys`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setKeys(data.api_keys || []);
    } catch {
      setError("list_failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createKey = useCallback(
    async (label?: string) => {
      if (!token) return;
      setCreating(true);
      setCreateError(null);
      try {
        const res = await fetch(`${ENTERPRISE_API_URL}/api/subscription/api-keys`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ label: label || null }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setNewKey(data.api_key);
        await refresh();
      } catch {
        setCreateError("create_failed");
      } finally {
        setCreating(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [token, refresh]
  );

  const revokeKey = useCallback(
    async (id: string) => {
      if (!token) return;
      setRevokingId(id);
      setError(null);
      try {
        const res = await fetch(`${ENTERPRISE_API_URL}/api/subscription/api-keys/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(String(res.status));
        await refresh();
      } catch {
        setError("revoke_failed");
      } finally {
        setRevokingId(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [token, refresh]
  );

  const dismissNewKey = useCallback(() => setNewKey(null), []);

  return {
    keys,
    loading,
    error,
    newKey,
    creating,
    createError,
    revokingId,
    createKey,
    revokeKey,
    dismissNewKey,
    refresh,
  };
}
