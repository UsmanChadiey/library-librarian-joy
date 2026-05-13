import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Athenaeum" }] }),
});

function AdminPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/admin-login" });
      else if (role && role !== "admin") navigate({ to: "/admin-login" });
    }
  }, [user, role, loading, navigate]);

  const { data: books = [] } = useQuery({
    queryKey: ["admin-books"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("books").select("*").order("title")).data ?? [],
  });

  const { data: txs = [] } = useQuery({
    queryKey: ["admin-tx"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("transactions").select("*, books(title)").order("borrow_date", { ascending: false })).data ?? [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const [newBook, setNewBook] = useState({ title: "", author: "", genre: "", isbn: "", description: "", total_copies: 1 });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  const addBook = async () => {
    if (!newBook.title || !newBook.author) { toast.error("Title and author required"); return; }
    setUploading(true);
    let pdf_path: string | null = null;
    if (pdfFile) {
      if (pdfFile.type !== "application/pdf") { toast.error("PDF file required"); setUploading(false); return; }
      const path = `${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage.from("book-pdfs").upload(path, pdfFile, {
        contentType: "application/pdf",
      });
      if (upErr) { toast.error(upErr.message); setUploading(false); return; }
      pdf_path = path;
    }
    const { error } = await supabase.from("books").insert({
      ...newBook,
      available_copies: newBook.total_copies,
      isbn: newBook.isbn || null, genre: newBook.genre || null, description: newBook.description || null,
      pdf_path,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Book added");
    setNewBook({ title: "", author: "", genre: "", isbn: "", description: "", total_copies: 1 });
    setPdfFile(null);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-books"] });
    qc.invalidateQueries({ queryKey: ["books"] });
  };

  const deleteBook = async (id: string) => {
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Book deleted");
    qc.invalidateQueries({ queryKey: ["admin-books"] });
  };

  if (role !== "admin") return <Layout><div className="container mx-auto p-12 text-center text-muted-foreground">Verifying access…</div></Layout>;

  const activeLoans = txs.filter((t: any) => !t.return_date).length;
  const overdue = txs.filter((t: any) => !t.return_date && new Date(t.due_date) < new Date()).length;

  return (
    <Layout>
      <div className="container mx-auto px-6 py-12">
        <h1 className="font-display text-4xl font-semibold">Admin Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: "Books", value: books.length },
            { label: "Members", value: users.length },
            { label: "Active loans", value: activeLoans },
            { label: "Overdue", value: overdue, danger: true },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-card border border-border/60 p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`mt-1 text-3xl font-display font-semibold ${s.danger && s.value > 0 ? "text-destructive" : ""}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="books" className="mt-10">
          <TabsList>
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="loans">Transactions</TabsTrigger>
            <TabsTrigger value="users">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="books" className="mt-6">
            <div className="flex justify-end mb-4">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" />Add book</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add a new book</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Title</Label><Input value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} /></div>
                    <div><Label>Author</Label><Input value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Genre</Label><Input value={newBook.genre} onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })} /></div>
                      <div><Label>ISBN</Label><Input value={newBook.isbn} onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })} /></div>
                    </div>
                    <div><Label>Copies</Label><Input type="number" min={1} value={newBook.total_copies} onChange={(e) => setNewBook({ ...newBook, total_copies: parseInt(e.target.value) || 1 })} /></div>
                    <div><Label>Description</Label><Textarea value={newBook.description} onChange={(e) => setNewBook({ ...newBook, description: e.target.value })} /></div>
                    <div>
                      <Label>PDF file (optional)</Label>
                      <Input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
                      {pdfFile && <p className="text-xs text-muted-foreground mt-1">{pdfFile.name}</p>}
                    </div>
                    <Button onClick={addBook} className="w-full" disabled={uploading}>
                      {uploading ? "Uploading…" : "Add book"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-xl bg-card border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left"><tr>
                  <th className="p-3">Title</th><th className="p-3">Author</th><th className="p-3">Genre</th><th className="p-3">Available</th><th></th>
                </tr></thead>
                <tbody>
                  {books.map((b) => (
                    <tr key={b.id} className="border-t border-border/40">
                      <td className="p-3 font-medium">{b.title}</td>
                      <td className="p-3 text-muted-foreground">{b.author}</td>
                      <td className="p-3">{b.genre || "—"}</td>
                      <td className="p-3">{b.available_copies}/{b.total_copies}</td>
                      <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => deleteBook(b.id)}><Trash2 className="w-4 h-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="loans" className="mt-6">
            <div className="rounded-xl bg-card border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left"><tr>
                  <th className="p-3">Member</th><th className="p-3">Book</th><th className="p-3">Borrowed</th><th className="p-3">Due</th><th className="p-3">Status</th>
                </tr></thead>
                <tbody>
                  {txs.map((t: any) => {
                    const overdue = !t.return_date && new Date(t.due_date) < new Date();
                    return (
                      <tr key={t.id} className="border-t border-border/40">
                        <td className="p-3">{users.find((u) => u.id === t.user_id)?.name ?? "—"}</td>
                        <td className="p-3 font-medium">{t.books?.title}</td>
                        <td className="p-3">{new Date(t.borrow_date).toLocaleDateString()}</td>
                        <td className="p-3">{new Date(t.due_date).toLocaleDateString()}</td>
                        <td className="p-3">
                          {t.return_date ? <Badge variant="secondary">Returned</Badge> : overdue ? <Badge variant="destructive">Overdue</Badge> : <Badge>Active</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <div className="rounded-xl bg-card border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left"><tr>
                  <th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Joined</th>
                </tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border/40">
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
