BEGIN;

-- =============================================
-- AFTERPAY J27 - CATALOGO COMPARTILHADO
-- Empresa principal: REGATA SAUNA
-- =============================================

-- 1. VERIFICAR AS TABELAS E COLUNAS

DO $check$
BEGIN
  IF to_regclass('public.produtos') IS NULL THEN
    RAISE EXCEPTION 'Tabela produtos nao encontrada';
  END IF;

  IF to_regclass('public.fornecedores') IS NULL THEN
    RAISE EXCEPTION 'Tabela fornecedores nao encontrada';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'produtos'
      AND column_name = 'variacoes'
  ) THEN
    RAISE EXCEPTION 'Coluna variacoes nao encontrada';
  END IF;
END;
$check$;

-- 2. ADICIONAR CONTROLE DE COMPARTILHAMENTO

ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS compartilhar_todas boolean
NOT NULL DEFAULT false;

ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS catalogo_origem_id uuid;

ALTER TABLE public.fornecedores
ADD COLUMN IF NOT EXISTS catalogo_origem_id uuid;

-- 3. IDENTIFICAR OS PRODUTOS QUE JA EXISTEM

UPDATE public.produtos AS copia
SET catalogo_origem_id = modelo.id
FROM public.produtos AS modelo
WHERE modelo.empresa_id =
  53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441
AND copia.empresa_id NOT IN (
'53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441',
  'cc637980-7ab5-48b0-9296-585be8197db1'
)
AND lower(btrim(copia.nome)) = lower(btrim(modelo.nome))
AND modelo.nome IN ('REGATA SAUNA', 'RESINA BOX 21')
AND copia.catalogo_origem_id IS NULL;

UPDATE public.produtos
SET catalogo_origem_id = id
WHERE empresa_id =
'53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
AND catalogo_origem_id IS NULL
AND nome IN ('REGATA SAUNA', 'RESINA BOX 21');

CREATE UNIQUE INDEX IF NOT EXISTS
produtos_empresa_catalogo_origem_uidx
ON public.produtos (empresa_id, catalogo_origem_id)
WHERE catalogo_origem_id IS NOT NULL;

-- 4. IDENTIFICAR FORNECEDORES JA COPIADOS

UPDATE public.fornecedores AS copia
SET
  catalogo_origem_id = modelo.id,
  produto_id = produto_copia.id
FROM public.fornecedores AS modelo
JOIN public.produtos AS produto_modelo
  ON produto_modelo.id = modelo.produto_id
JOIN public.produtos AS produto_copia
  ON produto_copia.catalogo_origem_id = produto_modelo.id
WHERE modelo.empresa_id =
'53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
AND copia.empresa_id = produto_copia.empresa_id
AND copia.url = modelo.url
AND copia.catalogo_origem_id IS NULL
AND copia.empresa_id NOT IN (
 '53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441',
  'cc637980-7ab5-48b0-9296-585be8197db1'
);

-- 5. FUNCAO PARA IDENTIFICAR PRODUTO PRINCIPAL

CREATE OR REPLACE FUNCTION public.definir_origem_produto_catalogo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.empresa_id =
'53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
    AND NEW.compartilhar_todas = true
  THEN
    NEW.catalogo_origem_id := NEW.id;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS produtos_catalogo_origem_before
ON public.produtos;

CREATE TRIGGER produtos_catalogo_origem_before
BEFORE INSERT OR UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.definir_origem_produto_catalogo();

-- 6. COPIAR PRODUTOS COMPARTILHADOS

