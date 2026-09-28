import { profileDisplayName, useUserProfile } from "hooks/useUserAccount";
import { useT, type TFunction } from "i18n";

export function roleLabel(role: string | undefined, t: TFunction): string {
  if (role === "company_admin") return t("nav.role.company_admin");
  if (role === "super_admin") return t("nav.role.super_admin");
  if (role === "driver") return t("nav.role.driver");
  return role || "";
}

/** Shared identity lines for sidenav header and account menu. */
export function useIdentityDisplay() {
  const { t } = useT();
  const { data: profile } = useUserProfile();
  const givenName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  const email = profile?.email || "";
  const primary = givenName || email || t("common.emptyDash");
  const emailLine = givenName && email ? email : "";
  const role = roleLabel(profile?.role, t);
  const company = profile?.company_name || t("common.emptyDash");
  const meta = role ? `${role} · ${company}` : company;
  const dash = t("common.emptyDash");
  const aria = givenName
    ? t("nav.identityAria", {
        name: givenName,
        email: email || dash,
        role: role || dash,
        company,
      })
    : t("nav.identityAriaEmail", {
        email: email || dash,
        role: role || dash,
        company,
      });
  /** Mini icon tooltip: e-posta + rol · şirket (e-posta tek kez). */
  const tooltip = [email || primary, meta].filter(Boolean).join(" · ");

  return {
    profile,
    givenName,
    email,
    primary,
    emailLine,
    role,
    company,
    meta,
    aria,
    tooltip: tooltip || profileDisplayName(profile) || t("common.emptyDash"),
  };
}
