import { Router, type IRouter, type Request, type Response } from "express";
import { db, roomsTable, textsTable, filesTable, devicesTable, activityTable } from "@workspace/db";
import { and, desc, eq, gt } from "drizzle-orm";
import {
  GetBoardResponse,
  SaveTextBody,
  SaveTextResponse,
  ListFilesResponse,
  UploadFileBody,
  DownloadFileResponse,
  ListDevicesResponse,
  GetActivityResponse,
  GetStatsResponse,
} from "@workspace/api-zod";
import {
  RETENTION_MINUTES,
  DEVICE_ACTIVE_WINDOW_MS,
  deviceLabelFor,
  expiresAt,
  getDeviceId,
  getRoomId,
  minutesUntil,
  newId,
} from "../lib/room";
import { memoryStore } from "../lib/memory-store";

const router: IRouter = Router();
const useMemoryStore = process.env["USE_IN_MEMORY_STORE"] === "true";

async function ensureRoom(roomId: string): Promise<void> {
  await db.insert(roomsTable).values({ id: roomId }).onConflictDoNothing();
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

router.get("/board", async (req, res) => {
  const roomId = getRoomId(req);
  if (useMemoryStore) {
    memoryStore.ensureRoom(roomId);
    await touchDevice(req, res, roomId);
    const board = memoryStore.getBoard(roomId);
    const data = GetBoardResponse.parse({
      roomId,
      text: board.text
        ? {
            id: board.text.id,
            content: board.text.content,
            createdAt: board.text.createdAt.toISOString(),
            expiresAt: board.text.expiresAt.toISOString(),
            deviceLabel: board.text.deviceLabel,
          }
        : null,
      files: board.files.map((f) => ({
        id: f.id,
        name: f.name,
        sizeBytes: f.sizeBytes,
        mimeType: f.mimeType,
        createdAt: f.createdAt.toISOString(),
        expiresAt: f.expiresAt.toISOString(),
        deviceLabel: f.deviceLabel,
      })),
      deviceCount: board.deviceCount,
      expiresInMinutes: board.expiresInMinutes,
    });
    res.json(data);
    return;
  }
  await ensureRoom(roomId);
  await touchDevice(req, res, roomId);

  const now = new Date();
  const [textRow] = await db
    .select()
    .from(textsTable)
    .where(and(eq(textsTable.roomId, roomId), gt(textsTable.expiresAt, now)))
    .orderBy(desc(textsTable.createdAt))
    .limit(1);

  const fileRows = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.roomId, roomId), gt(filesTable.expiresAt, now)))
    .orderBy(desc(filesTable.createdAt));

  const activeSince = new Date(Date.now() - DEVICE_ACTIVE_WINDOW_MS);
  const deviceRows = await db
    .select()
    .from(devicesTable)
    .where(and(eq(devicesTable.roomId, roomId), gt(devicesTable.lastSeen, activeSince)));

  const data = GetBoardResponse.parse({
    roomId,
    text: textRow
      ? {
          id: textRow.id,
          content: textRow.content,
          createdAt: textRow.createdAt.toISOString(),
          expiresAt: textRow.expiresAt.toISOString(),
          deviceLabel: textRow.deviceLabel,
        }
      : null,
    files: fileRows.map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      createdAt: f.createdAt.toISOString(),
      expiresAt: f.expiresAt.toISOString(),
      deviceLabel: f.deviceLabel,
    })),
    deviceCount: deviceRows.length,
    expiresInMinutes: textRow ? minutesUntil(textRow.expiresAt) : RETENTION_MINUTES,
  });
  res.json(data);
});

