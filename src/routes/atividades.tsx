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
  { key: "segunda", label: "Segunda-feira — 19h", short: "Seg 19h", weekday: 1, color: "bg-slate-500/10 text-slate-700 border-slate-200" },
  { key: "terca", label: "Terça-feira — 19h", short: "Ter 19h", weekday: 2, color: "bg-orange-500/10 text-orange-700 border-orange-200" },
  { key: "quarta", label: "Quarta-feira — 19h", short: "Qua 19h", weekday: 3, color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { key: "quinta", label: "Quinta-feira — 19h", short: "Qui 19h", weekday: 4, color: "bg-cyan-500/10 text-cyan-700 border-cyan-200" },
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

  const activeColumns = useMemo(() => {
    const hasMonday = activities?.some((a) => a.time_slot === "segunda") ?? false;
    const hasTuesday = activities?.some((a) => a.time_slot === "terca") ?? false;
    const hasThursday = activities?.some((a) => a.time_slot === "quinta") ?? false;

    const cols = [
      { key: "domingo_manha", label: "Domingo", subLabel: "Manhã | 8h", weekday: 0, time_slot: "domingo_manha" },
      { key: "domingo_noite", label: "Domingo", subLabel: "Noite | 18h", weekday: 0, time_slot: "domingo_noite" },
    ];

    if (hasMonday) {
      cols.push({ key: "segunda", label: "Segunda-feira", subLabel: "19h", weekday: 1, time_slot: "segunda" });
    }
    if (hasTuesday) {
      cols.push({ key: "terca", label: "Terça-feira", subLabel: "19h", weekday: 2, time_slot: "terca" });
    }

    cols.push({ key: "quarta", label: "Quarta-feira", subLabel: "19h", weekday: 3, time_slot: "quarta" });

    if (hasThursday) {
      cols.push({ key: "quinta", label: "Quinta-feira", subLabel: "19h", weekday: 4, time_slot: "quinta" });
    }

    cols.push({ key: "sexta", label: "Sexta-feira", subLabel: "19h", weekday: 5, time_slot: "sexta" });
    cols.push({ key: "sabado", label: "Sábado", subLabel: "19h", weekday: 6, time_slot: "sabado" });

    return cols;
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
        {/* Double-layer Header */}
        <div 
          className="grid border-b border-border bg-secondary/50 font-display font-bold text-primary-dark divide-x divide-border"
          style={{ gridTemplateColumns: `repeat(${activeColumns.length}, minmax(0, 1fr))` }}
        >
          {/* Sunday Header Spanning 2 Columns */}
          <div className="col-span-2 py-3 text-center bg-primary/5 text-sm uppercase tracking-wider">
            Domingo
          </div>
          {activeColumns.slice(2).map((col) => (
            <div key={col.key} className="py-3 text-center text-sm uppercase tracking-wider">
              {col.label}
            </div>
          ))}
        </div>

        {/* Sub-header (Times/Types) */}
        <div 
          className="grid border-b border-border bg-secondary/20 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider divide-x divide-border"
          style={{ gridTemplateColumns: `repeat(${activeColumns.length}, minmax(0, 1fr))` }}
        >
          {activeColumns.map((col) => (
            <div key={col.key} className="px-2 py-2.5">
              {col.subLabel}
            </div>
          ))}
        </div>

        {/* Weeks rows */}
        {weeks.map((week, wi) => (
          <div 
            key={wi} 
            className="grid border-b border-border last:border-b-0 divide-x divide-border"
            style={{ gridTemplateColumns: `repeat(${activeColumns.length}, minmax(0, 1fr))` }}
          >
            {activeColumns.map((col) => {
              const day = week.days[col.weekday];
              const activity = day ? actsByDaySlot[`${day}-${col.time_slot}`] : null;
              const slot = getSlotInfo(col.time_slot);
              const isToday = day !== null && isCurrentMonth && day === today.getDate();

              return (
                <div
                  key={col.key}
                  className={`min-h-[145px] p-2.5 transition group relative flex flex-col justify-between
                    ${day === null ? "bg-secondary/10" : "hover:bg-secondary/20"}
                    ${isToday ? "bg-primary/5 ring-inset ring-2 ring-primary/20" : ""}`}
                >
                  {day !== null && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold ${isToday ? "bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center" : "text-muted-foreground"}`}>
                          {day}
                        </span>
                        
                        {isAdmin && !activity && (
                          <button
                            onClick={() => handleAdd(day, col.time_slot)}
                            className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition opacity-0 group-hover:opacity-100"
                            title={`Adicionar programação`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {activity ? (
                        <button
                          onClick={() => setSelectedActivity(activity)}
                          className={`w-full text-left rounded-xl border p-2.5 text-xs transition cursor-pointer hover:shadow-md hover:scale-[1.01] duration-150 flex-1 flex flex-col justify-between min-h-[90px]
                            ${slot?.color ?? "bg-card text-foreground border-border"}`}
                        >
                          <div>
                            <p className="font-display font-bold text-[13px] text-primary-dark leading-snug mb-1.5 break-words line-clamp-2">
                              {activity.title}
                            </p>
                            
                            <div className="space-y-0.5 text-[10.5px] opacity-90">
                              {activity.dirigente && (
                                <p className="truncate"><span className="font-semibold">Dirigente:</span> {activity.dirigente}</p>
                              )}
                              {activity.leitura && (
                                <p className="truncate"><span className="font-semibold">Leitura:</span> {activity.leitura}</p>
                              )}
                              {activity.texto && (
                                <p className="truncate"><span className="font-semibold">Texto:</span> {activity.texto}</p>
                              )}
                              {activity.pregacao && (
                                <p className="truncate"><span className="font-semibold">Pregação:</span> {activity.pregacao}</p>
                              )}
                              {activity.estudo && (
                                <p className="truncate"><span className="font-semibold">Estudo:</span> {activity.estudo}</p>
                              )}
                              {activity.local && (
                                <p className="truncate"><span className="font-semibold">Local:</span> {activity.local}</p>
                              )}
                              {activity.notes && (
                                <p className="truncate text-muted-foreground italic"><span className="font-semibold">Obs:</span> {activity.notes}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div className="flex-1">
                          {/* Empty state spacer */}
                        </div>
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
          {isAdmin && " Clique em 'Nova atividade' para começar."}
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
