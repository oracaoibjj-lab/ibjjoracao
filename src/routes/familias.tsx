import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, UsersRound, ChevronDown, User } from "lucide-react";

export const Route = createFileRoute("/familias")({
  head: () => ({ meta: [{ title: "Famílias — IBJJ" }] }),
  component: FamiliesPage,
});

function FamiliesPage() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

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

      <div className="mt-8 space-y-3">
        {filtered?.map((f) => {
          const isOpen = openId === f.id || !!search;
          return (
            <div key={f.id} className="rounded-3xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : f.id)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-secondary/40"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20 text-gold-foreground">
                    <UsersRound className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-display text-xl text-primary-dark">Família {f.name}</p>
                    <p className="text-sm text-muted-foreground">{f.members.length} {f.members.length === 1 ? "membro" : "membros"}</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-border p-5 grid sm:grid-cols-2 gap-3">
                  {f.members.length === 0 && <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>}
                  {f.members.map((m) => (
                    <Link key={m.id} to={"/membros/$id" as never} params={{ id: m.id } as never} className="flex items-center gap-3 rounded-xl p-3 hover:bg-secondary">
                      {m.photo_url ? (
                        <img src={m.photo_url} alt={m.full_name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-5 w-5" /></div>
                      )}
                      <span className="font-medium">{m.full_name}</span>
                    </Link>
                  ))}
                </div>
              )}
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
