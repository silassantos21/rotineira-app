ALTER TABLE public.weekly_plans
  ADD COLUMN period TEXT NOT NULL DEFAULT 'weekly'
    CHECK (period IN ('weekly', 'biweekly', 'monthly'));