router.put("/text", async (req, res) => {
  const body = SaveTextBody.parse(req.body);
  const roomId = getRoomId(req);
  if (useMemoryStore) {
    memoryStore.ensureRoom(roomId);
    const device = await touchDevice(req, res, roomId);
    const id = newId();
    const exp = expiresAt();
    const created = new Date();
    memoryStore.saveText({
      id,
      roomId,
      content: body.content,
      deviceLabel: device.label,
      createdAt: created,
      expiresAt: exp,
    });
    memoryStore.addActivity(roomId, {
      id: newId(),
      roomId,
      kind: "text_saved",
      summary: `${device.label} saved a text snippet (${body.content.length} chars)`,
      deviceLabel: device.label,
      createdAt: new Date(),
    });
    const data = SaveTextResponse.parse({
      id,
      content: body.content,
      createdAt: created.toISOString(),
      expiresAt: exp.toISOString(),
      deviceLabel: device.label,
    });
    res.json(data);
    return;
  }
  await ensureRoom(roomId);
  const device = await touchDevice(req, res, roomId);

  // Replace existing text for the room
  await db.delete(textsTable).where(eq(textsTable.roomId, roomId));
  const id = newId();
  const exp = expiresAt();
  const created = new Date();
  await db.insert(textsTable).values({
    id,
    roomId,
    content: body.content,
    deviceLabel: device.label,
    createdAt: created,
    expiresAt: exp,
  });
  await db.insert(activityTable).values({
    id: newId(),
    roomId,
    kind: "text_saved",
    summary: `${device.label} saved a text snippet (${body.content.length} chars)`,
    deviceLabel: device.label,
    createdAt: new Date(),
  });

  const data = SaveTextResponse.parse({
    id,
    content: body.content,
    createdAt: created.toISOString(),
    expiresAt: exp.toISOString(),
    deviceLabel: device.label,
  });
  res.json(data);
});

router.delete("/text", async (req, res) => {
  const roomId = getRoomId(req);
  if (useMemoryStore) {
    memoryStore.ensureRoom(roomId);
    const device = await touchDevice(req, res, roomId);
    memoryStore.clearText(roomId);
    memoryStore.addActivity(roomId, {
      id: newId(),
      roomId,
      kind: "text_cleared",
      summary: `${device.label} cleared the text snippet`,
      deviceLabel: device.label,
      createdAt: new Date(),
    });
    res.status(204).send();
    return;
  }
  await ensureRoom(roomId);
  const device = await touchDevice(req, res, roomId);
  await db.delete(textsTable).where(eq(textsTable.roomId, roomId));
  await db.insert(activityTable).values({
    id: newId(),
    roomId,
    kind: "text_cleared",
    summary: `${device.label} cleared the text snippet`,
    deviceLabel: device.label,
    createdAt: new Date(),
  });
  res.status(204).send();
});

router.get("/files", async (req, res) => {
  const roomId = getRoomId(req);
  if (useMemoryStore) {
    memoryStore.ensureRoom(roomId);
    await touchDevice(req, res, roomId);
    const rows = memoryStore.listFiles(roomId);
    const data = ListFilesResponse.parse(
      rows.map((f) => ({
        id: f.id,
        name: f.name,
        sizeBytes: f.sizeBytes,
        mimeType: f.mimeType,
        createdAt: f.createdAt.toISOString(),
        expiresAt: f.expiresAt.toISOString(),
        deviceLabel: f.deviceLabel,
      })),
    );
    res.json(data);
    return;
  }
  await ensureRoom(roomId);
  await touchDevice(req, res, roomId);
  const now = new Date();
  const rows = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.roomId, roomId), gt(filesTable.expiresAt, now)))
    .orderBy(desc(filesTable.createdAt));
  const data = ListFilesResponse.parse(
    rows.map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      createdAt: f.createdAt.toISOString(),
      expiresAt: f.expiresAt.toISOString(),
      deviceLabel: f.deviceLabel,
    })),
  );
  res.json(data);
});

