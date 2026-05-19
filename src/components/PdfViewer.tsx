import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerUrl from "react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfViewer({ data }: { data: Uint8Array }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
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
    const update = () => setPageWidth(Math.min(window.innerWidth - 32, 900));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (renderError) {
    return <div className="p-6 text-center text-destructive">{renderError}</div>;
  }

  const canPrev = pageNumber > 1;
  const canNext = pageNumber < numPages;

  return (
    <div className="relative pb-24">
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
              <Loader2 className="animate-spin h-4 w-4" /> Loading book…
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={pageWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            onRenderError={(error) => {
              console.error(error);
              setRenderError("Failed to render this page");
            }}
            className="shadow-lg rounded-md overflow-hidden bg-white"
          />
        </Document>
      </div>

      {numPages > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border bg-card/95 backdrop-blur px-2 py-1.5 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm tabular-nums px-2 min-w-[70px] text-center font-medium">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={!canNext}
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
