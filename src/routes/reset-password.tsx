import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Set new password — Athenaeum" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated. Please sign in."); await supabase.auth.signOut(); navigate({ to: "/auth" }); }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-4xl font-semibold text-center">Set new password</h1>
        <div className="mt-8 rounded-xl bg-card border border-border/60 p-6 shadow-[var(--shadow-book)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>New password</Label><PasswordInput required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div><Label>Confirm password</Label><PasswordInput required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating..." : "Update password"}</Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
