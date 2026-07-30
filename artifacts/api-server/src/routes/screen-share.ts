import express, { Router, type IRouter, type Request, type Response } from "express";
import { deviceLabelFor, getDeviceId, getRoomId } from "../lib/room";
import { screenShareStore } from "../lib/screen-share-store";

const router: IRouter = Router();

function getScreenDevice(req: Request, res: Response) {
  let deviceId: string = (req as Request & { cookies?: Record<string, string> }).cookies?.["qs_did"] ?? "";
  if (!/^[a-f0-9]{16}$/.test(deviceId)) {
    deviceId = getDeviceId(req);
    res.cookie("qs_did", deviceId, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });
  }

  return {
    deviceId,
    label: deviceLabelFor(deviceId),
    networkId: getRoomId(req),
  };
}

function serializeStatus(result: ReturnType<typeof screenShareStore.getRoomStatus>) {
  if ("error" in result) {
    return result;
  }

  const success = result as {
    room: {
      code: string;
      hostLabel: string;
      hostDeviceId: string;
      participants: Map<string, unknown>;
      frame: { sequence: number; capturedAt: Date } | null;
      createdAt: Date;
    };
    participant: { role: "host" | "viewer" };
    participants: Array<{
      deviceId: string;
      label: string;
      role: "host" | "viewer";
      isCurrent: boolean;
      lastSeen: Date;
    }>;
  };

  return {
    code: success.room.code,
    role: success.participant.role,
    hostLabel: success.room.hostLabel,
    isHostPresent: success.room.participants.has(success.room.hostDeviceId),
    isSharing: success.room.frame !== null,
    frameSequence: success.room.frame?.sequence ?? 0,
    frameCapturedAt: success.room.frame?.capturedAt.toISOString() ?? null,
    viewerCount: success.participants.filter((participant) => participant.role === "viewer").length,
    participantCount: success.participants.length,
    participants: success.participants.map((participant) => ({
      deviceId: participant.deviceId,
      label: participant.label,
      role: participant.role,
      isCurrent: participant.isCurrent,
      lastSeen: participant.lastSeen.toISOString(),
    })),
    createdAt: success.room.createdAt.toISOString(),
  };
}

function parseJoinRoomBody(body: unknown): { code: string } {
  const candidate = typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
  const code = typeof candidate === "string" ? candidate.trim().toUpperCase() : "";

  if (code.length < 4 || code.length > 12) {
    throw new Error("Enter a valid room code.");
  }

  return { code };
}

function parseFrameHeaders(req: Request): { width: number; height: number; mimeType: string } {
  const width = Number.parseInt(req.header("x-frame-width") ?? "", 10);
  const height = Number.parseInt(req.header("x-frame-height") ?? "", 10);
  const mimeType = (req.header("content-type") ?? "").trim().toLowerCase();

  if (!Number.isInteger(width) || width <= 0 || width > 7680 || !Number.isInteger(height) || height <= 0 || height > 4320) {
    throw new Error("Frame dimensions are invalid.");
  }

  if (!mimeType.startsWith("image/")) {
    throw new Error("A valid image frame is required.");
  }

  return { width, height, mimeType };
}

router.post("/screen-share/rooms", (req, res) => {
  const { deviceId, label, networkId } = getScreenDevice(req, res);
  const room = screenShareStore.createRoom(networkId, deviceId, label);
  const status = screenShareStore.getRoomStatus(room.code, networkId, deviceId);
  res.status(201).json(serializeStatus(status));
});

router.post("/screen-share/rooms/join", (req, res) => {
  const body = parseJoinRoomBody(req.body);
  const { deviceId, label, networkId } = getScreenDevice(req, res);
  const joined = screenShareStore.joinRoom(body.code, networkId, deviceId, label);
  if ("error" in joined) {
    res.status(404).json({ error: joined.error });
    return;
  }

  const status = screenShareStore.getRoomStatus(joined.room.code, networkId, deviceId);
  res.json(serializeStatus(status));
});

router.get("/screen-share/rooms/:code/status", (req, res) => {
  const { deviceId, networkId } = getScreenDevice(req, res);
  const status = screenShareStore.getRoomStatus(req.params["code"]!.trim().toUpperCase(), networkId, deviceId);
  if ("error" in status) {
    res.status(404).json({ error: status.error });
    return;
  }

  res.json(serializeStatus(status));
});

router.get("/screen-share/rooms/:code/frame", (req, res) => {
  const { deviceId, networkId } = getScreenDevice(req, res);
  const result = screenShareStore.getFrame(req.params["code"]!.trim().toUpperCase(), networkId, deviceId);
  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  const success = result as {
    room: { code: string };
    frame:
      | {
          imageBuffer: Buffer;
          mimeType: string;
          width: number;
          height: number;
          sequence: number;
          capturedAt: Date;
        }
      | null;
  };

  res.json({
    code: success.room.code,
    frame: success.frame
      ? {
          imageDataUrl: `data:${success.frame.mimeType};base64,${success.frame.imageBuffer.toString("base64")}`,
          width: success.frame.width,
          height: success.frame.height,
          sequence: success.frame.sequence,
          capturedAt: success.frame.capturedAt.toISOString(),
        }
      : null,
  });
});

router.get("/screen-share/rooms/:code/frame/image", (req, res) => {
  const { deviceId, networkId } = getScreenDevice(req, res);
  const result = screenShareStore.getFrame(req.params["code"]!.trim().toUpperCase(), networkId, deviceId);
  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  if (!result.frame) {
    res.status(204).send();
    return;
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.type(result.frame.mimeType);
  res.send(result.frame.imageBuffer);
});

router.get("/screen-share/rooms/:code/events", (req, res) => {
  const { deviceId, networkId } = getScreenDevice(req, res);
  const code = req.params["code"]!.trim().toUpperCase();
  const result = screenShareStore.subscribe(code, networkId, deviceId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: "ready" })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    result.unsubscribe();
    res.end();
  });
});

router.post("/screen-share/rooms/:code/frame", express.raw({ type: "image/*", limit: "12mb" }), (req, res) => {
  let width = 0;
  let height = 0;
  let mimeType = "";

  try {
    ({ width, height, mimeType } = parseFrameHeaders(req));
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "A valid image frame is required.",
    });
    return;
  }

  const frameBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (frameBuffer.length === 0) {
    res.status(400).json({ error: "A valid image frame is required." });
    return;
  }

  const { deviceId, networkId } = getScreenDevice(req, res);
  const result = screenShareStore.updateFrame(
    req.params["code"]!.trim().toUpperCase(),
    networkId,
    deviceId,
    frameBuffer,
    mimeType,
    width,
    height,
  );
  if ("error" in result) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.status(204).send();
});

router.post("/screen-share/rooms/:code/stop", (req, res) => {
  const { deviceId, networkId } = getScreenDevice(req, res);
  const result = screenShareStore.clearFrame(req.params["code"]!.trim().toUpperCase(), networkId, deviceId);
  if ("error" in result) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.status(204).send();
});

router.post("/screen-share/rooms/:code/leave", (req, res) => {
  const { deviceId } = getScreenDevice(req, res);
  const result = screenShareStore.leaveRoom(req.params["code"]!.trim().toUpperCase(), deviceId);
  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.status(204).send();
});

router.post("/screen-share/rooms/:code/close", (req, res) => {
  const { deviceId } = getScreenDevice(req, res);
  const result = screenShareStore.closeRoom(req.params["code"]!.trim().toUpperCase(), deviceId);
  if ("error" in result) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.status(204).send();
});

export default router;
