import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* ------------------------------------------------------------ */
/* Autenticação                                                    */
/* ------------------------------------------------------------ */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signUpAdmin({ email, password, nomeUsuario, nomeEmpresa }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nomeUsuario,
        nomeEmpresa,
      },
    },
  });

  if (error) throw error;

  if (!data.session) {
    return {
      pendingConfirmation: true,
      user: data.user,
    };
  }

  const { error: rpcError } = await supabase.rpc("criar_empresa_e_admin", {
    nome_empresa: nomeEmpresa,
    nome_usuario: nomeUsuario,
  });

  if (rpcError) {
    // O listener de Auth também pode tentar concluir o cadastro ao receber
    // SIGNED_IN. Se essa chamada concorrente já criou o profile, o signup
    // continua válido em vez de mostrar um falso erro de cadastro duplicado.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (profileError || !profile) throw rpcError;
  }

  return data.session;
}

export async function signInAdmin({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signInAffiliate({ afiliadoId, pin }) {
  const email = `afiliado-${String(afiliadoId).replaceAll("-", "")}@afterpayj27.app`;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: String(pin) });
  if (error) throw new Error("PIN incorreto.");
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchMyProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, empresa_id, role, afiliado_id, nome")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // O nome da operação é exibido no cabeçalho. A consulta continua sujeita
  // à policy empresas_own, portanto só retorna a empresa da sessão atual.
  const { data: empresa, error: empresaError } = await supabase
    .from("empresas")
    .select("nome")
    .eq("id", data.empresa_id)
    .maybeSingle();
  if (empresaError) throw empresaError;

  return { ...data, empresa_nome: empresa?.nome || null };
}

// Lista pública (sem dados sensíveis) de afiliados com login ativo,
// usada na tela "Sou afiliado" para a pessoa escolher o próprio nome.
export async function fetchAffiliateLoginList(empresaId) {
  const { data, error } = await supabase.rpc("afiliados_login_publico", { p_empresa_id: empresaId });
  if (error) throw error;
  return data || [];
}

// Lista de empresas (só nome + id) pra pessoa escolher a operação
// antes de logar como afiliado.
export async function fetchEmpresasPublicList() {
  const { data, error } = await supabase.rpc("empresas_publico");
  if (error) throw error;
  return data || [];
}

/* ------------------------------------------------------------ */
/* Mappers                                                          */
/* ------------------------------------------------------------ */
const rowToPedido = (r) => ({
  id: r.id,
  cliente: r.cliente,
  dataPedido: r.data_pedido,
  previsaoEntrega: r.previsao_entrega,
  custo: Number(r.custo) || 0,
  venda: Number(r.venda) || 0,
  status: r.status,
  formaPagamento: r.forma_pagamento,
  dataPagamento: r.data_pagamento,
  afiliadoId: r.afiliado_id,
  produtoId: r.produto_id || null,
  produtoNome: r.produto_nome || null,
  produtoVariacao: r.produto_variacao || "",
  criadoEm: r.criado_em ? new Date(r.criado_em).getTime() : Date.now(),
});

const pedidoToRow = (p, empresaId) => {
  const row = {
    cliente: p.cliente,
    data_pedido: p.dataPedido,
    previsao_entrega: p.previsaoEntrega || null,
    custo: Number(p.custo) || 0,
    venda: Number(p.venda) || 0,
    status: p.status,
    forma_pagamento: p.formaPagamento,
    data_pagamento: p.dataPagamento || null,
    afiliado_id: p.afiliadoId || null,
  };
  if (p.produtoId || p.produtoNome) {
    row.produto_id = p.produtoId || null;
    row.produto_nome = p.produtoNome || null;
    row.produto_variacao = p.produtoVariacao || null;
  }
  if (empresaId) row.empresa_id = empresaId;
  if (p.id) row.id = p.id;
  return row;
};

const rowToAfiliado = (r) => ({
  id: r.id,
  nome: r.nome,
  ativo: r.ativo,
  criadoEm: r.criado_em ? new Date(r.criado_em).getTime() : Date.now(),
});

/* ------------------------------------------------------------ */
/* Pedidos                                                          */
/* ------------------------------------------------------------ */
export async function fetchPedidos() {
  const { data, error } = await supabase.from("pedidos").select("*").order("criado_em", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToPedido);
}

export async function createPedido(p, empresaId) {
  const { data, error } = await supabase.from("pedidos").insert(pedidoToRow(p, empresaId)).select().single();
  if (error) throw error;
  return rowToPedido(data);
}

export async function updatePedido(id, patch) {
  const row = {};
  if ("cliente" in patch) row.cliente = patch.cliente;
  if ("dataPedido" in patch) row.data_pedido = patch.dataPedido;
  if ("previsaoEntrega" in patch) row.previsao_entrega = patch.previsaoEntrega || null;
  if ("custo" in patch) row.custo = Number(patch.custo) || 0;
  if ("venda" in patch) row.venda = Number(patch.venda) || 0;
  if ("status" in patch) row.status = patch.status;
  if ("formaPagamento" in patch) row.forma_pagamento = patch.formaPagamento;
  if ("dataPagamento" in patch) row.data_pagamento = patch.dataPagamento || null;
  if ("afiliadoId" in patch) row.afiliado_id = patch.afiliadoId || null;
  if (patch.produtoAlterado || patch.produtoId || patch.produtoNome) {
    row.produto_id = patch.produtoId || null;
    row.produto_nome = patch.produtoNome || null;
    if ("produtoVariacao" in patch) {
  row.produto_variacao = patch.produtoVariacao || null;
}
  }

  const { data, error } = await supabase.from("pedidos").update(row).eq("id", id).select().single();
  if (error) throw error;
  return rowToPedido(data);
}

