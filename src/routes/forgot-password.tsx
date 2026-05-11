import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Forgot password — Athenaeum" }] }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { setSent(true); toast.success("Reset link sent — check your email."); }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-4xl font-semibold text-center">Reset password</h1>
        <p className="text-center text-muted-foreground mt-2">Enter your email and we'll send you a reset link.</p>
        <div className="mt-8 rounded-xl bg-card border border-border/60 p-6 shadow-[var(--shadow-book)]">
          {sent ? (
            <div className="text-center space-y-4">
              <p>Check your inbox for a password reset link.</p>
              <Link to="/auth"><Button variant="outline">Back to sign in</Button></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
              <div className="text-center text-sm">
                <Link to="/auth" className="text-primary hover:underline">Back to sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
