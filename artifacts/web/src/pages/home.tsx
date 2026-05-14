import {
  useGetBoard,
  useSaveText,
  useClearText,
  useUploadFile,
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
import { FileIcon, Trash2, Download, Copy, Save, Clock, UploadCloud, Type, Image as ImageIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const POLL_INTERVAL = 3000;
const MAX_UPLOAD_SIZE_BYTES = 1024 * 1024 * 1024;
const MAX_UPLOAD_SIZE_LABEL = "1GB";

type BoardFileItem = {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  deviceLabel: string;
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
    <Button variant="secondary" size="icon" onClick={onDownload} disabled={isFetching}>
      <Download className="h-4 w-4" />
    </Button>
  );
}

function ImagePreviewContent({ fileId }: { fileId: string }) {
  const { data, isFetching } = useDownloadFile(fileId, {
    query: {
      queryKey: getDownloadFileQueryKey(fileId),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  });
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.dataBase64) {
      setObjectUrl(null);
      setTextPreview(null);
      return;
    }

    const blob = base64ToBlob(data.dataBase64, data.mimeType);
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    if (isTextLikeMime(data.mimeType)) {
      blob.text().then(setTextPreview).catch(() => setTextPreview("Preview is unavailable for this file."));
    } else {
      setTextPreview(null);
    }

    return () => URL.revokeObjectURL(url);
  }, [data]);

  if (isFetching || !data?.dataBase64) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isImageMime(data.mimeType)) {
    return (
      <div className="flex items-center justify-center rounded-md bg-muted/30 overflow-hidden">
        <img src={objectUrl ?? undefined} alt={data.name} className="max-h-[70vh] max-w-full object-contain" />
      </div>
    );
  }

  if (isVideoMime(data.mimeType)) {
    return (
      <video src={objectUrl ?? undefined} controls className="max-h-[70vh] w-full rounded-md bg-black" />
    );
  }

  if (isAudioMime(data.mimeType)) {
    return (
      <div className="rounded-md border bg-muted/20 p-6">
        <audio src={objectUrl ?? undefined} controls className="w-full" />
      </div>
    );
  }

  if (isPdfMime(data.mimeType) && objectUrl) {
    return <iframe src={objectUrl} title={data.name} className="h-[70vh] w-full rounded-md border bg-background" />;
  }

  if (isTextLikeMime(data.mimeType)) {
    return (
      <div className="max-h-[70vh] overflow-auto rounded-md border bg-muted/20 p-4">
        <pre className="whitespace-pre-wrap break-words text-sm">{textPreview ?? "Loading preview..."}</pre>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-6 text-center">
      <p className="text-sm text-muted-foreground">Preview is not available for this file type.</p>
      <Button className="mt-4" onClick={() => triggerBrowserDownload(base64ToBlob(data.dataBase64, data.mimeType), data.name)}>
        <Download className="mr-2 h-4 w-4" />
        Download file
      </Button>
    </div>
  );
}

