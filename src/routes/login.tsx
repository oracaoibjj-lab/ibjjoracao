import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo-ibjj.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — IBJJ" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = mode === "in"
      ? await signIn(email, password)
      : await signUp(email, password, fullName);
    setLoading(false);
    if (error) toast.error(error);
    else {
      toast.success(mode === "in" ? "Bem-vindo!" : "Cadastro feito! Você já pode entrar.");
      if (mode === "in") navigate({ to: "/" });
      else setMode("in");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-gold/10 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 mb-8">
          <img src={logo} alt="IBJJ" width={96} height={96} className="h-24 w-24" />
          <p className="font-display text-2xl text-primary-dark">Mural de Oração IBJJ</p>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-primary/5">
          <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-full">
            <button onClick={() => setMode("in")} className={`flex-1 py-2.5 rounded-full text-sm font-medium ${mode === "in" ? "bg-card shadow text-primary-dark" : "text-muted-foreground"}`}>Entrar</button>
            <button onClick={() => setMode("up")} className={`flex-1 py-2.5 rounded-full text-sm font-medium ${mode === "up" ? "bg-card shadow text-primary-dark" : "text-muted-foreground"}`}>Criar conta</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "up" && (
              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 h-12 rounded-xl" />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 h-12 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 h-12 rounded-xl" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark text-base">
              {loading ? "Aguarde..." : mode === "in" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
