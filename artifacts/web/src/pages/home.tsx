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
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FileIcon,
  Trash2,
  Download,
  Copy,
  Save,
  Clock,
  UploadCloud,
  Type,
  Image as ImageIcon,
  Loader2,
  FileText,
  FileVideo,
  FileAudio,
  FileArchive,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const POLL_INTERVAL = 3000;
const MAX_UPLOAD_SIZE_BYTES = 1024 * 1024 * 1024;
const MAX_UPLOAD_SIZE_LABEL = "1GB";
const READ_PROGRESS_SHARE = 0.15;
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

const isImageMime = (mime: string) => mime.toLowerCase().startsWith("image/");
const isVideoMime = (mime: string) => mime.toLowerCase().startsWith("video/");
const isAudioMime = (mime: string) => mime.toLowerCase().startsWith("audio/");
const isPdfMime = (mime: string) => mime.toLowerCase() === "application/pdf";
const isTextLikeMime = (mime: string) => {
  const normalized = mime.toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized === "application/json" ||
    normalized === "application/xml" ||
    normalized.endsWith("+json") ||
    normalized.endsWith("+xml") ||
    normalized.includes("javascript")
  );
};

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

function DownloadButton({ fileId }: { fileId: string }) {
  const { refetch, isFetching } = useDownloadFile(fileId, {
    query: { queryKey: getDownloadFileQueryKey(fileId), enabled: false },
  });

  const onDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    return <img src={previewUrl} alt={fileName} className={`${sizeClass} object-cover`} />;
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

  const [textContent, setTextContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "files">("text");
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (board?.text && !document.activeElement?.matches("textarea")) {
      setTextContent(board.text.content);
    } else if (!board?.text && !document.activeElement?.matches("textarea")) {
      setTextContent("");
    }
  }, [board?.text]);

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
      navigator.clipboard.writeText(board.text.content);
      toast({ title: "Copied to local clipboard" });
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(Array.from(e.dataTransfer.files));
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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="mb-2 max-w-[12ch] text-4xl font-bold leading-tight tracking-tight sm:max-w-none sm:text-5xl">
          Your Network Board
        </h1>
        <p className="max-w-4xl text-base leading-8 text-muted-foreground sm:text-lg">
          Anyone on your current Wi-Fi network can see this board. Things disappear after 30 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-col">
          <button
            onClick={() => setActiveTab("text")}
            className={`flex min-h-14 items-center justify-center gap-3 rounded-lg px-4 py-3 text-center text-sm font-medium transition-colors md:justify-start md:text-left ${
              activeTab === "text"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            <Type className="h-4 w-4 shrink-0" />
            Text
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex min-h-14 items-center justify-center gap-3 rounded-lg px-4 py-3 text-center text-sm font-medium transition-colors md:justify-start md:text-left ${
              activeTab === "files"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            <UploadCloud className="h-4 w-4 shrink-0" />
            Files
          </button>
        </div>

        <div>
          {activeTab === "text" && (
            <Card className="overflow-hidden border-primary/20 shadow-sm">
              <CardHeader className="bg-muted/50 px-4 pb-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileIcon className="h-5 w-5 text-primary" />
                    Text
                  </CardTitle>
                  {board?.text && (
                    <Badge variant="outline" className="flex w-fit items-center gap-1 text-xs font-normal">
                      <Clock className="h-3 w-3" />
                      Expires in {board.expiresInMinutes}m
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex min-h-[260px] flex-col p-0">
                <div className="flex-1 p-4 sm:p-6">
                  <Textarea
                    placeholder="Paste snippet, link, or text here..."
                    className="min-h-[180px] resize-none border-none px-0 text-base shadow-none focus-visible:ring-0 sm:min-h-[220px]"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  />
                </div>
                <div className="border-t bg-muted/30 px-4 py-3 sm:px-6">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {board?.text && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleClearText}
                          disabled={clearText.isPending}
                          aria-label="Clear text"
                          title="Clear text"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handleCopyText}
                          aria-label="Copy text"
                          title="Copy text"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon"
                      onClick={handleSaveText}
                      disabled={saveText.isPending || !textContent.trim()}
                      aria-label={saveText.isPending ? "Saving text" : "Save text to board"}
                      title={saveText.isPending ? "Saving..." : "Save to board"}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "files" && (
            <Card className="overflow-hidden border-primary/20 shadow-sm">
              <CardHeader className="bg-muted/50 px-4 pb-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UploadCloud className="h-5 w-5 text-primary" />
                    Files
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="min-h-[220px] space-y-3 p-4 sm:p-6">
                <div
                  className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:px-6 sm:py-12 ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
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
                    onChange={(e) => {
                      if (e.target.files) void handleFiles(Array.from(e.target.files));
                      e.target.value = "";
                    }}
                    multiple
                  />
                  <UploadCloud className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="mb-1 text-sm font-medium">Click to browse or drag files here (Max 1GB)</p>
                  <p className="text-xs text-muted-foreground">Available instantly to everyone on your network</p>
                </div>

                {uploadQueue.length > 0 && (
                  <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        Uploading {uploadQueue.length} file{uploadQueue.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                      {uploadQueue.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-4 rounded-xl border bg-background/80 p-3 sm:flex-row sm:items-center"
                        >
                          <div className="flex justify-center sm:block">
                            <UploadCircle progress={item.progress} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-start gap-3">
                              <div className="shrink-0">
                                <FileThumb
                                  mimeType={item.mimeType}
                                  fileName={item.fileName}
                                  previewUrl={item.previewUrl}
                                  compact
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{item.fileName}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(item.sizeBytes)}</p>
                              </div>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
                              <div
                                className="h-full rounded-full bg-primary transition-[width] duration-200"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {item.status === "reading"
                                ? "Preparing file..."
                                : item.status === "uploading"
                                  ? "Uploading..."
                                  : "Finalizing..."}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isBoardLoading ? null : board?.files && board.files.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteAll}
                          disabled={isDeletingAll}
                          className="h-10 w-full sm:w-auto"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeletingAll ? "Deleting..." : "Delete all"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadAll}
                          disabled={isDownloadingAll}
                          className="h-10 w-full sm:w-auto"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {isDownloadingAll ? "Preparing zip..." : "Download all"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {board.files.map((file: BoardFileItem) => (
                        <div
                          key={file.id}
                          className="group overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/30"
                          title={`${file.name}\n${file.mimeType}\n${formatFileSize(file.sizeBytes)}`}
                        >
                          <button
                            type="button"
                            onClick={() => void openFilePreviewInNewTab(file)}
                            className="relative w-full text-left"
                          >
                            <RemoteFileThumbnail file={file} />
                            <div className="pointer-events-none absolute inset-x-3 top-3 hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
                              <div className="rounded-lg bg-background/85 px-3 py-2 text-xs shadow-lg backdrop-blur">
                                <p className="truncate font-medium text-foreground">{file.name}</p>
                                <p className="truncate text-[11px] text-muted-foreground">{file.mimeType}</p>
                              </div>
                            </div>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(file.id);
                              }}
                              aria-label="Delete file"
                              title="Delete file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
