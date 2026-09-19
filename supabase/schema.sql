-- ==============================================================================
-- Schema SQL Completo - TS EYEWEAR (PostgreSQL no Supabase)
-- Instruções: Copie e cole este script diretamente no SQL Editor do Supabase Dashboard
-- para criar todas as tabelas, tipos, índices e dados iniciais da aplicação.
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Criar Enums Personalizados
DO $$ BEGIN
    CREATE TYPE "StatusProduto" AS ENUM ('ATIVO', 'OCULTO', 'ARQUIVADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TipoMidia" AS ENUM ('IMAGEM', 'VIDEO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TipoMovimentacaoEstoque" AS ENUM ('ENTRADA', 'SAIDA_MANUAL', 'VENDA', 'AJUSTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabela de Administradores
CREATE TABLE IF NOT EXISTS "usuarios_admin" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "senhaHash" VARCHAR(255) NOT NULL,
    "criadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "atualizadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Categorias Principais
CREATE TABLE IF NOT EXISTS "categorias" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL UNIQUE,
    "slug" VARCHAR(100) NOT NULL UNIQUE,
    "ordem" INT DEFAULT 0 NOT NULL,
    "ativo" BOOLEAN DEFAULT true NOT NULL,
    "criadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "atualizadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Subcategorias
CREATE TABLE IF NOT EXISTS "subcategorias" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "categoriaId" UUID NOT NULL REFERENCES "categorias"("id") ON DELETE CASCADE,
    "criadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "atualizadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "subcategorias_categoria_slug_unique" UNIQUE ("categoriaId", "slug")
);

-- 6. Tabela de Produtos (Produto-Pai)
CREATE TABLE IF NOT EXISTS "produtos" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "skuPai" VARCHAR(100) NOT NULL UNIQUE,
    "titulo" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "descricao" TEXT NOT NULL,
    "precoVenda" DECIMAL(10, 2) NOT NULL,
    "precoPromocional" DECIMAL(10, 2),
    "destaqueHome" BOOLEAN DEFAULT false NOT NULL,
    "novidade" BOOLEAN DEFAULT false NOT NULL,
    "outlet" BOOLEAN DEFAULT false NOT NULL,
    "status" "StatusProduto" DEFAULT 'ATIVO' NOT NULL,
    "categoriaId" UUID NOT NULL REFERENCES "categorias"("id"),
    "subcategoriaId" UUID REFERENCES "subcategorias"("id") ON DELETE SET NULL,
    "criadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "atualizadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_produtos_categoria" ON "produtos"("categoriaId");
CREATE INDEX IF NOT EXISTS "idx_produtos_status" ON "produtos"("status");

-- 7. Tabela de Variações de Produto (Cores, Medidas e Estoque)
CREATE TABLE IF NOT EXISTS "produtos_variacoes" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "produtoId" UUID NOT NULL REFERENCES "produtos"("id") ON DELETE CASCADE,
    "skuVariacao" VARCHAR(100) NOT NULL UNIQUE,
    "corNome" VARCHAR(100) NOT NULL,
    "corHex" VARCHAR(20),
    "aroMm" INT NOT NULL,
    "ponteMm" INT NOT NULL,
    "hasteMm" INT NOT NULL,
    "material" VARCHAR(100) NOT NULL,
    "estoqueAtual" INT DEFAULT 0 NOT NULL,
    "precoDiferenciado" DECIMAL(10, 2),
    "statusAtivo" BOOLEAN DEFAULT true NOT NULL,
    "criadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "atualizadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_variacoes_produto" ON "produtos_variacoes"("produtoId");

-- 8. Tabela de Mídias (Fotos e Vídeos)
CREATE TABLE IF NOT EXISTS "produtos_midias" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "produtoId" UUID NOT NULL REFERENCES "produtos"("id") ON DELETE CASCADE,
    "variacaoId" UUID REFERENCES "produtos_variacoes"("id") ON DELETE SET NULL,
    "url" TEXT NOT NULL,
    "tipo" "TipoMidia" DEFAULT 'IMAGEM' NOT NULL,
    "ordem" INT DEFAULT 0 NOT NULL,
    "principal" BOOLEAN DEFAULT false NOT NULL,
    "criadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_midias_produto" ON "produtos_midias"("produtoId");
