import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Athenaeum" }] }),
});

function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (user) navigate({ to: "/books" });
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(signInData.email, signInData.password);
    if (error) { setLoading(false); toast.error(error); return; }
    // Block admin accounts from the member login route
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      if (roles?.some((r) => r.role === "admin")) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error("Administrators must sign in via the admin portal.");
        navigate({ to: "/admin-login" });
        return;
      }
    }
    setLoading(false);
    toast.success("Welcome back!");
    navigate({ to: "/books" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpData.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.name);
    setLoading(false);
    if (error) toast.error(error);
    else { toast.success("Account created!"); navigate({ to: "/books" }); }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-4xl font-semibold text-center">Welcome</h1>
        <p className="text-center text-muted-foreground mt-2">Sign in or create an account to start borrowing.</p>
        <div className="mt-8 rounded-xl bg-card border border-border/60 p-6 shadow-[var(--shadow-book)]">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div><Label>Email</Label><Input type="email" required value={signInData.email} onChange={(e) => setSignInData({ ...signInData, email: e.target.value })} /></div>
                <div><Label>Password</Label><Input type="password" required value={signInData.password} onChange={(e) => setSignInData({ ...signInData, password: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div><Label>Full name</Label><Input required value={signUpData.name} onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" required value={signUpData.email} onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} /></div>
                <div><Label>Password</Label><Input type="password" required minLength={6} value={signUpData.password} onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
