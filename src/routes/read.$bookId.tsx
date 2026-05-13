import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Use the worker bundled with pdfjs-dist (served from CDN to avoid bundling issues)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const Route = createFileRoute("/read/$bookId")({
  component: ReadPage,
  head: () => ({ meta: [{ title: "Read — Athenaeum" }] }),
});

function ReadPage() {
  const { bookId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [pageWidth, setPageWidth] = useState<number>(800);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }

    (async () => {
      const { data: book, error: bErr } = await supabase
        .from("books").select("title, pdf_path").eq("id", bookId).single();
      if (bErr || !book) { setError("Book not found"); return; }
      setTitle(book.title);
      if (!book.pdf_path) { setError("No PDF available for this book"); return; }

      const { data, error: dErr } = await supabase
        .storage.from("book-pdfs").download(book.pdf_path);
      if (dErr || !data) {
        setError("You need an active loan for this book to read it.");
        return;
      }
      const buf = await data.arrayBuffer();
      setPdfData(new Uint8Array(buf));
    })();
  }, [user, loading, bookId, navigate]);

  // Block download / print shortcuts and right-click
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

  // Responsive page width
  useEffect(() => {
    const update = () => {
      const w = Math.min(window.innerWidth - 48, 900);
      setPageWidth(w);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/my-loans"><ArrowLeft /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-semibold truncate">
                {title || "Reader"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Read-only · Download &amp; print disabled
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Card className="p-6 text-center">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        {!error && !pdfData && (
          <Card className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="animate-spin" />
            <p>Loading book…</p>
          </Card>
        )}

        {pdfData && (
          <>
            {/* Toolbar */}
            <Card className="p-3 mb-4 flex items-center justify-between gap-2 flex-wrap sticky top-2 z-10 backdrop-blur bg-card/90">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </Button>
                <span className="text-sm tabular-nums px-2 min-w-[80px] text-center">
                  {pageNumber} / {numPages || "…"}
                </span>
                <Button
                  variant="outline" size="icon"
                  onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                  disabled={pageNumber >= numPages}
                  aria-label="Next page"
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

            {/* PDF */}
            <div
              className="flex justify-center select-none"
              onContextMenu={(e) => e.preventDefault()}
              style={{ userSelect: "none" }}
            >
              <Document
                file={{ data: pdfData }}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                onLoadError={() => setError("Failed to render PDF")}
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
                  className="shadow-[var(--shadow-book)] rounded-md overflow-hidden bg-white"
                />
              </Document>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
