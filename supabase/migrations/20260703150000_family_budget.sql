-- Adiciona coluna de orçamento máximo semanal ao perfil familiar
ALTER TABLE public.family_profiles
    ADD COLUMN IF NOT EXISTS weekly_budget_brl NUMERIC(8, 2);
