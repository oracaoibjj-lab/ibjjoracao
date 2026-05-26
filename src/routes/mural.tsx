import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Plus, HandHeart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const CATEGORIES = [
  { v: "saude", l: "Saúde" },
  { v: "trabalho", l: "Trabalho" },
  { v: "familia", l: "Família" },
  { v: "espiritual", l: "Espiritual" },
  { v: "viagens", l: "Viagens" },
  { v: "gratidao", l: "Gratidão" },
  { v: "outros", l: "Outros" },
] as const;

export const Route = createFileRoute("/mural")({
  head: () => ({ meta: [{ title: "Mural de Oração — IBJJ" }] }),
  component: MuralPage,
});

function MuralPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: prayers, isLoading } = useQuery({
    queryKey: ["prayers", filterCat, filterType],
    queryFn: async () => {
      let q = supabase
        .from("prayer_requests")
        .select("*, members(id, full_name, photo_url)")
        .eq("status", "aprovado")
        .order("created_at", { ascending: false });
      if (filterCat !== "all") q = q.eq("category", filterCat as never);
      if (filterType !== "all") q = q.eq("type", filterType as never);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: myReactions } = useQuery({
    queryKey: ["my-reactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("reactions").select("prayer_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((r) => r.prayer_id));
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["reaction-counts", prayers?.map((p) => p.id).join(",")],
    enabled: !!prayers,
    queryFn: async () => {
      if (!prayers || prayers.length === 0) return {} as Record<string, number>;
      const { data } = await supabase.from("reactions").select("prayer_id").in("prayer_id", prayers.map((p) => p.id));
      const map: Record<string, number> = {};
      (data ?? []).forEach((r) => { map[r.prayer_id] = (map[r.prayer_id] ?? 0) + 1; });
      return map;
    },
  });

  const toggleReact = async (prayerId: string) => {
    if (!user) { navigate({ to: "/login" }); return; }
    const has = myReactions?.has(prayerId);
    if (has) {
      await supabase.from("reactions").delete().eq("prayer_id", prayerId).eq("user_id", user.id);
    } else {
      await supabase.from("reactions").insert({ prayer_id: prayerId, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["my-reactions"] });
    qc.invalidateQueries({ queryKey: ["reaction-counts"] });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-primary-dark">Mural de Oração</h1>
          <p className="mt-2 text-muted-foreground text-lg">Compartilhe pedidos, agradeça e ore pelos irmãos.</p>
        </div>
        <NewPrayerDialog />
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44 rounded-full bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="pedido">Pedidos</SelectItem>
            <SelectItem value="agradecimento">Gratidão</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44 rounded-full bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="grid md:grid-cols-2 gap-5">
        {prayers?.map((p) => {
          const reacted = myReactions?.has(p.id);
          const count = counts?.[p.id] ?? 0;
          const isThanks = p.type === "agradecimento";
          return (
            <article key={p.id} className={`rounded-3xl border p-6 transition hover:shadow-lg ${isThanks ? "border-gold/40 bg-gold/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
                <span className={`rounded-full px-2.5 py-1 font-semibold ${isThanks ? "bg-gold/25 text-gold-foreground" : "bg-primary/10 text-primary"}`}>
                  {isThanks ? "Gratidão" : "Pedido"}
                </span>
                <span className="text-muted-foreground">{CATEGORIES.find((c) => c.v === p.category)?.l}</span>
              </div>

              {(p as any).members && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-background/60 border border-border/60 p-3">
                  {(p as any).members.photo_url ? (
                    <img src={(p as any).members.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                      {((p as any).members.full_name as string).slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{isThanks ? "Por" : "Para"}</p>
                    <p className="text-sm font-medium text-primary-dark truncate">{(p as any).members.full_name}</p>
                  </div>
                </div>
              )}

              <h3 className="mt-4 font-display text-2xl text-primary-dark">{p.title}</h3>
              <p className="mt-2 text-foreground/80 whitespace-pre-wrap">{p.description}</p>
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {p.is_anonymous ? "Enviado anonimamente" : `Por ${p.display_name ?? "Membro"}`} • {format(new Date(p.created_at), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <button
                  onClick={() => toggleReact(p.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${reacted ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-primary/10"}`}
                >
                  <HandHeart className="h-4 w-4" /> {reacted ? "Orando" : "Estou orando"} {count > 0 && <span className="ml-1 opacity-80">· {count}</span>}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {prayers && prayers.length === 0 && (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg text-muted-foreground">Nenhum pedido aprovado ainda.</p>
        </div>
      )}
    </div>
  );
}

function NewPrayerDialog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("outros");
  const [type, setType] = useState<"pedido" | "agradecimento">("pedido");
  const [memberId, setMemberId] = useState<string>("");
  const [anon, setAnon] = useState(false);
  const [whole, setWhole] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["members-options"],
    enabled: open,
    queryFn: async () => (await supabase.from("members").select("id, full_name").order("full_name")).data ?? [],
  });

  const open_ = () => {
    if (!user) { navigate({ to: "/login" }); return; }
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!memberId) { toast.error("Selecione o membro a quem este pedido se refere"); return; }
    setLoading(true);
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("prayer_requests").insert({
      author_id: user.id,
      member_id: memberId,
      title, description: desc,
      category: cat as never, type,
      is_anonymous: anon, is_whole_family: whole,
      status: "pendente",
      display_name: prof?.full_name ?? null,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Pedido enviado! Aguardando aprovação.");
      setOpen(false);
      setTitle(""); setDesc(""); setCat("outros"); setAnon(false); setWhole(false); setType("pedido"); setMemberId("");
      qc.invalidateQueries({ queryKey: ["prayers"] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={open_} className="rounded-full bg-primary text-primary-foreground hover:bg-primary-dark h-12 px-6 text-base">
          <Plus className="h-5 w-5 mr-2" /> Novo pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl text-primary-dark">Enviar ao mural</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            {(["pedido", "agradecimento"] as const).map((t) => (
              <button type="button" key={t} onClick={() => setType(t)} className={`flex-1 rounded-xl py-3 text-sm font-medium border ${type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
                {t === "pedido" ? "Pedido de oração" : "Agradecimento"}
              </button>
            ))}
          </div>
          <div>
            <Label>{type === "pedido" ? "Para qual membro?" : "Em nome de qual membro?"} *</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger className="mt-1 h-12 rounded-xl"><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {members?.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="t">Título</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className="mt-1 h-12 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="d">Descrição</Label>
            <Textarea id="d" value={desc} onChange={(e) => setDesc(e.target.value)} required maxLength={1000} rows={4} className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="mt-1 h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label htmlFor="anon" className="cursor-pointer">Enviar como anônimo</Label>
            <Switch id="anon" checked={anon} onCheckedChange={setAnon} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label htmlFor="wf" className="cursor-pointer">Em nome da família inteira</Label>
            <Switch id="wf" checked={whole} onCheckedChange={setWhole} />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground">
            {loading ? "Enviando..." : "Enviar para aprovação"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Seu pedido aparecerá no mural após ser aprovado pela administração.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
