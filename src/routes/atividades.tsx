import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Upload,
  Calendar, User, BookOpen, Mic, FileText, Loader2, MapPin, Info
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/atividades")({
  head: () => ({ meta: [{ title: "Atividades Mensais — IBJJ" }] }),
  component: ActivitiesPage,
});

/* ---- Constants ---- */
const TIME_SLOTS = [
  { key: "domingo_manha", label: "Domingo — Manhã 8h", short: "Dom 8h", weekday: 0, color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  { key: "domingo_noite", label: "Domingo — Noite 18h", short: "Dom 18h", weekday: 0, color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  { key: "quarta", label: "Quarta-feira — 19h", short: "Qua 19h", weekday: 3, color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { key: "sexta", label: "Sexta-feira — 19h", short: "Sex 19h", weekday: 5, color: "bg-violet-500/10 text-violet-700 border-violet-200" },
  { key: "sabado", label: "Sábado — 19h", short: "Sáb 19h", weekday: 6, color: "bg-rose-500/10 text-rose-700 border-rose-200" },
] as const;

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Activity = {
  id: string;
  month: string;
  day: number;
  time_slot: string;
  title: string;
  dirigente: string | null;
  leitura: string | null;
  texto: string | null;
  pregacao: string | null;
  estudo: string | null;
  local: string | null;
  notes: string | null;
};

/* ---- Helpers ---- */
function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(m: string): [number, number] {
  const [y, mo] = m.split("-").map(Number);
  return [y, mo];
}

function prevMonth(m: string) {
  let [y, mo] = parseMonth(m);
  mo--;
  if (mo < 1) { mo = 12; y--; }
  return `${y}-${String(mo).padStart(2, "0")}`;
}

function nextMonth(m: string) {
  let [y, mo] = parseMonth(m);
  mo++;
  if (mo > 12) { mo = 1; y++; }
  return `${y}-${String(mo).padStart(2, "0")}`;
}

function getWeeksOfMonth(m: string) {
  const [year, month] = parseMonth(m);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();

  const weeks: { days: (number | null)[] }[] = [];
  let currentWeek: (number | null)[] = [];

  // Fill in blanks before the first day
  const startWeekday = firstDay.getDay(); // 0=Sunday
  for (let i = 0; i < startWeekday; i++) currentWeek.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek });
      currentWeek = [];
    }
  }
  // Fill remaining blanks
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push({ days: currentWeek });
  }

  return weeks;
}

function getSlotInfo(key: string) {
  return TIME_SLOTS.find((s) => s.key === key);
}

