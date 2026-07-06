-- Rotineira — Schema inicial
-- Execute no Supabase: Dashboard > SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tabela: perfis de usuário (extensão do auth.users) ───────────────────
CREATE TABLE public.user_profiles (
    id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name   TEXT,
    plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
    -- controle de rate limiting do plano Free (1 geração/semana)
    generation_count_week  INTEGER NOT NULL DEFAULT 0,
    last_generation_reset  TIMESTAMPTZ DEFAULT NOW(),
    expo_push_token        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela: perfis familiares ─────────────────────────────────────────────
CREATE TABLE public.family_profiles (
    id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    -- array de membros armazenado como JSONB
    -- schema: [{ name, type, appetite, restrictions[], objectives[] }]
    members    JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela: planos semanais ───────────────────────────────────────────────
CREATE TABLE public.weekly_plans (
    id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    family_profile_id  UUID REFERENCES public.family_profiles(id) NOT NULL,
    week_start         DATE NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'processing', 'done', 'error')),
    meals              JSONB,
    shopping_list      JSONB,
    assembly_guide     JSONB,
    error_message      TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS (Row Level Security) ──────────────────────────────────────────────
ALTER TABLE public.user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plans    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_own" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "family_profiles_own" ON public.family_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "weekly_plans_own" ON public.weekly_plans
    FOR ALL USING (auth.uid() = user_id);

-- O backend usa service_role_key que bypassa RLS — necessário para o worker Celery
-- gravar o resultado do cardápio sem autenticação de usuário.

-- ── Trigger: criar user_profile ao registrar ──────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Trigger: atualizar updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_family_profiles_updated_at
    BEFORE UPDATE ON public.family_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_weekly_plans_updated_at
    BEFORE UPDATE ON public.weekly_plans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Índices ───────────────────────────────────────────────────────────────
CREATE INDEX idx_family_profiles_user_id ON public.family_profiles(user_id);
CREATE INDEX idx_weekly_plans_user_id    ON public.weekly_plans(user_id);
CREATE INDEX idx_weekly_plans_week_start ON public.weekly_plans(week_start);
CREATE INDEX idx_weekly_plans_status     ON public.weekly_plans(status);
