export type BlogPost = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  imageDataUrl: string | null;
};

const BLOG_STORAGE_KEY = "hiqain-share.blog-posts";
const ADMIN_SESSION_KEY = "hiqain-share.admin-auth";

const defaultPosts: BlogPost[] = [
  {
    id: "post-1",
    title: "How QR Codes Help Teams Share Faster",
    date: "March 12, 2026",
    excerpt:
      "A quick overview of how teams use QR workflows to move links, assets, and information between devices without friction.",
    content:
      "Teams often need a simple way to move information between screens, people, and devices. QR flows reduce copy-paste friction and make handoffs much faster in meetings, stores, events, and internal operations.",
    imageDataUrl: null,
  },
  {
    id: "post-2",
    title: "Designing Better Mobile Scan Experiences",
    date: "February 28, 2026",
    excerpt:
      "Simple interface decisions can make QR journeys feel instant, trustworthy, and much easier to use on the go.",
    content:
      "Clear labels, short actions, and immediate feedback make QR-based experiences feel reliable. Users respond best when they know exactly what will happen after a scan and what value they will get from it.",
    imageDataUrl: null,
  },
  {
    id: "post-3",
    title: "Security Tips for QR-Based Sharing",
    date: "January 16, 2026",
    excerpt:
      "A mock article covering best practices like trusted destinations, short retention windows, and safer internal sharing.",
    content:
      "Safer QR workflows start with trusted destinations, limited exposure windows, and controlled publishing. Good defaults help users share quickly without opening unnecessary security risk.",
    imageDataUrl: null,
  },
];

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredBlogs(): BlogPost[] {
  if (!canUseStorage()) return defaultPosts;

  const raw = window.localStorage.getItem(BLOG_STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(defaultPosts));
    return defaultPosts;
  }

  try {
    const parsed = JSON.parse(raw) as BlogPost[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultPosts;
  } catch {
    window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(defaultPosts));
    return defaultPosts;
  }
}

export function saveBlogs(posts: BlogPost[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(posts));
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
