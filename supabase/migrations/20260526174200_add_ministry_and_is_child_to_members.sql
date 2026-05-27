-- Add ministry and is_child columns to members table
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS ministry TEXT,
  ADD COLUMN IF NOT EXISTS is_child BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing data from internal_notes tags to proper columns
UPDATE public.members
SET
  is_child = (internal_notes LIKE '%[FILHO_DE_MEMBRO]%'),
  ministry = CASE
    WHEN internal_notes ~ '\[MINISTERIO:([^\]]+)\]'
    THEN substring(internal_notes FROM '\[MINISTERIO:([^\]]+)\]')
    ELSE NULL
  END,
  internal_notes = TRIM(
    regexp_replace(
      regexp_replace(internal_notes, '\[FILHO_DE_MEMBRO\]', '', 'g'),
      '\[MINISTERIO:[^\]]*\]', '', 'g'
    )
  )
WHERE internal_notes IS NOT NULL
  AND (internal_notes LIKE '%[FILHO_DE_MEMBRO]%' OR internal_notes LIKE '%[MINISTERIO:%');

-- Set empty internal_notes to NULL
UPDATE public.members SET internal_notes = NULL WHERE TRIM(internal_notes) = '';
