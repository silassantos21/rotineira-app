ALTER TABLE public.weekly_plans
    ADD COLUMN IF NOT EXISTS parent_plan_id UUID REFERENCES public.weekly_plans(id);
