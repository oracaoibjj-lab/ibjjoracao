import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Megaphone, Calendar, BookOpen } from "lucide-react";
import logo from "@/assets/logo-ibjj.png";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Mural de Oração IBJJ" },
      { name: "description", content: "Boas-vindas ao mural de oração da IBJJ. Pedidos, agradecimentos, avisos e programações." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: verse } = useQuery({
    queryKey: ["home-verse"],
    queryFn: async () => {
      const { data } = await supabase.from("daily_verses").select("*").order("display_date", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  // Próxima atividade do calendário (monthly_activities)
  const { data: nextEvent } = useQuery({
    queryKey: ["home-next-event"],
    queryFn: async () => {
      const today = startOfDay(new Date());

      const { data } = await supabase
        .from("monthly_activities")
        .select("*")
        .order("month", { ascending: true })
        .order("day", { ascending: true });

      if (!data || data.length === 0) return null;

      // Converte month (YYYY-MM) + day em Date e filtra as futuras/hoje
      const withDates = data
        .map((a) => {
          const [year, month] = a.month.split("-").map(Number);
          const date = new Date(year, month - 1, a.day);
          return { ...a, date };
        })
        .filter((a) => a.date >= today)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return withDates[0] ?? null;
    },
  });

  // Formata o time_slot de forma legível
  const formatSlot = (slot: string) =>
    slot === "domingo_manha" ? "Dom 8h" :
    slot === "domingo_noite" ? "Dom 18h" :
    slot.replace(/_/g, " ");

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-gold/10" />
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24 grid lg:grid-cols-[1fr_auto] gap-10 items-center">
          <div className="text-center lg:text-left">
            <h1 className="mt-6 font-display text-4xl sm:text-5xl text-primary-dark">
              Bem-vindo
            </h1>
            <p className="mt-6 font-display text-3xl sm:text-4xl text-primary-dark leading-tight max-w-2xl mx-auto lg:mx-0">
              Compartilhe pedidos de oração, agradecimentos e acompanhe a vida da nossa igreja.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start flex-wrap">
              <Link to={"/mural" as never} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary-dark transition">
                <Heart className="h-5 w-5" /> Abrir o mural
              </Link>
              <Link to={"/avisos" as never} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-8 py-4 text-base font-semibold hover:bg-secondary transition">
                <Megaphone className="h-5 w-5" /> Ver avisos
              </Link>
              <Link to={"/atividades" as never} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-8 py-4 text-base font-semibold hover:bg-secondary transition">
                <Calendar className="h-5 w-5" /> Ver programações
              </Link>
            </div>

            {/* PRÓXIMA PROGRAMAÇÃO — discreta, abaixo dos botões */}
            {nextEvent && (
              <div className="mt-5 inline-flex items-center gap-2.5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur px-4 py-2.5 text-sm text-foreground/65">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  <span className="font-medium text-foreground/80">Próxima:</span>{" "}
                  <span className="font-semibold text-primary-dark">{nextEvent.title}</span>
                  {" — "}
                  {format((nextEvent as any).date, "EEEE, dd/MM", { locale: ptBR })}
                  {nextEvent.time_slot && <> · {formatSlot(nextEvent.time_slot)}</>}
                  {nextEvent.local && <> · {nextEvent.local}</>}
                </span>
              </div>
            )}
          </div>
          <img src={logo} alt="IBJJ" className="mx-auto h-56 lg:h-72 w-auto object-contain drop-shadow-xl" />
        </div>
      </section>

      {/* VERSE */}
      {verse && (
        <section className="mx-auto max-w-4xl px-6 -mt-4">
          <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-8 text-center">
            <BookOpen className="mx-auto h-6 w-6 text-gold-foreground" />
            <p className="mt-4 font-display text-2xl text-primary-dark italic">"{verse.text}"</p>
            <p className="mt-3 text-sm uppercase tracking-widest text-gold-foreground/80">{verse.reference}</p>
          </div>
        </section>
      )}
    </div>
  );
}
