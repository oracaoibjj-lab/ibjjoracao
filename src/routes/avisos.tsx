import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Megaphone, Star } from "lucide-react";
import { format } from "date-fns";
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

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-12">
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
