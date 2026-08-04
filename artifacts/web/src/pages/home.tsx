import {
  useGetBoard,
  useSaveText,
  useClearText,
  useDeleteFile,
  useDownloadFile,
  getGetBoardQueryKey,
  getDownloadFileQueryKey,
  getListFilesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileAudio,
  FileIcon,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  Maximize,
  MessageCircle,
  Monitor,
  Save,
  Send,
  Trash2,
  Type,
  UploadCloud,
  Users,
  Wifi,
  X,
} from "lucide-react";

const POLL_INTERVAL = 3000;
const SCREEN_STATUS_POLL_MS = 5000;
const CHAT_STATUS_POLL_MS = 6000;
const MAX_CHAT_MESSAGE_LENGTH = 2000;
const SCREEN_CAPTURE_INTERVAL_MS = 450;
const MAX_UPLOAD_SIZE_BYTES = 1024 * 1024 * 1024;
const MAX_UPLOAD_SIZE_LABEL = "1GB";
const READ_PROGRESS_SHARE = 0.15;
const MAX_CAPTURE_WIDTH = 960;
const JPEG_QUALITY = 0.5;
const APP_BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

type BoardFileItem = {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  deviceLabel: string;
};

type UploadQueueItem = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  progress: number;
  status: "reading" | "uploading" | "finishing";
  previewUrl: string | null;
};

type ScreenParticipant = {
  deviceId: string;
  label: string;
  role: "host" | "viewer";
  isCurrent: boolean;
  lastSeen: string;
};

type ScreenRoomStatus = {
  code: string;
  role: "host" | "viewer";
  hostLabel: string;
  isHostPresent: boolean;
  isSharing: boolean;
  frameSequence: number;
  frameCapturedAt: string | null;
  viewerCount: number;
  participantCount: number;
  participants: ScreenParticipant[];
  createdAt: string;
};

type ScreenFrame = {
  imageUrl: string;
  width: number;
  height: number;
  sequence: number;
  capturedAt: string;
  localObjectUrl: boolean;
};

type ScreenFrameResponse = {
  code: string;
  frame:
  | {
    imageDataUrl: string;
    width: number;
    height: number;
    sequence: number;
    capturedAt: string;
  }
  | null;
};

type ScreenShareEvent =
  | {
    type: "frame";
    sequence: number;
    capturedAt: string;
    width: number;
    height: number;
  }
  | {
    type: "stopped";
  }
  | {
    type: "closed";
  }
  | {
    type: "ready";
  };

type ChatParticipant = {
  deviceId: string;
  label: string;
  role: "host" | "member";
  isCurrent: boolean;
  lastSeen: string;
};

type ChatRoomStatus = {
  code: string;
  role: "host" | "member";
  hostLabel: string;
  isHostPresent: boolean;
  memberCount: number;
  participantCount: number;
  participants: ChatParticipant[];
  createdAt: string;
};

type ChatMessage = {
  id: string;
  deviceId: string;
  label: string;
  text: string;
  sentAt: string;
};

type ChatMessagesResponse = {
  code: string;
  messages: ChatMessage[];
};

type ChatEvent =
  | {
    type: "message";
    message: ChatMessage;
  }
  | {
    type: "closed";
  }
  | {
    type: "ready";
  };

const isImageMime = (mime: string) => mime.toLowerCase().startsWith("image/");
const isVideoMime = (mime: string) => mime.toLowerCase().startsWith("video/");
const isAudioMime = (mime: string) => mime.toLowerCase().startsWith("audio/");
const isPdfMime = (mime: string) => mime.toLowerCase() === "application/pdf";

function base64ToBlob(dataBase64: string, mimeType: string): Blob {
  const byteCharacters = atob(dataBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(sizeBytes / 1024).toFixed(1)} KB`;
}

function getFileFormatLabel(fileName: string, mimeType: string) {
  const extension = fileName.split(".").pop()?.trim();

  if (extension && extension !== fileName) {
    return extension.toUpperCase();
  }

  const mimePart = mimeType.split("/")[1]?.split(/[+;]/)[0]?.trim();
  return mimePart ? mimePart.toUpperCase() : "FILE";
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[.,;:!?)\]]+$/, "") : null;
}

function getDisplayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function createPreviewUrl(file: File) {
  if (isImageMime(file.type) || isVideoMime(file.type) || isAudioMime(file.type) || isPdfMime(file.type)) {
    return URL.createObjectURL(file);
  }
  return null;
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function openFilePreviewInNewTab(file: BoardFileItem) {
  const previewUrl = `${APP_BASE_PATH}/files/${file.id}`;
  const anchor = document.createElement("a");
  anchor.href = previewUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

async function uploadFileWithProgress(
  file: File,
  onProgress: (progress: number, status: UploadQueueItem["status"]) => void,
): Promise<void> {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }
      onProgress((event.loaded / event.total) * READ_PROGRESS_SHARE, "reading");
    };

    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onabort = () => reject(new Error(`Reading ${file.name} was cancelled.`));
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") {
        reject(new Error(`Could not read ${file.name}.`));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };

    reader.readAsDataURL(file);
  });

  onProgress(READ_PROGRESS_SHARE, "uploading");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }
      const uploadRatio = event.loaded / event.total;
      const progress = READ_PROGRESS_SHARE + uploadRatio * (1 - READ_PROGRESS_SHARE);
      onProgress(Math.min(progress, 0.99), uploadRatio >= 0.98 ? "finishing" : "uploading");
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1, "finishing");
        resolve();
        return;
      }
      reject(new Error(`Could not upload ${file.name}.`));
    };

    xhr.onerror = () => reject(new Error(`Could not upload ${file.name}.`));
    xhr.onabort = () => reject(new Error(`Uploading ${file.name} was cancelled.`));

    xhr.send(
      JSON.stringify({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64: base64Data,
      }),
    );
  });
}

async function apiRequest<T>(input: string, init?: RequestInit, expectJson = true): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();
  const data = text ? (JSON.parse(text) as { error?: string }) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed with status ${response.status}.`);
  }

  return (expectJson ? (data as T) : (undefined as T));
}

