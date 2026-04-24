import type { Request } from "express";
import crypto from "node:crypto";

export const RETENTION_MINUTES = 30;
export const DEVICE_ACTIVE_WINDOW_MS = 60_000;

export function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0]!.trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return fwd[0]!.split(",")[0]!.trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function getRoomId(req: Request): string {
  const ip = getClientIp(req);
  return crypto.createHash("sha256").update(`room:${ip}`).digest("hex").slice(0, 16);
}

export function getDeviceId(req: Request): string {
  const cookieDid = (req as Request & { cookies?: Record<string, string> }).cookies?.["qs_did"];
  if (cookieDid && /^[a-z0-9]{16}$/.test(cookieDid)) return cookieDid;
  return crypto.randomBytes(8).toString("hex");
}

const ADJECTIVES = [
  "Swift", "Cozy", "Bright", "Quiet", "Brisk", "Sunny", "Gentle", "Quick",
  "Lively", "Sharp", "Calm", "Bold", "Crisp", "Mellow", "Vivid", "Plucky",
];
const NOUNS = [
  "Otter", "Falcon", "Cedar", "Fern", "Comet", "Pebble", "Lantern", "Maple",
  "Heron", "Quartz", "Willow", "Sparrow", "Linden", "Harbor", "Meadow", "Drift",
];

export function deviceLabelFor(deviceId: string): string {
  const seedA = parseInt(deviceId.slice(0, 6), 16) || 0;
  const seedB = parseInt(deviceId.slice(6, 12), 16) || 0;
  const seedC = parseInt(deviceId.slice(12, 16), 16) || 0;
  const adj = ADJECTIVES[seedA % ADJECTIVES.length] ?? "Swift";
  const noun = NOUNS[seedB % NOUNS.length] ?? "Otter";
  const num = (seedC % 90) + 10;
  return `${adj} ${noun} ${num}`;
}

export function newId(): string {
  return crypto.randomBytes(8).toString("hex");
}

export function expiresAt(): Date {
  return new Date(Date.now() + RETENTION_MINUTES * 60_000);
}

export function minutesUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 60_000));
}
