import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerUrl from "react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfViewer({ data }: { data: Uint8Array }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [pageWidth, setPageWidth] = useState(800);
  const [renderError, setRenderError] = useState<string | null>(null);
  const pdfFile = useMemo(() => ({ data }), [data]);

  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast.message("Downloading is disabled. Read online only.");
      }
      if (e.key === "ArrowLeft") setPageNumber((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setPageNumber((p) => Math.min(numPages || p, p + 1));
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", keys);
    };
  }, [numPages]);

  useEffect(() => {
    const update = () => setPageWidth(Math.min(window.innerWidth - 48, 900));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (renderError) {
    return <Card className="p-6 text-center text-destructive">{renderError}</Card>;
  }

  return (
    <>
      <Card className="p-3 mb-4 flex items-center justify-between gap-2 flex-wrap sticky top-2 z-10 backdrop-blur bg-card/90">
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1} aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm tabular-nums px-2 min-w-[80px] text-center">
            {pageNumber} / {numPages || "…"}
          </span>
          <Button
            variant="outline" size="icon"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages} aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))}
            aria-label="Zoom out"
          >
            <ZoomOut />
          </Button>
          <span className="text-sm tabular-nums px-2 min-w-[56px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline" size="icon"
            onClick={() => setScale((s) => Math.min(2.5, +(s + 0.1).toFixed(2)))}
            aria-label="Zoom in"
          >
            <ZoomIn />
          </Button>
        </div>
      </Card>

      <div
        className="flex justify-center select-none"
        onContextMenu={(e) => e.preventDefault()}
        style={{ userSelect: "none" }}
      >
        <Document
          file={pdfFile}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(error) => {
            console.error(error);
            setRenderError("Failed to render PDF");
          }}
          loading={
            <div className="p-12 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="animate-spin h-4 w-4" /> Rendering…
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={pageWidth * scale}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            onRenderError={(error) => {
              console.error(error);
              setRenderError("Failed to render this page");
            }}
            className="shadow-[var(--shadow-book)] rounded-md overflow-hidden bg-white"
          />
        </Document>
      </div>
    </>
  );
}
