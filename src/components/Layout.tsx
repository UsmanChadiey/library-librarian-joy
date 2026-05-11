import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, LogOut, Shield, User as UserIcon, Library } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 backdrop-blur-md bg-background/70 sticky top-0 z-40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <Library className="w-6 h-6" />
            <span className="font-display text-xl font-semibold">Athenaeum</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/books">
              <Button variant="ghost" size="sm"><BookOpen className="w-4 h-4 mr-1" />Catalog</Button>
            </Link>
            {user && role !== "admin" && (
              <Link to="/my-loans">
                <Button variant="ghost" size="sm"><UserIcon className="w-4 h-4 mr-1" />My Loans</Button>
              </Link>
            )}
            {role === "admin" && (
              <Link to="/admin">
                <Button variant="ghost" size="sm"><Shield className="w-4 h-4 mr-1" />Admin</Button>
              </Link>
            )}
            {user ? (
              <>
                <Link to="/account">
                  <Button variant="ghost" size="sm">Account</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                  <LogOut className="w-4 h-4 mr-1" />Sign out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/60 py-6 text-center text-sm text-muted-foreground">
        Athenaeum Library · SEN201 Project
      </footer>
    </div>
  );
}