CREATE OR REPLACE FUNCTION public.sincronizar_produto_catalogo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.empresa_id <>
  '53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
    OR NEW.compartilhar_todas IS NOT TRUE
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.produtos (
    empresa_id,
    nome,
    imagem_url,
    sku,
    custo,
    preco_venda,
    ativo,
    variacoes,
    compartilhar_todas,
    catalogo_origem_id
  )
  SELECT
    e.id,
    NEW.nome,
    NEW.imagem_url,
    NEW.sku,
    NEW.custo,
    NEW.preco_venda,
    NEW.ativo,
    NEW.variacoes,
    false,
    NEW.id
  FROM public.empresas e
  WHERE e.id NOT IN (
'53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441',
    'cc637980-7ab5-48b0-9296-585be8197db1'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS produtos_catalogo_sync
ON public.produtos;

CREATE TRIGGER produtos_catalogo_sync
AFTER INSERT OR UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_produto_catalogo();

-- 7. PREPARAR OS LINKS DOS FORNECEDORES

CREATE OR REPLACE FUNCTION public.definir_origem_fornecedor_catalogo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.empresa_id =
    '53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
    AND EXISTS (
      SELECT 1
      FROM public.produtos p
      WHERE p.id = NEW.produto_id
        AND p.compartilhar_todas = true
    )
  THEN
    NEW.catalogo_origem_id := NEW.id;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS fornecedores_catalogo_origem_before
ON public.fornecedores;

CREATE TRIGGER fornecedores_catalogo_origem_before
BEFORE INSERT OR UPDATE ON public.fornecedores
FOR EACH ROW
EXECUTE FUNCTION public.definir_origem_fornecedor_catalogo();

-- 8. COMPARTILHAR LINKS COM AS OUTRAS EMPRESAS

CREATE OR REPLACE FUNCTION public.sincronizar_fornecedor_catalogo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.empresa_id <>
'53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
    OR NEW.catalogo_origem_id IS DISTINCT FROM NEW.id
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.fornecedores (
    empresa_id,
    produto_id,
    plataforma,
    nome,
    variacao,
    url,
    ativo,
    catalogo_origem_id
  )
  SELECT
    e.id,
    destino.id,
    NEW.plataforma,
    NEW.nome,
    NEW.variacao,
    NEW.url,
    NEW.ativo,
    NEW.id
  FROM public.empresas e
  JOIN public.produtos destino
    ON destino.empresa_id = e.id
   AND destino.catalogo_origem_id = NEW.produto_id
  WHERE e.id NOT IN (
'53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441',
    'cc637980-7ab5-48b0-9296-585be8197db1'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.fornecedores existente
    WHERE existente.empresa_id = e.id
      AND (
        existente.catalogo_origem_id = NEW.id
        OR existente.url = NEW.url
      )
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS fornecedores_catalogo_sync
ON public.fornecedores;

CREATE TRIGGER fornecedores_catalogo_sync
AFTER INSERT OR UPDATE ON public.fornecedores
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_fornecedor_catalogo();

-- 9. PUBLICAR OS DOIS PRODUTOS PADRAO

UPDATE public.produtos
SET
  compartilhar_todas = true,
  catalogo_origem_id = id
WHERE empresa_id =
'53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
AND nome IN ('REGATA SAUNA', 'RESINA BOX 21');

-- 10. PUBLICAR OS FORNECEDORES JA CADASTRADOS

UPDATE public.fornecedores f
SET catalogo_origem_id = f.id
WHERE f.empresa_id =
'53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
AND EXISTS (
  SELECT 1
  FROM public.produtos p
  WHERE p.id = f.produto_id
    AND p.compartilhar_todas = true
);

-- 11. AUTOMATIZAR O CATALOGO NAS NOVAS EMPRESAS

CREATE OR REPLACE FUNCTION public.criar_empresa_e_admin(
  nome_empresa text,
  nome_usuario text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  nova_empresa_id uuid;
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Este usuario ja possui uma empresa.';
  END IF;

  INSERT INTO public.empresas (nome)
  VALUES (nome_empresa)
  RETURNING id INTO nova_empresa_id;

  INSERT INTO public.profiles (
    user_id,
    empresa_id,
    role,
    nome
  )
  VALUES (
    auth.uid(),
    nova_empresa_id,
    'admin',
    nome_usuario
  );

  -- COPIAR PRODUTOS COMPARTILHADOS

  INSERT INTO public.produtos (
    empresa_id,
    nome,
    imagem_url,
    sku,
    custo,
    preco_venda,
    ativo,
    variacoes,
    compartilhar_todas,
    catalogo_origem_id
  )
  SELECT
    nova_empresa_id,
    p.nome,
    p.imagem_url,
    p.sku,
    p.custo,
    p.preco_venda,
    p.ativo,
    p.variacoes,
    false,
    p.id
  FROM public.produtos p
  WHERE p.empresa_id =
  '53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
  AND p.compartilhar_todas = true
  ON CONFLICT DO NOTHING;

  -- COPIAR FORNECEDORES DOS PRODUTOS

  INSERT INTO public.fornecedores (
    empresa_id,
    produto_id,
    plataforma,
    nome,
    variacao,
    url,
    ativo,
    catalogo_origem_id
  )
  SELECT
    nova_empresa_id,
    destino.id,
    f.plataforma,
    f.nome,
    f.variacao,
    f.url,
    f.ativo,
    f.id
  FROM public.fornecedores f
  JOIN public.produtos origem
    ON origem.id = f.produto_id
   AND origem.empresa_id = f.empresa_id
  JOIN public.produtos destino
    ON destino.empresa_id = nova_empresa_id
   AND destino.catalogo_origem_id = origem.id
  WHERE f.empresa_id =
  '53546fbb-2b6a-4dfa-8ff5-0b67dfcfd441'
  AND origem.compartilhar_todas = true
  AND f.catalogo_origem_id = f.id
  ON CONFLICT DO NOTHING;

  RETURN nova_empresa_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.criar_empresa_e_admin(text, text)
TO authenticated;

COMMIT;
