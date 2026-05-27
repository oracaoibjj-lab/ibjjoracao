-- 1. Adicionar is_approved na tabela profiles
ALTER TABLE public.profiles ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false;

-- Aprovar usuários existentes automaticamente para não travá-los
UPDATE public.profiles SET is_approved = true;

-- 2. Modificar tabela reactions para permitir reações anônimas (com session_id)
ALTER TABLE public.reactions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.reactions ADD COLUMN session_id TEXT;

-- Remover a restrição única antiga e adicionar um índice único que considere session_id e user_id
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_prayer_id_user_id_key;
CREATE UNIQUE INDEX idx_reactions_unique ON public.reactions(prayer_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(session_id, ''));

-- 3. Atualizar políticas da tabela reactions
DROP POLICY IF EXISTS "Authed view reactions" ON public.reactions;
DROP POLICY IF EXISTS "Authed add own reaction" ON public.reactions;
DROP POLICY IF EXISTS "Remove own reaction" ON public.reactions;

-- Permitir leitura para todos (anon e authenticated)
CREATE POLICY "Anyone view reactions" ON public.reactions FOR SELECT USING (true);

-- Permitir inserção
CREATE POLICY "Anyone insert reaction" ON public.reactions FOR INSERT WITH CHECK (
  (auth.role() = 'authenticated' AND user_id = auth.uid()) OR
  (session_id IS NOT NULL)
);

-- Permitir deleção
CREATE POLICY "Anyone delete reaction" ON public.reactions FOR DELETE USING (
  (auth.role() = 'authenticated' AND user_id = auth.uid()) OR
  (session_id IS NOT NULL)
);

-- 4. Atualizar políticas para restringir dados sensíveis apenas a usuários aprovados
-- Tabela members
DROP POLICY IF EXISTS "Authed view members" ON public.members;
CREATE POLICY "Approved users view members" ON public.members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true)
);

-- Tabela families
DROP POLICY IF EXISTS "Anyone authed views families" ON public.families;
CREATE POLICY "Approved users view families" ON public.families FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true)
);

-- Tabela prayer_requests (inserção requer aprovação)
DROP POLICY IF EXISTS "Authed create requests" ON public.prayer_requests;
CREATE POLICY "Approved users create requests" ON public.prayer_requests FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND status = 'pendente' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true)
);