/* ---- Main Page ---- */
function ActivitiesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [addDefaults, setAddDefaults] = useState<{ day?: number; time_slot?: string }>({});

  const [year, month] = parseMonth(currentMonth);

  const { data: activities } = useQuery({
    queryKey: ["monthly-activities", currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_activities")
        .select("*")
        .eq("month", currentMonth)
        .order("day")
        .order("time_slot");
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });

  const weeks = useMemo(() => getWeeksOfMonth(currentMonth), [currentMonth]);

  const actsByDaySlot = useMemo(() => {
    const map: Record<string, Activity> = {};
    activities?.forEach((a) => {
      map[`${a.day}-${a.time_slot}`] = a;
    });
    return map;
  }, [activities]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const handleAdd = (day: number, slotKey: string) => {
    setAddDefaults({ day, time_slot: slotKey });
    setShowAdd(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-primary-dark flex items-center gap-3">
            <Calendar className="h-9 w-9 text-gold" /> Atividades
          </h1>
          <p className="mt-2 text-muted-foreground text-lg">Calendário mensal de cultos e programações.</p>
        </div>

        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => { setAddDefaults({}); setShowAdd(true); }}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4 mr-2" /> Nova atividade
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setShowImport(true)}
            >
              <Upload className="h-4 w-4 mr-2" /> Importar imagem
            </Button>
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          onClick={() => setCurrentMonth(prevMonth(currentMonth))}
          className="h-11 w-11 rounded-full border border-border bg-card flex items-center justify-center hover:bg-secondary transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-2xl sm:text-3xl text-primary-dark min-w-[220px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          onClick={() => setCurrentMonth(nextMonth(currentMonth))}
          className="h-11 w-11 rounded-full border border-border bg-card flex items-center justify-center hover:bg-secondary transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid — Desktop */}
      <div className="hidden lg:block rounded-3xl border border-border bg-card overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-7 border-b border-border bg-secondary/50">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.days.map((day, di) => {
              const isToday = isCurrentMonth && day === today.getDate();
              const dayActivities = day
                ? TIME_SLOTS.filter((s) => s.weekday === di).map((s) => ({
                    slot: s,
                    activity: actsByDaySlot[`${day}-${s.key}`],
                  }))
                : [];

              return (
                <div
                  key={di}
                  className={`min-h-[130px] border-r border-border last:border-r-0 p-2 transition
                    ${day === null ? "bg-secondary/20" : "hover:bg-secondary/30"}
                    ${isToday ? "bg-primary/5 ring-inset ring-2 ring-primary/20" : ""}`}
                >
                  {day !== null && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${isToday ? "bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center" : "text-muted-foreground"}`}>
                          {day}
                        </span>
                        {isAdmin && dayActivities.some((da) => !da.activity) && (
                          <button
                            onClick={() => {
                              const emptySlot = dayActivities.find((da) => !da.activity);
                              if (emptySlot) handleAdd(day, emptySlot.slot.key);
                            }}
                            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition opacity-0 group-hover:opacity-100"
                            title="Adicionar atividade"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {dayActivities.map(({ slot, activity }) =>
                        activity ? (
                          <button
                            key={slot.key}
                            onClick={() => setSelectedActivity(activity)}
                            className={`w-full text-left rounded-lg border px-2 py-1.5 mb-1 text-xs transition cursor-pointer hover:shadow-sm ${slot.color}`}
                          >
                            <p className="font-semibold truncate">{activity.title}</p>
                            {activity.dirigente && (
                              <p className="text-[10px] opacity-75 truncate">Dir: {activity.dirigente}</p>
                            )}
                            {activity.pregacao && (
                              <p className="text-[10px] opacity-75 truncate">Preg: {activity.pregacao}</p>
                            )}
                            {activity.estudo && (
                              <p className="text-[10px] opacity-75 truncate font-medium">Est: {activity.estudo}</p>
                            )}
                            {activity.texto && (
                              <p className="text-[10px] opacity-75 truncate italic">Txt: {activity.texto}</p>
                            )}
                          </button>
                        ) : null
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Calendar — Mobile (card-based) */}
      <div className="lg:hidden space-y-3">
        {weeks.map((week, wi) => {
          const weekDays = week.days.filter((d) => d !== null) as number[];
          const range = weekDays.length > 0 ? `${weekDays[0]}–${weekDays[weekDays.length - 1]}` : "";

          // Collect all activities for this week
          const weekActivities: { day: number; slot: (typeof TIME_SLOTS)[number]; activity: Activity }[] = [];
          week.days.forEach((day, di) => {
            if (day === null) return;
            TIME_SLOTS.filter((s) => s.weekday === di).forEach((s) => {
              const a = actsByDaySlot[`${day}-${s.key}`];
              if (a) weekActivities.push({ day, slot: s, activity: a });
            });
          });

          if (weekActivities.length === 0) return null;

          return (
            <div key={wi} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-secondary/40 border-b border-border">
                <p className="text-sm font-semibold text-muted-foreground">
                  Semana {wi + 1} — Dias {range} de {MONTH_NAMES[month - 1]}
                </p>
              </div>
              <div className="divide-y divide-border">
                {weekActivities.map(({ day, slot, activity }) => (
                  <div
                    key={activity.id}
                    className="p-4 cursor-pointer hover:bg-secondary/30 transition"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${slot.color}`}>
                        {slot.short} — Dia {day}
                      </span>
                    </div>
                    <p className="font-display text-lg text-primary-dark">{activity.title}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {activity.dirigente && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5" /> {activity.dirigente}
                        </span>
                      )}
                      {activity.pregacao && (
                        <span className="inline-flex items-center gap-1">
                          <Mic className="h-3.5 w-3.5" /> {activity.pregacao}
                        </span>
                      )}
                      {activity.leitura && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" /> {activity.leitura}
                        </span>
                      )}
                      {activity.texto && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" /> {activity.texto}
                        </span>
                      )}
                      {activity.estudo && <span>Estudo: {activity.estudo}</span>}
                      {activity.local && <span>📍 {activity.local}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {(!activities || activities.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma atividade cadastrada para este mês.
          </div>
        )}
      </div>

      {/* Desktop empty state */}
      {(!activities || activities.length === 0) && (
        <div className="hidden lg:block text-center py-8 text-muted-foreground">
          Nenhuma atividade cadastrada para este mês.
          {isAdmin && " Clique em 'Nova atividade' ou 'Importar imagem' para começar."}
        </div>
      )}

      {/* Edit Dialog */}
      {editActivity && (
        <ActivityDialog
          activity={editActivity}
          month={currentMonth}
          onClose={() => setEditActivity(null)}
          onSaved={() => { setEditActivity(null); qc.invalidateQueries({ queryKey: ["monthly-activities", currentMonth] }); }}
        />
      )}

      {/* Add Dialog */}
      {showAdd && (
        <ActivityDialog
          month={currentMonth}
          defaults={addDefaults}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); qc.invalidateQueries({ queryKey: ["monthly-activities", currentMonth] }); }}
        />
      )}

      {/* Import Dialog */}
      {showImport && (
        <ImportDialog
          month={currentMonth}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            qc.invalidateQueries({ queryKey: ["monthly-activities", currentMonth] });
          }}
        />
      )}

      {/* View Details Dialog */}
      {selectedActivity && (
        <ViewActivityDialog
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onEdit={() => {
            setEditActivity(selectedActivity);
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
}

/* ---- View Activity Details Dialog ---- */
function ViewActivityDialog({
  activity,
  onClose,
  onEdit,
}: {
  activity: Activity;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { isAdmin } = useAuth();
  const slotInfo = getSlotInfo(activity.time_slot);

  const detailItems = [
    { label: "Dirigente", value: activity.dirigente, icon: User, color: "text-blue-500 bg-blue-50/50 border-blue-100" },
    { label: "Pregação / Mensagem", value: activity.pregacao, icon: Mic, color: "text-amber-500 bg-amber-50/50 border-amber-100" },
    { label: "Leitura Bíblica", value: activity.leitura, icon: BookOpen, color: "text-emerald-500 bg-emerald-50/50 border-emerald-100" },
    { label: "Texto Chave", value: activity.texto, icon: FileText, color: "text-violet-500 bg-violet-50/50 border-violet-100" },
    { label: "Estudo", value: activity.estudo, icon: BookOpen, color: "text-rose-500 bg-rose-50/50 border-rose-100" },
    { label: "Local", value: activity.local, icon: MapPin, color: "text-sky-500 bg-sky-50/50 border-sky-100" },
  ].filter(item => !!item.value);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${slotInfo?.color ?? ""}`}>
              Dia {activity.day} — {slotInfo?.label ?? activity.time_slot}
            </span>
          </div>
          <DialogTitle className="font-display text-2xl text-primary-dark leading-tight">{activity.title}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {detailItems.length > 0 ? (
            <div className="grid gap-3">
              {detailItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                  <div className={`p-2 rounded-lg shrink-0 border ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className="text-base text-foreground font-medium mt-0.5 break-words">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum detalhe adicional cadastrado.</p>
          )}

          {activity.notes && (
            <div className="p-3.5 rounded-xl border border-dashed border-border bg-secondary/20">
              <div className="flex gap-2 text-muted-foreground mb-1">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Observações</span>
              </div>
              <p className="text-sm text-foreground italic break-words">{activity.notes}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-full py-5 text-sm font-medium">
            Fechar
          </Button>
          {isAdmin && (
            <Button onClick={onEdit} className="flex-1 rounded-full py-5 bg-primary text-primary-foreground hover:bg-primary-dark text-sm font-medium">
              <Edit2 className="h-4 w-4 mr-2" /> Editar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Activity Add/Edit Dialog ---- */
function ActivityDialog({
  activity,
  month,
  defaults,
  onClose,
  onSaved,
}: {
  activity?: Activity;
  month: string;
  defaults?: { day?: number; time_slot?: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!activity;
  const [form, setForm] = useState<any>(
    activity ?? {
      title: "",
      day: defaults?.day ?? 1,
      time_slot: defaults?.time_slot ?? "domingo_manha",
      dirigente: "",
      leitura: "",
      texto: "",
      pregacao: "",
      estudo: "",
      local: "",
      notes: "",
    }
  );
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      month,
      day: Number(form.day),
      time_slot: form.time_slot,
      title: form.title,
      dirigente: form.dirigente || null,
      leitura: form.leitura || null,
      texto: form.texto || null,
      pregacao: form.pregacao || null,
      estudo: form.estudo || null,
      local: form.local || null,
      notes: form.notes || null,
    };

    const { error } = isEdit
      ? await supabase.from("monthly_activities").update(payload).eq("id", activity!.id)
      : await supabase.from("monthly_activities").insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Atualizado!" : "Atividade criada!");
    onSaved();
  };

  const handleDelete = async () => {
    if (!activity || !confirm("Excluir esta atividade?")) return;
    await supabase.from("monthly_activities").delete().eq("id", activity.id);
    toast.success("Excluído");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar atividade" : "Nova atividade"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Título *</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Escola Bíblica Dominical" />
          </div>
          <div>
            <Label>Dia do mês *</Label>
            <Input type="number" min={1} max={31} required value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
          </div>
          <div>
            <Label>Horário/Turno *</Label>
            <Select value={form.time_slot} onValueChange={(v) => setForm({ ...form, time_slot: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dirigente</Label>
            <Input value={form.dirigente ?? ""} onChange={(e) => setForm({ ...form, dirigente: e.target.value })} />
          </div>
          <div>
            <Label>Leitura</Label>
            <Input value={form.leitura ?? ""} onChange={(e) => setForm({ ...form, leitura: e.target.value })} />
          </div>
          <div>
            <Label>Texto / Passagem</Label>
            <Input value={form.texto ?? ""} onChange={(e) => setForm({ ...form, texto: e.target.value })} placeholder="Ex: Salmo 18.1-25" />
          </div>
          <div>
            <Label>Pregação</Label>
            <Input value={form.pregacao ?? ""} onChange={(e) => setForm({ ...form, pregacao: e.target.value })} />
          </div>
          <div>
            <Label>Estudo</Label>
            <Input value={form.estudo ?? ""} onChange={(e) => setForm({ ...form, estudo: e.target.value })} />
          </div>
          <div>
            <Label>Local</Label>
            <Input value={form.local ?? ""} onChange={(e) => setForm({ ...form, local: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="col-span-2 flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground hover:bg-primary-dark">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
            {isEdit && (
              <Button type="button" variant="outline" onClick={handleDelete} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Import from Image Dialog ---- */
function ImportDialog({
  month,
  onClose,
  onImported,
}: {
  month: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<"upload" | "processing" | "review" | "saving">("upload");
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [parsed, setParsed] = useState<Omit<Activity, "id">[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep("processing");
    setProgress(0);

    try {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "por", {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      setExtractedText(text);

      // Parse extracted text into activities
      const activities = parseCalendarText(text, month);
      setParsed(activities);
      setStep("review");
    } catch (err: any) {
      toast.error("Erro ao processar imagem: " + (err.message || err));
      setStep("upload");
    }
  };

  const handleSave = async () => {
    if (parsed.length === 0) { toast.error("Nenhuma atividade para salvar."); return; }

    setStep("saving");

    // Delete existing activities for this month first
    await supabase.from("monthly_activities").delete().eq("month", month);

    // Insert all parsed activities
    const payload = parsed.map((a) => ({
      month: a.month,
      day: a.day,
      time_slot: a.time_slot,
      title: a.title,
      dirigente: a.dirigente || null,
      leitura: a.leitura || null,
      texto: a.texto || null,
      pregacao: a.pregacao || null,
      estudo: a.estudo || null,
      local: a.local || null,
      notes: a.notes || null,
    }));

    const { error } = await supabase.from("monthly_activities").insert(payload);
    if (error) { toast.error(error.message); setStep("review"); return; }

    toast.success(`${parsed.length} atividades importadas com sucesso!`);
    onImported();
  };

  const removeParsed = (idx: number) => {
    setParsed((p) => p.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar calendário de imagem</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="text-center py-8">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              Envie uma imagem do calendário de cultos (como a tabela mensal da igreja).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
            <Button onClick={() => fileRef.current?.click()} className="rounded-full bg-primary text-primary-foreground hover:bg-primary-dark">
              <Upload className="h-4 w-4 mr-2" /> Selecionar imagem
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              O sistema vai tentar extrair os textos automaticamente usando OCR (reconhecimento óptico). Você poderá revisar e editar antes de salvar.
            </p>
          </div>
        )}

        {step === "processing" && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
            <p className="font-display text-xl text-primary-dark mb-2">Processando imagem...</p>
            <div className="mx-auto max-w-xs bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{progress}% concluído</p>
          </div>
        )}

        {step === "review" && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {parsed.length} atividades encontradas. Revise abaixo e clique em "Salvar tudo" para importar.
            </p>

            {parsed.length === 0 && (
              <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-center">
                <p className="text-muted-foreground">Nenhuma atividade reconhecida automaticamente.</p>
                <p className="text-xs text-muted-foreground mt-2">Texto extraído da imagem:</p>
                <pre className="mt-2 text-xs text-left bg-card rounded-xl p-4 max-h-48 overflow-y-auto whitespace-pre-wrap border border-border">
                  {extractedText}
                </pre>
              </div>
            )}

            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {parsed.map((a, i) => {
                const slotInfo = getSlotInfo(a.time_slot);
                return (
                  <div key={i} className="rounded-xl border border-border bg-card p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${slotInfo?.color ?? ""}`}>
                          Dia {a.day} — {slotInfo?.short ?? a.time_slot}
                        </span>
                      </div>
                      <p className="font-semibold text-primary-dark">{a.title}</p>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                        {a.dirigente && <span>Dir: {a.dirigente}</span>}
                        {a.leitura && <span>Leit: {a.leitura}</span>}
                        {a.texto && <span>Texto: {a.texto}</span>}
                        {a.pregacao && <span>Preg: {a.pregacao}</span>}
                        {a.estudo && <span>Estudo: {a.estudo}</span>}
                        {a.local && <span>Local: {a.local}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeParsed(i)} className="text-destructive hover:text-destructive/80 shrink-0 mt-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Ver texto bruto extraído (OCR)
              </summary>
              <pre className="mt-2 text-xs bg-secondary rounded-xl p-4 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {extractedText}
              </pre>
            </details>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} className="flex-1 bg-primary text-primary-foreground hover:bg-primary-dark">
                Salvar tudo ({parsed.length} atividades)
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Tentar outra imagem
              </Button>
            </div>
          </div>
        )}

        {step === "saving" && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
            <p className="font-display text-xl text-primary-dark">Salvando atividades...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---- OCR Text Parser ---- */
function parseCalendarText(rawText: string, month: string): Omit<Activity, "id">[] {
  const activities: Omit<Activity, "id">[] = [];
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Try to detect blocks of activity data
  let currentDay: number | null = null;
  let currentSlot: string | null = null;
  let currentTitle = "";
  let currentFields: Record<string, string> = {};

  const flushActivity = () => {
    if (currentDay && currentSlot && currentTitle) {
      activities.push({
        month,
        day: currentDay,
        time_slot: currentSlot,
        title: currentTitle,
        dirigente: currentFields.dirigente || null,
        leitura: currentFields.leitura || null,
        texto: currentFields.texto || null,
        pregacao: currentFields.pregacao || null,
        estudo: currentFields.estudo || null,
        local: currentFields.local || null,
        notes: null,
      });
    }
    currentTitle = "";
    currentFields = {};
  };

  for (const line of lines) {
    // Try to detect day numbers (standalone numbers 1-31)
    const dayMatch = line.match(/^\s*(\d{1,2})\s*$/);
    if (dayMatch) {
      const d = parseInt(dayMatch[1]);
      if (d >= 1 && d <= 31) {
        flushActivity();
        currentDay = d;
        continue;
      }
    }

    // Detect known field patterns
    const fieldPatterns: [string, RegExp][] = [
      ["dirigente", /^Dirigente\s*[:\-]\s*(.+)/i],
      ["leitura", /^Leitura\s*[:\-]\s*(.+)/i],
      ["texto", /^Texto\s*[:\-]\s*(.+)/i],
      ["pregacao", /^Prega[çc][ãa]o\s*[:\-]\s*(.+)/i],
      ["estudo", /^Estudo\s*[:\-]\s*(.+)/i],
    ];

    let matched = false;
    for (const [key, regex] of fieldPatterns) {
      const m = line.match(regex);
      if (m) {
        currentFields[key] = m[1].trim();
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Detect time slot keywords
    if (/Escola B[íi]blica/i.test(line) || /Manh[ãa]/i.test(line)) {
      flushActivity();
      currentSlot = "domingo_manha";
      if (/Escola B[íi]blica/i.test(line)) currentTitle = "Escola Bíblica Dominical";
      continue;
    }
    if (/Culto de Adora[çc][ãa]o/i.test(line) || (/Noite/i.test(line) && /18/i.test(line))) {
      flushActivity();
      currentSlot = "domingo_noite";
      if (/Culto de Adora/i.test(line)) currentTitle = "Culto de Adoração";
      continue;
    }
    if (/Culto de Ora[çc][ãa]o/i.test(line)) {
      flushActivity();
      currentSlot = "quarta";
      currentTitle = line.includes("Nos Lares") ? "Culto de Oração Nos Lares" : "Culto de Oração";
      continue;
    }
    if (/Quarta\s*Mission[áa]ria/i.test(line)) {
      flushActivity();
      currentSlot = "quarta";
      currentTitle = "Quarta Missionária";
      continue;
    }
    if (/Reuni[ãa]o de Senhores/i.test(line) || /Reuni[ãa]o de Senhoras/i.test(line)) {
      flushActivity();
      currentSlot = "sexta";
      currentTitle = line;
      continue;
    }
    if (/Encontr[ãa]o/i.test(line)) {
      flushActivity();
      currentSlot = "sexta";
      currentTitle = line;
      continue;
    }
    if (/Mocidade/i.test(line)) {
      flushActivity();
      currentSlot = "sabado";
      currentTitle = "Mocidade";
      continue;
    }

    // If we have a current activity but no title yet, this line might be the title
    if (currentDay && currentSlot && !currentTitle && line.length > 3) {
      currentTitle = line;
    }
  }

  // Flush the last activity
  flushActivity();

  return activities;
}
