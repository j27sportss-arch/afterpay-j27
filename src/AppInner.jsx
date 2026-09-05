"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Users, Plus, X, Search,
  Pencil, Trash2, LogOut, ChevronLeft, TrendingUp, DollarSign,
  CheckCircle2, Clock, UserPlus, ChevronDown, Package, KeyRound,
  Megaphone, Percent, Target, Receipt, Bell, BellOff, Building2, AlertTriangle,
} from "lucide-react";
import {
  isConfigured, getSession, onAuthStateChange, fetchMyProfile,
  signUpAdmin, signInAdmin, signInAffiliate, signOut,
  fetchEmpresasPublicList, fetchAffiliateLoginList,
  fetchPedidos, createPedido, updatePedido, deletePedido,
  fetchAfiliados, createAfiliadoComLogin, desativarAfiliado,
  fetchDespesas, upsertDespesa,
  fetchNotificacoes, marcarNotificacaoLida,
  subscribeAll, subscribeNotificacoes,
} from "../lib/db.js";

/* ---------------------------------------------------------------- */
/* Estilo global                                                      */
/* ---------------------------------------------------------------- */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap');
    .fp-app{ font-family:'Manrope',sans-serif; color:#122420; }
    .fp-mono{ font-family:'IBM Plex Mono',monospace; font-variant-numeric: tabular-nums; }
    .fp-scrollbar::-webkit-scrollbar{ width:6px; height:6px; }
    .fp-scrollbar::-webkit-scrollbar-thumb{ background:#BFDCD1; border-radius:4px; }
    input:focus, select:focus, button:focus-visible{ outline: 2px solid #0E7C66; outline-offset: 2px; }
  `}</style>
);

const COLORS = {
  ink: "#122420", paper: "#F2F7F4", brand: "#0E7C66", brandDeep: "#0A4F42",
  pos: "#15A671", posBg: "#E1F6EC", pending: "#D98A2B", pendingBg: "#FCF0DC",
  neg: "#E1496A", negBg: "#FDE9EF", gold: "#E8B84B", line: "#DCE7E1", sub: "#5C716B",
  frustrado: "#B23A21", frustradoBg: "#F7E1D9",
};

const STATUS_STYLES = {
  "Em Rota": { bg: "#E1F0EC", color: COLORS.brand },
  "Entregue": { bg: "#E7EEFB", color: "#3B5FA6" },
  "Não Pago": { bg: COLORS.negBg, color: COLORS.neg },
  "Pago": { bg: COLORS.posBg, color: COLORS.pos },
  "Frustrado": { bg: COLORS.frustradoBg, color: COLORS.frustrado },
};
const STATUS_OPTIONS = ["Em Rota", "Entregue", "Não Pago", "Pago", "Frustrado"];
const PAGAMENTO_OPTIONS = ["PIX", "Cartão", "Boleto", "Dinheiro", "Pendente"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtBRL = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

function computeMetrics(list) {
  const m = {
    faturamento: 0, pagos: 0, lucro: 0, vendas: 0, pendentes: 0,
    emRota: 0, entregues: 0, naoPagos: 0, pagosCount: 0,
    frustradosCount: 0, prejuizoFrustrados: 0, vendaPerdidaFrustrados: 0,
  };
  list.forEach((p) => {
    const venda = Number(p.venda) || 0;
    const custo = Number(p.custo) || 0;
    if (p.status === "Frustrado") {
      m.frustradosCount += 1;
      m.prejuizoFrustrados += custo;
      m.vendaPerdidaFrustrados += venda;
      return;
    }
    m.vendas += 1;
    m.faturamento += venda;
    m.lucro += venda - custo;
    if (p.status === "Pago") { m.pagos += venda; m.pagosCount += 1; }
    else m.pendentes += venda;
    if (p.status === "Em Rota") m.emRota += 1;
    if (p.status === "Entregue" || p.status === "Pago") m.entregues += 1;
    if (p.status === "Não Pago") m.naoPagos += 1;
  });
  return m;
}

const getDespesaDia = (despesas, date) => {
  const d = despesas[date] || {};
  return { trafego: Number(d.trafego) || 0, outras: Number(d.outras) || 0 };
};
const totalDespesaDia = (despesas, date) => {
  const d = getDespesaDia(despesas, date);
  return d.trafego + d.outras;
};
const sumDespesasTotal = (despesas) =>
  Object.values(despesas).reduce((a, d) => a + (Number(d.trafego) || 0) + (Number(d.outras) || 0), 0);
const sumTrafegoTotal = (despesas) =>
  Object.values(despesas).reduce((a, d) => a + (Number(d.trafego) || 0), 0);

const inputStyle = { border: `1.5px solid ${COLORS.line}`, background: "#FAFAFD" };
const FieldLabel = ({ children }) => (
  <label className="text-xs font-semibold block mb-1.5" style={{ color: COLORS.sub }}>{children}</label>
);

/* ---------------------------------------------------------------- */
/* Peças pequenas reutilizáveis                                       */
/* ---------------------------------------------------------------- */
const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES["Em Rota"];
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
};

const MiniStat = ({ label, value, tone = "ink", icon: Icon }) => {
  const color = tone === "pos" ? COLORS.pos : tone === "neg" ? COLORS.neg : tone === "pending" ? COLORS.pending : COLORS.ink;
  return (
    <div className="bg-white rounded-2xl p-3.5" style={{ border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={12} color={COLORS.sub} />}
        <p className="text-[10.5px] font-semibold" style={{ color: COLORS.sub }}>{label}</p>
      </div>
      <p className="fp-mono text-base font-bold" style={{ color }}>{value}</p>
    </div>
  );
};

/* ---------------------------------------------------------------- */
/* Tela de configuração ausente                                       */
/* ---------------------------------------------------------------- */
function SetupNeeded() {
  return (
    <div className="fp-app min-h-screen flex items-center justify-center px-6" style={{ background: COLORS.paper }}>
      <div className="max-w-sm bg-white rounded-2xl p-6" style={{ border: `1px solid ${COLORS.line}` }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: COLORS.pendingBg }}>
          <KeyRound size={20} color={COLORS.pending} />
        </div>
        <h1 className="font-extrabold text-lg mb-1">Banco de dados não configurado</h1>
        <p className="text-sm mb-4" style={{ color: COLORS.sub }}>
          Configure <code className="fp-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="fp-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> nas variáveis de ambiente do projeto.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Tela de autenticação (cadastro admin / login admin / login afiliado) */
/* ---------------------------------------------------------------- */
function AuthGate() {
  const [mode, setMode] = useState("choose");
  const [pickedEmpresa, setPickedEmpresa] = useState(null);
  const [pickedAfiliado, setPickedAfiliado] = useState(null);

  return (
    <div
      className="fp-app min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: `linear-gradient(180deg, ${COLORS.brandDeep} 0%, ${COLORS.brand} 55%, ${COLORS.paper} 55%)` }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 pt-6">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
            <Package size={30} color="#fff" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Afterpay J27</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.75)" }}>
            Controle de vendas, entregas e afiliados
          </p>
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <button onClick={() => setMode("admin_login")} className="w-full bg-white rounded-2xl p-5 text-left flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#E1F0EC" }}>
                <LayoutDashboard size={20} color={COLORS.brand} />
              </div>
              <div>
                <p className="font-bold text-sm">Já tenho conta (administrador)</p>
                <p className="text-xs" style={{ color: COLORS.sub }}>Entrar com e-mail e senha</p>
              </div>
            </button>
            <button onClick={() => setMode("admin_signup")} className="w-full bg-white rounded-2xl p-5 text-left flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#E1F0EC" }}>
                <Building2 size={20} color={COLORS.brand} />
              </div>
              <div>
                <p className="font-bold text-sm">Criar minha operação</p>
                <p className="text-xs" style={{ color: COLORS.sub }}>Comece do zero, você vira administrador</p>
              </div>
            </button>
            <button onClick={() => setMode("aff_company")} className="w-full bg-white rounded-2xl p-5 text-left flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#E1F0EC" }}>
                <Users size={20} color={COLORS.brand} />
              </div>
              <div>
                <p className="font-bold text-sm">Sou afiliado</p>
                <p className="text-xs" style={{ color: COLORS.sub }}>Registrar minhas vendas do dia</p>
              </div>
            </button>
          </div>
        )}

        {mode === "admin_login" && <AdminLoginForm onBack={() => setMode("choose")} />}
        {mode === "admin_signup" && <AdminSignupForm onBack={() => setMode("choose")} />}
        {mode === "aff_company" && (
          <AffiliateCompanyPicker onBack={() => setMode("choose")} onPicked={(empresa) => { setPickedEmpresa(empresa); setMode("aff_name"); }} />
        )}
        {mode === "aff_name" && (
          <AffiliateNamePicker empresa={pickedEmpresa} onBack={() => setMode("aff_company")} onPicked={(af) => { setPickedAfiliado(af); setMode("aff_pin"); }} />
        )}
        {mode === "aff_pin" && (
          <AffiliatePinForm afiliado={pickedAfiliado} onBack={() => setMode("aff_name")} />
        )}
      </div>
    </div>
  );
}

function AdminLoginForm({ onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email || !password) return setError("Preencha e-mail e senha.");
    setBusy(true);
    try {
      await signInAdmin({ email, password });
    } catch (e) {
      setError(e?.message || "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold mb-4" style={{ color: COLORS.sub }}>
        <ChevronLeft size={14} /> Voltar
      </button>
      <p className="font-bold text-sm mb-4">Entrar como administrador</p>
      <div className="space-y-3">
        <div>
          <FieldLabel>E-mail</FieldLabel>
          <input type="email" className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Senha</FieldLabel>
          <input type="password" className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        {error && <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ color: COLORS.neg, background: COLORS.negBg }}>{error}</p>}
        <button onClick={submit} disabled={busy} className="w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ background: COLORS.brand, opacity: busy ? 0.7 : 1 }}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}

function AdminSignupForm({ onBack }) {
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!nomeUsuario.trim() || !nomeEmpresa.trim()) return setError("Preencha seu nome e o nome da operação.");
    if (!email || !password) return setError("Preencha e-mail e senha.");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setBusy(true);
    try {
      await signUpAdmin({ email, password, nomeUsuario: nomeUsuario.trim(), nomeEmpresa: nomeEmpresa.trim() });
    } catch (e) {
      setError(e?.message || "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold mb-4" style={{ color: COLORS.sub }}>
        <ChevronLeft size={14} /> Voltar
      </button>
      <p className="font-bold text-sm mb-4">Criar minha operação</p>
      <div className="space-y-3">
        <div>
          <FieldLabel>Seu nome</FieldLabel>
          <input className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={nomeUsuario} onChange={(e) => setNomeUsuario(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Nome da sua operação/negócio</FieldLabel>
          <input className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Ex: Loja do João" />
        </div>
        <div>
          <FieldLabel>E-mail</FieldLabel>
          <input type="email" className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Senha</FieldLabel>
            <input type="password" className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Confirmar senha</FieldLabel>
            <input type="password" className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ color: COLORS.neg, background: COLORS.negBg }}>{error}</p>}
        <button onClick={submit} disabled={busy} className="w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ background: COLORS.brand, opacity: busy ? 0.7 : 1 }}>
          {busy ? "Criando..." : "Criar minha operação"}
        </button>
      </div>
    </div>
  );
}

function AffiliateCompanyPicker({ onBack, onPicked }) {
  const [empresas, setEmpresas] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEmpresasPublicList().then(setEmpresas).catch((e) => setError(e?.message || "Erro ao carregar."));
  }, []);

  return (
    <div className="bg-white rounded-2xl p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold mb-4" style={{ color: COLORS.sub }}>
        <ChevronLeft size={14} /> Voltar
      </button>
      <p className="font-bold text-sm mb-3">Qual é a sua operação?</p>
      {error && <p className="text-xs font-semibold mb-2" style={{ color: COLORS.neg }}>{error}</p>}
      {!empresas ? (
        <p className="text-sm" style={{ color: COLORS.sub }}>Carregando...</p>
      ) : empresas.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.sub }}>Nenhuma operação encontrada ainda.</p>
      ) : (
        <div className="space-y-2">
          {empresas.map((emp) => (
            <button key={emp.id} onClick={() => onPicked(emp)} className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold" style={{ border: `1.5px solid ${COLORS.line}` }}>
              {emp.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AffiliateNamePicker({ empresa, onBack, onPicked }) {
  const [afiliados, setAfiliados] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!empresa) return;
    fetchAffiliateLoginList(empresa.id).then(setAfiliados).catch((e) => setError(e?.message || "Erro ao carregar."));
  }, [empresa]);

  if (!empresa) return null;

  return (
    <div className="bg-white rounded-2xl p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold mb-4" style={{ color: COLORS.sub }}>
        <ChevronLeft size={14} /> Voltar
      </button>
      <p className="font-bold text-sm mb-1">{empresa.nome}</p>
      <p className="text-xs mb-3" style={{ color: COLORS.sub }}>Qual é o seu nome?</p>
      {error && <p className="text-xs font-semibold mb-2" style={{ color: COLORS.neg }}>{error}</p>}
      {!afiliados ? (
        <p className="text-sm" style={{ color: COLORS.sub }}>Carregando...</p>
      ) : afiliados.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.sub }}>Nenhum afiliado cadastrado ainda nessa operação.</p>
      ) : (
        <div className="space-y-2">
          {afiliados.map((a) => (
            <button key={a.id} onClick={() => onPicked(a)} className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold" style={{ border: `1.5px solid ${COLORS.line}` }}>
              {a.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AffiliatePinForm({ afiliado, onBack }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await signInAffiliate({ afiliadoId: afiliado.id, pin });
    } catch (e) {
      setError(e?.message || "PIN incorreto.");
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  if (!afiliado) return null;

  return (
    <div className="bg-white rounded-2xl p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold mb-4" style={{ color: COLORS.sub }}>
        <ChevronLeft size={14} /> Voltar
      </button>
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={16} color={COLORS.brand} />
        <p className="font-bold text-sm">Olá, {afiliado.nome}. Digite seu PIN</p>
      </div>
      <input
        type="password" inputMode="numeric" maxLength={6} autoFocus
        className="w-full rounded-xl px-4 py-3 text-center text-2xl fp-mono tracking-[0.5em]"
        style={inputStyle} value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      {error && <p className="text-xs font-semibold mt-2" style={{ color: COLORS.neg }}>{error}</p>}
      <button onClick={submit} disabled={busy} className="w-full rounded-xl py-3 text-sm font-semibold text-white mt-4" style={{ background: COLORS.brand, opacity: busy ? 0.7 : 1 }}>
        {busy ? "Entrando..." : "Entrar"}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Sino de notificações (tempo real via Supabase Realtime)            */
/* ---------------------------------------------------------------- */
function NotificationBell({ empresaId }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const unread = items.filter((n) => !n.lida).length;

  useEffect(() => {
    fetchNotificacoes().then(setItems).catch(() => {});
    const unsub = subscribeNotificacoes((novo) => setItems((prev) => [novo, ...prev].slice(0, 30)));
    return unsub;
  }, [empresaId]);

  const marcarTodasLidas = async () => {
    const naoLidas = items.filter((n) => !n.lida);
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    for (const n of naoLidas) marcarNotificacaoLida(n.id).catch(() => {});
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-lg relative" style={{ background: "rgba(255,255,255,0.15)" }}>
        {unread > 0 ? <Bell size={16} color="#fff" /> : <BellOff size={16} color="#fff" />}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center text-white" style={{ background: COLORS.neg }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto fp-scrollbar" style={{ border: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
            <p className="font-bold text-sm" style={{ color: COLORS.ink }}>Notificações</p>
            {unread > 0 && <button onClick={marcarTodasLidas} className="text-[11px] font-semibold" style={{ color: COLORS.brand }}>Marcar lidas</button>}
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: COLORS.sub }}>Nenhuma notificação ainda.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.line}`, background: n.lida ? "#fff" : "#F2F7F4" }}>
                <p className="text-xs font-bold" style={{ color: COLORS.ink }}>{n.titulo}</p>
                <p className="text-[11px] mt-0.5" style={{ color: COLORS.sub }}>{n.mensagem}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Modal de pedido                                                    */
/* ---------------------------------------------------------------- */
function PedidoFormModal({ title, initial, afiliados, showAfiliadoField, onCancel, onSave }) {
  const [form, setForm] = useState(
    initial || {
      cliente: "", dataPedido: todayISO(), previsaoEntrega: todayISO(),
      custo: "", venda: "", status: "Em Rota", formaPagamento: "PIX",
      dataPagamento: "", afiliadoId: "",
    }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lucro = (Number(form.venda) || 0) - (Number(form.custo) || 0);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e && e.target ? e.target.value : e }));

  const handleSave = async () => {
    if (!form.cliente.trim()) return setError("Informe o nome do cliente.");
    if (!form.venda || Number(form.venda) <= 0) return setError("Informe o valor da venda.");
    setError("");
    setSaving(true);
    try {
      await onSave({ ...form, custo: Number(form.custo) || 0, venda: Number(form.venda) || 0 });
    } catch (e) {
      setError(e?.message || "Não foi possível salvar o pedido.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(27,27,47,0.55)" }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto fp-scrollbar">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div>
            <FieldLabel>Nome do cliente</FieldLabel>
            <input className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={form.cliente} onChange={set("cliente")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Data do pedido</FieldLabel>
              <input type="date" className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} value={form.dataPedido} onChange={set("dataPedido")} />
            </div>
            <div><FieldLabel>Previsão de entrega</FieldLabel>
              <input type="date" className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} value={form.previsaoEntrega} onChange={set("previsaoEntrega")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Custo do produto (R$)</FieldLabel>
              <input type="number" inputMode="decimal" className="w-full rounded-xl px-3.5 py-2.5 text-sm fp-mono" style={inputStyle} value={form.custo} onChange={set("custo")} />
            </div>
            <div><FieldLabel>Valor da venda (R$)</FieldLabel>
              <input type="number" inputMode="decimal" className="w-full rounded-xl px-3.5 py-2.5 text-sm fp-mono" style={inputStyle} value={form.venda} onChange={set("venda")} />
            </div>
          </div>
          <div className="rounded-xl px-3.5 py-2.5 flex items-center justify-between" style={{ background: COLORS.posBg }}>
            <span className="text-xs font-semibold" style={{ color: COLORS.pos }}>Lucro deste pedido</span>
            <span className="fp-mono text-sm font-bold" style={{ color: COLORS.pos }}>{fmtBRL(lucro)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Status</FieldLabel>
              <select className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} value={form.status} onChange={set("status")}>
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><FieldLabel>Forma de pagamento</FieldLabel>
              <select className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} value={form.formaPagamento} onChange={set("formaPagamento")}>
                {PAGAMENTO_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {showAfiliadoField && (
            <div>
              <FieldLabel>Afiliado</FieldLabel>
              <select className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} value={form.afiliadoId || ""} onChange={set("afiliadoId")}>
                <option value="">Sem afiliado (venda própria)</option>
                {(afiliados || []).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
          )}
          <div>
            <FieldLabel>Data do pagamento (se pago)</FieldLabel>
            <input type="date" className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} value={form.dataPagamento} onChange={set("dataPagamento")} />
          </div>
          {error && (
            <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ color: COLORS.neg, background: COLORS.negBg }}>{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} disabled={saving} className="flex-1 rounded-xl py-3 text-sm font-semibold" style={{ border: `1.5px solid ${COLORS.line}`, color: COLORS.ink }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl py-3 text-sm font-semibold text-white" style={{ background: COLORS.brand, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Salvando..." : "Salvar pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Dashboard                                                          */
/* ---------------------------------------------------------------- */
function DashboardTab({ pedidos, afiliados, despesas, onSaveDespesa, onNovo }) {
  const [view, setView] = useState("hoje");
  const [customDate, setCustomDate] = useState(todayISO());
  const today = todayISO();
  const activeDate = view === "hoje" ? today : view === "data" ? customDate : null;
  const filtered = activeDate ? pedidos.filter((p) => p.dataPedido === activeDate) : pedidos;
  const m = computeMetrics(filtered);

  const despesaPeriodo = activeDate ? totalDespesaDia(despesas, activeDate) : sumDespesasTotal(despesas);
  const trafegoPeriodo = activeDate ? getDespesaDia(despesas, activeDate).trafego : sumTrafegoTotal(despesas);
  const custoProdutos = m.faturamento - m.lucro;
  const lucroReal = m.lucro - despesaPeriodo;
  const margemReal = m.faturamento > 0 ? (lucroReal / m.faturamento) * 100 : 0;
  const roas = trafegoPeriodo > 0 ? m.faturamento / trafegoPeriodo : null;
  const ticketMedio = m.vendas > 0 ? m.faturamento / m.vendas : 0;
  const periodoLabel = view === "hoje" ? "hoje" : view === "total" ? "no total geral" : `em ${fmtDate(customDate)}`;

  return (
    <div className="px-4 pt-5 pb-6 space-y-5">
      <div>
        <h2 className="text-xl font-extrabold">Visão geral do negócio</h2>
        <p className="text-sm" style={{ color: COLORS.sub }}>Desempenho financeiro completo da operação</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-xl p-1" style={{ background: "#DDEDE6" }}>
          {["hoje", "total", "data"].map((v) => (
            <button key={v} onClick={() => setView(v)} className="px-3.5 py-1.5 rounded-lg text-xs font-bold"
              style={view === v ? { background: "#fff", color: COLORS.brand } : { color: COLORS.sub }}>
              {v === "hoje" ? "Hoje" : v === "total" ? "Total geral" : "Escolher data"}
            </button>
          ))}
        </div>
        <button onClick={onNovo} className="ml-auto flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-xl" style={{ background: COLORS.brand }}>
          <Plus size={15} /> Novo pedido
        </button>
      </div>
      {view === "data" && (
        <div>
          <FieldLabel>Ver resultado do dia</FieldLabel>
          <input type="date" className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
        </div>
      )}
      <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${COLORS.brandDeep}, ${COLORS.brand})` }}>
        <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
          {view === "total" ? "Lucro real total" : `Lucro real ${periodoLabel}`}
        </p>
        <p className="fp-mono text-3xl font-extrabold mt-1">{fmtBRL(lucroReal)}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: "rgba(255,255,255,0.18)" }}>
            <Percent size={11} /> Margem {margemReal.toFixed(1)}%
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: "rgba(255,255,255,0.18)" }}>
            <Target size={11} /> ROAS {roas !== null ? `${roas.toFixed(2)}x` : "—"}
          </span>
        </div>
        <p className="text-[11px] mt-3" style={{ color: "rgba(255,255,255,0.65)" }}>
          Faturamento {fmtBRL(m.faturamento)} − Custo {fmtBRL(custoProdutos)} − Tráfego {fmtBRL(despesaPeriodo)}
        </p>
      </div>
      {onSaveDespesa && <DespesaWidget despesas={despesas} onSave={onSaveDespesa} />}
      <div className="grid grid-cols-2 gap-3">
        <MiniStat label={view === "total" ? "Faturamento total" : `Faturamento ${periodoLabel}`} value={fmtBRL(m.faturamento)} icon={DollarSign} />
        <MiniStat label="Custo de produtos" value={fmtBRL(custoProdutos)} icon={Package} tone="neg" />
        <MiniStat label="Gasto com tráfego" value={fmtBRL(trafegoPeriodo)} icon={Megaphone} tone="pending" />
        <MiniStat label="Lucro bruto (sem despesas)" value={fmtBRL(m.lucro)} icon={TrendingUp} />
        <MiniStat label="Ticket médio" value={fmtBRL(ticketMedio)} icon={Receipt} />
        <MiniStat label="ROAS" value={roas !== null ? `${roas.toFixed(2)}x` : "—"} icon={Target} tone="pos" />
        <MiniStat label={view === "total" ? "Total de vendas" : `Vendas ${periodoLabel}`} value={String(m.vendas)} icon={ShoppingCart} />
        <MiniStat label="Pendentes de pagamento" value={fmtBRL(m.pendentes)} icon={Clock} tone="pending" />
      </div>
      <div>
        <h3 className="font-bold text-sm mb-3">Resumo rápido de status ({view === "total" ? "total geral" : periodoLabel})</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Em rota", value: m.emRota, tone: "brand" },
            { label: "Entregues", value: m.entregues, tone: "ink" },
            { label: "Não pagos", value: m.naoPagos, tone: "neg" },
            { label: "Pagos", value: m.pagosCount, tone: "pos" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl py-4 text-center bg-white" style={{ border: `1px solid ${COLORS.line}` }}>
              <p className="text-xs font-medium mb-1" style={{ color: COLORS.sub }}>{s.label}</p>
              <p className="fp-mono text-xl font-bold" style={{ color: s.tone === "brand" ? COLORS.brand : s.tone === "neg" ? COLORS.neg : s.tone === "pos" ? COLORS.pos : COLORS.ink }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      {afiliados.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3">Vendas por afiliado {view === "hoje" ? "hoje" : ""}</h3>
          <div className="space-y-2">
            {afiliados.map((a) => {
              const aList = pedidos.filter((p) => p.afiliadoId === a.id && (activeDate ? p.dataPedido === activeDate : true));
              const am = computeMetrics(aList);
              return (
                <div key={a.id} className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between" style={{ border: `1px solid ${COLORS.line}` }}>
                  <div>
                    <p className="font-semibold text-sm">{a.nome}</p>
                    <p className="text-[11px]" style={{ color: COLORS.sub }}>{am.vendas} venda{am.vendas !== 1 ? "s" : ""}</p>
                  </div>
                  <p className="fp-mono text-sm font-bold" style={{ color: COLORS.pos }}>{fmtBRL(am.faturamento)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DespesaWidget({ despesas, onSave }) {
  const [date, setDate] = useState(todayISO());
  const [trafego, setTrafego] = useState("");
  const [outras, setOutras] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const d = getDespesaDia(despesas, date);
    setTrafego(d.trafego || "");
    setOutras(d.outras || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleSave = async () => {
    await onSave(date, { trafego: Number(trafego) || 0, outras: Number(outras) || 0 });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="rounded-2xl p-4" style={{ background: "#FFFCF3", border: `1px solid ${COLORS.line}` }}>
      <h3 className="font-bold text-sm flex items-center gap-1.5 mb-3"><Megaphone size={15} color={COLORS.gold} /> Despesas do dia</h3>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div><FieldLabel>Data</FieldLabel>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg px-2 py-2 text-xs" style={inputStyle} />
        </div>
        <div><FieldLabel>Tráfego (R$)</FieldLabel>
          <input type="number" inputMode="decimal" value={trafego} onChange={(e) => setTrafego(e.target.value)} className="w-full rounded-lg px-2 py-2 text-xs fp-mono" style={inputStyle} />
        </div>
        <div><FieldLabel>Outras (R$)</FieldLabel>
          <input type="number" inputMode="decimal" value={outras} onChange={(e) => setOutras(e.target.value)} className="w-full rounded-lg px-2 py-2 text-xs fp-mono" style={inputStyle} />
        </div>
      </div>
      <button onClick={handleSave} className="w-full rounded-lg py-2.5 text-xs font-bold text-white" style={{ background: saved ? COLORS.pos : COLORS.brand }}>
        {saved ? "Despesas salvas ✓" : "Salvar despesas do dia"}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Pedidos                                                            */
/* ---------------------------------------------------------------- */
function PedidosTab({ pedidos, afiliados, showAfiliadoColumn, onNovo, onEdit, onDelete }) {
  const [q, setQ] = useState("");
  const affName = (id) => afiliados.find((a) => a.id === id)?.nome;
  const filtered = pedidos.filter((p) => p.cliente.toLowerCase().includes(q.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => (a.dataPedido < b.dataPedido ? 1 : -1));

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Pedidos</h2>
        <p className="text-sm" style={{ color: COLORS.sub }}>{pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""} no total</p>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.sub} />
          <input className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm" style={inputStyle} placeholder="Buscar por cliente..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={onNovo} className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-xl shrink-0" style={{ background: COLORS.brand }}>
          <Plus size={15} /> Novo
        </button>
      </div>
      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <Package size={32} color={COLORS.sub} className="mx-auto mb-3" />
          <p className="text-sm font-semibold">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => {
            const lucro = (Number(p.venda) || 0) - (Number(p.custo) || 0);
            const affiliate = showAfiliadoColumn ? affName(p.afiliadoId) : null;
            return (
              <div key={p.id} className="bg-white rounded-2xl p-4" style={{ border: `1px solid ${COLORS.line}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm">{p.cliente}</p>
                    {affiliate && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mt-1" style={{ background: "#E1F0EC", color: COLORS.brand }}>via {affiliate}</span>}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs mb-3" style={{ color: COLORS.sub }}>
                  <span>Pedido: {fmtDate(p.dataPedido)}</span>
                  <span>Previsão: {fmtDate(p.previsaoEntrega)}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div className="fp-mono text-xs space-y-0.5">
                    <p style={{ color: COLORS.sub }}>Custo <span className="font-semibold" style={{ color: COLORS.ink }}>{fmtBRL(p.custo)}</span></p>
                    <p style={{ color: COLORS.sub }}>Venda <span className="font-semibold" style={{ color: COLORS.ink }}>{fmtBRL(p.venda)}</span></p>
                    <p style={{ color: COLORS.pos }}>Lucro <span className="font-bold">{fmtBRL(lucro)}</span></p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => onEdit(p)} className="p-2 rounded-lg" style={{ background: "#E1F0EC" }}><Pencil size={14} color={COLORS.brand} /></button>
                    {onDelete && <button onClick={() => onDelete(p.id)} className="p-2 rounded-lg" style={{ background: COLORS.negBg }}><Trash2 size={14} color={COLORS.neg} /></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Frustrados                                                         */
/* ---------------------------------------------------------------- */
function FrustradosTab({ pedidos, onEdit, onDelete }) {
  const [view, setView] = useState("hoje");
  const today = todayISO();
  const filtered = view === "hoje" ? pedidos.filter((p) => p.status === "Frustrado" && p.dataPedido === today) : pedidos.filter((p) => p.status === "Frustrado");
  const sorted = [...filtered].sort((a, b) => (a.dataPedido < b.dataPedido ? 1 : -1));
  const prejuizoTotal = sorted.reduce((s, p) => s + (Number(p.custo) || 0), 0);

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Pedidos frustrados</h2>
        <p className="text-sm" style={{ color: COLORS.sub }}>Monitore o prejuízo das entregas que não vingaram</p>
      </div>
      <div className="flex rounded-xl p-1 w-fit" style={{ background: COLORS.frustradoBg }}>
        {["hoje", "total"].map((v) => (
          <button key={v} onClick={() => setView(v)} className="px-3.5 py-1.5 rounded-lg text-xs font-bold"
            style={view === v ? { background: "#fff", color: COLORS.frustrado } : { color: COLORS.sub }}>
            {v === "hoje" ? "Hoje" : "Total geral"}
          </button>
        ))}
      </div>
      <div className="rounded-2xl p-5" style={{ background: COLORS.frustradoBg }}>
        <p className="text-xs font-semibold" style={{ color: COLORS.frustrado }}>Prejuízo total com frustrados {view === "hoje" ? "hoje" : "(total geral)"}</p>
        <p className="fp-mono text-3xl font-extrabold mt-1" style={{ color: COLORS.frustrado }}>{fmtBRL(prejuizoTotal)}</p>
        <p className="text-[11px] mt-2" style={{ color: "#B2664F" }}>{sorted.length} pedido{sorted.length !== 1 ? "s" : ""} frustrado{sorted.length !== 1 ? "s" : ""}</p>
      </div>
      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 size={32} color={COLORS.sub} className="mx-auto mb-3" />
          <p className="text-sm font-semibold">Nenhum pedido frustrado {view === "hoje" ? "hoje" : "registrado"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-4" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `4px solid ${COLORS.frustrado}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm">{p.cliente}</p>
                <span className="text-[11px]" style={{ color: COLORS.sub }}>{fmtDate(p.dataPedido)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="fp-mono text-xs space-y-0.5">
                  <p style={{ color: COLORS.frustrado }}>Custo perdido <span className="font-bold">{fmtBRL(p.custo)}</span></p>
                  <p style={{ color: COLORS.sub }}>Venda perdida <span className="font-semibold">{fmtBRL(p.venda)}</span></p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => onEdit(p)} className="p-2 rounded-lg" style={{ background: "#E1F0EC" }}><Pencil size={14} color={COLORS.brand} /></button>
                  <button onClick={() => onDelete(p.id)} className="p-2 rounded-lg" style={{ background: COLORS.negBg }}><Trash2 size={14} color={COLORS.neg} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Afiliados                                                          */
/* ---------------------------------------------------------------- */
function AfiliadosTab({ afiliados, pedidos, onAdd, onRemove }) {
  const [showNew, setShowNew] = useState(false);
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const today = todayISO();

  const submit = async () => {
    setError("");
    if (!nome.trim()) return setError("Informe o nome do afiliado.");
    if (!/^\d{4,6}$/.test(pin)) return setError("O PIN precisa ter de 4 a 6 números.");
    setBusy(true);
    try {
      await onAdd(nome.trim(), pin);
      setNome(""); setPin(""); setShowNew(false);
    } catch (e) {
      setError(e?.message || "Erro ao criar afiliado.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Afiliados</h2>
        <p className="text-sm" style={{ color: COLORS.sub }}>Gerencie quem vende por você e acompanhe o dia de cada um</p>
      </div>
      <button onClick={() => setShowNew((v) => !v)} className="w-full flex items-center justify-center gap-1.5 text-white text-xs font-bold px-4 py-3 rounded-xl" style={{ background: COLORS.brand }}>
        <UserPlus size={15} /> Novo afiliado
      </button>
      {showNew && (
        <div className="bg-white rounded-2xl p-4 space-y-3" style={{ border: `1px solid ${COLORS.line}` }}>
          <div><FieldLabel>Nome do afiliado</FieldLabel>
            <input className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div><FieldLabel>PIN de acesso (4 a 6 dígitos)</FieldLabel>
            <input type="text" inputMode="numeric" maxLength={6} className="w-full rounded-xl px-3.5 py-2.5 text-sm fp-mono" style={inputStyle} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          </div>
          {error && <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ color: COLORS.neg, background: COLORS.negBg }}>{error}</p>}
          <button onClick={submit} disabled={busy} className="w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: COLORS.brand, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Criando..." : "Cadastrar afiliado"}
          </button>
        </div>
      )}
      {afiliados.length === 0 ? (
        <div className="text-center py-16">
          <Users size={32} color={COLORS.sub} className="mx-auto mb-3" />
          <p className="text-sm font-semibold">Nenhum afiliado cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {afiliados.map((a) => {
            const todayList = pedidos.filter((p) => p.afiliadoId === a.id && p.dataPedido === today);
            const m = computeMetrics(todayList);
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: `1px solid ${COLORS.line}` }}>
                <button onClick={() => setExpanded(isOpen ? null : a.id)} className="w-full p-4 flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0" style={{ background: COLORS.brand }}>
                      {a.nome.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{a.nome}</p>
                      <p className="text-[11px]" style={{ color: COLORS.sub }}>
                        {m.vendas} venda{m.vendas !== 1 ? "s" : ""} hoje · <span className="fp-mono font-semibold" style={{ color: COLORS.pos }}>{fmtBRL(m.faturamento)}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={18} color={COLORS.sub} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                    <div className="flex justify-end pt-3">
                      <button onClick={() => { if (window.confirm(`Desativar ${a.nome}?`)) onRemove(a.id); }} className="text-xs font-semibold flex items-center gap-1" style={{ color: COLORS.neg }}>
                        <Trash2 size={13} /> Desativar
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl py-2" style={{ background: COLORS.paper }}><p className="text-[10px]" style={{ color: COLORS.sub }}>Vendas</p><p className="fp-mono font-bold text-sm">{m.vendas}</p></div>
                      <div className="rounded-xl py-2" style={{ background: COLORS.paper }}><p className="text-[10px]" style={{ color: COLORS.sub }}>Faturamento</p><p className="fp-mono font-bold text-sm">{fmtBRL(m.faturamento)}</p></div>
                      <div className="rounded-xl py-2" style={{ background: COLORS.paper }}><p className="text-[10px]" style={{ color: COLORS.sub }}>Lucro</p><p className="fp-mono font-bold text-sm" style={{ color: COLORS.pos }}>{fmtBRL(m.lucro)}</p></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Admin shell                                                        */
/* ---------------------------------------------------------------- */
function AdminApp({ profile, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [pedidos, setPedidos] = useState([]);
  const [afiliados, setAfiliados] = useState([]);
  const [despesas, setDespesas] = useState({});
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(null);

  const reload = async () => {
    const [p, a, d] = await Promise.all([fetchPedidos(), fetchAfiliados(), fetchDespesas()]);
    setPedidos(p); setAfiliados(a); setDespesas(d); setReady(true);
  };

  useEffect(() => {
    reload();
    const unsub = subscribeAll(() => reload());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveDespesa = async (date, values) => upsertDespesa(date, values, profile.empresa_id);

  const handleSavePedido = async (values) => {
    if (modal && modal.id) await updatePedido(modal.id, values);
    else await createPedido(values, profile.empresa_id);
    await reload();
    setModal(null);
  };

  const handleDeletePedido = async (id) => {
    if (window.confirm("Excluir este pedido?")) { await deletePedido(id); await reload(); }
  };

  const handleAddAfiliado = async (nome, pin) => { await createAfiliadoComLogin(nome, pin); await reload(); };
  const handleRemoveAfiliado = async (id) => { await desativarAfiliado(id); await reload(); };

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "pedidos", label: "Pedidos", icon: ShoppingCart },
    { id: "afiliados", label: "Afiliados", icon: Users },
    { id: "frustrados", label: "Frustrados", icon: AlertTriangle },
  ];

  if (!ready) {
    return <div className="fp-app min-h-screen flex items-center justify-center" style={{ background: COLORS.paper }}><p className="text-sm font-semibold" style={{ color: COLORS.sub }}>Carregando...</p></div>;
  }

  return (
    <div className="fp-app min-h-screen flex flex-col" style={{ background: COLORS.paper }}>
      <div className="px-4 pt-5 pb-4 flex items-center justify-between text-white" style={{ background: `linear-gradient(135deg, ${COLORS.brandDeep}, ${COLORS.brand})` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}><Package size={18} color="#fff" /></div>
          <div>
            <p className="font-extrabold text-sm leading-tight">Afterpay J27</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>{profile.nome || "Administrador"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell empresaId={profile.empresa_id} />
          <button onClick={onLogout} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}><LogOut size={16} color="#fff" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto fp-scrollbar pb-24 max-w-md w-full mx-auto">
        {tab === "dashboard" && <DashboardTab pedidos={pedidos} afiliados={afiliados} despesas={despesas} onSaveDespesa={handleSaveDespesa} onNovo={() => setModal("new")} />}
        {tab === "pedidos" && <PedidosTab pedidos={pedidos} afiliados={afiliados} showAfiliadoColumn onNovo={() => setModal("new")} onEdit={(p) => setModal(p)} onDelete={handleDeletePedido} />}
        {tab === "afiliados" && <AfiliadosTab afiliados={afiliados} pedidos={pedidos} onAdd={handleAddAfiliado} onRemove={handleRemoveAfiliado} />}
        {tab === "frustrados" && <FrustradosTab pedidos={pedidos} onEdit={(p) => setModal(p)} onDelete={handleDeletePedido} />}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white flex items-center justify-around py-2 px-2 max-w-md mx-auto" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
              <Icon size={19} color={active ? COLORS.brand : COLORS.sub} />
              <span className="text-[10px] font-bold" style={{ color: active ? COLORS.brand : COLORS.sub }}>{t.label}</span>
            </button>
          );
        })}
      </div>
      {modal && (
        <PedidoFormModal
          title={modal === "new" ? "Novo pedido" : "Editar pedido"}
          initial={modal === "new" ? null : modal}
          afiliados={afiliados}
          showAfiliadoField
          onCancel={() => setModal(null)}
          onSave={handleSavePedido}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Afiliado shell                                                     */
/* ---------------------------------------------------------------- */
function AffiliateApp({ profile, onLogout }) {
  const [pedidos, setPedidos] = useState([]);
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const today = todayISO();

  const reload = async () => { const p = await fetchPedidos(); setPedidos(p); setReady(true); };

  useEffect(() => {
    reload();
    const unsub = subscribeAll(() => reload());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meus = pedidos.filter((p) => p.dataPedido === today).sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));

  const handleSave = async (values) => {
    await createPedido({ ...values, afiliadoId: profile.afiliado_id }, profile.empresa_id);
    await reload();
    setShowForm(false);
  };

  if (!ready) {
    return <div className="fp-app min-h-screen flex items-center justify-center" style={{ background: COLORS.paper }}><p className="text-sm font-semibold" style={{ color: COLORS.sub }}>Carregando...</p></div>;
  }

  return (
    <div className="fp-app min-h-screen" style={{ background: COLORS.paper }}>
      <div className="px-4 pt-5 pb-6 text-white" style={{ background: `linear-gradient(135deg, ${COLORS.brandDeep}, ${COLORS.brand})` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>Olá,</p>
            <p className="font-extrabold text-lg leading-tight">{profile.nome}</p>
          </div>
          <button onClick={onLogout} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}><LogOut size={16} color="#fff" /></button>
        </div>
      </div>
      <div className="max-w-md mx-auto px-4 -mt-4 pb-10">
        <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold px-4 py-4 rounded-2xl shadow-sm" style={{ background: COLORS.brand }}>
          <Plus size={18} /> Registrar nova venda
        </button>
        <div className="mt-6">
          <h3 className="font-bold text-sm mb-1">Suas vendas de hoje</h3>
          <p className="text-xs mb-3" style={{ color: COLORS.sub }}>{fmtDate(today)}</p>
          {meus.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart size={30} color={COLORS.sub} className="mx-auto mb-3" />
              <p className="text-sm font-semibold">Nenhuma venda registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meus.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-4" style={{ border: `1px solid ${COLORS.line}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-sm">{p.cliente}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-xs" style={{ color: COLORS.sub }}>Previsão: {fmtDate(p.previsaoEntrega)} · {p.formaPagamento}</p>
                  <p className="fp-mono text-sm font-bold mt-1" style={{ color: COLORS.brand }}>{fmtBRL(p.venda)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showForm && (
        <PedidoFormModal title="Registrar nova venda" initial={null} afiliados={[]} showAfiliadoField={false} onCancel={() => setShowForm(false)} onSave={handleSave} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Raiz                                                                */
/* ---------------------------------------------------------------- */
export default function App() {
  const [status, setStatus] = useState("loading");
  const [profile, setProfile] = useState(null);

  const loadProfile = async () => {
    try {
      const p = await fetchMyProfile();
      if (!p) { setStatus("needsAuth"); return; }
      setProfile(p);
      setStatus("ready");
    } catch {
      setStatus("needsAuth");
    }
  };

  useEffect(() => {
    if (!isConfigured) return;
    (async () => {
      const session = await getSession();
      if (session) await loadProfile();
      else setStatus("needsAuth");
    })();
    const unsub = onAuthStateChange((session) => {
      if (session) loadProfile();
      else { setProfile(null); setStatus("needsAuth"); }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isConfigured) return <><GlobalStyle /><SetupNeeded /></>;

  if (status === "loading") {
    return (
      <div className="fp-app min-h-screen flex items-center justify-center" style={{ background: COLORS.paper }}>
        <GlobalStyle />
        <p className="text-sm font-semibold" style={{ color: COLORS.sub }}>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <GlobalStyle />
      {status === "needsAuth" && <AuthGate />}
      {status === "ready" && profile?.role === "admin" && <AdminApp profile={profile} onLogout={signOut} />}
      {status === "ready" && profile?.role === "affiliate" && <AffiliateApp profile={profile} onLogout={signOut} />}
    </>
  );
}