export function Home() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: board, isLoading: isBoardLoading } = useGetBoard({
    query: { queryKey: getGetBoardQueryKey(), refetchInterval: POLL_INTERVAL },
  });

  const saveText = useSaveText();
  const clearText = useClearText();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  const [textContent, setTextContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "files">("text");
  const [previewFile, setPreviewFile] = useState<{ id: string; name: string; mimeType: string } | null>(null);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [uploadProgressValue, setUploadProgressValue] = useState(18);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync text from server if not editing
  useEffect(() => {
    if (board?.text && !document.activeElement?.matches('textarea')) {
      setTextContent(board.text.content);
    } else if (!board?.text && !document.activeElement?.matches('textarea')) {
      setTextContent("");
    }
  }, [board?.text]);

  useEffect(() => {
    if (pendingUploads <= 0) {
      setUploadProgressValue(18);
      return;
    }

    const interval = window.setInterval(() => {
      setUploadProgressValue((current) => (current >= 82 ? 28 : current + 9));
    }, 250);

    return () => window.clearInterval(interval);
  }, [pendingUploads]);

  const handleSaveText = () => {
    if (!textContent.trim()) return;
    saveText.mutate({ data: { content: textContent } }, {
      onSuccess: () => {
        toast({ title: "Text saved", description: "Copied to shared clipboard." });
        queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
      }
    });
  };

  const handleClearText = () => {
    clearText.mutate(undefined, {
      onSuccess: () => {
        setTextContent("");
        toast({ title: "Text cleared" });
        queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
      }
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
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${MAX_UPLOAD_SIZE_LABEL} limit.`,
          variant: "destructive",
        });
        continue;
      }

      const reader = new FileReader();
      setPendingUploads((count) => count + 1);

      reader.onerror = () => {
        setPendingUploads((count) => Math.max(0, count - 1));
        toast({
          title: "Upload failed",
          description: `Could not read ${file.name}.`,
          variant: "destructive",
        });
      };

      reader.onabort = () => {
        setPendingUploads((count) => Math.max(0, count - 1));
      };

      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          setPendingUploads((count) => Math.max(0, count - 1));
          return;
        }
        
        const base64Data = result.split(",")[1];
        
        uploadFile.mutate({
          data: {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            dataBase64: base64Data,
          }
        }, {
          onSuccess: () => {
            setPendingUploads((count) => Math.max(0, count - 1));
            toast({ title: "File uploaded", description: `${file.name} shared successfully.` });
            queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
          },
          onError: () => {
            setPendingUploads((count) => Math.max(0, count - 1));
            toast({ title: "Upload failed", description: `Could not upload ${file.name}.`, variant: "destructive" });
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    deleteFile.mutate({ fileId }, {
      onSuccess: () => {
        toast({ title: "File deleted" });
        queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
      }
    });
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Your Network Board</h1>
        <p className="text-muted-foreground text-lg">
          Anyone on your current Wi-Fi network can see this board. Things disappear after 30 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        {/* LEFT TAB SIDEBAR */}
        <div className="flex md:flex-col gap-2">
          <button
            onClick={() => setActiveTab("text")}
            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === "text"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border hover:bg-muted text-foreground"
            }`}
          >
            <Type className="h-4 w-4 shrink-0" />
            Shared Text
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === "files"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border hover:bg-muted text-foreground"
            }`}
          >
            <UploadCloud className="h-4 w-4 shrink-0" />
            Shared Files
          </button>
        </div>

        {/* RIGHT CONTENT AREA */}
        <div>
          {activeTab === "text" && (
          /* TEXT PANEL */
          <Card className="border-primary/20 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileIcon className="h-5 w-5 text-primary" />
                  Shared Text
                </CardTitle>
                {board?.text && (
                  <Badge variant="outline" className="font-normal text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires in {board.expiresInMinutes}m
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4">
                <Textarea 
                  placeholder="Paste snippet, link, or text here..."
                  className="min-h-[150px] resize-none border-none shadow-none focus-visible:ring-0 text-base"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
              </div>
              <div className="bg-muted/30 px-4 py-3 flex items-center justify-end border-t">
                <div className="flex gap-2">
                  {board?.text && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleClearText} disabled={clearText.isPending}>
                        <Trash2 className="h-4 w-4 mr-2" /> Clear
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleCopyText}>
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </Button>
                    </>
                  )}
                  <Button size="sm" onClick={handleSaveText} disabled={saveText.isPending || !textContent.trim()}>
                    <Save className="h-4 w-4 mr-2" /> {saveText.isPending ? "Saving..." : "Save to Board"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {activeTab === "files" && (
          /* FILES PANEL */
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                Shared Files
              </CardTitle>
              <CardDescription>Drag and drop or browse to share (Max {MAX_UPLOAD_SIZE_LABEL})</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) handleFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }} 
                  multiple 
                />
                <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">Click to browse or drag files here</p>
                <p className="text-xs text-muted-foreground">Available instantly to everyone on your network</p>
              </div>

              {pendingUploads > 0 && (
                <div className="mt-4 rounded-lg border bg-muted/30 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      Uploading {pendingUploads} file{pendingUploads > 1 ? "s" : ""}...
                    </p>
                    <span className="text-xs text-muted-foreground">Please wait</span>
                  </div>
                  <Progress value={uploadProgressValue} className="h-2" />
                </div>
              )}

              {isBoardLoading ? null : board?.files && board.files.length > 0 ? (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Currently on board</h3>
                    <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={isDownloadingAll}>
                      <Download className="mr-2 h-4 w-4" />
                      {isDownloadingAll ? "Preparing zip..." : "Download all"}
                    </Button>
                  </div>
                  {board.files.map((file: BoardFileItem) => {
                    const isImage = isImageMime(file.mimeType);
                    return (
                    <div
                      key={file.id}
                      className="group flex cursor-pointer items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:border-primary/30"
                      onClick={() => setPreviewFile({ id: file.id, name: file.name, mimeType: file.mimeType })}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-primary/10 p-2 rounded-md shrink-0">
                          {isImage ? (
                            <ImageIcon className="h-5 w-5 text-primary" />
                          ) : (
                            <FileIcon className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span className="text-primary">Click to preview</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <DownloadButton fileId={file.id} />
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 text-center py-6">
                  <p className="text-sm text-muted-foreground">No files on the board right now.</p>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && <ImagePreviewContent fileId={previewFile.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
