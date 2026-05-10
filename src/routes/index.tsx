import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, RotateCw, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Athenaeum — A modern library, beautifully managed" },
      { name: "description", content: "Browse the catalog, borrow books, track due dates, and manage your library — all in one place." },
    ],
  }),
});

function Index() {
  return (
    <Layout>
      <section className="container mx-auto px-6 pt-20 pb-24 text-center max-w-4xl">
        <div className="inline-block px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium tracking-wide uppercase">
          SEN201 Project · Library Management System
        </div>
        <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold leading-[1.05] text-foreground">
          A library that runs itself —
          <span className="text-primary"> beautifully</span>.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Catalog books, register members, borrow and return with a click,
          and generate reports. Built with role-based access for members and admins.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/books"><Button size="lg">Browse the catalog</Button></Link>
          <Link to="/auth"><Button size="lg" variant="outline">Create an account</Button></Link>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24 grid md:grid-cols-4 gap-6">
        {[
          { icon: BookOpen, title: "Cataloguing", desc: "Curated catalog with covers, genres, ISBN, and availability." },
          { icon: Search, title: "Search & filter", desc: "Find books by title, author, or genre instantly." },
          { icon: RotateCw, title: "Borrow & renew", desc: "Track due dates and renew loans seamlessly." },
          { icon: Shield, title: "Role-based access", desc: "Members borrow. Admins manage and report." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl bg-card border border-border/60 p-6 shadow-[var(--shadow-book)]">
            <f.icon className="w-6 h-6 text-primary" />
            <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </Layout>
  );
}
