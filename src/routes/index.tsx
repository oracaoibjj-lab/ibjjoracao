import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Megaphone, Calendar, BookOpen, Sparkles, Users } from "lucide-react";
import logo from "@/assets/logo-ibjj.png";
import { format } from "date-fns";
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
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [approved, members] = await Promise.all([
        supabase.from("prayer_requests").select("id,title,display_name,is_anonymous,type,category,created_at").eq("status", "aprovado").order("created_at", { ascending: false }).limit(4),
        supabase.from("members").select("id", { count: "exact", head: true }),
      ]);
      return {
        recent: approved.data ?? [],
        totalMembers: members.count ?? 0,
      };
    },
  });

  const { data: announcements } = useQuery({
    queryKey: ["home-announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("publish_date", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  const { data: schedule } = useQuery({
    queryKey: ["home-schedule"],
    queryFn: async () => {
      const { data } = await supabase.from("services_schedule").select("*").order("weekday", { ascending: true }).limit(4);
      return data ?? [];
    },
  });

  const { data: verse } = useQuery({
    queryKey: ["home-verse"],
    queryFn: async () => {
      const { data } = await supabase.from("daily_verses").select("*").order("display_date", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

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
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to={"/mural" as never} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary-dark transition">
                <Heart className="h-5 w-5" /> Abrir o mural
              </Link>
              <Link to={"/avisos" as never} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-8 py-4 text-base font-semibold hover:bg-secondary transition">
                <Megaphone className="h-5 w-5" /> Ver avisos
              </Link>
            </div>
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



      {/* RECENT PRAYERS */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <SectionHeader title="Pedidos e agradecimentos recentes" link="/mural" linkLabel="Ver todos" />
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {(stats?.recent ?? []).length === 0 && (
            <p className="text-muted-foreground col-span-full">Ainda não há pedidos aprovados.</p>
          )}
          {stats?.recent.map((p) => (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold-foreground">
                <span className="rounded-full bg-gold/20 px-2 py-0.5">{p.type === "agradecimento" ? "Gratidão" : "Pedido"}</span>
                <span>{p.category}</span>
              </div>
              <h3 className="mt-3 font-display text-xl text-primary-dark">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.is_anonymous ? "Anônimo" : (p.display_name ?? "Membro")} •{" "}
                {format(new Date(p.created_at), "dd 'de' MMM", { locale: ptBR })}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* SCHEDULE + ANNOUNCEMENTS */}
      <section className="mx-auto max-w-6xl px-6 py-12 grid lg:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="Próximas programações" />
          <div className="mt-6 space-y-3">
            {(schedule ?? []).length === 0 && <p className="text-muted-foreground">Nenhuma programação cadastrada.</p>}
            {schedule?.map((s) => (
              <div key={s.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg text-primary-dark">{s.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.weekday !== null && s.weekday !== undefined ? weekdays[s.weekday] : ""} {s.start_time?.slice(0, 5)}
                    {s.location ? ` • ${s.location}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Avisos" link="/avisos" linkLabel="Ver todos" />
          <div className="mt-6 space-y-3">
            {(announcements ?? []).length === 0 && <p className="text-muted-foreground">Nenhum aviso publicado.</p>}
            {announcements?.map((a) => (
              <div key={a.id} className={`rounded-2xl border p-5 ${a.is_important ? "border-gold bg-gold/10" : "border-border bg-card"}`}>
                <p className="font-display text-lg text-primary-dark">{a.title}</p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.content}</p>
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{format(new Date(a.publish_date), "dd 'de' MMMM", { locale: ptBR })}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


function SectionHeader({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="font-display text-3xl text-primary-dark">{title}</h2>
      {link && (
        <Link to={link as never} className="text-sm font-medium text-primary hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
