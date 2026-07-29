import crypto from "node:crypto";

const ROOM_TTL_MS = 1000 * 60 * 60 * 2;
const FRAME_TTL_MS = 1000 * 20;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type ScreenShareParticipant = {
  deviceId: string;
  label: string;
  role: "host" | "viewer";
  lastSeen: Date;
};

type ScreenFrame = {
  imageDataUrl: string;
  width: number;
  height: number;
  capturedAt: Date;
  sequence: number;
};

type ScreenShareRoom = {
  code: string;
  networkId: string;
  hostDeviceId: string;
  hostLabel: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  participants: Map<string, ScreenShareParticipant>;
  frame: ScreenFrame | null;
};

function now(): Date {
  return new Date();
}

function createCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
    }
    if (!existing.has(code)) {
      return code;
    }
  }

  return crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

function isExpired(room: ScreenShareRoom, current: Date): boolean {
  return current.getTime() - room.updatedAt.getTime() > ROOM_TTL_MS;
}

export class ScreenShareStore {
  private rooms = new Map<string, ScreenShareRoom>();

  private cleanup(): void {
    const current = now();
    for (const [code, room] of this.rooms.entries()) {
      if (room.closedAt || isExpired(room, current)) {
        this.rooms.delete(code);
        continue;
      }

      if (room.frame && current.getTime() - room.frame.capturedAt.getTime() > FRAME_TTL_MS) {
        room.frame = null;
      }
    }
  }

  private getOpenRoom(code: string): ScreenShareRoom | null {
    this.cleanup();
    const room = this.rooms.get(code) ?? null;
    if (!room || room.closedAt) {
      return null;
    }
    return room;
  }

  createRoom(networkId: string, hostDeviceId: string, hostLabel: string) {
    this.cleanup();
    const code = createCode(new Set(this.rooms.keys()));
    const createdAt = now();
    const room: ScreenShareRoom = {
      code,
      networkId,
      hostDeviceId,
      hostLabel,
      createdAt,
      updatedAt: createdAt,
      closedAt: null,
      participants: new Map([
        [
          hostDeviceId,
          {
            deviceId: hostDeviceId,
            label: hostLabel,
            role: "host",
            lastSeen: createdAt,
          },
        ],
      ]),
      frame: null,
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, networkId: string, deviceId: string, label: string) {
    const room = this.getOpenRoom(code);
    if (!room) {
      return { error: "Room not found" as const };
    }
    if (room.networkId !== networkId) {
      return { error: "Room is only available on the creator's network" as const };
    }

    const role = room.hostDeviceId === deviceId ? "host" : "viewer";
    const participant: ScreenShareParticipant = {
      deviceId,
      label,
      role,
      lastSeen: now(),
    };
    room.participants.set(deviceId, participant);
    room.updatedAt = now();
    return { room, participant };
  }

  leaveRoom(code: string, deviceId: string) {
    const room = this.getOpenRoom(code);
    if (!room) {
      return { error: "Room not found" as const };
    }
    const participant = room.participants.get(deviceId);
    if (!participant) {
      return { error: "You are not part of this room" as const };
    }

    room.participants.delete(deviceId);
    if (deviceId === room.hostDeviceId) {
      room.frame = null;
    }
    room.updatedAt = now();
    return { room };
  }

  closeRoom(code: string, deviceId: string) {
    const room = this.getOpenRoom(code);
    if (!room) {
      return { error: "Room not found" as const };
    }
    if (room.hostDeviceId !== deviceId) {
      return { error: "Only the room creator can close it" as const };
    }

    room.closedAt = now();
    room.updatedAt = now();
    this.rooms.delete(code);
    return { room };
  }

  touchRoom(code: string, networkId: string, deviceId: string) {
    const room = this.getOpenRoom(code);
    if (!room) {
      return { error: "Room not found" as const };
    }
    if (room.networkId !== networkId) {
      return { error: "Room is only available on the creator's network" as const };
    }
    const participant = room.participants.get(deviceId);
    if (!participant) {
      return { error: "Join the room first" as const };
    }
    participant.lastSeen = now();
    room.updatedAt = now();
    return { room, participant };
  }

  updateFrame(code: string, networkId: string, deviceId: string, imageDataUrl: string, width: number, height: number) {
    const touched = this.touchRoom(code, networkId, deviceId);
    if ("error" in touched) {
      return touched;
    }
    if (touched.room.hostDeviceId !== deviceId) {
      return { error: "Only the room creator can share a screen" as const };
    }

    const nextSequence = (touched.room.frame?.sequence ?? 0) + 1;
    touched.room.frame = {
      imageDataUrl,
      width,
      height,
      capturedAt: now(),
      sequence: nextSequence,
    };
    touched.room.updatedAt = now();
    return { room: touched.room, frame: touched.room.frame };
  }

  clearFrame(code: string, networkId: string, deviceId: string) {
    const touched = this.touchRoom(code, networkId, deviceId);
    if ("error" in touched) {
      return touched;
    }
    if (touched.room.hostDeviceId !== deviceId) {
      return { error: "Only the room creator can stop sharing" as const };
    }

    touched.room.frame = null;
    touched.room.updatedAt = now();
    return { room: touched.room };
  }

  getRoomStatus(code: string, networkId: string, deviceId: string) {
    const touched = this.touchRoom(code, networkId, deviceId);
    if ("error" in touched) {
      return touched;
    }

    const room = touched.room;
    const participants = [...room.participants.values()]
      .sort((left, right) => right.lastSeen.getTime() - left.lastSeen.getTime())
      .map((participant) => ({
        deviceId: participant.deviceId,
        label: participant.label,
        role: participant.role,
        lastSeen: participant.lastSeen,
        isCurrent: participant.deviceId === deviceId,
      }));

    return {
      room,
      participant: touched.participant,
      participants,
    };
  }

  getFrame(code: string, networkId: string, deviceId: string) {
    const touched = this.touchRoom(code, networkId, deviceId);
    if ("error" in touched) {
      return touched;
    }

    return {
      room: touched.room,
      participant: touched.participant,
      frame: touched.room.frame,
    };
  }
}

export const screenShareStore = new ScreenShareStore();
