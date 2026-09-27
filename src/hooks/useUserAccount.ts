import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";

// Desen: src/hooks/useTasks.ts'ten kanitli (fetch + Authorization header).
// Ana backend'e (api.tulipfleet.com) DOGRUDAN baglanir - enterprise-api'ye degil.
// Karar (ARCHITECTURE_DECISION.md SS3): CORS acik oldugu kanitlandigi icin
// (curl testi: Access-Control-Allow-Origin: *) dogrudan baglanti secildi,
// proxy zorunlu degil.

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  company_name: string;
  source: "api" | "jwt";
}

function authHeaders(token: string | null) {
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

function pickStr(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return asRecord(JSON.parse(json));
  } catch {
    return null;
  }
}

export function profileFromJwt(token: string): UserProfile {
  const payload = decodeJwtPayload(token);
  return {
    firstName: "",
    lastName: "",
    email: pickStr(payload?.email),
    phone: "",
    role: pickStr(payload?.role),
    company_name: "",
    source: "jwt",
  };
}

export function normalizeUserProfile(body: unknown, token: string): UserProfile {
  const root = asRecord(body) ?? {};
  const user = asRecord(root.user) ?? root;
  return {
    firstName: pickStr(root.firstName, user.firstName, root.first_name, user.first_name),
    lastName: pickStr(root.lastName, user.lastName, root.last_name, user.last_name),
    email: pickStr(root.email, user.email) || profileFromJwt(token).email,
    phone: pickStr(root.phone, user.phone),
    role: pickStr(root.role, user.role) || profileFromJwt(token).role,
    company_name: pickStr(root.company_name, user.company_name),
    source: "api",
  };
}

export function profileDisplayName(profile: UserProfile | undefined): string {
  if (!profile) return "";
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return name || profile.email;
}

export function useUserProfile() {
  const token = useAuthStore((s) => s.token);
  const jwtFallback = useMemo(() => (token ? profileFromJwt(token) : undefined), [token]);

  return useQuery<UserProfile, Error>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      if (!token) throw new Error("No auth token");
      const res = await fetch(`${AUTH_API_URL}/api/user/profile`, {
        headers: authHeaders(token),
      });
      // Core A not on prod yet: 404 -> JWT email+role, company blank ("—").
      if (res.status === 404) {
        return profileFromJwt(token);
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch user profile: ${res.status}`);
      }
      const body: unknown = await res.json();
      return normalizeUserProfile(body, token);
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    placeholderData: jwtFallback,
  });
}

export function useUpdateUserProfile() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation<UserProfile, Error, Partial<UserProfile>>({
    mutationFn: async (payload) => {
      if (!token) throw new Error("No auth token");
      const res = await fetch(`${AUTH_API_URL}/api/user/profile`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to update profile: ${res.status}`);
      const body: unknown = await res.json();
      return normalizeUserProfile(body, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

export function useChangePassword() {
  const token = useAuthStore((s) => s.token);
  return useMutation<void, Error, { currentPassword: string; newPassword: string }>({
    mutationFn: async (payload) => {
      const res = await fetch(`${AUTH_API_URL}/api/user/change-password`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Password change failed: ${res.status} ${text}`);
      }
    },
  });
}

export function useDeleteAccount() {
  const token = useAuthStore((s) => s.token);
  return useMutation<void, Error, string>({
    mutationFn: async (password) => {
      const res = await fetch(`${AUTH_API_URL}/api/user/account`, {
        method: "DELETE",
        headers: authHeaders(token),
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Account delete failed: ${res.status} ${text}`);
      }
    },
  });
}
