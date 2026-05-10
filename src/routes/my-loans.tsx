import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/my-loans")({
  component: MyLoans,
  head: () => ({ meta: [{ title: "My Loans — Athenaeum" }] }),
});

type Tx = {
  id: string; book_id: string; borrow_date: string; due_date: string;
  return_date: string | null; renewed_count: number;
  books: { title: string; author: string; available_copies: number } | null;
};

function MyLoans() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const { data: txs = [] } = useQuery({
    queryKey: ["my-loans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, book_id, borrow_date, due_date, return_date, renewed_count, books(title, author, available_copies)")
        .eq("user_id", user!.id)
        .order("borrow_date", { ascending: false });
      if (error) throw error;
      return data as unknown as Tx[];
    },
  });

  const active = txs.filter((t) => !t.return_date);
  const history = txs.filter((t) => t.return_date);

  const returnBook = async (tx: Tx) => {
    const { error } = await supabase.from("transactions").update({ return_date: new Date().toISOString() }).eq("id", tx.id);
    if (error) { toast.error(error.message); return; }
    if (tx.books) {
      await supabase.from("books").update({ available_copies: tx.books.available_copies + 1 }).eq("id", tx.book_id);
    }
    toast.success("Book returned");
    qc.invalidateQueries({ queryKey: ["my-loans"] });
    qc.invalidateQueries({ queryKey: ["books"] });
  };

  const renew = async (tx: Tx) => {
    if (tx.renewed_count >= 2) { toast.error("Max renewals reached"); return; }
    const newDue = new Date(tx.due_date); newDue.setDate(newDue.getDate() + 14);
    const { error } = await supabase.from("transactions")
      .update({ due_date: newDue.toISOString(), renewed_count: tx.renewed_count + 1 })
      .eq("id", tx.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Loan renewed for 14 more days");
    qc.invalidateQueries({ queryKey: ["my-loans"] });
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="font-display text-4xl font-semibold">My Loans</h1>

        <h2 className="font-display text-2xl mt-10 mb-4">Currently borrowed ({active.length})</h2>
        <div className="space-y-3">
          {active.length === 0 && <p className="text-muted-foreground">No active loans.</p>}
          {active.map((t) => {
            const overdue = new Date(t.due_date) < new Date();
            return (
              <div key={t.id} className="rounded-xl bg-card border border-border/60 p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold">{t.books?.title}</h3>
                  <p className="text-sm text-muted-foreground">{t.books?.author}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={overdue ? "destructive" : "secondary"}>
                      Due {new Date(t.due_date).toLocaleDateString()}
                    </Badge>
                    {t.renewed_count > 0 && <Badge variant="outline">Renewed × {t.renewed_count}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => renew(t)} disabled={t.renewed_count >= 2}>Renew</Button>
                  <Button onClick={() => returnBook(t)}>Return</Button>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="font-display text-2xl mt-12 mb-4">History ({history.length})</h2>
        <div className="space-y-2">
          {history.map((t) => (
            <div key={t.id} className="rounded-lg bg-card/60 border border-border/40 p-4 flex justify-between text-sm">
              <span className="font-medium">{t.books?.title}</span>
              <span className="text-muted-foreground">Returned {new Date(t.return_date!).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
