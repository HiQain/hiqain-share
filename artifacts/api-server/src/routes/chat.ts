import { Router, type IRouter } from "express";
import { getRequestDevice } from "../lib/room";
import { chatStore, MAX_MESSAGE_LENGTH } from "../lib/chat-store";

const router: IRouter = Router();

function serializeStatus(result: ReturnType<typeof chatStore.getRoomStatus>) {
  if ("error" in result) {
    return result;
  }

  const success = result as {
    room: {
      code: string;
      hostLabel: string;
      hostDeviceId: string;
      participants: Map<string, unknown>;
      createdAt: Date;
    };
    participant: { role: "host" | "member" };
    participants: Array<{
      deviceId: string;
      label: string;
      role: "host" | "member";
      isCurrent: boolean;
      lastSeen: Date;
    }>;
  };

  return {
    code: success.room.code,
    role: success.participant.role,
    hostLabel: success.room.hostLabel,
    isHostPresent: success.room.participants.has(success.room.hostDeviceId),
    memberCount: success.participants.filter((participant) => participant.role === "member").length,
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

function serializeMessage(message: { id: string; deviceId: string; label: string; text: string; sentAt: Date }) {
  return {
    id: message.id,
    deviceId: message.deviceId,
    label: message.label,
    text: message.text,
    sentAt: message.sentAt.toISOString(),
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

function parseMessageBody(body: unknown): { text: string } {
  const candidate = typeof body === "object" && body !== null ? (body as { text?: unknown }).text : undefined;
  const text = typeof candidate === "string" ? candidate.trim() : "";

  if (!text) {
    throw new Error("Message can't be empty.");
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new Error("Message is too long.");
  }

  return { text };
}

router.post("/chat/rooms", (req, res) => {
  const { deviceId, label, networkId } = getRequestDevice(req, res);
  const room = chatStore.createRoom(networkId, deviceId, label);
  const status = chatStore.getRoomStatus(room.code, networkId, deviceId);
  res.status(201).json(serializeStatus(status));
});

router.post("/chat/rooms/join", (req, res) => {
  let body: { code: string };
  try {
    body = parseJoinRoomBody(req.body);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Enter a valid room code." });
    return;
  }

  const { deviceId, label, networkId } = getRequestDevice(req, res);
  const joined = chatStore.joinRoom(body.code, networkId, deviceId, label);
  if ("error" in joined) {
    res.status(404).json({ error: joined.error });
    return;
  }

  const status = chatStore.getRoomStatus(joined.room.code, networkId, deviceId);
  res.json(serializeStatus(status));
});

router.get("/chat/rooms/:code/status", (req, res) => {
  const { deviceId, networkId } = getRequestDevice(req, res);
  const status = chatStore.getRoomStatus(req.params["code"]!.trim().toUpperCase(), networkId, deviceId);
  if ("error" in status) {
    res.status(404).json({ error: status.error });
    return;
  }

  res.json(serializeStatus(status));
});

router.get("/chat/rooms/:code/messages", (req, res) => {
  const { deviceId, networkId } = getRequestDevice(req, res);
  const result = chatStore.getMessages(req.params["code"]!.trim().toUpperCase(), networkId, deviceId);
  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.json({ code: result.room.code, messages: result.messages.map(serializeMessage) });
});

router.post("/chat/rooms/:code/messages", (req, res) => {
  let body: { text: string };
  try {
    body = parseMessageBody(req.body);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Message can't be empty." });
    return;
  }

  const { deviceId, networkId } = getRequestDevice(req, res);
  const result = chatStore.sendMessage(req.params["code"]!.trim().toUpperCase(), networkId, deviceId, body.text);
  if ("error" in result) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.status(201).json(serializeMessage(result.message));
});

router.get("/chat/rooms/:code/events", (req, res) => {
  const { deviceId, networkId } = getRequestDevice(req, res);
  const code = req.params["code"]!.trim().toUpperCase();
  const result = chatStore.subscribe(code, networkId, deviceId, (event) => {
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

router.post("/chat/rooms/:code/leave", (req, res) => {
  const { deviceId } = getRequestDevice(req, res);
  const result = chatStore.leaveRoom(req.params["code"]!.trim().toUpperCase(), deviceId);
  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.status(204).send();
});

router.post("/chat/rooms/:code/close", (req, res) => {
  const { deviceId } = getRequestDevice(req, res);
  const result = chatStore.closeRoom(req.params["code"]!.trim().toUpperCase(), deviceId);
  if ("error" in result) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.status(204).send();
});

export default router;
