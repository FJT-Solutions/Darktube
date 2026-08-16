// scripts/setup-postgres.ts
import { Client } from 'pg'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { NICHES } from '../lib/constants'

dotenv.config({ path: '.env.local' })
dotenv.config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("❌ ERRO: A variável de ambiente DATABASE_URL não está configurada no .env.local ou .env")
  process.exit(1)
}

const ddl = `
-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin', 'user'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'blocked'
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Nichos
CREATE TABLE IF NOT EXISTS public.niches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    revenue_potential TEXT,
    growth_potential TEXT,
    difficulty INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Canais
CREATE TABLE IF NOT EXISTS public.channels (
    id TEXT PRIMARY KEY, -- UC... (YouTube Channel ID)
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    avatar_url TEXT,
    banner_url TEXT,
    subscribers BIGINT DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    description TEXT,
    joined_date TEXT,
    country TEXT,
    url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    topic_categories TEXT[] DEFAULT '{}'::TEXT[],
    dark_type TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    tracked_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 4. Histórico de Métricas de Canais
CREATE TABLE IF NOT EXISTS public.channel_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT REFERENCES public.channels(id) ON DELETE CASCADE,
    subscribers BIGINT DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    avg_views_per_video NUMERIC DEFAULT 0,
    estimated_monthly_views BIGINT DEFAULT 0,
    estimated_revenue NUMERIC DEFAULT 0,
    dark_score NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Vídeos Analisados
CREATE TABLE IF NOT EXISTS public.videos (
    id TEXT PRIMARY KEY, -- YouTube Video ID
    channel_id TEXT REFERENCES public.channels(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    views BIGINT DEFAULT 0,
    duration TEXT,
    published_at TIMESTAMPTZ,
    transcript TEXT,
    ai_analysis JSONB,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Contas Conectadas
CREATE TABLE IF NOT EXISTS public.blotato_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    account_id TEXT NOT NULL,
    label TEXT,
    page_id TEXT DEFAULT '',
    page_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_blotato_account UNIQUE (user_id, platform, account_id, page_id)
);

-- 7. Modelos de Automação (Templates)
CREATE TABLE IF NOT EXISTS public.remodeling_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    video_title TEXT,
    video_thumbnail TEXT,
    name TEXT NOT NULL,
    template_data JSONB NOT NULL,
    generated_script TEXT,
    format TEXT NOT NULL,
    has_music BOOLEAN DEFAULT FALSE,
    music_style TEXT,
    voice_type TEXT,
    post_frequency TEXT NOT NULL,
    post_interval_days INTEGER,
    post_times TEXT[] DEFAULT '{}'::TEXT[],
    last_dispatched_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    target_accounts TEXT[] DEFAULT '{}'::TEXT[],
    tags TEXT[] DEFAULT '{}'::TEXT[],
    image_model TEXT NOT NULL,
    video_model TEXT NOT NULL,
    music_model TEXT,
    voice_model TEXT,
    voice_language TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Histórico de Produção/Remodelação
CREATE TABLE IF NOT EXISTS public.remodeling_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.remodeling_templates(id) ON DELETE CASCADE,
    original_video_id TEXT,
    dispatched_at TIMESTAMPTZ DEFAULT NOW(),
    payload JSONB,
    status TEXT DEFAULT 'pending',
    video_url TEXT,
    error_message TEXT
);

-- 9. Chaves de API dos Usuários
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_provider_key UNIQUE (user_id, provider)
);

-- 10. Armazenamento de Arquivos binários (Storage)
CREATE TABLE IF NOT EXISTS public.storage_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT UNIQUE NOT NULL,
    mime_type TEXT NOT NULL,
    content BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida de arquivos por nome
CREATE INDEX IF NOT EXISTS idx_storage_files_filename ON public.storage_files(filename);

-- 11. Tabela de Convites (Invites)
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'declined'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 12. Tabelas do Dark Clips (Meme Studio & Remodelagem)
CREATE TABLE IF NOT EXISTS public.dark_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    platform TEXT NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration NUMERIC DEFAULT 0,
    author_name TEXT,
    author_handle TEXT,
    author_avatar TEXT,
    original_caption TEXT,
    original_metrics JSONB DEFAULT '{}'::jsonb,
    sanitized BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dark_clips_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    profile_header JSONB NOT NULL DEFAULT '{}'::jsonb,
    headline_style JSONB NOT NULL DEFAULT '{}'::jsonb,
    video_placement JSONB NOT NULL DEFAULT '{}'::jsonb,
    background_style JSONB NOT NULL DEFAULT '{}'::jsonb,
    footer_style JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dark_clips_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    clip_id UUID REFERENCES public.dark_clips(id) ON DELETE SET NULL,
    title TEXT,
    rendered_video_url TEXT,
    remodel_data JSONB DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft',
    target_accounts JSONB DEFAULT '[]'::jsonb,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`

async function setup() {
  console.log("🚀 Conectando ao banco de dados PostgreSQL...")
  const client = new Client({
    connectionString,
    ssl: connectionString!.includes('supabase') || connectionString!.includes('neon') || connectionString!.includes('render') ? { rejectUnauthorized: false } : undefined
  })

  try {
    await client.connect()
    console.log("✅ Conexão estabelecida com sucesso!")

    console.log("⏳ Executando DDL para criação das tabelas...")
    await client.query(ddl)
    console.log("✅ Tabelas e índices criados com sucesso!")

    console.log("⏳ Semeando nichos iniciais...")
    for (const niche of NICHES) {
      await client.query(`
        INSERT INTO public.niches (name, label, revenue_potential, growth_potential, difficulty)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO UPDATE SET
          label = EXCLUDED.label,
          revenue_potential = EXCLUDED.revenue_potential,
          growth_potential = EXCLUDED.growth_potential,
          difficulty = EXCLUDED.difficulty
      `, [niche.id, niche.label, niche.revenuePotential, niche.growthPotential.toString(), niche.difficulty])
    }
    console.log("✅ Nichos semeados com sucesso!")

    console.log("\n✨ Inicialização concluída com sucesso!")
  } catch (error) {
    console.error("❌ ERRO durante a execução do setup:", error)
  } finally {
    await client.end()
  }
}

setup()
