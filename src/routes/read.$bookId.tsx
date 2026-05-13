import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

const PdfViewer = lazy(() => import("@/components/PdfViewer"));

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (loading || !mounted) return;
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
  }, [user, loading, bookId, navigate, mounted]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-4">
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

        {error && <Card className="p-6 text-center"><p className="text-destructive">{error}</p></Card>}

        {!error && (!pdfData || !mounted) && (
          <Card className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="animate-spin" />
            <p>Loading book…</p>
          </Card>
        )}

        {mounted && pdfData && !error && (
          <Suspense fallback={
            <Card className="p-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="animate-spin" />
            </Card>
          }>
            <PdfViewer data={pdfData} />
          </Suspense>
        )}
      </div>
    </Layout>
  );
}
