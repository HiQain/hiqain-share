import { DEVICE_ACTIVE_WINDOW_MS, RETENTION_MINUTES, minutesUntil } from "./room";

type TextRecord = {
  id: string;
  roomId: string;
  content: string;
  deviceLabel: string;
  createdAt: Date;
  expiresAt: Date;
};

type FileRecord = {
  id: string;
  roomId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
  deviceLabel: string;
  createdAt: Date;
  expiresAt: Date;
};

type DeviceRecord = {
  id: string;
  roomId: string;
  label: string;
  userAgent: string;
  lastSeen: Date;
};

type ActivityRecord = {
  id: string;
  roomId: string;
  kind: string;
  summary: string;
  deviceLabel: string;
  createdAt: Date;
};

type RoomState = {
  text: TextRecord | null;
  files: FileRecord[];
  devices: Map<string, DeviceRecord>;
  activity: ActivityRecord[];
};

function activeSince(): Date {
  return new Date(Date.now() - DEVICE_ACTIVE_WINDOW_MS);
}

function byNewest<T extends { createdAt: Date }>(a: T, b: T): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export class MemoryStore {
  private rooms = new Map<string, RoomState>();

  private getRoom(roomId: string): RoomState {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        text: null,
        files: [],
        devices: new Map(),
        activity: [],
      };
      this.rooms.set(roomId, room);
    }
    this.cleanupRoom(room);
    return room;
  }

  private cleanupRoom(room: RoomState): void {
    const now = Date.now();
    if (room.text && room.text.expiresAt.getTime() <= now) {
      room.text = null;
    }
    room.files = room.files.filter((file) => file.expiresAt.getTime() > now);
  }

  ensureRoom(roomId: string): void {
    this.getRoom(roomId);
  }

  touchDevice(roomId: string, device: DeviceRecord): { inserted: boolean } {
    const room = this.getRoom(roomId);
    const existing = room.devices.get(device.id);
    room.devices.set(device.id, {
      ...device,
      lastSeen: new Date(),
    });
    return { inserted: !existing };
  }

  addActivity(roomId: string, activity: ActivityRecord): void {
    const room = this.getRoom(roomId);
    room.activity.unshift(activity);
    room.activity = room.activity.sort(byNewest).slice(0, 50);
  }

  getBoard(roomId: string) {
    const room = this.getRoom(roomId);
    const currentText = room.text;
    const files = [...room.files].sort(byNewest);
    const activeDevices = [...room.devices.values()].filter(
      (device) => device.lastSeen.getTime() > activeSince().getTime(),
    );
    return {
      roomId,
      text: currentText,
      files,
      deviceCount: activeDevices.length,
      expiresInMinutes: currentText ? minutesUntil(currentText.expiresAt) : RETENTION_MINUTES,
    };
  }

  saveText(record: TextRecord): void {
    const room = this.getRoom(record.roomId);
    room.text = record;
  }

  clearText(roomId: string): void {
    const room = this.getRoom(roomId);
    room.text = null;
  }

  listFiles(roomId: string): FileRecord[] {
    return [...this.getRoom(roomId).files].sort(byNewest);
  }

  uploadFile(record: FileRecord): void {
    const room = this.getRoom(record.roomId);
    room.files.unshift(record);
    room.files = room.files.sort(byNewest);
  }

  deleteFile(roomId: string, fileId: string): FileRecord | null {
    const room = this.getRoom(roomId);
    const existing = room.files.find((file) => file.id === fileId) ?? null;
    if (!existing) return null;
    room.files = room.files.filter((file) => file.id !== fileId);
    return existing;
  }

  getFile(roomId: string, fileId: string): FileRecord | null {
    return this.getRoom(roomId).files.find((file) => file.id === fileId) ?? null;
  }

  listDevices(roomId: string): DeviceRecord[] {
    return [...this.getRoom(roomId).devices.values()]
      .filter((device) => device.lastSeen.getTime() > activeSince().getTime())
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  listActivity(roomId: string): ActivityRecord[] {
    return [...this.getRoom(roomId).activity].sort(byNewest).slice(0, 20);
  }

  getStats(roomId: string) {
    const room = this.getRoom(roomId);
    const files = room.files;
    const text = room.text;
    const devices = this.listDevices(roomId);
    return {
      totalFiles: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
      activeDevices: devices.length,
      textCharacters: text?.content.length ?? 0,
      retentionMinutes: RETENTION_MINUTES,
    };
  }
}

export const memoryStore = new MemoryStore();
