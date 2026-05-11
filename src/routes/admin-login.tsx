import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
  head: () => ({ meta: [{ title: "Admin Login — Athenaeum" }] }),
});

function AdminLoginPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ email: "", password: "" });

  useEffect(() => {
    if (user && role === "admin") navigate({ to: "/admin" });
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signIn, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error || !signIn.user) {
      setLoading(false);
      toast.error(error?.message ?? "Sign in failed");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", signIn.user.id);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account does not have admin access.");
      return;
    }
    setLoading(false);
    toast.success("Welcome, administrator.");
    navigate({ to: "/admin" });
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Shield className="w-7 h-7" />
          </div>
        </div>
        <h1 className="font-display text-4xl font-semibold text-center">Administrator Sign-in</h1>
        <p className="text-center text-muted-foreground mt-2">
          Restricted access. Members should use the regular sign-in page.
        </p>
        <div className="mt-8 rounded-xl bg-card border border-border/60 p-6 shadow-[var(--shadow-book)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Admin email</Label>
              <Input type="email" required value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Sign in as admin"}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
