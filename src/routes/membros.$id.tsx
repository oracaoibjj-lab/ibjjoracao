import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, User, Heart } from "lucide-react";
import { differenceInYears, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/membros/$id")({
  head: () => ({ meta: [{ title: "Perfil — IBJJ" }] }),
  component: MemberPage,
});

function MemberPage() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("*, families(id,name)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: prayers } = useQuery({
    queryKey: ["member-prayers", id, member?.user_id],
    enabled: !!member,
    queryFn: async () => {
      if (!member?.user_id) return [];
      const { data } = await supabase.from("prayer_requests").select("*").eq("author_id", member.user_id).eq("status", "aprovado").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  if (isLoading) return <div className="mx-auto max-w-3xl px-6 py-10">Carregando...</div>;
  if (!member) return <div className="mx-auto max-w-3xl px-6 py-10">Membro não encontrado.</div>;

  const age = member.birth_date ? differenceInYears(new Date(), new Date(member.birth_date)) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <Link to={"/membros" as never} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="rounded-3xl border border-border bg-card p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.full_name} className="h-32 w-32 rounded-full object-cover" />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-14 w-14" />
            </div>
          )}
          <div className="text-center sm:text-left">
            <h1 className="font-display text-4xl text-primary-dark">{member.full_name}</h1>
            <p className="mt-1 text-muted-foreground">
              {age !== null && `${age} anos`}
              {member.conversion_year && ` • Convertido em ${member.conversion_year}`}
            </p>
            {member.families && (
              <p className="mt-2 inline-block rounded-full bg-gold/15 px-3 py-1 text-sm text-gold-foreground">
                Família {member.families.name}
              </p>
            )}
          </div>
        </div>

        <dl className="mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-4">
          {member.marital_status && <Info label="Estado civil" value={member.marital_status} />}
          {member.spouse && <Info label="Cônjuge" value={member.spouse} />}
          {member.children && <Info label="Filhos" value={member.children} />}
          {member.baptism_date && <Info label="Batismo" value={format(new Date(member.baptism_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} />}
          {isAdmin && member.phone && <Info label="Telefone (admin)" value={member.phone} />}
          {isAdmin && member.email && <Info label="E-mail (admin)" value={member.email} />}
        </dl>
      </div>

      {prayers && prayers.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-2xl text-primary-dark mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> Pedidos recentes
          </h2>
          <div className="space-y-3">
            {prayers.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                <p className="font-medium text-primary-dark">{p.title}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{format(new Date(p.created_at), "dd 'de' MMM", { locale: ptBR })}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}
