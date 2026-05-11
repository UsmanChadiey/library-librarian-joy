import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({ meta: [{ title: "Account — Athenaeum" }] }),
});

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else { toast.success("Password changed successfully."); setPassword(""); setConfirm(""); }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-4xl font-semibold">Account</h1>
        <p className="text-muted-foreground mt-2">{user?.email}</p>
        <div className="mt-8 rounded-xl bg-card border border-border/60 p-6 shadow-[var(--shadow-book)]">
          <h2 className="font-display text-xl font-semibold mb-4">Change password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>New password</Label><PasswordInput required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div><Label>Confirm new password</Label><PasswordInput required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Updating..." : "Update password"}</Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
