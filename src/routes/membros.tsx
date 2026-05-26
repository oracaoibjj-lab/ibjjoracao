import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, User } from "lucide-react";
import { differenceInYears } from "date-fns";

export const Route = createFileRoute("/membros")({
  head: () => ({ meta: [{ title: "Membros — IBJJ" }] }),
  component: MembersPage,
});

function MembersPage() {
  const [search, setSearch] = useState("");

  const { data: members } = useQuery({
    queryKey: ["members", search],
    queryFn: async () => {
      let q = supabase.from("members").select("*, families(name)").order("full_name");
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-4xl sm:text-5xl text-primary-dark">Membros</h1>
      <p className="mt-2 text-muted-foreground text-lg">Conheça quem faz parte da nossa família.</p>

      <div className="relative mt-8 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="h-13 pl-12 rounded-full bg-card border-border" />
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members?.map((m) => {
          const age = m.birth_date ? differenceInYears(new Date(), new Date(m.birth_date)) : null;
          return (
            <Link
              key={m.id}
              to={"/membros/$id" as never}
              params={{ id: m.id } as never}
              className="group rounded-3xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/30 transition"
            >
              <div className="flex items-center gap-4">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.full_name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-display text-lg text-primary-dark truncate group-hover:text-primary">{m.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {age !== null && `${age} anos`}
                    {m.families && ` • Fam. ${m.families.name}`}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
        {members && members.length === 0 && (
          <p className="col-span-full text-muted-foreground text-center py-12">Nenhum membro encontrado.</p>
        )}
      </div>
    </div>
  );
}
