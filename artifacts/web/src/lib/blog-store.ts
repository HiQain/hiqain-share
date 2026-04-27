export type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageDataUrl: string | null;
  publishedAt: string;
};
const ADMIN_SESSION_KEY = "hiqain-share.admin-auth";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isAdminAuthenticated(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

export function setAdminAuthenticated(value: boolean): void {
  if (!canUseStorage()) return;
  if (value) {
    window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
  } else {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
  }
}
