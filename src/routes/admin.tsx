import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Archive, Edit2, Trash2, Plus, Users, Heart, Megaphone, Calendar, BookOpen, ShieldAlert, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administração — IBJJ" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Carregando...</div>;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md text-center py-20 px-6">
        <ShieldAlert className="mx-auto h-14 w-14 text-muted-foreground/50" />
        <h1 className="mt-4 font-display text-3xl text-primary-dark">Acesso restrito</h1>
        <p className="mt-2 text-muted-foreground">Esta área é exclusiva para administradores. Peça ao administrador da igreja para liberar seu acesso.</p>
        <p className="mt-4 text-xs text-muted-foreground">
          (Para conceder acesso, adicione uma linha na tabela <code>user_roles</code> com role = admin para o seu user_id.)
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-4xl sm:text-5xl text-primary-dark">Administração</h1>
      <p className="mt-2 text-muted-foreground text-lg">Gerencie membros, pedidos, avisos e programações.</p>

      <DashboardStats />

      <Tabs defaultValue="prayers" className="mt-10">
        <TabsList className="bg-secondary rounded-full p-1 h-auto flex flex-wrap">
          <TabsTrigger value="prayers" className="rounded-full px-5 py-2.5"><Heart className="h-4 w-4 mr-2" />Pedidos</TabsTrigger>
          <TabsTrigger value="users" className="rounded-full px-5 py-2.5"><UserPlus className="h-4 w-4 mr-2" />Usuários</TabsTrigger>
          <TabsTrigger value="members" className="rounded-full px-5 py-2.5"><Users className="h-4 w-4 mr-2" />Membros</TabsTrigger>
          <TabsTrigger value="families" className="rounded-full px-5 py-2.5">Famílias</TabsTrigger>
          <TabsTrigger value="announcements" className="rounded-full px-5 py-2.5"><Megaphone className="h-4 w-4 mr-2" />Avisos</TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-full px-5 py-2.5"><Calendar className="h-4 w-4 mr-2" />Programações</TabsTrigger>
          <TabsTrigger value="verses" className="rounded-full px-5 py-2.5"><BookOpen className="h-4 w-4 mr-2" />Versículos</TabsTrigger>
        </TabsList>
        <TabsContent value="prayers" className="mt-6"><PrayersAdmin /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersAdmin /></TabsContent>
        <TabsContent value="members" className="mt-6"><MembersAdmin /></TabsContent>
        <TabsContent value="families" className="mt-6"><FamiliesAdmin /></TabsContent>
        <TabsContent value="announcements" className="mt-6"><AnnouncementsAdmin /></TabsContent>
        <TabsContent value="schedule" className="mt-6"><ScheduleAdmin /></TabsContent>
        <TabsContent value="verses" className="mt-6"><VersesAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardStats() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [members, families, pending, approved] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }),
        supabase.from("families").select("id", { count: "exact", head: true }),
        supabase.from("prayer_requests").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("prayer_requests").select("id", { count: "exact", head: true }).eq("status", "aprovado"),
      ]);
      return {
        members: members.count ?? 0,
        families: families.count ?? 0,
        pending: pending.count ?? 0,
        approved: approved.count ?? 0,
      };
    },
  });
  return (
    <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Membros" value={data?.members ?? 0} icon={Users} />
      <Stat label="Famílias" value={data?.families ?? 0} icon={Users} />
      <Stat label="Pedidos pendentes" value={data?.pending ?? 0} icon={Heart} highlight />
      <Stat label="Pedidos aprovados" value={data?.approved ?? 0} icon={Heart} />
    </div>
  );
}
function Stat({ label, value, icon: Icon, highlight }: { label: string; value: number; icon: typeof Users; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-gold bg-gold/10" : "border-border bg-card"}`}>
      <Icon className={`h-5 w-5 ${highlight ? "text-gold-foreground" : "text-primary"}`} />
      <p className="mt-3 font-display text-3xl text-primary-dark">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/* -------------------- USERS APPROVAL -------------------- */
function UsersAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-users-pending"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("is_approved", false).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const approve = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Conta aprovada!"); qc.invalidateQueries({ queryKey: ["admin-users-pending"] }); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display text-primary-dark">Usuários Aguardando Aprovação</h2>
      {data?.length === 0 && <p className="text-muted-foreground">Nenhuma conta pendente.</p>}
      <div className="grid gap-3">
        {data?.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-semibold text-primary-dark">{u.full_name}</p>
              <p className="text-sm text-muted-foreground">{u.email}</p>
            </div>
            <Button onClick={() => approve(u.id)} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <UserCheck className="h-4 w-4 mr-2" /> Aprovar Conta
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- PRAYERS -------------------- */
function PrayersAdmin() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pendente" | "aprovado" | "rejeitado" | "arquivado">("pendente");
  const { data } = useQuery({
    queryKey: ["admin-prayers", status],
    queryFn: async () => {
      const { data } = await supabase.from("prayer_requests").select("*").eq("status", status).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const updateStatus = async (id: string, s: typeof status) => {
    const { error } = await supabase.from("prayer_requests").update({ status: s, approved_at: s === "aprovado" ? new Date().toISOString() : null }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["admin-prayers"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); qc.invalidateQueries({ queryKey: ["prayers"] }); }
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir este pedido?")) return;
    await supabase.from("prayer_requests").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-prayers"] });
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["pendente", "aprovado", "rejeitado", "arquivado"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${status === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {data?.length === 0 && <p className="text-muted-foreground">Nenhum pedido nesta categoria.</p>}
        {data?.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{p.type}</span>
                  <span className="text-muted-foreground">{p.category}</span>
                  {p.is_anonymous && <span className="rounded-full bg-secondary px-2 py-0.5">anônimo</span>}
                </div>
                <p className="mt-2 font-display text-lg text-primary-dark">{p.title}</p>
                <p className="mt-1 text-sm text-foreground/80 whitespace-pre-wrap">{p.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{p.display_name ?? "Sem nome"} • {format(new Date(p.created_at), "dd/MM/yyyy HH:mm")}</p>
              </div>
              <div className="flex flex-col gap-2">
                {status !== "aprovado" && <Button size="sm" onClick={() => updateStatus(p.id, "aprovado")} className="bg-primary text-primary-foreground"><Check className="h-4 w-4 mr-1" />Aprovar</Button>}
                {status !== "rejeitado" && <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, "rejeitado")}><X className="h-4 w-4 mr-1" />Rejeitar</Button>}
                {status !== "arquivado" && <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, "arquivado")}><Archive className="h-4 w-4 mr-1" />Arquivar</Button>}
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- MEMBERS -------------------- */
function MembersAdmin() {
  const qc = useQueryClient();
  const { data: members } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => (await supabase.from("members").select("*, families(name)").order("full_name")).data ?? [],
  });

  const remove = async (id: string) => {
    if (!confirm("Excluir este membro?")) return;
    await supabase.from("members").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-members"] });
  };

  return (
    <div>
      <div className="flex justify-end mb-4"><MemberForm /></div>
      <div className="space-y-2">
        {members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <p className="font-medium text-primary-dark">{m.full_name}</p>
              <p className="text-sm text-muted-foreground">{m.families?.name ? `Fam. ${m.families.name}` : "Sem família"} {m.phone && `• ${m.phone}`}</p>
            </div>
            <div className="flex gap-1">
              <MemberForm member={m} />
              <Button size="icon" variant="ghost" onClick={() => remove(m.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {members?.length === 0 && <p className="text-muted-foreground">Nenhum membro cadastrado.</p>}
      </div>
    </div>
  );
}

function MemberForm({ member }: { member?: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(member ?? { full_name: "", marital_status: "solteiro" });
  const { data: families } = useQuery({ queryKey: ["fams-opts"], queryFn: async () => (await supabase.from("families").select("id,name").order("name")).data ?? [] });
  const { data: memberOptions } = useQuery({
    queryKey: ["member-opts"],
    enabled: open,
    queryFn: async () => (await supabase.from("members").select("id, full_name").order("full_name")).data ?? [],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalFamilyId = form.family_id;

    if (form.is_new_family && form.new_family_name) {
      const { data: newFam, error: famErr } = await supabase.from("families").insert({ name: form.new_family_name }).select("id").single();
      if (famErr) { toast.error("Erro ao criar família: " + famErr.message); return; }
      finalFamilyId = newFam.id;
    }

    const payload = { ...form, conversion_year: form.conversion_year ? Number(form.conversion_year) : null, family_id: finalFamilyId || null };
    delete payload.families;
    delete payload.is_new_family;
    delete payload.new_family_name;
    delete payload.baptism_year_only;

    const { error } = member
      ? await supabase.from("members").update(payload).eq("id", member.id)
      : await supabase.from("members").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-members"] }); qc.invalidateQueries({ queryKey: ["members"] }); qc.invalidateQueries({ queryKey: ["admin-families"] }); qc.invalidateQueries({ queryKey: ["families-with-members"] }); }
  };

  const options = (memberOptions ?? []).filter((m) => !member || m.id !== member.id);

  return (
    <Dialog open={open} onOpenChange={(o) => { 
        setOpen(o); 
        if (o) {
            if (member) {
                setForm({ ...member, is_child: !!member.is_child, ministry: member.ministry || "" });
            } else {
                setForm({ full_name: "", marital_status: "solteiro", is_child: false, ministry: "" });
            }
        }
    }}>
      <DialogTrigger asChild>
        {member ? <Button size="icon" variant="ghost"><Edit2 className="h-4 w-4" /></Button> : <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary-dark"><Plus className="h-4 w-4 mr-2" />Novo membro</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{member ? "Editar membro" : "Novo membro"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nome completo *</Label><Input required value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="col-span-2"><Label>Foto do membro</Label><PhotoUpload value={form.photo_url} onChange={(url) => setForm({ ...form, photo_url: url })} /></div>
          <div><Label>Data de nascimento</Label><Input type="date" value={form.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
          <div><Label>Ano de conversão</Label><Input type="number" value={form.conversion_year ?? ""} onChange={(e) => setForm({ ...form, conversion_year: e.target.value })} /></div>
          <div><Label>Estado civil</Label>
            <Select value={form.marital_status ?? ""} onValueChange={(v) => setForm({ ...form, marital_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["solteiro", "casado", "viuvo", "divorciado", "outro"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Família</Label>
              <button type="button" onClick={() => setForm({ ...form, is_new_family: !form.is_new_family, family_id: null, new_family_name: "" })} className="text-xs font-medium text-primary hover:underline">
                {form.is_new_family ? "Selecionar existente" : "+ Nova família"}
              </button>
            </div>
            {form.is_new_family ? (
              <Input placeholder="Nome da nova família" value={form.new_family_name ?? ""} onChange={(e) => setForm({ ...form, new_family_name: e.target.value })} required />
            ) : (
              <Select value={form.family_id ?? ""} onValueChange={(v) => setForm({ ...form, family_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {families?.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="col-span-2">
            <Label>Cônjuge</Label>
            <MemberPicker
              options={options}
              value={form.spouse ?? ""}
              multi={false}
              placeholder="Selecione o cônjuge entre os membros"
              onChange={(v) => setForm({ ...form, spouse: v })}
            />
          </div>
          <div className="col-span-2">
            <Label>Filhos</Label>
            <MemberPicker
              options={options}
              value={form.children ?? ""}
              multi={true}
              placeholder="Selecione os filhos entre os membros"
              onChange={(v) => setForm({ ...form, children: v })}
            />
          </div>
          <div><Label>Telefone (admin)</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>E-mail (admin)</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Data de batismo</Label>
              <button type="button" onClick={() => setForm({ ...form, baptism_year_only: !form.baptism_year_only, baptism_date: "" })} className="text-xs font-medium text-primary hover:underline">
                {form.baptism_year_only ? "Data exata" : "Só o ano"}
              </button>
            </div>
            {form.baptism_year_only ? (
              <Input type="number" placeholder="Ano (ex: 2020)" value={form.baptism_date?.substring(0,4) ?? ""} onChange={(e) => setForm({ ...form, baptism_date: e.target.value ? `${e.target.value}-01-01` : "" })} />
            ) : (
              <Input type="date" value={form.baptism_date ?? ""} onChange={(e) => setForm({ ...form, baptism_date: e.target.value })} />
            )}
          </div>
          <div><Label>Ministério onde serve</Label><Input placeholder="Ex: Louvor, Recepção..." value={form.ministry ?? ""} onChange={(e) => setForm({ ...form, ministry: e.target.value })} /></div>
          <div className="flex items-center gap-2 col-span-2 pt-2 border-t border-border/50">
             <Switch id="is_child" checked={!!form.is_child} onCheckedChange={(v) => setForm({ ...form, is_child: v })} />
             <Label htmlFor="is_child" className="cursor-pointer">É filho(a) de membro (não é membro propriamente dito)</Label>
          </div>
          <div className="flex items-center gap-2 col-span-2">
             <Switch id="is_converted" checked={!!form.is_converted} onCheckedChange={(v) => setForm({ ...form, is_converted: v })} />
             <Label htmlFor="is_converted" className="cursor-pointer">É convertido(a)</Label>
          </div>
          <div className="col-span-2"><Label>Observações internas</Label><Textarea value={form.internal_notes ?? ""} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} /></div>
          <Button type="submit" className="col-span-2 bg-primary text-primary-foreground hover:bg-primary-dark">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberPicker({
  options, value, multi, placeholder, onChange,
}: {
  options: { id: string; full_name: string }[];
  value: string;
  multi: boolean;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const selected = (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const toggle = (name: string) => {
    if (multi) {
      const next = selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name];
      onChange(next.join(", "));
    } else {
      onChange(selected[0] === name ? "" : name);
    }
  };
  return (
    <div className="mt-1 rounded-md border border-input bg-card">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-border">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-1">
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-destructive">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="max-h-40 overflow-y-auto p-1">
        {options.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">Nenhum membro disponível.</p>}
        {options.map((m) => {
          const isSel = selected.includes(m.full_name);
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => toggle(m.full_name)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md ${isSel ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
            >
              {multi && <span className="mr-2">{isSel ? "☑" : "☐"}</span>}
              {m.full_name}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && <p className="px-3 pb-2 text-xs text-muted-foreground">{placeholder}</p>}
    </div>
  );
}

function PhotoUpload({ value, onChange }: { value?: string | null; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (máx 5MB)"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("member-photos").upload(path, file, { upsert: false, contentType: file.type });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("member-photos").getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success("Foto enviada");
  };
  return (
    <div className="flex items-center gap-3">
      {value && <img src={value} alt="" className="h-16 w-16 rounded-full object-cover border border-border" />}
      <Input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="flex-1" />
      {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>Remover</Button>}
    </div>
  );
}

/* -------------------- FAMILIES -------------------- */
function FamiliesAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-families"], queryFn: async () => (await supabase.from("families").select("*, members(id)").order("name")).data ?? [] });
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("families").insert({ name, description: desc || null });
    if (error) toast.error(error.message);
    else { setName(""); setDesc(""); toast.success("Família criada"); qc.invalidateQueries({ queryKey: ["admin-families"] }); }
  };
  const remove = async (id: string) => { if (!confirm("Excluir família?")) return; await supabase.from("families").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-families"] }); };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5 space-y-3 h-fit">
        <h3 className="font-display text-lg">Nova família</h3>
        <Input placeholder="Nome (ex: Silva)" value={name} onChange={(e) => setName(e.target.value)} required />
        <Textarea placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-dark">Criar</Button>
      </form>
      <div className="space-y-2">
        {data?.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <p className="font-medium">Família {f.name}</p>
              <p className="text-sm text-muted-foreground">{f.members.length} membros</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(f.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- ANNOUNCEMENTS -------------------- */
function AnnouncementsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-announce"], queryFn: async () => (await supabase.from("announcements").select("*").order("publish_date", { ascending: false })).data ?? [] });
  const [form, setForm] = useState<any>({ title: "", content: "", is_important: false });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, publish_date: form.publish_date || new Date().toISOString().slice(0, 10) };
    const { error } = await supabase.from("announcements").insert(payload);
    if (error) toast.error(error.message);
    else { setForm({ title: "", content: "", is_important: false }); toast.success("Aviso publicado"); qc.invalidateQueries({ queryKey: ["admin-announce"] }); }
  };
  const remove = async (id: string) => { if (!confirm("Excluir?")) return; await supabase.from("announcements").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-announce"] }); };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 space-y-3 h-fit">
        <h3 className="font-display text-lg">Novo aviso</h3>
        <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Textarea placeholder="Conteúdo" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required rows={5} />
        <Input type="date" value={form.publish_date ?? ""} onChange={(e) => setForm({ ...form, publish_date: e.target.value })} />
        <div className="flex items-center gap-2"><Switch checked={form.is_important} onCheckedChange={(v) => setForm({ ...form, is_important: v })} /><Label>Marcar como importante</Label></div>
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-dark">Publicar</Button>
      </form>
      <div className="space-y-2">
        {data?.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{a.title}</p>
              <Button size="icon" variant="ghost" onClick={() => remove(a.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- SCHEDULE -------------------- */
function ScheduleAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-schedule"], queryFn: async () => (await supabase.from("services_schedule").select("*").order("weekday")).data ?? [] });
  const [form, setForm] = useState<any>({ title: "", type: "culto", weekday: 0, is_recurring: true });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, weekday: form.is_recurring ? Number(form.weekday) : null, event_date: form.is_recurring ? null : form.event_date };
    const { error } = await supabase.from("services_schedule").insert(payload);
    if (error) toast.error(error.message);
    else { setForm({ title: "", type: "culto", weekday: 0, is_recurring: true }); toast.success("Programação criada"); qc.invalidateQueries({ queryKey: ["admin-schedule"] }); }
  };
  const remove = async (id: string) => { if (!confirm("Excluir?")) return; await supabase.from("services_schedule").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-schedule"] }); };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 space-y-3 h-fit">
        <h3 className="font-display text-lg">Nova programação</h3>
        <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Textarea placeholder="Descrição (opcional)" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["culto", "oracao", "estudo", "evento", "outro"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-2"><Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} /><Label>Semanal</Label></div>
        {form.is_recurring ? (
          <Select value={String(form.weekday)} onValueChange={(v) => setForm({ ...form, weekday: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <Input type="date" value={form.event_date ?? ""} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        )}
        <div className="grid grid-cols-2 gap-2">
          <Input type="time" value={form.start_time ?? ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          <Input type="time" value={form.end_time ?? ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        </div>
        <Input placeholder="Local" value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-dark">Salvar</Button>
      </form>
      <div className="space-y-2">
        {data?.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-sm text-muted-foreground">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][s.weekday ?? -1] ?? s.event_date} {s.start_time?.slice(0, 5)}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- VERSES -------------------- */
function VersesAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-verses"], queryFn: async () => (await supabase.from("daily_verses").select("*").order("display_date", { ascending: false })).data ?? [] });
  const [form, setForm] = useState({ reference: "", text: "", display_date: new Date().toISOString().slice(0, 10) });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("daily_verses").insert(form);
    if (error) toast.error(error.message);
    else { setForm({ reference: "", text: "", display_date: new Date().toISOString().slice(0, 10) }); toast.success("Versículo salvo"); qc.invalidateQueries({ queryKey: ["admin-verses"] }); }
  };
  const remove = async (id: string) => { await supabase.from("daily_verses").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-verses"] }); };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 space-y-3 h-fit">
        <h3 className="font-display text-lg">Novo versículo</h3>
        <Input placeholder="Referência (ex: Salmos 23:1)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} required />
        <Textarea placeholder="Texto" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required rows={4} />
        <Input type="date" value={form.display_date} onChange={(e) => setForm({ ...form, display_date: e.target.value })} />
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-dark">Salvar</Button>
      </form>
      <div className="space-y-2">
        {data?.map((v) => (
          <div key={v.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{v.display_date}</p>
            <p className="italic mt-1">"{v.text}"</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gold-foreground">{v.reference}</p>
              <Button size="icon" variant="ghost" onClick={() => remove(v.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
