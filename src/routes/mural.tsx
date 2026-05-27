import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Plus, HandHeart, Printer, Loader2 } from "lucide-react";
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
  const { user, isApproved, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [exportingPdf, setExportingPdf] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

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

  const monthsOptions = useMemo(() => {
    if (!prayers) return [];
    const months = new Set<string>();
    prayers.forEach((p) => {
      const date = new Date(p.created_at);
      const key = format(date, "yyyy-MM");
      months.add(key);
    });
    return Array.from(months)
      .sort((a, b) => b.localeCompare(a))
      .map((m) => {
        const [year, month] = m.split("-").map(Number);
        const date = new Date(year, month - 1, 1);
        return {
          value: m,
          label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
        };
      });
  }, [prayers]);

  const filteredPrayers = useMemo(() => {
    if (!prayers) return [];
    return prayers.filter((p) => {
      const matchesCat = filterCat === "all" || p.category === filterCat;
      const matchesType = filterType === "all" || p.type === filterType;
      
      let matchesMonth = true;
      if (filterMonth !== "all") {
        const date = new Date(p.created_at);
        const key = format(date, "yyyy-MM");
        matchesMonth = key === filterMonth;
      }
      
      return matchesCat && matchesType && matchesMonth;
    });
  }, [prayers, filterCat, filterType, filterMonth]);

  const getSessionId = () => {
    let sid = localStorage.getItem("ibjj_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("ibjj_session_id", sid);
    }
    return sid;
  };

  const { data: myReactions } = useQuery({
    queryKey: ["my-reactions", user?.id],
    queryFn: async () => {
      const sid = getSessionId();
      let q = supabase.from("reactions").select("prayer_id");
      if (user) q = q.eq("user_id", user.id);
      else q = q.eq("session_id", sid);
      const { data } = await q;
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
    const sid = getSessionId();
    const has = myReactions?.has(prayerId);

    // Atualização otimista
    qc.setQueryData(["my-reactions", user?.id], (old: Set<string> | undefined) => {
      const next = new Set(old ?? []);
      if (has) next.delete(prayerId);
      else next.add(prayerId);
      return next;
    });
    qc.setQueryData(["reaction-counts", prayers?.map((p) => p.id).join(",")], (old: Record<string, number> | undefined) => {
      const next = { ...(old ?? {}) };
      next[prayerId] = (next[prayerId] ?? 0) + (has ? -1 : 1);
      if (next[prayerId] <= 0) delete next[prayerId];
      return next;
    });

    try {
      if (has) {
        let q = supabase.from("reactions").delete().eq("prayer_id", prayerId);
        if (user) q = q.eq("user_id", user.id);
        else q = q.eq("session_id", sid);
        const { data, error } = await q.select();
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Não foi possível remover a reação (sem permissão)");
        }
      } else {
        const { error } = await supabase.from("reactions").insert({
          prayer_id: prayerId,
          user_id: user?.id ?? null,
          session_id: !user ? sid : null,
        });
        if (error) throw error;
      }
      // Confirma com o servidor
      qc.invalidateQueries({ queryKey: ["my-reactions"] });
      qc.invalidateQueries({ queryKey: ["reaction-counts"] });
    } catch (err: any) {
      // Reverte o estado otimista em caso de erro
      qc.setQueryData(["my-reactions", user?.id], (old: Set<string> | undefined) => {
        const next = new Set(old ?? []);
        if (has) next.add(prayerId);
        else next.delete(prayerId);
        return next;
      });
      toast.error(`Erro ao reagir: ${err?.message ?? "tente novamente"}`);
    }
  };

  const handleExportPdf = async () => {
    const isMobile = window.innerWidth < 640;
    if (!isMobile) {
      window.print();
      return;
    }
    if (!pdfContainerRef.current) return;
    setExportingPdf(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(pdfContainerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      // Divide a imagem em páginas se for maior que uma página A4
      let srcY = 0;
      let firstPage = true;
      const pageContentH = pageH - margin * 2;
      const pixelsPerMm = canvas.height / imgH;
      while (srcY < canvas.height) {
        const slicePixelH = Math.min(pageContentH * pixelsPerMm, canvas.height - srcY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = slicePixelH;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, slicePixelH, 0, 0, canvas.width, slicePixelH);
        if (!firstPage) pdf.addPage();
        const sliceH = (slicePixelH / pixelsPerMm);
        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, imgW, sliceH);
        srcY += slicePixelH;
        firstPage = false;
      }
      const mes = filterMonth !== "all" ? `_${filterMonth}` : "";
      pdf.save(`mural_oracao${mes}_ibjj.pdf`);
    } catch (e) {
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-primary-dark">Mural de Oração</h1>
          <p className="mt-2 text-muted-foreground text-lg print:hidden">Compartilhe pedidos, agradeça e ore pelos irmãos.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            variant="outline"
            className="rounded-full h-12 px-6 text-base border border-border bg-card hover:bg-secondary"
          >
            {exportingPdf ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Gerando PDF...</>
            ) : (
              <><Printer className="h-5 w-5 mr-2" /> Exportar PDF</>
            )}
          </Button>
          {(!user || isApproved || isAdmin) && <NewPrayerDialog />}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 print:hidden">
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
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-48 rounded-full bg-card"><SelectValue placeholder="Todos os meses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {monthsOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div ref={pdfContainerRef} className="rounded-3xl border border-border bg-card overflow-hidden divide-y divide-border">
        {filteredPrayers.map((p) => {
          const reacted = myReactions?.has(p.id);
          const count = counts?.[p.id] ?? 0;
          const isThanks = p.type === "agradecimento";
          const member = (p as any).members;
          return (
            <article key={p.id} className="p-5 sm:p-6 hover:bg-secondary/30 transition-colors print:break-inside-avoid">
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="shrink-0">
                  {member?.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.full_name}
                      className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover ring-2 ring-primary/15"
                    />
                  ) : (
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-xl ring-2 ring-primary/15">
                      {member ? (member.full_name as string).slice(0, 1) : <Heart className="h-6 w-6" />}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider">
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${isThanks ? "bg-gold/25 text-gold-foreground" : "bg-primary/10 text-primary"}`}>
                      {isThanks ? "Gratidão" : "Pedido"}
                    </span>
                    <span className="text-muted-foreground">{CATEGORIES.find((c) => c.v === p.category)?.l}</span>
                    {member && (
                      <span className="text-muted-foreground normal-case tracking-normal">
                        Por <span className="font-medium text-primary-dark">{member.full_name}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 font-display text-xl sm:text-2xl text-primary-dark leading-tight">{p.title}</h3>
                  <p className="mt-2 text-foreground/80 whitespace-pre-wrap text-sm sm:text-base">{p.description}</p>

                  <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {p.is_anonymous ? "Enviado anonimamente" : `Enviado por ${p.display_name ?? "Visitante"}`}
                      {" • "}
                      {format(new Date(p.created_at), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <button
                      onClick={() => toggleReact(p.id)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${reacted ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-primary/10"}`}
                    >
                      <HandHeart className="h-4 w-4" /> {reacted ? "Orando" : "Estou orando"} {count > 0 && <span className="ml-1 opacity-80">· {count}</span>}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {prayers && filteredPrayers.length === 0 && (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border mt-4">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg text-muted-foreground">
            {prayers.length === 0 ? "Nenhum pedido aprovado ainda." : "Nenhum pedido encontrado para o filtro selecionado."}
          </p>
        </div>
      )}
    </div>
  );
}

function NewPrayerDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("outros");
  const [type, setType] = useState<"pedido" | "agradecimento">("pedido");
  const [memberId, setMemberId] = useState<string>("");
  const [authorName, setAuthorName] = useState("");
  const [anon, setAnon] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["members-options"],
    enabled: open,
    queryFn: async () => (await supabase.from("members").select("id, full_name").order("full_name")).data ?? [],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) { toast.error("Selecione o membro a quem este pedido se refere"); return; }
    setLoading(true);

    let displayName: string | null = null;
    if (!anon) {
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        displayName = prof?.full_name ?? (authorName.trim() || null);
      } else {
        displayName = authorName.trim() || null;
      }
    }

    const { error } = await supabase.from("prayer_requests").insert({
      author_id: user?.id ?? null,
      member_id: memberId,
      title,
      description: desc,
      category: cat as never,
      type,
      is_anonymous: anon,
      is_whole_family: false,
      status: "pendente",
      display_name: displayName,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Pedido enviado! Aguardando aprovação.");
      setOpen(false);
      setTitle(""); setDesc(""); setCat("outros"); setAnon(false); setType("pedido"); setMemberId(""); setAuthorName("");
      qc.invalidateQueries({ queryKey: ["prayers"] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary-dark h-12 px-6 text-base">
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
            <Textarea id="d" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} rows={4} className="mt-1 rounded-xl" />
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
          {!user && !anon && (
            <div>
              <Label htmlFor="author">Seu nome (opcional)</Label>
              <Input id="author" value={authorName} onChange={(e) => setAuthorName(e.target.value)} maxLength={80} placeholder="Como você quer ser identificado" className="mt-1 h-12 rounded-xl" />
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label htmlFor="anon" className="cursor-pointer">Enviar como anônimo</Label>
            <Switch id="anon" checked={anon} onCheckedChange={setAnon} />
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
