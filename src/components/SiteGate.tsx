import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-ibjj.png";

const KEY = "ibjj_site_access";
const PASSWORD = "Jesuseocaminho";

export function SiteGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(KEY) === "1") setOk(true);
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-gold/10 px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center gap-3 mb-8">
            <img src={logo} alt="IBJJ" className="h-24 w-24" />
            <p className="font-display text-2xl text-primary-dark">Mural de Oração IBJJ</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pwd === PASSWORD) {
                localStorage.setItem(KEY, "1");
                setOk(true);
              } else {
                setErr(true);
              }
            }}
            className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-primary/5 space-y-4"
          >
            <div className="flex items-center gap-2 text-primary-dark">
              <Lock className="h-5 w-5" />
              <h1 className="font-display text-xl">Acesso ao site</h1>
            </div>
            <p className="text-sm text-muted-foreground">Digite a senha para entrar no mural da igreja.</p>
            <Input
              type="password"
              autoFocus
              placeholder="Senha"
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setErr(false); }}
              className="h-12 rounded-xl"
            />
            {err && <p className="text-sm text-destructive">Senha incorreta. Tente novamente.</p>}
            <Button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
