import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

type DownloadPayload = {
  name: string;
  mimeType: string;
  dataBase64: string;
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

export function FilePreviewPage() {
  const [match, params] = useRoute<{ id: string }>("/files/:id");
  const [data, setData] = useState<DownloadPayload | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!match || !params?.id) {
      return;
    }

    let isMounted = true;
    let nextUrl: string | null = null;

    const load = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/files/${params.id}/download`);
        if (!response.ok) {
          throw new Error("Preview could not be loaded.");
        }

        const payload = (await response.json()) as DownloadPayload;
        const blob = base64ToBlob(payload.dataBase64, payload.mimeType);
        nextUrl = URL.createObjectURL(blob);

        if (!isMounted) {
          return;
        }

        setData(payload);
        setObjectUrl(nextUrl);

        if (isTextLikeMime(payload.mimeType)) {
          const text = await blob.text();
          if (isMounted) {
            setTextPreview(text);
          }
        } else if (isMounted) {
          setTextPreview("");
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Preview could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
      if (nextUrl) {
        URL.revokeObjectURL(nextUrl);
      }
    };
  }, [match, params?.id]);

  if (!match) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#111111] text-foreground">
      {isLoading ? (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : data && objectUrl && isImageMime(data.mimeType) ? (
        <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4 sm:p-6">
          <img
            src={objectUrl}
            alt={data.name}
            className="block max-h-[calc(100vh-8rem)] max-w-full h-auto w-auto rounded-xl object-contain shadow-2xl"
          />
        </div>
      ) : data && objectUrl && isVideoMime(data.mimeType) ? (
        <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4 sm:p-6">
          <video
            src={objectUrl}
            controls
            className="block max-h-[calc(100vh-8rem)] max-w-full rounded-xl bg-black object-contain shadow-2xl"
          />
        </div>
      ) : data && objectUrl && isPdfMime(data.mimeType) ? (
        <iframe src={objectUrl} title={data.name} className="h-screen w-full bg-background" />
      ) : data && objectUrl && isAudioMime(data.mimeType) ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold">{data.name}</h1>
            <p className="text-sm text-muted-foreground">{data.mimeType}</p>
          </div>
          <div className="w-full max-w-2xl rounded-xl border bg-muted/20 p-6">
            <audio src={objectUrl} controls className="w-full" />
          </div>
        </div>
      ) : data && isTextLikeMime(data.mimeType) ? (
        <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-white">{data.name}</h1>
              <p className="text-sm text-muted-foreground">{data.mimeType}</p>
            </div>
            <Button onClick={() => triggerBrowserDownload(base64ToBlob(data.dataBase64, data.mimeType), data.name)}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
          <div className="overflow-auto rounded-xl border border-white/10 bg-black/40 p-4">
            <pre className="whitespace-pre-wrap break-words text-sm text-slate-100">{textPreview}</pre>
          </div>
        </div>
      ) : data ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
          <p className="text-sm text-muted-foreground">Preview is not available for this file type.</p>
          <Button onClick={() => triggerBrowserDownload(base64ToBlob(data.dataBase64, data.mimeType), data.name)}>
            <Download className="mr-2 h-4 w-4" />
            Download file
          </Button>
        </div>
      ) : null}
    </div>
  );
}
