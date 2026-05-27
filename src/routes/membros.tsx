import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, User, Cake, UsersRound, Heart, ChevronRight } from "lucide-react";
import { differenceInYears, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/membros")({
  head: () => ({ meta: [{ title: "Membros — IBJJ" }] }),
  component: MembersPage,
});

const MARITAL: Record<string, string> = {
  solteiro: "Solteiro(a)", casado: "Casado(a)", viuvo: "Viúvo(a)", divorciado: "Divorciado(a)", outro: "Outro",
};

function MembersPage() {
  const matchRoute = useMatchRoute();
  const isProfilePage = matchRoute({ to: "/membros/$id" as never });

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("membros");

  const { data: members } = useQuery({
    queryKey: ["members", search],
    queryFn: async () => {
      let q = supabase.from("members").select("id, full_name, photo_url, birth_date, marital_status, baptism_date, conversion_year, is_child, families(name)").order("full_name");
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  if (isProfilePage) {
    return <Outlet />;
  }

  const filteredMembers = members?.filter(m => !m.is_child) || [];
  const filteredChildren = members?.filter(m => m.is_child) || [];
  const currentCount = activeTab === "membros" ? filteredMembers.length : filteredChildren.length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-4xl sm:text-5xl text-primary-dark">Membros</h1>
      <p className="mt-2 text-muted-foreground text-lg">Conheça quem faz parte da nossa família IBJJ.</p>

      <div className="relative mt-8 sticky top-20 z-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="h-13 pl-12 rounded-full bg-card border-border shadow-sm"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <TabsList className="bg-card border border-border h-11 p-1 rounded-full">
            <TabsTrigger value="membros" className="rounded-full px-5">Membros</TabsTrigger>
            <TabsTrigger value="filhos" className="rounded-full px-5">Filhos</TabsTrigger>
          </TabsList>
          
          <p className="text-sm text-muted-foreground">
            {currentCount} {currentCount === 1 ? "registro" : "registros"}
          </p>
        </div>

        <TabsContent value="membros" className="mt-0 outline-none">
          <MembersList members={filteredMembers} />
        </TabsContent>

        <TabsContent value="filhos" className="mt-0 outline-none">
          <MembersList members={filteredChildren} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MembersList({ members }: { members: any[] }) {
  return (
    <ul className="mt-4 divide-y divide-border rounded-3xl border border-border bg-card overflow-hidden">
      {members.map((m) => {
        const age = m.birth_date ? differenceInYears(new Date(), new Date(m.birth_date)) : null;
        const family = m.families?.name;
        return (
          <li key={m.id}>
            <Link
              to={"/membros/$id" as never}
              params={{ id: m.id } as never}
              className="group flex items-center gap-4 p-4 sm:p-5 hover:bg-secondary/60 transition-colors"
            >
              {m.photo_url ? (
                <img
                  src={m.photo_url}
                  alt={m.full_name}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-border group-hover:ring-primary/40 transition shrink-0"
                />
              ) : (
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-gold/15 text-primary shrink-0">
                  <User className="h-8 w-8" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-display text-lg sm:text-xl text-primary-dark truncate group-hover:text-primary transition-colors">
                  {m.full_name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {age !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Cake className="h-3.5 w-3.5" /> {age} anos
                    </span>
                  )}
                  {family && (
                    <span className="inline-flex items-center gap-1">
                      <UsersRound className="h-3.5 w-3.5" /> Fam. {family}
                    </span>
                  )}
                  {!m.is_child && m.marital_status && MARITAL[m.marital_status] && (
                    <span>{MARITAL[m.marital_status]}</span>
                  )}
                  {m.baptism_date && (
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> Batizado em {format(new Date(m.baptism_date), "MMM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                  {!m.baptism_date && m.conversion_year && (
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> Conv. {m.conversion_year}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0" />
            </Link>
          </li>
        );
      })}
      {members.length === 0 && (
        <li className="text-center py-16 text-muted-foreground">Nenhum registro encontrado.</li>
      )}
    </ul>
  );
}
