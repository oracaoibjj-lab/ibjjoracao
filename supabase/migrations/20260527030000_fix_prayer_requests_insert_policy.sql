-- Corrigir política de inserção de prayer_requests para restringir usuários logados não aprovados
DROP POLICY IF EXISTS "Anyone can create pending requests" ON public.prayer_requests;

-- Permitir inserção de pedidos pendentes por visitantes (apenas anon e sem author_id)
CREATE POLICY "Anyone can create pending requests" ON public.prayer_requests
FOR INSERT TO anon
WITH CHECK (
  status = 'pendente' AND author_id IS NULL
);
