import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/read/$bookId")({
  component: ReadPage,
  head: () => ({ meta: [{ title: "Read — Athenaeum" }] }),
});

function ReadPage() {
  const { bookId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }

    (async () => {
      const { data: book, error: bErr } = await supabase
        .from("books").select("title, pdf_path").eq("id", bookId).single();
      if (bErr || !book) { setError("Book not found"); return; }
      setTitle(book.title);
      if (!book.pdf_path) { setError("No PDF available for this book"); return; }

      const { data, error: sErr } = await supabase
        .storage.from("book-pdfs").createSignedUrl(book.pdf_path, 60 * 30);
      if (sErr || !data) {
        setError("You need an active loan for this book to read it.");
        return;
      }
      setUrl(data.signedUrl);
    })();
  }, [user, loading, bookId, navigate]);

  // Block context menu / keyboard download shortcuts on this page
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast.message("Downloading is disabled. Read online only.");
      }
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", keys);
    };
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <h1 className="font-display text-2xl font-semibold mb-1">{title || "Reader"}</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Read-only access. Download and printing are disabled.
        </p>
        {error && <p className="text-destructive">{error}</p>}
        {url && (
          <div className="rounded-xl overflow-hidden border border-border/60 bg-card" style={{ height: "80vh" }}>
            <iframe
              title={title}
              src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}
        {!url && !error && <p className="text-muted-foreground">Loading…</p>}
      </div>
    </Layout>
  );
}
