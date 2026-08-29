import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Hard navigation is more reliable than client router alone after a full page refresh
 * (preview iframe, stale HMR, etc.). Router replace is still attempted for SPA transitions.
 */
export function redirectToLogin(router?: AppRouterInstance): void {
  if (typeof window === "undefined") return;
  router?.replace("/login");
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

export function redirectToHome(router?: AppRouterInstance): void {
  if (typeof window === "undefined") return;
  router?.replace("/");
  if (window.location.pathname === "/login") {
    window.location.replace("/");
  }
}