router.post("/files", async (req, res) => {
  const body = UploadFileBody.parse(req.body);
  const roomId = getRoomId(req);
  if (useMemoryStore) {
    memoryStore.ensureRoom(roomId);
    const device = await touchDevice(req, res, roomId);
    const id = newId();
    const exp = expiresAt();
    const created = new Date();
    const sizeBytes = Math.floor((body.dataBase64.length * 3) / 4);
    memoryStore.uploadFile({
      id,
      roomId,
      name: body.name,
      mimeType: body.mimeType,
      sizeBytes,
      dataBase64: body.dataBase64,
      deviceLabel: device.label,
      createdAt: created,
      expiresAt: exp,
    });
    memoryStore.addActivity(roomId, {
      id: newId(),
      roomId,
      kind: "file_uploaded",
      summary: `${device.label} uploaded ${body.name} (${fmtBytes(sizeBytes)})`,
      deviceLabel: device.label,
      createdAt: new Date(),
    });
    res.status(201).json({
      id,
      name: body.name,
      sizeBytes,
      mimeType: body.mimeType,
      createdAt: created.toISOString(),
      expiresAt: exp.toISOString(),
      deviceLabel: device.label,
    });
    return;
  }
  await ensureRoom(roomId);
  const device = await touchDevice(req, res, roomId);
  const id = newId();
  const exp = expiresAt();
  const created = new Date();
  const sizeBytes = Math.floor((body.dataBase64.length * 3) / 4);
  await db.insert(filesTable).values({
    id,
    roomId,
    name: body.name,
    mimeType: body.mimeType,
    sizeBytes,
    dataBase64: body.dataBase64,
    deviceLabel: device.label,
    createdAt: created,
    expiresAt: exp,
  });
  await db.insert(activityTable).values({
    id: newId(),
    roomId,
    kind: "file_uploaded",
    summary: `${device.label} uploaded ${body.name} (${fmtBytes(sizeBytes)})`,
    deviceLabel: device.label,
    createdAt: new Date(),
  });
  res.status(201).json({
    id,
    name: body.name,
    sizeBytes,
    mimeType: body.mimeType,
    createdAt: created.toISOString(),
    expiresAt: exp.toISOString(),
    deviceLabel: device.label,
  });
});

router.delete("/files/:fileId", async (req, res) => {
  const roomId = getRoomId(req);
  const fileId = req.params["fileId"]!;
  if (useMemoryStore) {
    memoryStore.ensureRoom(roomId);
    const device = await touchDevice(req, res, roomId);
    const existing = memoryStore.deleteFile(roomId, fileId);
    if (!existing) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    memoryStore.addActivity(roomId, {
      id: newId(),
      roomId,
      kind: "file_deleted",
      summary: `${device.label} removed ${existing.name}`,
      deviceLabel: device.label,
      createdAt: new Date(),
    });
    res.status(204).send();
    return;
  }
  await ensureRoom(roomId);
  const device = await touchDevice(req, res, roomId);
  const [existing] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, fileId), eq(filesTable.roomId, roomId)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  await db.delete(filesTable).where(eq(filesTable.id, fileId));
  await db.insert(activityTable).values({
    id: newId(),
    roomId,
    kind: "file_deleted",
    summary: `${device.label} removed ${existing.name}`,
    deviceLabel: device.label,
    createdAt: new Date(),
  });
  res.status(204).send();
});

router.get("/files/:fileId/download", async (req, res) => {
  const roomId = getRoomId(req);
  const fileId = req.params["fileId"]!;
  if (useMemoryStore) {
    const row = memoryStore.getFile(roomId, fileId);
    if (!row) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const data = DownloadFileResponse.parse({
      name: row.name,
      mimeType: row.mimeType,
      dataBase64: row.dataBase64,
    });
    res.json(data);
    return;
  }
  const [row] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, fileId), eq(filesTable.roomId, roomId)))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const data = DownloadFileResponse.parse({
    name: row.name,
    mimeType: row.mimeType,
    dataBase64: row.dataBase64,
  });
  res.json(data);
});

router.get("/devices", async (req, res) => {
  const roomId = getRoomId(req);
  if (useMemoryStore) {
    memoryStore.ensureRoom(roomId);
    const me = await touchDevice(req, res, roomId);
    const rows = memoryStore.listDevices(roomId);
    const data = ListDevicesResponse.parse(
      rows.map((d) => ({
        id: d.id,
        label: d.label,
        userAgent: d.userAgent,
        lastSeen: d.lastSeen.toISOString(),
        isCurrent: d.id === me.id,
      })),
    );
    res.json(data);
    return;
  }
  await ensureRoom(roomId);
  const me = await touchDevice(req, res, roomId);
  const activeSince = new Date(Date.now() - DEVICE_ACTIVE_WINDOW_MS);
  const rows = await db
    .select()
    .from(devicesTable)
    .where(and(eq(devicesTable.roomId, roomId), gt(devicesTable.lastSeen, activeSince)))
    .orderBy(desc(devicesTable.lastSeen));
  const data = ListDevicesResponse.parse(
    rows.map((d) => ({
      id: d.id,
      label: d.label,
      userAgent: d.userAgent,
      lastSeen: d.lastSeen.toISOString(),
      isCurrent: d.id === me.id,
    })),
  );
  res.json(data);
});

