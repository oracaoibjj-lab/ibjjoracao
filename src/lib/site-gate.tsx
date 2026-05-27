import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Heart } from "lucide-react";

const STORAGE_KEY = "ibjj_site_unlocked";
const CORRECT_PASSWORD = "Jesuseocaminho";

type GateCtx = { unlocked: boolean };
const GateContext = createContext<GateCtx>({ unlocked: false });

export function useGate() {
  return useContext(GateContext);
}

export function SiteGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "1") setUnlocked(true);
    setChecked(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === CORRECT_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setInput("");
    }
  };

  if (!checked) return null;
  if (unlocked) {
    return (
      <GateContext.Provider value={{ unlocked }}>
        {children}
      </GateContext.Provider>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-4">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-4xl text-primary-dark">IBJJ</h1>
          <p className="mt-1 text-muted-foreground text-sm">Mural de Oração e Avisos</p>
        </div>

        <div className={`rounded-3xl border border-border bg-card p-8 shadow-sm ${shake ? "animate-[wiggle_0.4s_ease-in-out]" : ""}`}>
          <h2 className="font-display text-xl text-primary-dark text-center">Área restrita</h2>
          <p className="mt-1 text-sm text-muted-foreground text-center mb-6">
            Digite a senha da comunidade para acessar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                id="site-password"
                type="password"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(false); }}
                placeholder="Senha"
                autoFocus
                className={`w-full rounded-xl border px-4 py-3 text-base bg-background outline-none transition
                  focus:ring-2 focus:ring-primary/40
                  ${error ? "border-destructive focus:ring-destructive/40" : "border-border"}`}
              />
              {error && (
                <p className="mt-2 text-sm text-destructive text-center">Senha incorreta. Tente novamente.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground hover:bg-primary-dark transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground italic">
          "a igreja do Deus vivo, coluna e baluarte da verdade" — 1 Tm 3.15
        </p>
      </div>
    </div>
  );
}
