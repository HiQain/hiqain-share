import {
  useGetBoard,
  useSaveText,
  useClearText,
  useUploadFile,
  useDeleteFile,
  useDownloadFile,
  useListDevices,
  useGetActivity,
  getGetBoardQueryKey,
  getListDevicesQueryKey,
  getGetActivityQueryKey,
  getListFilesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon, Smartphone, Laptop, Trash2, Download, Copy, Save, AlertCircle, Clock, CheckCircle2, UploadCloud, X, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const POLL_INTERVAL = 3000;

export function Home() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: board, isLoading: isBoardLoading } = useGetBoard({
    query: { refetchInterval: POLL_INTERVAL },
  });

  const { data: devices, isLoading: isDevicesLoading } = useListDevices({
    query: { refetchInterval: POLL_INTERVAL },
  });

  const { data: activity, isLoading: isActivityLoading } = useGetActivity({
    query: { refetchInterval: POLL_INTERVAL },
  });

  const saveText = useSaveText();
  const clearText = useClearText();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  const [textContent, setTextContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync text from server if not editing
  useEffect(() => {
    if (board?.text && !document.activeElement?.matches('textarea')) {
      setTextContent(board.text.content);
    } else if (!board?.text && !document.activeElement?.matches('textarea')) {
      setTextContent("");
    }
  }, [board?.text]);

  const handleSaveText = () => {
    if (!textContent.trim()) return;
    saveText.mutate({ data: { content: textContent } }, {
      onSuccess: () => {
        toast({ title: "Text saved", description: "Copied to shared clipboard." });
        queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActivityQueryKey() });
      }
    });
  };

  const handleClearText = () => {
    clearText.mutate(undefined, {
      onSuccess: () => {
        setTextContent("");
        toast({ title: "Text cleared" });
        queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActivityQueryKey() });
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
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 10MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) return;
        
        const base64Data = result.split(",")[1];
        
        uploadFile.mutate({
          data: {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            dataBase64: base64Data,
          }
        }, {
          onSuccess: () => {
            toast({ title: "File uploaded", description: `${file.name} shared successfully.` });
            queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetActivityQueryKey() });
          },
          onError: () => {
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
        queryClient.invalidateQueries({ queryKey: getGetActivityQueryKey() });
      }
    });
  };

  // Download File component
  const DownloadButton = ({ fileId, fileName }: { fileId: string, fileName: string }) => {
    const { refetch, isFetching } = useDownloadFile(fileId, { query: { enabled: false } });
    
    const onDownload = async () => {
      const { data } = await refetch();
      if (data?.dataBase64) {
        const byteCharacters = atob(data.dataBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    };

    return (
      <Button variant="secondary" size="icon" onClick={onDownload} disabled={isFetching}>
        <Download className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Your Network Board</h1>
        <p className="text-muted-foreground text-lg">
          Anyone on your current Wi-Fi network can see this board. Things disappear after 30 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* TEXT PANEL */}
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
              <div className="bg-muted/30 px-4 py-3 flex items-center justify-between border-t">
                <div className="text-xs text-muted-foreground">
                  {textContent.length} chars
                  {board?.text && <span className="ml-2">• Last saved by {board.text.deviceLabel}</span>}
                </div>
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

          {/* FILES PANEL */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                Shared Files
              </CardTitle>
              <CardDescription>Drag and drop or browse to share (Max 10MB)</CardDescription>
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

              {isBoardLoading ? (
                <div className="mt-6 space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : board?.files && board.files.length > 0 ? (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Currently on board</h3>
                  {board.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-primary/10 p-2 rounded-md shrink-0">
                          <FileIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>By {file.deviceLabel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <DownloadButton fileId={file.id} fileName={file.name} />
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteFile(file.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 text-center py-6">
                  <p className="text-sm text-muted-foreground">No files on the board right now.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          
          {/* DEVICES */}
          <Card className="shadow-sm border-none bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                Devices on this network
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isDevicesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {devices?.map((device) => (
                    <div key={device.id} className={`flex items-center gap-3 p-2 rounded-md ${device.isCurrent ? 'bg-primary/10 border border-primary/20' : 'bg-background'}`}>
                      <div className="p-1.5 bg-muted rounded-md text-muted-foreground">
                        {device.userAgent.toLowerCase().includes('mobile') ? (
                          <Smartphone className="h-4 w-4" />
                        ) : (
                          <Laptop className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">
                          {device.label}
                          {device.isCurrent && <span className="ml-2 text-xs text-primary font-normal">(You)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Active {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ACTIVITY FEED */}
          <Card className="shadow-sm border-none bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                {isActivityLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : activity && activity.length > 0 ? (
                  <div className="space-y-4">
                    {activity.map((item) => (
                      <div key={item.id} className="flex gap-3 text-sm">
                        <div className="mt-0.5 shrink-0 text-muted-foreground">
                          {item.kind.includes('text') ? <FileIcon className="h-3 w-3" /> :
                           item.kind.includes('file') ? <UploadCloud className="h-3 w-3" /> :
                           <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <div>
                          <p className="text-foreground">{item.summary}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
