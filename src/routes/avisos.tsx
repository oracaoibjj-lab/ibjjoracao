import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Megaphone, Star, Cake, User } from "lucide-react";
import { format, startOfWeek, endOfWeek, isSameDay, addDays, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/avisos")({
  head: () => ({ meta: [{ title: "Avisos e Programações — IBJJ" }] }),
  component: AnnouncementsPage,
});

const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function AnnouncementsPage() {
  const { data: announcements } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("publish_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: schedule } = useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      const { data } = await supabase.from("services_schedule").select("*").order("weekday").order("start_time");
      return data ?? [];
    },
  });

  const { data: birthdays } = useQuery({
    queryKey: ["birthdays-week"],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("id, full_name, photo_url, birth_date")
        .not("birth_date", "is", null);
      if (!data) return [];

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

      return data
        .filter((m) => {
          if (!m.birth_date) return false;
          const bd = new Date(m.birth_date);
          // Create date in current year with same month/day
          const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
          return thisYearBd >= weekStart && thisYearBd <= weekEnd;
        })
        .map((m) => {
          const bd = new Date(m.birth_date!);
          const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
          const age = differenceInYears(today, bd);
          const isToday = isSameDay(thisYearBd, today);
          return { ...m, age, thisYearBd, isToday };
        })
        .sort((a, b) => a.thisYearBd.getTime() - b.thisYearBd.getTime());
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-12">

      {/* ANIVERSARIANTES DA SEMANA */}
      {birthdays && birthdays.length > 0 && (
        <section>
          <h2 className="font-display text-3xl text-primary-dark flex items-center gap-3">
            <Cake className="h-7 w-7 text-gold" /> Aniversariantes da semana
          </h2>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {birthdays.map((m) => (
              <div
                key={m.id}
                className={`rounded-3xl border p-5 flex items-center gap-4 transition
                  ${m.isToday
                    ? "border-gold bg-gold/10 ring-2 ring-gold/30"
                    : "border-border bg-card"
                  }`}
              >
                {m.photo_url ? (
                  <img
                    src={m.photo_url}
                    alt={m.full_name}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-border shrink-0"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <User className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-display text-lg text-primary-dark truncate">
                    {m.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.isToday ? "🎉 Hoje!" : format(m.thisYearBd, "EEEE, dd/MM", { locale: ptBR })}
                    {m.age > 0 && ` • ${m.age} anos`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AVISOS */}
      <section>
        <h1 className="font-display text-4xl sm:text-5xl text-primary-dark flex items-center gap-3">
          <Megaphone className="h-9 w-9 text-gold" /> Avisos
        </h1>
        <div className="mt-6 space-y-4">
          {announcements?.length === 0 && <p className="text-muted-foreground">Nenhum aviso publicado.</p>}
          {announcements?.map((a) => (
            <article key={a.id} className={`rounded-3xl border p-6 ${a.is_important ? "border-gold bg-gold/10" : "border-border bg-card"}`}>
              <div className="flex items-center gap-2">
                {a.is_important && <Star className="h-4 w-4 text-gold-foreground fill-gold" />}
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{format(new Date(a.publish_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              </div>
              <h2 className="mt-2 font-display text-2xl text-primary-dark">{a.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-foreground/85">{a.content}</p>
            </article>
          ))}
        </div>
      </section>

      {/* PROGRAMAÇÕES */}
      <section>
        <h2 className="font-display text-3xl text-primary-dark flex items-center gap-3">
          <Calendar className="h-7 w-7 text-primary" /> Programações
        </h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {schedule?.map((s) => (
            <div key={s.id} className="rounded-3xl border border-border bg-card p-6">
              <p className="font-display text-xl text-primary-dark">{s.title}</p>
              {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {s.weekday !== null && s.weekday !== undefined && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{weekdays[s.weekday]}</span>
                )}
                {s.event_date && (
                  <span className="rounded-full bg-gold/15 px-3 py-1 text-gold-foreground">{format(new Date(s.event_date), "dd/MM/yyyy")}</span>
                )}
                {s.start_time && (
                  <span className="rounded-full bg-secondary px-3 py-1">{s.start_time.slice(0, 5)}{s.end_time ? `–${s.end_time.slice(0, 5)}` : ""}</span>
                )}
                {s.location && <span className="rounded-full bg-secondary px-3 py-1">{s.location}</span>}
              </div>
            </div>
          ))}
          {schedule?.length === 0 && <p className="text-muted-foreground">Nenhuma programação cadastrada.</p>}
        </div>
      </section>
    </div>
  );
}

