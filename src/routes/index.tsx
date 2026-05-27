import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Megaphone, Calendar, BookOpen } from "lucide-react";
import logo from "@/assets/logo-ibjj.png";

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
              <Link to={"/atividades" as never} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-8 py-4 text-base font-semibold hover:bg-secondary transition">
                <Calendar className="h-5 w-5" /> Ver programações
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
    </div>
  );
}
