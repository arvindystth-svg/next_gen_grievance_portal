import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function redirectToLogin(router: AppRouterInstance): void {
  router.replace("/login");
  window.setTimeout(() => {
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }, 500);
}

export function redirectToHome(router: AppRouterInstance): void {
  router.replace("/");
  window.setTimeout(() => {
    if (window.location.pathname === "/login") {
      window.location.assign("/");
    }
  }, 500);
}
