import crypto from "node:crypto";

const ROOM_TTL_MS = 1000 * 60 * 60 * 2;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_MESSAGES_PER_ROOM = 200;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export type ChatParticipant = {
  deviceId: string;
  label: string;
  role: "host" | "member";
  lastSeen: Date;
};

export type ChatAttachmentMeta = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
};

export type ChatAttachmentInput = {
  name: string;
  mimeType: string;
  data: Buffer;
};

type StoredAttachment = {
  name: string;
  mimeType: string;
  data: Buffer;
};

export type ChatMessage = {
  id: string;
  deviceId: string;
  label: string;
  text: string;
  attachment: ChatAttachmentMeta | null;
  sentAt: Date;
};

export type ChatEvent =
  | {
      type: "message";
      message: ChatMessage;
    }
  | {
      type: "closed";
    };

type ChatRoom = {
  code: string;
  networkId: string;
  hostDeviceId: string;
  hostLabel: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  participants: Map<string, ChatParticipant>;
  messages: ChatMessage[];
  attachments: Map<string, StoredAttachment>;
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

function isExpired(room: ChatRoom, current: Date): boolean {
  return current.getTime() - room.updatedAt.getTime() > ROOM_TTL_MS;
}

export class ChatStore {
  private rooms = new Map<string, ChatRoom>();
  private listeners = new Map<string, Set<(event: ChatEvent) => void>>();

  private emit(code: string, event: ChatEvent): void {
    const listeners = this.listeners.get(code);
    if (!listeners || listeners.size === 0) {
      return;
    }

    for (const listener of listeners) {
      listener(event);
    }
  }

  private clearListeners(code: string): void {
    this.listeners.delete(code);
  }

  private cleanup(): void {
    const current = now();
    for (const [code, room] of this.rooms.entries()) {
      if (room.closedAt || isExpired(room, current)) {
        this.rooms.delete(code);
        this.clearListeners(code);
      }
    }
  }

  private getOpenRoom(code: string): ChatRoom | null {
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
    const room: ChatRoom = {
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
      messages: [],
      attachments: new Map(),
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

    const role = room.hostDeviceId === deviceId ? "host" : "member";
    const participant: ChatParticipant = {
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
    this.emit(code, { type: "closed" });
    this.clearListeners(code);
    return { room };
  }

  touchRoom(
    code: string,
    networkId: string,
    deviceId: string,
  ): { error: string } | { room: ChatRoom; participant: ChatParticipant } {
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

  sendMessage(
    code: string,
    networkId: string,
    deviceId: string,
    text: string,
    attachmentInput?: ChatAttachmentInput,
  ) {
    const touched = this.touchRoom(code, networkId, deviceId);
    if ("error" in touched) {
      return touched;
    }

    const messageId = crypto.randomBytes(8).toString("hex");

    let attachment: ChatAttachmentMeta | null = null;
    if (attachmentInput) {
      const attachmentId = crypto.randomBytes(8).toString("hex");
      touched.room.attachments.set(attachmentId, {
        name: attachmentInput.name,
        mimeType: attachmentInput.mimeType,
        data: attachmentInput.data,
      });
      attachment = {
        id: attachmentId,
        name: attachmentInput.name,
        mimeType: attachmentInput.mimeType,
        sizeBytes: attachmentInput.data.length,
      };
    }

    const message: ChatMessage = {
      id: messageId,
      deviceId,
      label: touched.participant.label,
      text,
      attachment,
      sentAt: now(),
    };

    touched.room.messages.push(message);
    if (touched.room.messages.length > MAX_MESSAGES_PER_ROOM) {
      const removed = touched.room.messages.splice(0, touched.room.messages.length - MAX_MESSAGES_PER_ROOM);
      for (const dropped of removed) {
        if (dropped.attachment) {
          touched.room.attachments.delete(dropped.attachment.id);
        }
      }
    }
    touched.room.updatedAt = now();
    this.emit(code, { type: "message", message });
    return { room: touched.room, message };
  }

  getAttachment(code: string, networkId: string, deviceId: string, attachmentId: string) {
    const touched = this.touchRoom(code, networkId, deviceId);
    if ("error" in touched) {
      return touched;
    }

    const attachment = touched.room.attachments.get(attachmentId);
    if (!attachment) {
      return { error: "Attachment not found" as const };
    }

    return { room: touched.room, attachment };
  }

  getMessages(code: string, networkId: string, deviceId: string) {
    const touched = this.touchRoom(code, networkId, deviceId);
    if ("error" in touched) {
      return touched;
    }

    return { room: touched.room, participant: touched.participant, messages: touched.room.messages };
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

  subscribe(code: string, networkId: string, deviceId: string, listener: (event: ChatEvent) => void) {
    const touched = this.touchRoom(code, networkId, deviceId);
    if ("error" in touched) {
      return touched;
    }

    let listeners = this.listeners.get(code);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(code, listeners);
    }

    listeners.add(listener);

    return {
      room: touched.room,
      participant: touched.participant,
      unsubscribe: () => {
        const currentListeners = this.listeners.get(code);
        if (!currentListeners) {
          return;
        }

        currentListeners.delete(listener);
        if (currentListeners.size === 0) {
          this.listeners.delete(code);
        }
      },
    };
  }
}

export const chatStore = new ChatStore();
