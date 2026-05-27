import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Heart, Home, Users, UsersRound, Megaphone, Shield, LogIn, LogOut, Menu, X, Calendar } from "lucide-react";
import { useState, type ReactNode } from "react";
import logo from "@/assets/logo-ibjj-novo.png";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Home; adminOnly?: boolean; memberOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/", label: "Início", icon: Home },
  { to: "/mural", label: "Mural", icon: Heart },
  { to: "/atividades", label: "Atividades", icon: Calendar },
  { to: "/membros", label: "Membros", icon: Users },
  { to: "/familias", label: "Famílias", icon: UsersRound },
  { to: "/avisos", label: "Avisos", icon: Megaphone },
  { to: "/admin", label: "Administração", icon: Shield, adminOnly: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, isApproved, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => (!n.adminOnly || isAdmin) && (!n.memberOnly || isApproved || isAdmin));
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="IBJJ" className="h-14 w-auto object-contain" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to as never}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  pathname === it.to
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!loading && user && (
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="hidden sm:inline-flex">
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </Button>
            )}
            <button
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-border bg-background">
            <nav className="mx-auto max-w-7xl px-4 py-3 grid gap-1">
              {items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to as never}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium",
                    pathname === it.to ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  )}
                >
                  <it.icon className="h-5 w-5" /> {it.label}
                </Link>
              ))}
              {user && (
                <button
                  onClick={async () => { setOpen(false); await signOut(); navigate({ to: "/" }); }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium hover:bg-secondary text-left"
                >
                  <LogOut className="h-5 w-5" /> Sair
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {user && !isApproved && !isAdmin && !loading && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-800 px-4 py-3 text-center text-sm font-medium">
          Sua conta foi criada e está aguardando aprovação do administrador para acesso completo.
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border mt-12 bg-secondary/10">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <p className="italic text-base">"a igreja do Deus vivo, coluna e baluarte da verdade"</p>
          <p className="mt-1 text-xs">1 Timóteo 3.15</p>
          {!loading && !user && (
            <Link to="/login" className="mt-4 text-xs text-muted-foreground/30 hover:text-primary transition-colors">
              Área Restrita
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
