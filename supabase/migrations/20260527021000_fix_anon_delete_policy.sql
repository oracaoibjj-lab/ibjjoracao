-- Corrigir políticas de deleção de reações para visitantes anônimos
DROP POLICY IF EXISTS "Anyone delete reaction" ON public.reactions;

-- Permitir deleção por visitantes (anon com session_id) e usuários logados
CREATE POLICY "Anyone delete reaction" ON public.reactions
FOR DELETE TO anon, authenticated
USING (
  (auth.role() = 'authenticated' AND user_id = auth.uid())
  OR
  (auth.role() = 'anon' AND session_id IS NOT NULL)
);

-- Garantir privilégios explicitamente para o role anon
GRANT INSERT, DELETE ON public.reactions TO anon;