/* ------------------------------------------------------------ */
/* Produtos                                                       */
/* ------------------------------------------------------------ */
const rowToProduto = (r) => ({
  id: r.id,
  nome: r.nome,
  imagemUrl: r.imagem_url || "",
  sku: r.sku || "",
  custo: Number(r.custo) || 0,
  precoVenda: Number(r.preco_venda) || 0,
  variacoes: Array.isArray(r.variacoes) ? r.variacoes : [],
  ativo: Boolean(r.ativo),
  criadoEm: r.criado_em ? new Date(r.criado_em).getTime() : Date.now(),
  atualizadoEm: r.atualizado_em ? new Date(r.atualizado_em).getTime() : null,
});

const produtoToRow = (p) => ({
  nome: String(p.nome || "").trim(),
  imagem_url: p.imagemUrl ? String(p.imagemUrl).trim() : null,
  sku: p.sku ? String(p.sku).trim() : null,
  custo: Number(p.custo) || 0,
  preco_venda: Number(p.precoVenda) || 0,
  variacoes: Array.isArray(p.variacoes) ? p.variacoes : [],
  ativo: p.ativo !== false,
});

export async function fetchProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToProduto);
}

export async function createProduto(produto, empresaId) {
  const row = produtoToRow(produto);
  if (empresaId) row.empresa_id = empresaId;
  const { data, error } = await supabase
    .from("produtos")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return rowToProduto(data);
}

export async function updateProduto(id, patch) {
  const row = {};
  if ("nome" in patch) row.nome = String(patch.nome || "").trim();
  if ("imagemUrl" in patch) row.imagem_url = patch.imagemUrl ? String(patch.imagemUrl).trim() : null;
  if ("sku" in patch) row.sku = patch.sku ? String(patch.sku).trim() : null;
  if ("custo" in patch) row.custo = Number(patch.custo) || 0;
  if ("precoVenda" in patch) row.preco_venda = Number(patch.precoVenda) || 0;
  if ("variacoes" in patch) {
  row.variacoes = Array.isArray(patch.variacoes) ? patch.variacoes : [];
}
  if ("ativo" in patch) row.ativo = Boolean(patch.ativo);

  const { data, error } = await supabase
    .from("produtos")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToProduto(data);
}

export async function deleteProduto(id) {
  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) throw error;
}

export async function deletePedido(id) {
  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------ */
/* Afiliados                                                        */
/* ------------------------------------------------------------ */
export async function fetchAfiliados() {
  const { data, error } = await supabase.from("afiliados").select("*").order("criado_em", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToAfiliado);
}

export async function createAfiliadoComLogin(nome, pin) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Sessão expirada, entre novamente.");

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/create-affiliate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ nome, pin }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Erro ao criar afiliado.");
  return json;
}

export async function desativarAfiliado(id) {
  const { error } = await supabase.from("afiliados").update({ ativo: false }).eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------ */
/* Despesas                                                         */
/* ------------------------------------------------------------ */
export async function fetchDespesas() {
  const { data, error } = await supabase.from("despesas").select("*");
  if (error) throw error;
  const obj = {};
  (data || []).forEach((r) => {
    obj[r.data] = { trafego: Number(r.trafego) || 0, outras: Number(r.outras) || 0 };
  });
  return obj;
}

export async function upsertDespesa(date, values, empresaId) {
  const { error } = await supabase
    .from("despesas")
    .upsert(
      { empresa_id: empresaId, data: date, trafego: Number(values.trafego) || 0, outras: Number(values.outras) || 0 },
      { onConflict: "empresa_id,data" }
    );
  if (error) throw error;
}

/* ------------------------------------------------------------ */
/* Notificações                                                     */
/* ------------------------------------------------------------ */
export async function fetchNotificacoes(limit = 30) {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function marcarNotificacaoLida(id) {
  const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  if (error) throw error;
}



/* ------------------------------------------------------------ */
/* Web Push                                                     */
/* ------------------------------------------------------------ */
export async function salvarPushSubscription(subscription, empresaId) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData?.session?.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Subscription Web Push inválida.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    empresa_id: empresaId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "endpoint" });

  if (error) throw error;
}

export async function removerPushSubscription(endpoint) {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw error;
}
export async function completarCadastroEmpresa({ nomeEmpresa, nomeUsuario }) {
  const { data, error } = await supabase.rpc("criar_empresa_e_admin", {
    nome_empresa: nomeEmpresa,
    nome_usuario: nomeUsuario,
  });

  if (error) throw error;

  return data;
}

export async function tentarCompletarCadastroAutomatico() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  const user = data.user;

  if (!user) return false;

  const nomeEmpresa = user.user_metadata?.nomeEmpresa;
  const nomeUsuario = user.user_metadata?.nomeUsuario;

  if (!nomeEmpresa || !nomeUsuario) {
    return false;
  }

  try {
    await completarCadastroEmpresa({ nomeEmpresa, nomeUsuario });
    return true;
  } catch (error) {
    // Outra chamada de Auth pode ter criado a empresa entre a leitura do
    // profile e a RPC. Nesse caso, o chamador deve apenas reler o profile.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profileError && profile) return false;
    throw error;
  }
}
/* ------------------------------------------------------------ */
/* Realtime                                                         */
/* ------------------------------------------------------------ */
export function subscribeAll(onChange) {
  if (!isConfigured) return () => {};
  const channel = supabase
    .channel("j27-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "afiliados" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "despesas" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeNotificacoes(onNew) {
  if (!isConfigured) return () => {};
  const channel = supabase
    .channel("j27-notificacoes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes" }, (payload) =>
      onNew(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