router.get("/activity", async (req, res) => {
  const roomId = getRoomId(req);
  if (useMemoryStore) {
    memoryStore.ensureRoom(roomId);
    await touchDevice(req, res, roomId);
    const rows = memoryStore.listActivity(roomId);
    const data = GetActivityResponse.parse(
      rows.map((a) => ({
        id: a.id,
        kind: a.kind,
        summary: a.summary,
        deviceLabel: a.deviceLabel,
        createdAt: a.createdAt.toISOString(),
      })),
    );
    res.json(data);
    return;
  }
  await ensureRoom(roomId);
  await touchDevice(req, res, roomId);
  const rows = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.roomId, roomId))
    .orderBy(desc(activityTable.createdAt))
    .limit(20);
  const data = GetActivityResponse.parse(
    rows.map((a) => ({
      id: a.id,
      kind: a.kind,
      summary: a.summary,
      deviceLabel: a.deviceLabel,
      createdAt: a.createdAt.toISOString(),
    })),
  );
  res.json(data);
});

router.get("/stats", async (req, res) => {
  const roomId = getRoomId(req);
  if (useMemoryStore) {
    memoryStore.ensureRoom(roomId);
    await touchDevice(req, res, roomId);
    const data = GetStatsResponse.parse(memoryStore.getStats(roomId));
    res.json(data);
    return;
  }
  await ensureRoom(roomId);
  await touchDevice(req, res, roomId);
  const now = new Date();
  const fileRows = await db
    .select({ sizeBytes: filesTable.sizeBytes })
    .from(filesTable)
    .where(and(eq(filesTable.roomId, roomId), gt(filesTable.expiresAt, now)));
  const [textRow] = await db
    .select({ content: textsTable.content })
    .from(textsTable)
    .where(and(eq(textsTable.roomId, roomId), gt(textsTable.expiresAt, now)))
    .orderBy(desc(textsTable.createdAt))
    .limit(1);
  const activeSince = new Date(Date.now() - DEVICE_ACTIVE_WINDOW_MS);
  const deviceRows = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(and(eq(devicesTable.roomId, roomId), gt(devicesTable.lastSeen, activeSince)));

  const data = GetStatsResponse.parse({
    totalFiles: fileRows.length,
    totalBytes: fileRows.reduce((sum, f) => sum + f.sizeBytes, 0),
    activeDevices: deviceRows.length,
    textCharacters: textRow?.content.length ?? 0,
    retentionMinutes: RETENTION_MINUTES,
  });
  res.json(data);
});

async function touchDevice(req: Request, res: Response, roomId: string): Promise<{ id: string; label: string }> {
  let deviceId: string = (req as Request & { cookies?: Record<string, string> }).cookies?.["qs_did"] ?? "";
  if (!/^[a-f0-9]{16}$/.test(deviceId)) {
    deviceId = getDeviceId(req);
    res.cookie("qs_did", deviceId, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });
  }
  const label = deviceLabelFor(deviceId);
  const userAgent = req.headers["user-agent"] ?? "Unknown device";

  if (useMemoryStore) {
    const { inserted } = memoryStore.touchDevice(roomId, {
      id: deviceId,
      roomId,
      label,
      userAgent,
      lastSeen: new Date(),
    });
    if (inserted) {
      memoryStore.addActivity(roomId, {
        id: newId(),
        roomId,
        kind: "device_joined",
        summary: `${label} joined the room`,
        deviceLabel: label,
        createdAt: new Date(),
      });
    }
    return { id: deviceId, label };
  }

  const inserted = await db
    .insert(devicesTable)
    .values({
      id: deviceId,
      roomId,
      label,
      userAgent,
      lastSeen: new Date(),
    })
    .onConflictDoNothing({ target: devicesTable.id })
    .returning({ id: devicesTable.id });

  if (inserted.length > 0) {
    await db.insert(activityTable).values({
      id: newId(),
      roomId,
      kind: "device_joined",
      summary: `${label} joined the room`,
      deviceLabel: label,
      createdAt: new Date(),
    });
  } else {
    await db
      .update(devicesTable)
      .set({ lastSeen: new Date(), roomId, userAgent })
      .where(eq(devicesTable.id, deviceId));
  }
  return { id: deviceId, label };
}

export default router;
