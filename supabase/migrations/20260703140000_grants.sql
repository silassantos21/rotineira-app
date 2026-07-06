-- Grants explícitos para as roles anon, authenticated e service_role
-- Necessário porque auto_expose_new_tables está desabilitado no config.toml

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plans   TO authenticated;

-- anon só precisa ler user_profiles (para o trigger de criação funcionar via PostgREST)
GRANT SELECT ON public.user_profiles TO anon;

-- service_role precisa de acesso direto (usado pelo backend FastAPI/Celery para bypassar RLS)
GRANT ALL ON public.user_profiles   TO service_role;
GRANT ALL ON public.family_profiles TO service_role;
GRANT ALL ON public.weekly_plans    TO service_role;