function copyTextToClipboard(value: string) {
  return navigator.clipboard.writeText(value);
}

function createRemoteFrameUrl(code: string, sequence: number, capturedAt: string) {
  const params = new URLSearchParams({
    sequence: String(sequence),
    capturedAt,
  });
  return `/api/screen-share/rooms/${code}/frame/image?${params.toString()}`;
}

function DownloadButton({ fileId }: { fileId: string }) {
  const { refetch, isFetching } = useDownloadFile(fileId, {
    query: { queryKey: getDownloadFileQueryKey(fileId), enabled: false },
  });

  const onDownload = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const { data } = await refetch();
    if (data?.dataBase64) {
      triggerBrowserDownload(base64ToBlob(data.dataBase64, data.mimeType), data.name);
    }
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      className="h-10 w-10 shrink-0"
      onClick={onDownload}
      disabled={isFetching}
      aria-label="Download file"
      title="Download file"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}

function UploadCircle({ progress }: { progress: number }) {
  const safeProgress = Math.max(0, Math.min(progress, 100));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg className="-rotate-90 h-20 w-20" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} className="fill-none stroke-border/60" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          className="fill-none stroke-primary transition-all duration-200"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Loader2 className="mb-1 h-4 w-4 animate-spin text-primary" />
        <span className="text-xs font-semibold text-foreground">{safeProgress}%</span>
      </div>
    </div>
  );
}

function FileThumb({
  mimeType,
  fileName,
  previewUrl,
  compact = false,
}: {
  mimeType: string;
  fileName: string;
  previewUrl?: string | null;
  compact?: boolean;
}) {
  const sizeClass = compact ? "h-12 w-12 rounded-lg" : "h-44 w-full rounded-none";

  if (previewUrl && isImageMime(mimeType)) {
    return <img src={previewUrl} alt={fileName} className={`notranslate ${sizeClass} object-cover`} />;
  }

  if (previewUrl && isVideoMime(mimeType)) {
    return <video src={previewUrl} className={`${sizeClass} object-cover`} muted playsInline />;
  }

  const Icon = isPdfMime(mimeType)
    ? FileText
    : isVideoMime(mimeType)
      ? FileVideo
      : isAudioMime(mimeType)
        ? FileAudio
        : mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")
          ? FileArchive
          : isImageMime(mimeType)
            ? ImageIcon
            : FileIcon;

  return (
    <div className={`${sizeClass} flex items-center justify-center bg-primary/10 text-primary`}>
      <Icon className={compact ? "h-6 w-6" : "h-10 w-10"} />
    </div>
  );
}