CREATE INDEX IF NOT EXISTS "idx_midias_variacao" ON "produtos_midias"("variacaoId");

-- 9. Tabela de Histórico de Estoque
CREATE TABLE IF NOT EXISTS "estoque_historico" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "variacaoId" UUID NOT NULL REFERENCES "produtos_variacoes"("id") ON DELETE CASCADE,
    "quantidade" INT NOT NULL,
    "tipoMovimentacao" "TipoMovimentacaoEstoque" NOT NULL,
    "motivo" VARCHAR(255),
    "criadoEm" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_historico_variacao" ON "estoque_historico"("variacaoId");

-- ==============================================================================
-- 10. Configuração dos Buckets no Supabase Storage
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos-imagens', 'produtos-imagens', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos-videos', 'produtos-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Leitura Pública para as Mídias
CREATE POLICY "Leitura pública de fotos de produtos"
ON storage.objects FOR SELECT
USING (bucket_id = 'produtos-imagens');

CREATE POLICY "Leitura pública de vídeos de produtos"
ON storage.objects FOR SELECT
USING (bucket_id = 'produtos-videos');

-- ==============================================================================
-- 11. Carga Inicial de Dados (Seed Inicial)
-- ==============================================================================

-- Categorias Iniciais
INSERT INTO "categorias" ("id", "nome", "slug", "ordem") VALUES
('a1000000-0000-0000-0000-000000000001', 'Óculos de Grau', 'oculos-de-grau', 1),
('a2000000-0000-0000-0000-000000000002', 'Óculos de Sol', 'oculos-de-sol', 2),
('a3000000-0000-0000-0000-000000000003', 'Lançamentos', 'lancamentos', 3),
('a4000000-0000-0000-0000-000000000004', 'Outlet', 'outlet', 4)
ON CONFLICT ("slug") DO NOTHING;

-- Subcategorias de Grau
INSERT INTO "subcategorias" ("nome", "slug", "categoriaId") VALUES
('Feminino', 'grau-feminino', 'a1000000-0000-0000-0000-000000000001'),
('Masculino', 'grau-masculino', 'a1000000-0000-0000-0000-000000000001'),
('Unissex', 'grau-unissex', 'a1000000-0000-0000-0000-000000000001'),
('Redondo', 'grau-redondo', 'a1000000-0000-0000-0000-000000000001'),
('Quadrado', 'grau-quadrado', 'a1000000-0000-0000-0000-000000000001'),
('Gatinho', 'grau-gatinho', 'a1000000-0000-0000-0000-000000000001'),
('Aviador', 'grau-aviador', 'a1000000-0000-0000-0000-000000000001')
ON CONFLICT ("categoriaId", "slug") DO NOTHING;

-- Subcategorias de Sol
INSERT INTO "subcategorias" ("nome", "slug", "categoriaId") VALUES
('Feminino', 'sol-feminino', 'a2000000-0000-0000-0000-000000000002'),
('Masculino', 'sol-masculino', 'a2000000-0000-0000-0000-000000000002'),
('Unissex', 'sol-unissex', 'a2000000-0000-0000-0000-000000000002'),
('Polarizado', 'sol-polarizado', 'a2000000-0000-0000-0000-000000000002'),
('Esportivo', 'sol-esportivo', 'a2000000-0000-0000-0000-000000000002')
ON CONFLICT ("categoriaId", "slug") DO NOTHING;

-- Administrador Inicial (admin@tseyewear.com.br / Senha temporária: AdminTsEyewear2026!)
INSERT INTO "usuarios_admin" ("nome", "email", "senhaHash")
VALUES (
    'Administrador TS EYEWEAR',
    'admin@tseyewear.com.br',
    '$2a$12$4vQ5f8Tz/K2Z9pA3h6WvpeLp6v0K6z8j7G5h4F3d2S1a0Q9w8e7r6' -- Hash Bcrypt temporário
)
ON CONFLICT ("email") DO NOTHING;
