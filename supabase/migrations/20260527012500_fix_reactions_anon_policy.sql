-- Corrigir política de inserção de reactions para visitantes anônimos
-- O role 'anon' precisa de permissão explícita de INSERT na tabela reactions

DROP POLICY IF EXISTS "Anyone insert reaction" ON public.reactions;
DROP POLICY IF EXISTS "Anyone delete reaction" ON public.reactions;

-- Permitir inserção por anônimos (session_id) e por usuários autenticados
CREATE POLICY "Anyone insert reaction" ON public.reactions FOR INSERT TO anon, authenticated WITH CHECK (
  (auth.role() = 'authenticated' AND user_id = auth.uid()) OR
  (auth.role() = 'anon' AND user_id IS NULL AND session_id IS NOT NULL)
);

-- Permitir deleção por anônimos (session_id) e por usuários autenticados
CREATE POLICY "Anyone delete reaction" ON public.reactions FOR DELETE TO anon, authenticated USING (
  (auth.role() = 'authenticated' AND user_id = auth.uid()) OR
  (auth.role() = 'anon' AND user_id IS NULL AND session_id IS NOT NULL)
);