function RemoteFileThumbnail({ file }: { file: BoardFileItem }) {
  const shouldLoadPreview = isImageMime(file.mimeType);
  const { data } = useDownloadFile(file.id, {
    query: {
      queryKey: getDownloadFileQueryKey(file.id),
      enabled: shouldLoadPreview,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.dataBase64) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(base64ToBlob(data.dataBase64, data.mimeType));
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [data]);

  return <FileThumb mimeType={file.mimeType} fileName={file.name} previewUrl={previewUrl} />;
}

export function Home() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: board, isLoading: isBoardLoading } = useGetBoard({
    query: { queryKey: getGetBoardQueryKey(), refetchInterval: POLL_INTERVAL },
  });

  const saveText = useSaveText();
  const clearText = useClearText();
  const deleteFile = useDeleteFile();

  const [activeView, setActiveView] = useState<"board" | "private">("board");
  const [boardTab, setBoardTab] = useState<"text" | "files">("text");
  const [textContent, setTextContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [screenRoom, setScreenRoom] = useState<ScreenRoomStatus | null>(null);
  const [latestFrame, setLatestFrame] = useState<ScreenFrame | null>(null);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);
  const [isScreenActionPending, setIsScreenActionPending] = useState(false);
  const [isStartingShare, setIsStartingShare] = useState(false);
  const [isStoppingShare, setIsStoppingShare] = useState(false);

  const [chatRoomCodeInput, setChatRoomCodeInput] = useState("");
  const [chatRoom, setChatRoom] = useState<ChatRoomStatus | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const [chatNotice, setChatNotice] = useState<string | null>(null);
  const [isChatActionPending, setIsChatActionPending] = useState(false);
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestFrameSequenceRef = useRef(0);
  const latestFrameRef = useRef<ScreenFrame | null>(null);
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const screenPreviewRef = useRef<HTMLDivElement | null>(null);
  const screenEventsRef = useRef<EventSource | null>(null);
  const localFrameSequenceRef = useRef(0);
  const chatEventsRef = useRef<EventSource | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  const replaceLatestFrame = (nextFrame: ScreenFrame | null) => {
    setLatestFrame((current) => {
      if (current?.localObjectUrl) {
        URL.revokeObjectURL(current.imageUrl);
      }
      return nextFrame;
    });
  };

  useEffect(() => {
    if (board?.text && !document.activeElement?.matches("textarea")) {
      setTextContent(board.text.content);
    } else if (!board?.text && !document.activeElement?.matches("textarea")) {
      setTextContent("");
    }
  }, [board?.text]);

  useEffect(() => {
    latestFrameSequenceRef.current = latestFrame?.sequence ?? 0;
    latestFrameRef.current = latestFrame;
  }, [latestFrame]);

  useEffect(() => {
    return () => {
      if (screenEventsRef.current) {
        screenEventsRef.current.close();
      }
      if (chatEventsRef.current) {
        chatEventsRef.current.close();
      }
      if (captureIntervalRef.current !== null) {
        window.clearInterval(captureIntervalRef.current);
      }
      if (captureStreamRef.current) {
        captureStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (latestFrameRef.current?.localObjectUrl) {
        URL.revokeObjectURL(latestFrameRef.current.imageUrl);
      }
    };
  }, []);

  const updateUploadItem = (id: string, updater: (item: UploadQueueItem) => UploadQueueItem) => {
    setUploadQueue((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  };

  const removeUploadItem = (id: string) => {
    setUploadQueue((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const stopLocalCapture = () => {
    if (captureIntervalRef.current !== null) {
      window.clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (captureStreamRef.current) {
      captureStreamRef.current.getTracks().forEach((track) => track.stop());
      captureStreamRef.current = null;
    }
    if (captureVideoRef.current) {
      captureVideoRef.current.srcObject = null;
    }
  };

  const refreshScreenRoom = async (codeOverride?: string) => {
    const code = codeOverride ?? screenRoom?.code;
    if (!code) {
      return;
    }

    try {
      const nextRoom = await apiRequest<ScreenRoomStatus>(`/api/screen-share/rooms/${code}/status`);
      setScreenRoom(nextRoom);

      if (!nextRoom.isSharing) {
        replaceLatestFrame(null);
        latestFrameSequenceRef.current = 0;
        return;
      }

      if (nextRoom.frameSequence !== latestFrameSequenceRef.current && nextRoom.frameCapturedAt) {
        const frameResponse = await apiRequest<ScreenFrameResponse>(`/api/screen-share/rooms/${code}/frame`);
        replaceLatestFrame(
          frameResponse.frame
            ? {
              imageUrl: frameResponse.frame.imageDataUrl,
              width: frameResponse.frame.width,
              height: frameResponse.frame.height,
              sequence: frameResponse.frame.sequence,
              capturedAt: frameResponse.frame.capturedAt,
              localObjectUrl: false,
            }
            : null,
        );
      }
    } catch (error) {
      stopLocalCapture();
      setScreenRoom(null);
      replaceLatestFrame(null);
      setScreenMessage(error instanceof Error ? error.message : "Screen room is no longer available.");
    }
  };

  useEffect(() => {
    if (!screenRoom?.code) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshScreenRoom(screenRoom.code);
    }, SCREEN_STATUS_POLL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [screenRoom?.code]);

  useEffect(() => {
    if (!screenRoom?.code) {
      if (screenEventsRef.current) {
        screenEventsRef.current.close();
        screenEventsRef.current = null;
      }
      return;
    }

    const events = new EventSource(`/api/screen-share/rooms/${screenRoom.code}/events`);
    screenEventsRef.current = events;

    events.onmessage = (message) => {
      const payload = JSON.parse(message.data) as ScreenShareEvent;

      if (payload.type === "ready") {
        return;
      }

      if (payload.type === "frame") {
        setScreenRoom((current) =>
          current
            ? {
              ...current,
              isSharing: true,
              frameSequence: payload.sequence,
              frameCapturedAt: payload.capturedAt,
            }
            : current,
        );

        const isLocalHostPreview = captureStreamRef.current !== null && screenRoom.role === "host";
        if (!isLocalHostPreview) {
          replaceLatestFrame({
            imageUrl: createRemoteFrameUrl(screenRoom.code, payload.sequence, payload.capturedAt),
            width: payload.width,
            height: payload.height,
            sequence: payload.sequence,
            capturedAt: payload.capturedAt,
            localObjectUrl: false,
          });
        }
        return;
      }

      if (payload.type === "stopped") {
        replaceLatestFrame(null);
        setScreenRoom((current) =>
          current
            ? {
              ...current,
              isSharing: false,
              frameCapturedAt: null,
            }
            : current,
        );
        return;
      }

      stopLocalCapture();
      setScreenRoom(null);
      replaceLatestFrame(null);
      setScreenMessage("Screen room was closed.");
    };

    events.onerror = () => {
      if (events.readyState === EventSource.CLOSED) {
        screenEventsRef.current = null;
      }
    };

    return () => {
      events.close();
      if (screenEventsRef.current === events) {
        screenEventsRef.current = null;
      }
    };
  }, [screenRoom?.code, screenRoom?.role]);

  const appendChatMessage = (message: ChatMessage) => {
    setChatMessages((current) => (current.some((existing) => existing.id === message.id) ? current : [...current, message]));
  };

  const refreshChatRoom = async (codeOverride?: string) => {
    const code = codeOverride ?? chatRoom?.code;
    if (!code) {
      return;
    }

    try {
      const nextRoom = await apiRequest<ChatRoomStatus>(`/api/chat/rooms/${code}/status`);
      setChatRoom(nextRoom);
    } catch (error) {
      if (chatEventsRef.current) {
        chatEventsRef.current.close();
        chatEventsRef.current = null;
      }
      setChatRoom(null);
      setChatMessages([]);
      setChatNotice(error instanceof Error ? error.message : "Chat room is no longer available.");
    }
  };

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ block: "end" });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!chatRoom?.code) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshChatRoom(chatRoom.code);
    }, CHAT_STATUS_POLL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [chatRoom?.code]);

  useEffect(() => {
    if (!chatRoom?.code) {
      if (chatEventsRef.current) {
        chatEventsRef.current.close();
        chatEventsRef.current = null;
      }
      return;
    }

    const events = new EventSource(`/api/chat/rooms/${chatRoom.code}/events`);
    chatEventsRef.current = events;

    events.onmessage = (message) => {
      const payload = JSON.parse(message.data) as ChatEvent;

      if (payload.type === "ready") {
        return;
      }

      if (payload.type === "message") {
        appendChatMessage(payload.message);
        return;
      }

      setChatRoom(null);
      setChatMessages([]);
      setChatNotice("Chat room was closed.");
    };

    events.onerror = () => {
      if (events.readyState === EventSource.CLOSED) {
        chatEventsRef.current = null;
      }
    };

    return () => {
      events.close();
      if (chatEventsRef.current === events) {
        chatEventsRef.current = null;
      }
    };
  }, [chatRoom?.code]);

  const handleCreateChatRoom = async () => {
    try {
      setIsChatActionPending(true);
      setChatNotice(null);
      setScreenMessage(null);
      setScreenRoom(null);
      replaceLatestFrame(null);
      localFrameSequenceRef.current = 0;
      const room = await apiRequest<ChatRoomStatus>("/api/chat/rooms", { method: "POST" });
      setChatRoom(room);
      setChatMessages([]);
      setChatRoomCodeInput(room.code);
      toast({ title: "Chat room created", description: `Room code: ${room.code}` });
    } catch (error) {
      setChatNotice(error instanceof Error ? error.message : "Could not create room.");
    } finally {
      setIsChatActionPending(false);
    }
  };

  const handleJoinChatRoom = async (codeOverride?: string) => {
    const code = (codeOverride ?? roomCodeInput ?? chatRoomCodeInput).trim().toUpperCase();
    if (!code) {
      setChatNotice("Enter a room code first.");
      return;
    }

    try {
      setIsChatActionPending(true);
      setChatNotice(null);
      setScreenMessage(null);
      setScreenRoom(null);
      replaceLatestFrame(null);
      localFrameSequenceRef.current = 0;
      const room = await apiRequest<ChatRoomStatus>("/api/chat/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setChatRoom(room);
      setRoomCodeInput(room.code);
      setChatRoomCodeInput(room.code);
      const history = await apiRequest<ChatMessagesResponse>(`/api/chat/rooms/${room.code}/messages`);
      setChatMessages(history.messages);
      toast({ title: "Joined room", description: `Connected to ${room.code}` });
    } catch (error) {
      setChatNotice(error instanceof Error ? error.message : "Could not join room.");
    } finally {
      setIsChatActionPending(false);
    }
  };

  const handleLeaveChatRoom = async () => {
    if (!chatRoom) {
      return;
    }

    try {
      setIsChatActionPending(true);
      await apiRequest(`/api/chat/rooms/${chatRoom.code}/leave`, { method: "POST" }, false);
      setChatRoom(null);
      setChatMessages([]);
      setChatNotice("You left the room.");
    } catch (error) {
      setChatNotice(error instanceof Error ? error.message : "Could not leave the room.");
    } finally {
      setIsChatActionPending(false);
    }
  };

  const handleCloseChatRoom = async () => {
    if (!chatRoom) {
      return;
    }

    try {
      setIsChatActionPending(true);
      await apiRequest(`/api/chat/rooms/${chatRoom.code}/close`, { method: "POST" }, false);
      setChatRoom(null);
      setChatMessages([]);
      setChatNotice("Room closed.");
      toast({ title: "Room closed" });
    } catch (error) {
      setChatNotice(error instanceof Error ? error.message : "Could not close the room.");
    } finally {
      setIsChatActionPending(false);
    }
  };

  const handleSendChatMessage = async () => {
    const text = chatMessageInput.trim();
    if (!chatRoom || !text) {
      return;
    }

    try {
      setIsSendingChatMessage(true);
      const message = await apiRequest<ChatMessage>(`/api/chat/rooms/${chatRoom.code}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      appendChatMessage(message);
      setChatMessageInput("");
    } catch (error) {
      setChatNotice(error instanceof Error ? error.message : "Could not send message.");
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  const handleSaveText = () => {
    if (!textContent.trim()) return;
    saveText.mutate(
      { data: { content: textContent } },
      {
        onSuccess: () => {
          toast({ title: "Text saved", description: "Copied to shared clipboard." });
          queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
        },
      },
    );
  };

  const handleClearText = () => {
    clearText.mutate(undefined, {
      onSuccess: () => {
        setTextContent("");
        toast({ title: "Text cleared" });
        queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
      },
    });
  };

  const handleCopyText = () => {
    if (board?.text?.content) {
      void copyTextToClipboard(board.text.content);
      toast({ title: "Copied to local clipboard" });
    }
  };

  const handleFileDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      void handleFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    const acceptedFiles = files.filter((file) => {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${MAX_UPLOAD_SIZE_LABEL} limit.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    await Promise.all(
      acceptedFiles.map(async (file, index) => {
        const uploadId = `${file.name}-${file.lastModified}-${file.size}-${index}-${Date.now()}`;
        const previewUrl = createPreviewUrl(file);

        setUploadQueue((current) => [
          {
            id: uploadId,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            progress: 0,
            status: "reading",
            previewUrl,
          },
          ...current,
        ]);

        try {
          await uploadFileWithProgress(file, (progress, status) => {
            updateUploadItem(uploadId, (item) => ({
              ...item,
              progress: Math.round(progress * 100),
              status,
            }));
          });

          updateUploadItem(uploadId, (item) => ({ ...item, progress: 100, status: "finishing" }));
          toast({ title: "File uploaded", description: `${file.name} shared successfully.` });

          window.setTimeout(() => {
            removeUploadItem(uploadId);
          }, 800);
        } catch (error) {
          removeUploadItem(uploadId);
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : `Could not upload ${file.name}.`,
            variant: "destructive",
          });
        } finally {
          queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
        }
      }),
    );
  };

  const handleDeleteFile = (fileId: string) => {
    deleteFile.mutate(
      { fileId },
      {
        onSuccess: () => {
          toast({ title: "File deleted" });
          queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
        },
      },
    );
  };

  const handleDownloadAll = async () => {
    try {
      setIsDownloadingAll(true);
      const response = await fetch("/api/files/download-all");
      if (!response.ok) {
        throw new Error("Archive download failed");
      }
      const blob = await response.blob();
      const fileName =
        response.headers
          .get("content-disposition")
          ?.match(/filename=\"?([^"]+)\"?/)?.[1] ?? "air4share-board.zip";

      triggerBrowserDownload(blob, fileName);
    } catch {
      toast({
        title: "Download failed",
        description: "Could not create the zip archive.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!board?.files?.length) {
      return;
    }

    try {
      setIsDeletingAll(true);
      const results = await Promise.allSettled(
        board.files.map((file) =>
          fetch(`/api/files/${file.id}`, {
            method: "DELETE",
          }),
        ),
      );

      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed > 0) {
        throw new Error("Some files could not be deleted.");
      }

      toast({ title: "Files deleted", description: "All shared files were removed." });
      queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
    } catch {
      toast({
        title: "Delete failed",
        description: "Could not remove all files.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      setIsScreenActionPending(true);
      setScreenMessage(null);
      setChatNotice(null);
      setChatRoom(null);
      setChatMessages([]);
      const room = await apiRequest<ScreenRoomStatus>("/api/screen-share/rooms", {
        method: "POST",
      });
      setScreenRoom(room);
      setRoomCodeInput(room.code);
      replaceLatestFrame(null);
      localFrameSequenceRef.current = 0;
      toast({ title: "Room created", description: `Room code: ${room.code}` });
    } catch (error) {
      setScreenMessage(error instanceof Error ? error.message : "Could not create room.");
    } finally {
      setIsScreenActionPending(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      setScreenMessage("Enter a room code first.");
      return;
    }

    try {
      setIsScreenActionPending(true);
      setScreenMessage(null);
      setChatNotice(null);
      setChatRoom(null);
      setChatMessages([]);
      const room = await apiRequest<ScreenRoomStatus>("/api/screen-share/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setScreenRoom(room);
      setRoomCodeInput(room.code);
      setChatRoomCodeInput(room.code);
      await refreshScreenRoom(room.code);
      toast({ title: "Joined room", description: `Connected to ${room.code}` });
    } catch (error) {
      setScreenMessage(error instanceof Error ? error.message : "Could not join room.");
    } finally {
      setIsScreenActionPending(false);
    }
  };

  const handleJoinPrivateRoom = async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      setScreenMessage("Enter a room code first.");
      setChatNotice(null);
      return;
    }

    setRoomCodeInput(code);
    setChatRoomCodeInput(code);
    setScreenMessage(null);
    setChatNotice(null);
    setIsScreenActionPending(true);
    setIsChatActionPending(true);

    try {
      setChatRoom(null);
      setChatMessages([]);
      const room = await apiRequest<ScreenRoomStatus>("/api/screen-share/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setScreenRoom(room);
      setRoomCodeInput(room.code);
      setChatRoomCodeInput(room.code);
      await refreshScreenRoom(room.code);
      toast({ title: "Joined room", description: `Connected to ${room.code}` });
      setIsChatActionPending(false);
      return;
    } catch {
      setScreenMessage(null);
    } finally {
      setIsScreenActionPending(false);
    }

    try {
      setScreenRoom(null);
      replaceLatestFrame(null);
      localFrameSequenceRef.current = 0;
      const room = await apiRequest<ChatRoomStatus>("/api/chat/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setChatRoom(room);
      setRoomCodeInput(room.code);
      setChatRoomCodeInput(room.code);
      const history = await apiRequest<ChatMessagesResponse>(`/api/chat/rooms/${room.code}/messages`);
      setChatMessages(history.messages);
      toast({ title: "Joined room", description: `Connected to ${room.code}` });
    } catch (error) {
      setChatNotice(error instanceof Error ? error.message : "Could not join room.");
    } finally {
      setIsChatActionPending(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!screenRoom) {
      return;
    }

    try {
      setIsScreenActionPending(true);
      stopLocalCapture();
      await apiRequest(`/api/screen-share/rooms/${screenRoom.code}/leave`, { method: "POST" }, false);
      setScreenRoom(null);
      replaceLatestFrame(null);
      localFrameSequenceRef.current = 0;
      setScreenMessage("You left the room.");
    } catch (error) {
      setScreenMessage(error instanceof Error ? error.message : "Could not leave the room.");
    } finally {
      setIsScreenActionPending(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!screenRoom) {
      return;
    }

    try {
      setIsScreenActionPending(true);
      stopLocalCapture();
      await apiRequest(`/api/screen-share/rooms/${screenRoom.code}/close`, { method: "POST" }, false);
      setScreenRoom(null);
      replaceLatestFrame(null);
      localFrameSequenceRef.current = 0;
      setScreenMessage("Room closed.");
      toast({ title: "Room closed" });
    } catch (error) {
      setScreenMessage(error instanceof Error ? error.message : "Could not close the room.");
    } finally {
      setIsScreenActionPending(false);
    }
  };

  const handleStopSharing = async () => {
    if (!screenRoom || screenRoom.role !== "host") {
      return;
    }

    try {
      setIsStoppingShare(true);
      stopLocalCapture();
      await apiRequest(`/api/screen-share/rooms/${screenRoom.code}/stop`, { method: "POST" }, false);
      replaceLatestFrame(null);
      await refreshScreenRoom(screenRoom.code);
    } catch (error) {
      setScreenMessage(error instanceof Error ? error.message : "Could not stop screen sharing.");
    } finally {
      setIsStoppingShare(false);
    }
  };

  const pushCurrentFrame = async (code: string) => {
    const video = captureVideoRef.current;
    const canvas = captureCanvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      return;
    }

    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const scale = Math.min(1, MAX_CAPTURE_WIDTH / sourceWidth);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const frameBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not capture screen frame."));
          return;
        }
        resolve(blob);
      }, "image/jpeg", JPEG_QUALITY);
    });

    const response = await fetch(`/api/screen-share/rooms/${code}/frame`, {
      method: "POST",
      headers: {
        "Content-Type": frameBlob.type,
        "x-frame-width": String(width),
        "x-frame-height": String(height),
      },
      body: frameBlob,
    });

    const errorText = await response.text();
    if (!response.ok) {
      const payload = errorText ? (JSON.parse(errorText) as { error?: string }) : null;
      throw new Error(payload?.error ?? `Request failed with status ${response.status}.`);
    }

    localFrameSequenceRef.current += 1;
    const capturedAt = new Date().toISOString();
    const imageUrl = URL.createObjectURL(frameBlob);

    replaceLatestFrame({
      imageUrl,
      width,
      height,
      sequence: localFrameSequenceRef.current,
      capturedAt,
      localObjectUrl: true,
    });

    setScreenRoom((current) =>
      current
        ? {
          ...current,
          isSharing: true,
          frameSequence: localFrameSequenceRef.current,
          frameCapturedAt: capturedAt,
        }
        : current,
    );
  };

  const handleStartSharing = async () => {
    if (!screenRoom || screenRoom.role !== "host") {
      return;
    }

    try {
      setIsStartingShare(true);
      setScreenMessage(null);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 8, max: 12 },
          width: { ideal: 1280, max: 1920 },
        },
        audio: false,
      });

      stopLocalCapture();
      captureStreamRef.current = stream;

      const video = captureVideoRef.current;
      if (!video) {
        throw new Error("Screen preview could not be initialized.");
      }

      video.srcObject = stream;
      await video.play();

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener("ended", () => {
          void handleStopSharing();
        });
      }

      localFrameSequenceRef.current = 0;
      await pushCurrentFrame(screenRoom.code);

      captureIntervalRef.current = window.setInterval(() => {
        void pushCurrentFrame(screenRoom.code);
      }, SCREEN_CAPTURE_INTERVAL_MS);

      toast({ title: "Screen sharing started" });
    } catch (error) {
      stopLocalCapture();
      setScreenMessage(
        error instanceof Error ? error.message : "Screen sharing could not be started on this device.",
      );
    } finally {
      setIsStartingShare(false);
    }
  };

  const handleFullscreenPreview = async () => {
    const previewElement = screenPreviewRef.current;
    if (!previewElement) {
      return;
    }

    try {
      if (document.fullscreenElement === previewElement) {
        await document.exitFullscreen();
        return;
      }

      await previewElement.requestFullscreen();
    } catch (error) {
      toast({
        title: "Fullscreen unavailable",
        description: error instanceof Error ? error.message : "Could not open fullscreen preview.",
        variant: "destructive",
      });
    }
  };

  const isSharingLocally = captureStreamRef.current !== null && captureIntervalRef.current !== null;
  const isPrivateRoomIdle = !screenRoom && !chatRoom;
  const detectedUrl = extractFirstUrl(textContent);

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex w-full rounded-xl border border-border bg-card p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveView("board")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-0 py-2 text-sm font-medium transition ${activeView === "board"
              ? "bg-background text-foreground shadow-sm ring-2 ring-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Wifi className="h-4 w-4" />
            Network Share
          </button>
          <button
            type="button"
            onClick={() => setActiveView("private")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-0 py-2 text-sm font-medium transition ${activeView === "private"
              ? "bg-background text-foreground shadow-sm ring-2 ring-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Lock className="h-4 w-4" />
            Private Share
          </button>
        </div>

        {activeView === "board" && (
          <>
            <Card className="overflow-hidden border-primary/20 shadow-sm">
              <CardHeader className="border-b px-4 py-0 sm:px-6">
                <div className="flex items-center gap-8 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setBoardTab("text")}
                    className={`border-b-4 px-1 py-5 text-base font-medium transition ${boardTab === "text"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Type className="h-4 w-4" />
                      Text / Links
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardTab("files")}
                    className={`border-b-4 px-1 py-5 text-base font-medium transition ${boardTab === "files"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <UploadCloud className="h-4 w-4" />
                      Files
                    </span>
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-4 sm:p-6">
                {boardTab === "text" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-background p-3 sm:p-4">
                      <Textarea
                        placeholder="Paste snippet, link, or text here..."
                        className="min-h-[170px] resize-none border-none bg-transparent px-0 text-base text-foreground shadow-none focus-visible:ring-0 sm:min-h-[190px]"
                        value={textContent}
                        onChange={(event) => setTextContent(event.target.value)}
                      />
                    </div>

                    {detectedUrl && (
                      <a
                        href={detectedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="notranslate group flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 transition-colors hover:border-primary/50 hover:bg-primary/10"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Link2 className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {getDisplayHost(detectedUrl)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{detectedUrl}</span>
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </a>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={handleSaveText} disabled={saveText.isPending || !textContent.trim()}>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      {board?.text && (
                        <>
                          <Button variant="secondary" onClick={handleCopyText}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </Button>
                          <Button variant="ghost" onClick={handleClearText} disabled={clearText.isPending}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {boardTab === "files" && (
                  <div className="space-y-6">
                    <div
                      className={`rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(event) => {
                          if (event.target.files) void handleFiles(Array.from(event.target.files));
                          event.target.value = "";
                        }}
                        multiple
                      />
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-muted-foreground">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="text-xl font-semibold text-foreground">Drag &amp; drop files here</p>
                      <p className="mt-1.5 text-base text-muted-foreground">or click to browse</p>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-sm text-muted-foreground">
                        <span className="rounded-full bg-muted px-3.5 py-1.5">Max {MAX_UPLOAD_SIZE_LABEL} per file</span>
                        <span className="rounded-full bg-muted px-3.5 py-1.5">Same network only</span>
                      </div>
                    </div>

                    {uploadQueue.length > 0 && (
                      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                        {uploadQueue.map((item) => (
                          <div key={item.id} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
                            <div className="flex justify-center sm:block">
                              <UploadCircle progress={item.progress} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex items-start gap-3">
                                <FileThumb mimeType={item.mimeType} fileName={item.fileName} previewUrl={item.previewUrl} compact />
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <p className="notranslate overflow-hidden break-words text-sm font-medium [overflow-wrap:anywhere]">
                                    {item.fileName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(item.sizeBytes)}</p>
                                </div>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
                                <div
                                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isBoardLoading ? null : board?.files && board.files.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <Button variant="outline" onClick={handleDeleteAll} disabled={isDeletingAll}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isDeletingAll ? "Deleting..." : "Delete all"}
                          </Button>
                          <Button variant="outline" onClick={handleDownloadAll} disabled={isDownloadingAll}>
                            <Download className="mr-2 h-4 w-4" />
                            {isDownloadingAll ? "Preparing zip..." : "Download all"}
                          </Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {board.files.map((file: BoardFileItem) => (
                            <div
                              key={file.id}
                              className="notranslate group overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/30"
                              title={`${file.name}\n${file.mimeType}\n${formatFileSize(file.sizeBytes)}`}
                            >
                              <button type="button" onClick={() => void openFilePreviewInNewTab(file)} className="relative w-full text-left">
                                <RemoteFileThumbnail file={file} />
                                <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
                                    {formatFileSize(file.sizeBytes)}
                                  </span>
                                  <span className="rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
                                    {getFileFormatLabel(file.name, file.mimeType)}
                                  </span>
                                </div>
                              </button>
                              <div className="flex items-center justify-end gap-3 border-t px-4 py-3">
                                <DownloadButton fileId={file.id} />
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteFile(file.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      !isBoardLoading && (
                        <div className="py-12 text-center text-xl text-muted-foreground">
                          No files yet. Upload some files to share!
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeView === "private" && (
          <Card className="border-primary/20 shadow-sm">
            <CardContent className="space-y-5 p-4 sm:p-6">
              {isPrivateRoomIdle && (
                <>
                  <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Lock className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">Create Private Share</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Create a room for secure screen sharing or real-time chat on the same network.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Button
                        className="h-11 rounded-lg text-sm font-semibold"
                        onClick={() => void handleCreateRoom()}
                        disabled={isScreenActionPending || isChatActionPending}
                      >
                        {isScreenActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Monitor className="mr-2 h-4 w-4" />}
                        Create Private Share For Screen Share
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-11 rounded-lg text-sm font-semibold"
                        onClick={() => void handleCreateChatRoom()}
                        disabled={isScreenActionPending || isChatActionPending}
                      >
                        {isChatActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                        Create Private Share For Chat
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-3.5 sm:p-4">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                        <Users className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">Join Existing Room</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Enter the room code below to join an existing screen share or chat room.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <input
                        value={roomCodeInput}
                        onChange={(event) => {
                          const value = event.target.value.toUpperCase();
                          setRoomCodeInput(value);
                          setChatRoomCodeInput(value);
                        }}
                        type="text"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={12}
                        placeholder="Enter room code"
                        className="h-14 flex-1 rounded-lg border border-input bg-background px-5 py-3 text-center font-mono text-base uppercase tracking-[0.2em] text-foreground outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary"
                      />
                      <Button
                        variant="secondary"
                        className="h-10 rounded-lg px-5 text-sm font-semibold"
                        onClick={() => void handleJoinPrivateRoom()}
                        disabled={isScreenActionPending || isChatActionPending}
                      >
                        {isScreenActionPending || isChatActionPending ? "Joining..." : "Join"}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {screenRoom && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-xl border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className="rounded-full bg-teal-50 px-4 py-1 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                          Room <span className="notranslate">{screenRoom.code}</span>
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-4 py-1 text-sm">
                          {screenRoom.role === "host" ? "Creator" : "Viewer"}
                        </Badge>
                      </div>
                      <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
                        {screenRoom.role === "host" ? (
                          "You are controlling this room"
                        ) : (
                          <>
                            Watching <span className="notranslate">{screenRoom.hostLabel}</span>
                          </>
                        )}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {screenRoom.isSharing
                          ? "Live screen is active."
                          : screenRoom.role === "host"
                            ? "Start screen share to broadcast your display."
                            : "Waiting for the creator to start sharing."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => {
                          void copyTextToClipboard(screenRoom.code);
                          toast({ title: "Room code copied" });
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy code
                      </Button>
                      <Button variant="outline" className="h-8 px-2.5 text-xs" onClick={() => void handleLeaveRoom()} disabled={isScreenActionPending}>
                        <X className="mr-2 h-4 w-4" />
                        Leave
                      </Button>
                      {screenRoom.role === "host" && (
                        <Button
                          variant="destructive"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => void handleCloseRoom()}
                          disabled={isScreenActionPending}
                        >
                          Close room
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
                    <div className="rounded-xl border bg-card p-3.5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Live Screen</p>
                          <p className="mt-1 text-base font-semibold text-foreground">
                            {screenRoom.isSharing ? "Broadcast running" : "No active stream"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {latestFrame?.imageUrl && (
                            <Button variant="outline" className="h-8 px-2.5 text-xs" onClick={() => void handleFullscreenPreview()}>
                              <Maximize className="mr-2 h-3.5 w-3.5" />
                              Full screen
                            </Button>
                          )}
                          {screenRoom.role === "host" && (
                            !isSharingLocally ? (
                              <Button
                                className="h-8 bg-teal-500 px-2.5 text-xs hover:bg-teal-600"
                                onClick={() => void handleStartSharing()}
                                disabled={isStartingShare}
                              >
                                {isStartingShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Monitor className="mr-2 h-4 w-4" />}
                                Start share
                              </Button>
                            ) : (
                              <Button variant="outline" className="h-8 px-2.5 text-xs" onClick={() => void handleStopSharing()} disabled={isStoppingShare}>
                                {isStoppingShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                                Stop share
                              </Button>
                            )
                          )}
                        </div>
                      </div>

                      <div ref={screenPreviewRef} className="overflow-hidden rounded-xl border bg-slate-950">
                        {latestFrame?.imageUrl ? (
                          <img
                            src={latestFrame.imageUrl}
                            alt="Shared screen preview"
                            className="aspect-video w-full object-contain"
                          />
                        ) : (
                          <div className="flex aspect-video flex-col items-center justify-center gap-3 px-4 text-center text-slate-300">
                            <Monitor className="h-8 w-8 text-slate-500" />
                            <div>
                              <p className="text-base font-semibold">
                                {screenRoom.role === "host" ? "Your screen preview will appear here" : "Waiting for live screen"}
                              </p>
                              <p className="mt-1.5 text-xs text-slate-400">
                                {screenRoom.role === "host"
                                  ? "Browser will ask which screen or window to share."
                                  : "The preview will update automatically as soon as the creator starts sharing."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-xl border bg-card p-3.5">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Room details</p>
                        <div className="mt-3 grid gap-3">
                          <div className="rounded-lg bg-muted/50 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Room code</p>
                            <p className="notranslate mt-1 font-mono text-base font-semibold tracking-[0.16em] text-foreground">
                              {screenRoom.code}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/50 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Participants</p>
                            <p className="mt-1 text-base font-semibold text-foreground">{screenRoom.participantCount}</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Viewers</p>
                            <p className="mt-1 text-base font-semibold text-foreground">{screenRoom.viewerCount}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border bg-card p-3.5">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Connected users</p>
                        <div className="mt-3 space-y-2.5">
                          {screenRoom.participants.map((participant) => (
                            <div key={participant.deviceId} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {participant.label} {participant.isCurrent ? "(You)" : ""}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {participant.role === "host" ? "Creator" : "Viewer"}
                                </p>
                              </div>
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {screenMessage && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {screenMessage}
                </div>
              )}
              {chatRoom && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-xl border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className="rounded-full bg-teal-50 px-4 py-1 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                          Room <span className="notranslate">{chatRoom.code}</span>
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-4 py-1 text-sm">
                          {chatRoom.role === "host" ? "Creator" : "Member"}
                        </Badge>
                      </div>
                      <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
                        {chatRoom.participantCount} {chatRoom.participantCount === 1 ? "person" : "people"} in this room
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Messages are visible to everyone connected to this room on the same network.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => {
                          void copyTextToClipboard(chatRoom.code);
                          toast({ title: "Room code copied" });
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy code
                      </Button>
                      <Button variant="outline" className="h-8 px-2.5 text-xs" onClick={() => void handleLeaveChatRoom()} disabled={isChatActionPending}>
                        <X className="mr-2 h-4 w-4" />
                        Leave
                      </Button>
                      {chatRoom.role === "host" && (
                        <Button
                          variant="destructive"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => void handleCloseChatRoom()}
                          disabled={isChatActionPending}
                        >
                          Close room
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex h-[420px] flex-col gap-3 overflow-y-auto p-4">
                      {chatMessages.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
                          No messages yet. Say hello!
                        </div>
                      ) : (
                        chatMessages.map((message) => {
                          const isOwn = message.deviceId === chatRoom.participants.find((participant) => participant.isCurrent)?.deviceId;
                          return (
                            <div key={message.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                              <span className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">
                                {isOwn ? "You" : <span className="notranslate">{message.label}</span>}
                              </span>
                              <div
                                className={`notranslate max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                                  }`}
                              >
                                {message.text}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatMessagesEndRef} />
                    </div>

                    <div className="flex items-center gap-2 border-t p-3">
                      <input
                        value={chatMessageInput}
                        onChange={(event) => setChatMessageInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void handleSendChatMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        maxLength={MAX_CHAT_MESSAGE_LENGTH}
                        className="h-10 flex-1 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary"
                      />
                      <Button
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-lg"
                        onClick={() => void handleSendChatMessage()}
                        disabled={isSendingChatMessage || !chatMessageInput.trim()}
                      >
                        {isSendingChatMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {chatNotice && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {chatNotice}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <video ref={captureVideoRef} className="hidden" muted playsInline />
        <canvas ref={captureCanvasRef} className="hidden" />
      </div>
    </div>
  );
}
