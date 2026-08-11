import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";

// Desen: src/hooks/useTasks.ts'ten kanitli (fetch + Authorization header).
// Base URL farki: bu hook ANA backend'e (api.tulipfleet.com) gider, enterprise-api'ye
// DEGIL - cunku profile/password/delete-account ana backend'in (public.users)
// endpoint'leri. CORS gercek curl testiyle dogrulandi: Access-Control-Allow-Origin: *,
// Allow-Methods GET/HEAD/PUT/PATCH/POST/DELETE hepsi acik.
//
// Endpoint'ler mobil src/services/api.js'ten birebir kanitli:
//   GET    /api/user/profile           -> userAPI.getProfile()
//   PUT    /api/user/profile           -> userAPI.updateProfile({firstName,lastName,phone})
//   PUT    /api/user/change-password   -> userAPI.changePassword({currentPassword,newPassword})
//   DELETE /api/users/me               -> userAPI.deleteAccount(password) body:{password}


export interface UserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

function authHeaders(token: string | null) {
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

// -- GET /api/user/profile --------------------------------------------
export function useUserProfile() {
  const token = useAuthStore((s) => s.token);
  return useQuery<UserProfile, Error>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch(`${AUTH_API_URL}/api/user/profile`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Profile fetch failed: ${res.status} ${text}`);
      }
      return res.json();
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
}

// -- PUT /api/user/profile ---------------------------------------------
export function useUpdateUserProfile() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation<UserProfile, Error, Partial<UserProfile>>({
    mutationFn: async (data) => {
      const res = await fetch(`${AUTH_API_URL}/api/user/profile`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Profile update failed: ${res.status} ${text}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

// -- PUT /api/user/change-password --------------------------------------
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  const token = useAuthStore((s) => s.token);
  return useMutation<unknown, Error, ChangePasswordPayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${AUTH_API_URL}/api/user/change-password`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Change password failed: ${res.status} ${text}`);
      }
      return res.json();
    },
  });
}

// -- DELETE /api/users/me -----------------------------------------------
export function useDeleteAccount() {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  return useMutation<unknown, Error, string>({
    mutationFn: async (password) => {
      const res = await fetch(`${AUTH_API_URL}/api/users/me`, {
        method: "DELETE",
        headers: authHeaders(token),
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Delete account failed: ${res.status} ${text}`);
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      logout();
    },
  });
}
