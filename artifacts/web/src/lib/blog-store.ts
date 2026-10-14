export type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageDataUrl: string | null;
  publishedAt: string;
};

// Mirror of the server's slugify so the admin form can preview the public URL
// and auto-fill the slug from the title before saving.
export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "post";
}

// A post whose publish date is still in the future is "scheduled": hidden from
// public views until its date arrives.
export function isScheduled(publishedAt: string): boolean {
  const published = new Date(publishedAt).getTime();
  return !Number.isNaN(published) && published > Date.now();
}

// A YYYY-MM-DD value (for <input type="date">) from an ISO timestamp.
export function toDateInputValue(isoOrDate: string): string {
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const ADMIN_SESSION_KEY = "enzosoft-share.admin-auth";

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
