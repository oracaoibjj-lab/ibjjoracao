CREATE TABLE IF NOT EXISTS public.monthly_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
  time_slot TEXT NOT NULL,
  title TEXT NOT NULL,
  dirigente TEXT,
  leitura TEXT,
  texto TEXT,
  pregacao TEXT,
  estudo TEXT,
  local TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.monthly_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view monthly_activities" ON public.monthly_activities
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage monthly_activities" ON public.monthly_activities
  FOR ALL USING (auth.role() = 'authenticated');
