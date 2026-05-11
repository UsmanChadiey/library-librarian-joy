import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/books")({
  component: BooksPage,
  head: () => ({ meta: [{ title: "Catalog — Athenaeum" }] }),
});

function BooksPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string>("All");

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });

  const genres = ["All", ...Array.from(new Set(books.map((b) => b.genre).filter(Boolean) as string[]))];
  const filtered = books.filter((b) => {
    const matchesQ = !q || b.title.toLowerCase().includes(q.toLowerCase()) || b.author.toLowerCase().includes(q.toLowerCase());
    const matchesG = genre === "All" || b.genre === genre;
    return matchesQ && matchesG;
  });

  const borrow = async (bookId: string, available: number) => {
    if (!user) { toast.error("Please sign in to borrow"); return; }
    if (available < 1) { toast.error("Not available"); return; }
    const due = new Date(); due.setDate(due.getDate() + 14);
    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: user.id, book_id: bookId, due_date: due.toISOString(),
    });
    if (txErr) { toast.error(txErr.message); return; }
    const { error: upErr } = await supabase.from("books").update({ available_copies: available - 1 }).eq("id", bookId);
    if (upErr) { toast.error(upErr.message); return; }
    toast.success("Book borrowed! Due in 14 days.");
    qc.invalidateQueries({ queryKey: ["books"] });
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-4xl font-semibold">Catalog</h1>
            <p className="text-muted-foreground mt-1">{books.length} books available to borrow.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search title or author..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {genres.map((g) => (
            <button key={g} onClick={() => setGenre(g)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${genre === g ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
              {g}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((b) => (
              <div key={b.id} className="rounded-xl bg-card border border-border/60 p-5 shadow-[var(--shadow-book)] flex flex-col">
                <div className="aspect-[3/4] rounded-md bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                  <BookOpen className="w-12 h-12 text-primary/60" />
                </div>
                <h3 className="font-display text-lg font-semibold leading-tight">{b.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{b.author}</p>
                <div className="flex items-center gap-2 mt-2">
                  {b.genre && <Badge variant="secondary">{b.genre}</Badge>}
                  <Badge variant={b.available_copies > 0 ? "default" : "destructive"}>
                    {b.available_copies > 0 ? `${b.available_copies} available` : "Out"}
                  </Badge>
                </div>
                <div className="mt-auto pt-4">
                  {role === "admin" ? null : user ? (
                    <Button className="w-full" disabled={b.available_copies < 1} onClick={() => borrow(b.id, b.available_copies)}>
                      Borrow
                    </Button>
                  ) : (
                    <Link to="/auth"><Button className="w-full" variant="outline">Sign in to borrow</Button></Link>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-muted-foreground col-span-full">No books match your search.</p>}
          </div>
        )}
      </div>
    </Layout>
  );
}
