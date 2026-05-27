import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, User } from "lucide-react";

export const Route = createFileRoute("/familias")({
  head: () => ({ meta: [{ title: "Famílias — IBJJ" }] }),
  component: FamiliesPage,
});

function FamiliesPage() {
  const [search, setSearch] = useState("");

  const { data: families } = useQuery({
    queryKey: ["families-with-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("families").select("*, members(id, full_name, photo_url)").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = families?.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.members.some((m) => m.full_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-4xl sm:text-5xl text-primary-dark">Famílias</h1>
      <p className="mt-2 text-muted-foreground text-lg">Nossa igreja organizada em famílias.</p>

      <div className="relative mt-8 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar família ou membro..." className="h-13 pl-12 rounded-full bg-card" />
      </div>

      <div className="mt-10 space-y-12">
        {filtered?.map((f) => {
          const sortedMembers = [...f.members].sort((a, b) => a.full_name.localeCompare(b.full_name));
          return (
            <div key={f.id}>
              <div className="flex items-end gap-3 mb-4 pb-2 border-b border-border">
                <h2 className="font-display text-2xl text-primary-dark">Família {f.name}</h2>
                <span className="text-sm text-muted-foreground mb-1">({sortedMembers.length} {sortedMembers.length === 1 ? "membro" : "membros"})</span>
              </div>
              
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {sortedMembers.length === 0 && <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>}
                {sortedMembers.map((m) => (
                  <Link key={m.id} to={"/membros/$id" as never} params={{ id: m.id } as never} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/40 hover:bg-secondary/20 transition-colors">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.full_name} className="h-10 w-10 rounded-full object-cover ring-1 ring-border" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-5 w-5" /></div>
                    )}
                    <span className="font-medium text-primary-dark">{m.full_name}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {filtered && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Nenhuma família encontrada.</p>
        )}
      </div>
    </div>
  );
}
