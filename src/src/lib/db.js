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
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // A sessão já vem ativa quando a confirmação de e-mail está desligada
  if (!data.session) {
    throw new Error(
      "Conta criada! Verifique seu e-mail para confirmar antes de entrar (ou desative a confirmação de e-mail nas configurações do Supabase para testes)."
    );
  }

  const { error: rpcError } = await supabase.rpc("criar_empresa_e_admin", {
    nome_empresa: nomeEmpresa,
    nome_usuario: nomeUsuario,
  });
  if (rpcError) throw rpcError;

  return data.session;
}

export async function signInAdmin({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("E-mail ou senha incorretos.");
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
    .single();
  if (error) throw error;
  return data;
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

  const { data, error } = await supabase.from("pedidos").update(row).eq("id", id).select().single();
  if (error) throw error;
  return rowToPedido(data);
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
/* Realtime                                                         */
/* ------------------------------------------------------------ */
export function subscribeAll(onChange) {
  if (!isConfigured) return () => {};
  const channel = supabase
    .channel("j27-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, onChange)
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
