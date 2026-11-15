"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Users, Plus, X, Search,
  Pencil, Trash2, LogOut, ChevronLeft, TrendingUp,
  CheckCircle2, Clock, UserPlus, ChevronDown, Package, KeyRound,
  Receipt, Bell, BellOff, Building2, AlertTriangle,
  Boxes, Wallet, Store, BarChart3, ChevronRight, TrendingDown, CircleDollarSign,
} from "lucide-react";
import {
  isConfigured, getSession, onAuthStateChange, fetchMyProfile,
  completarCadastroEmpresa, tentarCompletarCadastroAutomatico,
  signUpAdmin, signInAdmin, signInAffiliate, signOut,
  fetchEmpresasPublicList, fetchAffiliateLoginList,
  fetchPedidos, createPedido, updatePedido, deletePedido,
  fetchProdutos, createProduto, updateProduto, deleteProduto,
  fetchAfiliados, createAfiliadoComLogin, desativarAfiliado,
  fetchDespesas, upsertDespesa,
  fetchNotificacoes, marcarNotificacaoLida,
  salvarPushSubscription,
  subscribeAll, subscribeNotificacoes,
} from "../lib/db.js";

/* ---------------------------------------------------------------- */
/* Estilo global                                                      */
/* ---------------------------------------------------------------- */
const GlobalStyle = () => (
  <style>{`
    .fp-app{ font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:#111827; -webkit-font-smoothing:antialiased; }
    .fp-mono{ font-family:monospace; font-variant-numeric:tabular-nums; }
    .fp-scrollbar::-webkit-scrollbar{ width:6px; height:6px; }
    .fp-scrollbar::-webkit-scrollbar-thumb{ background:#CBD3E2; border-radius:8px; }
    input:focus, select:focus, textarea:focus, button:focus-visible{ outline:2px solid #5875FF; outline-offset:2px; }
    .admin-shell{ min-height:100vh; background:#F5F7FB; }
    .admin-sidebar{ position:fixed; inset:0 auto 0 0; width:252px; z-index:30; background:#0B1533; color:#E8ECF8; padding:26px 18px 18px; display:flex; flex-direction:column; }
    .brand-lockup{ display:flex; align-items:center; gap:12px; padding:0 10px 30px; }
    .brand-mark{ width:42px; height:42px; border-radius:14px; display:grid; place-items:center; color:#fff; background:linear-gradient(145deg,#5875FF,#8064FF); box-shadow:0 8px 24px rgba(88,117,255,.3); }
    .sidebar-kicker{ color:#7F8BAA; font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; padding:0 12px; margin:8px 0 10px; }
    .sidebar-link{ width:100%; display:flex; align-items:center; gap:12px; padding:12px 13px; border-radius:12px; color:#AEB8D0; font-size:13px; font-weight:650; text-align:left; transition:background .18s,color .18s; }
    .sidebar-link:hover{ background:rgba(255,255,255,.06); color:#fff; }
    .sidebar-link.active{ color:#fff; background:linear-gradient(100deg,rgba(88,117,255,.28),rgba(128,100,255,.16)); box-shadow:inset 3px 0 #7890FF; }
    .sidebar-bottom{ margin-top:auto; border-top:1px solid rgba(255,255,255,.09); padding:18px 8px 0; }
    .admin-main{ min-height:100vh; margin-left:252px; min-width:0; }
    .admin-topbar{ min-height:86px; padding:16px 34px; display:flex; align-items:center; justify-content:space-between; gap:16px; background:rgba(255,255,255,.92); border-bottom:1px solid #E7EBF3; position:sticky; top:0; z-index:20; backdrop-filter:blur(14px); }
    .admin-content{ max-width:1560px; margin:0 auto; padding:28px 34px 48px; }
    .admin-page{ min-width:0; }
    .admin-page h2{ color:#111B33; letter-spacing:-.035em; }
    .admin-page h3{ color:#17213A; letter-spacing:-.02em; }
    .admin-card{ background:#fff; border:1px solid #E6EAF2; border-radius:18px; box-shadow:0 5px 18px rgba(18,31,66,.035); }
    .mobile-nav{ display:none; }
    .metric-card{ background:#fff; border:1px solid #E6EAF2; border-radius:17px; padding:17px; box-shadow:0 4px 14px rgba(18,31,66,.025); }
    .chart-bar{ min-height:5px; border-radius:8px 8px 3px 3px; background:linear-gradient(180deg,#7B8EFF,#4E6BFF); }
    .page-eyebrow{ color:#7C87A0; font-size:10px; font-weight:800; letter-spacing:.13em; text-transform:uppercase; }
    .primary-button{ display:inline-flex; align-items:center; justify-content:center; gap:8px; background:#4F6BFF; color:#fff; border-radius:11px; padding:10px 15px; font-size:12px; font-weight:750; box-shadow:0 7px 16px rgba(79,107,255,.18); transition:transform .18s,background .18s; }
    .primary-button:hover{ background:#405DEB; transform:translateY(-1px); }
    .secondary-button{ display:inline-flex; align-items:center; justify-content:center; gap:8px; border:1px solid #E2E7F0; background:#fff; color:#34405A; border-radius:11px; padding:10px 14px; font-size:12px; font-weight:700; }
    .product-image{ width:58px; height:58px; flex:none; overflow:hidden; border-radius:13px; background:#F0F3FA; display:grid; place-items:center; color:#7A86A0; }
    .product-image img{ width:100%; height:100%; object-fit:cover; }
    @media(max-width:1023px){ .admin-main{ margin-left:0; } .admin-sidebar{ display:none; } .admin-topbar{ min-height:72px; padding:12px 18px; } .admin-content{ padding:20px 18px 100px; } .mobile-nav{ display:flex; position:fixed; z-index:40; bottom:0; left:0; right:0; padding:9px 5px calc(9px + env(safe-area-inset-bottom)); background:rgba(255,255,255,.96); border-top:1px solid #E6EAF2; box-shadow:0 -8px 28px rgba(18,31,66,.07); justify-content:space-around; backdrop-filter:blur(16px); } }
    @media(max-width:520px){ .admin-topbar{ padding:11px 14px; } .admin-content{ padding:16px 12px 100px; } .mobile-nav button{ min-width:0; padding:5px 7px; } .mobile-nav span{ font-size:9px; } }
  `}</style>
);

const COLORS = {
  ink: "#111B33", paper: "#F5F7FB", brand: "#4F6BFF", brandDeep: "#0B1533",
  pos: "#15966A", posBg: "#E8F7F0", pending: "#C98222", pendingBg: "#FFF5E5",
  neg: "#D94D67", negBg: "#FFF0F3", gold: "#8A70F8", line: "#E6EAF2", sub: "#68738A",
  frustrado: "#B64B3C", frustradoBg: "#FFF0EC", violet: "#8064FF", surface: "#FFFFFF",
};

const STATUS_STYLES = {
  "Em Rota": { bg: "#EEF1FF", color: COLORS.brand },
  "Entregue": { bg: "#E7EEFB", color: "#3B5FA6" },
  "Não Pago": { bg: COLORS.negBg, color: COLORS.neg },
  "Pago": { bg: COLORS.posBg, color: COLORS.pos },
  "Frustrado": { bg: COLORS.frustradoBg, color: COLORS.frustrado },
};
const STATUS_OPTIONS = ["Em Rota", "Entregue", "Não Pago", "Pago", "Frustrado"];
const PAGAMENTO_OPTIONS = ["PIX", "Cartão", "Boleto", "Dinheiro", "Pendente"];

const todayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
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
    pendentesCount: 0, frustradosCount: 0, prejuizoFrustrados: 0,
    vendaPerdidaFrustrados: 0,
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
    else { m.pendentes += venda; m.pendentesCount += 1; }
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

const inputStyle = { border: `1px solid ${COLORS.line}`, background: "#FFFFFF", color: COLORS.ink };
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
function CompleteCompanySetup({ onDone }) {
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!nomeUsuario.trim() || !nomeEmpresa.trim()) return setError("Preencha seu nome e o nome da operação.");
    setBusy(true);
    try {
      await completarCadastroEmpresa({ nomeEmpresa: nomeEmpresa.trim(), nomeUsuario: nomeUsuario.trim() });
      await onDone();
    } catch (e) {
      setError(e?.message || "Não foi possível concluir o cadastro.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fp-app min-h-screen flex items-center justify-center px-6"
      style={{ background: `linear-gradient(180deg, ${COLORS.brandDeep} 0%, ${COLORS.brand} 55%, ${COLORS.paper} 55%)` }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl p-5">
        <p className="font-bold text-sm mb-1">Só mais um passo</p>
        <p className="text-xs mb-4" style={{ color: COLORS.sub }}>
          Seu e-mail já está confirmado. Só falta o nome da sua operação pra terminar de criar sua conta.
        </p>
        <div className="space-y-3">
          <div>
            <FieldLabel>Seu nome</FieldLabel>
            <input className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={nomeUsuario} onChange={(e) => setNomeUsuario(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Nome da sua operação/negócio</FieldLabel>
            <input className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={inputStyle} value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Ex: Loja do João" />
          </div>
          {error && <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ color: COLORS.neg, background: COLORS.negBg }}>{error}</p>}
          <button onClick={submit} disabled={busy} className="w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ background: COLORS.brand, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Salvando..." : "Concluir cadastro"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
          
<img
  src="/j27-logo.svg"
  alt="Afterpay J27"
  className="w-full max-w-[300px] h-auto mx-auto mb-5"
/>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.75)" }}>
            Controle de vendas, entregas e afiliados
          </p>
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <button onClick={() => setMode("admin_login")} className="w-full bg-white rounded-2xl p-5 text-left flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#EEF1FF" }}>
                <LayoutDashboard size={20} color={COLORS.brand} />
              </div>
              <div>
                <p className="font-bold text-sm">Já tenho conta (administrador)</p>
                <p className="text-xs" style={{ color: COLORS.sub }}>Entrar com e-mail e senha</p>
              </div>
            </button>
            <button onClick={() => setMode("admin_signup")} className="w-full bg-white rounded-2xl p-5 text-left flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#EEF1FF" }}>
                <Building2 size={20} color={COLORS.brand} />
              </div>
              <div>
                <p className="font-bold text-sm">Criar minha operação</p>
                <p className="text-xs" style={{ color: COLORS.sub }}>Comece do zero, você vira administrador</p>
              </div>
            </button>
            <button onClick={() => setMode("aff_company")} className="w-full bg-white rounded-2xl p-5 text-left flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#EEF1FF" }}>
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
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const submit = async () => {
    setError("");
    if (!nomeUsuario.trim() || !nomeEmpresa.trim()) return setError("Preencha seu nome e o nome da operação.");
    if (!email || !password) return setError("Preencha e-mail e senha.");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setBusy(true);
    try {
      const result = await signUpAdmin({ email, password, nomeUsuario: nomeUsuario.trim(), nomeEmpresa: nomeEmpresa.trim() });
      if (result?.pendingConfirmation) setPendingConfirmation(true);
    } catch (e) {
      setError(e?.message || "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  };

  if (pendingConfirmation) {
    return (
      <div className="bg-white rounded-2xl p-5 text-center">
        <div className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: COLORS.posBg }}>
          <CheckCircle2 size={22} color={COLORS.pos} />
        </div>
        <p className="font-bold text-sm mb-1">Confira seu e-mail</p>
        <p className="text-xs" style={{ color: COLORS.sub }}>
          Enviamos um link de confirmação para <strong>{email}</strong>. Depois de clicar nele, volte aqui e entre com o mesmo e-mail e senha. Se pedirmos o nome da sua operação de novo, é rapidinho, só acontece uma vez.
        </p>
        <button onClick={onBack} className="w-full rounded-xl py-3 text-sm font-semibold text-white mt-4" style={{ background: COLORS.brand }}>Voltar ao início</button>
      </div>
    );
  }

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
  const [pushState, setPushState] = useState("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const unread = items.filter((n) => !n.lida).length;

  useEffect(() => {
    fetchNotificacoes().then(setItems).catch(() => {});
    const unsub = subscribeNotificacoes((novo) => setItems((prev) => [novo, ...prev].slice(0, 30)));

    let cancelled = false;
    (async () => {
      try {
        if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
          if (!cancelled) setPushState("unsupported");
          return;
        }
        if (Notification.permission === "denied") {
          if (!cancelled) setPushState("denied");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setPushState(existing ? "enabled" : "available");
      } catch {
        if (!cancelled) setPushState("error");
      }
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [empresaId]);

  const ativarPush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushState("unsupported");
        return;
      }

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "available");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada.");

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const padding = "=".repeat((4 - (vapidPublicKey.length % 4)) % 4);
        const base64 = (vapidPublicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(base64);
        const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
      }

      await salvarPushSubscription(subscription, empresaId);
      setPushState("enabled");
    } catch (err) {
      console.error("Falha ao ativar notificações push:", err);
      setPushState("error");
    } finally {
      setPushBusy(false);
    }
  };

  const marcarTodasLidas = async () => {
    const naoLidas = items.filter((n) => !n.lida);
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    for (const n of naoLidas) marcarNotificacaoLida(n.id).catch(() => {});
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-lg relative" style={{ background: "#E9EDF6", color: COLORS.brand }} aria-label="Abrir notificações">
        {unread > 0 ? <Bell size={17} color={COLORS.brand} /> : <BellOff size={17} color={COLORS.sub} />}
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

          {pushState === "available" && (
            <div className="px-4 py-3" style={{ background: "#F5F7FB", borderBottom: `1px solid ${COLORS.line}` }}>
              <p className="text-xs font-semibold" style={{ color: COLORS.ink }}>Receba alertas no celular</p>
              <p className="text-[11px] mt-1" style={{ color: COLORS.sub }}>Ative as notificações push para receber avisos mesmo fora do app.</p>
              <button
                onClick={ativarPush}
                disabled={pushBusy}
                className="w-full mt-2 rounded-lg py-2 text-xs font-bold text-white"
                style={{ background: COLORS.brand, opacity: pushBusy ? 0.7 : 1 }}
              >
                {pushBusy ? "Ativando..." : "Ativar notificações"}
              </button>
            </div>
          )}
          {pushState === "enabled" && (
            <div className="px-4 py-2 text-[11px] font-semibold" style={{ color: COLORS.pos, borderBottom: `1px solid ${COLORS.line}` }}>
              ✓ Notificações no celular ativadas
            </div>
          )}
          {pushState === "denied" && (
            <div className="px-4 py-2 text-[11px]" style={{ color: COLORS.sub, borderBottom: `1px solid ${COLORS.line}` }}>
              As notificações estão bloqueadas no navegador. Libere a permissão nas configurações do site.
            </div>
          )}
          {pushState === "unsupported" && (
            <div className="px-4 py-2 text-[11px]" style={{ color: COLORS.sub, borderBottom: `1px solid ${COLORS.line}` }}>
              Este navegador/dispositivo não oferece Web Push neste contexto.
            </div>
          )}
          {pushState === "error" && (
            <div className="px-4 py-2 text-[11px]" style={{ color: COLORS.neg, borderBottom: `1px solid ${COLORS.line}` }}>
              Não foi possível ativar o Push. Confira a chave VAPID pública e as configurações do Supabase.
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: COLORS.sub }}>Nenhuma notificação ainda.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.line}`, background: n.lida ? "#fff" : "#F5F7FB" }}>
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
function PedidoFormModal({ title, initial, afiliados, products = [], showAfiliadoField, onCancel, onSave }) {
  const [form, setForm] = useState(
    initial || {
      cliente: "", dataPedido: todayISO(), previsaoEntrega: todayISO(),
      custo: "", venda: "", status: "Em Rota", formaPagamento: "PIX",
      dataPagamento: "", afiliadoId: "", produtoId: "", produtoNome: "", produtoAlterado: false,
    }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lucro = (Number(form.venda) || 0) - (Number(form.custo) || 0);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e && e.target ? e.target.value : e }));
  const produtosDisponiveis = (products || []).filter((p) => p.ativo || p.id === form.produtoId);
  const produtoSelecionado = produtosDisponiveis.find((p) => p.id === form.produtoId);

  const selecionarProduto = (produtoId) => {
    if (!produtoId) {
      setForm((f) => ({ ...f, produtoId: "", produtoNome: "", produtoAlterado: true }));
      return;
    }
    const produto = products.find((p) => p.id === produtoId);
    if (!produto) return;
    setForm((f) => ({
      ...f,
      produtoId: produto.id,
      produtoNome: produto.nome,
      produtoAlterado: true,
      custo: String(produto.custo),
      venda: String(produto.precoVenda),
    }));
  };

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
          <div>
            <FieldLabel>Produto cadastrado (opcional)</FieldLabel>
            <select
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={inputStyle}
              value={form.produtoId || ""}
              onChange={(e) => selecionarProduto(e.target.value)}
            >
              <option value="">Cadastro manual / sem produto</option>
              {form.produtoId && !produtoSelecionado && form.produtoNome && (
                <option value={form.produtoId}>{form.produtoNome} · produto indisponível</option>
              )}
              {produtosDisponiveis.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome}{produto.ativo ? "" : " · inativo"}
                </option>
              ))}
            </select>
            {produtoSelecionado && (
              <p className="text-[11px] mt-1.5" style={{ color: COLORS.sub }}>
                Valores copiados do cadastro. Você ainda pode ajustar custo e preço neste pedido.
              </p>
            )}
            {!produtoSelecionado && form.produtoNome && !form.produtoId && (
              <p className="text-[11px] mt-1.5" style={{ color: COLORS.sub }}>
                Produto histórico: {form.produtoNome}. Os valores abaixo são os registrados no pedido.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Custo do produto (R$)</FieldLabel>
              <input type="number" min="0" step="0.01" inputMode="decimal" className="w-full rounded-xl px-3.5 py-2.5 text-sm fp-mono" style={inputStyle} value={form.custo} onChange={set("custo")} />
            </div>
            <div><FieldLabel>Valor da venda (R$)</FieldLabel>
              <input type="number" min="0" step="0.01" inputMode="decimal" className="w-full rounded-xl px-3.5 py-2.5 text-sm fp-mono" style={inputStyle} value={form.venda} onChange={set("venda")} />
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
  const today = todayISO();
  const [view, setView] = useState("hoje");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const sevenDaysAgo = () => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const monthStart = `${today.slice(0, 7)}-01`;
  const range = view === "hoje" ? [today, today]
    : view === "7dias" ? [sevenDaysAgo(), today]
      : view === "mes" ? [monthStart, today]
        : view === "personalizado" ? [customStart, customEnd]
          : [null, null];
  const [startDate, endDate] = range;
  const inRange = (date) => !startDate || !endDate || (date >= startDate && date <= endDate);
  const filtered = pedidos.filter((pedido) => inRange(pedido.dataPedido));
  const expenseRows = Object.entries(despesas).filter(([date]) => inRange(date));
  const despesaTrafego = expenseRows.reduce((sum, [, value]) => sum + (Number(value.trafego) || 0), 0);
  const despesaOutras = expenseRows.reduce((sum, [, value]) => sum + (Number(value.outras) || 0), 0);
  const despesaTotal = despesaTrafego + despesaOutras;
  const metrics = computeMetrics(filtered);
  const custoProdutos = metrics.faturamento - metrics.lucro;
  const resultadoRegistrado = metrics.lucro - despesaTotal;
  const roas = despesaTrafego > 0 ? metrics.faturamento / despesaTrafego : null;
  const ticketMedio = metrics.vendas > 0 ? metrics.faturamento / metrics.vendas : 0;
  const periodoLabel = view === "hoje" ? "hoje" : view === "7dias" ? "nos últimos 7 dias" : view === "mes" ? "neste mês" : view === "total" ? "no período total" : `${fmtDate(customStart)} a ${fmtDate(customEnd)}`;
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dayOrders = pedidos.filter((pedido) => pedido.dataPedido === iso && pedido.status !== "Frustrado");
    return {
      date: iso,
      label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      value: dayOrders.reduce((sum, pedido) => sum + (Number(pedido.venda) || 0), 0),
      paid: dayOrders.filter((pedido) => pedido.status === "Pago").reduce((sum, pedido) => sum + (Number(pedido.venda) || 0), 0),
    };
  });
  const chartMax = Math.max(1, ...chartDays.map((day) => day.value));

  return (
    <div className="px-4 pt-5 pb-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">Painel de desempenho</p>
          <h2 className="text-2xl font-extrabold mt-1">Visão geral</h2>
          <p className="text-sm mt-1" style={{ color: COLORS.sub }}>Acompanhe vendas, recebimentos e despesas da operação.</p>
        </div>
        <button onClick={onNovo} className="primary-button"><Plus size={15} /> Novo pedido</button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex rounded-xl p-1 overflow-x-auto" style={{ background: "#E9EDF6" }}>
          {[
            ["hoje", "Hoje"], ["7dias", "7 dias"], ["mes", "Este mês"], ["total", "Todo período"], ["personalizado", "Personalizado"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} className="px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap" style={view === id ? { background: "#fff", color: COLORS.brand, boxShadow: "0 1px 4px rgba(20,30,60,.08)" } : { color: COLORS.sub }}>{label}</button>
          ))}
        </div>
        {view === "personalizado" && (
          <div className="flex items-center gap-2">
            <div><FieldLabel>De</FieldLabel><input type="date" className="rounded-xl px-3 py-2.5 text-xs" style={inputStyle} value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} /></div>
            <div><FieldLabel>Até</FieldLabel><input type="date" className="rounded-xl px-3 py-2.5 text-xs" style={inputStyle} value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} /></div>
          </div>
        )}
      </div>

      <section className="rounded-2xl p-5 sm:p-6 text-white overflow-hidden relative" style={{ background: "linear-gradient(120deg,#0B1533 0%,#172B63 62%,#4F6BFF 140%)", boxShadow: "0 14px 30px rgba(20,37,90,.14)" }}>
        <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full" style={{ background: "rgba(128,100,255,.18)", filter: "blur(2px)" }} />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold" style={{ color: "#B8C5ED" }}>Resultado após despesas registradas · estimativa</p>
            <span className="text-[9px] font-extrabold tracking-wider px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,.12)", color: "#DCE4FF" }}>NÃO É LUCRO LÍQUIDO</span>
          </div>
          <p className="fp-mono text-3xl sm:text-4xl font-extrabold mt-2">{fmtBRL(resultadoRegistrado)}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[11px]" style={{ color: "#C7D1EE" }}>
            <span>Lucro bruto previsto <strong className="text-white">{fmtBRL(metrics.lucro)}</strong></span>
            <span>Despesas registradas <strong className="text-white">{fmtBRL(despesaTotal)}</strong></span>
            <span>ROAS previsto <strong className="text-white">{roas === null ? "—" : `${roas.toFixed(2)}x`}</strong></span>
          </div>
          <p className="text-[10px] mt-4 max-w-3xl" style={{ color: "#AAB8DE" }}>Estimativa calculada a partir dos custos dos pedidos e das despesas cadastradas. Não inclui taxas de pagamento, impostos, frete ou outros custos não registrados.</p>
        </div>
      </section>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="metric-card"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold" style={{ color: COLORS.sub }}>Faturamento previsto</p><CircleDollarSign size={17} color={COLORS.brand} /></div><p className="fp-mono text-xl font-extrabold mt-2">{fmtBRL(metrics.faturamento)}</p><p className="text-[10px] mt-1" style={{ color: COLORS.sub }}>Pedidos não frustrados</p></div>
        <div className="metric-card"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold" style={{ color: COLORS.sub }}>Faturamento recebido</p><CheckCircle2 size={17} color={COLORS.pos} /></div><p className="fp-mono text-xl font-extrabold mt-2" style={{ color: COLORS.pos }}>{fmtBRL(metrics.pagos)}</p><p className="text-[10px] mt-1" style={{ color: COLORS.sub }}>{metrics.pagosCount} pedidos pagos</p></div>
        <div className="metric-card"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold" style={{ color: COLORS.sub }}>Lucro bruto previsto</p><TrendingUp size={17} color={COLORS.violet} /></div><p className="fp-mono text-xl font-extrabold mt-2">{fmtBRL(metrics.lucro)}</p><p className="text-[10px] mt-1" style={{ color: COLORS.sub }}>Venda menos custo dos produtos</p></div>
        <div className="metric-card"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold" style={{ color: COLORS.sub }}>Custo dos produtos</p><Package size={17} color={COLORS.sub} /></div><p className="fp-mono text-xl font-extrabold mt-2">{fmtBRL(custoProdutos)}</p><p className="text-[10px] mt-1" style={{ color: COLORS.sub }}>Pedidos não frustrados</p></div>
        <div className="metric-card"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold" style={{ color: COLORS.sub }}>Ticket médio</p><Receipt size={17} color={COLORS.sub} /></div><p className="fp-mono text-xl font-extrabold mt-2">{fmtBRL(ticketMedio)}</p><p className="text-[10px] mt-1" style={{ color: COLORS.sub }}>{metrics.vendas} pedidos válidos</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
        <section className="admin-card p-4 sm:p-5 xl:col-span-3">
          <div className="flex items-center justify-between gap-3 mb-5"><div><h3 className="font-extrabold text-sm">Faturamento por dia</h3><p className="text-[11px] mt-1" style={{ color: COLORS.sub }}>Últimos 7 dias · previsto e recebido</p></div><BarChart3 size={18} color={COLORS.brand} /></div>
          <div className="h-36 flex items-end gap-2 sm:gap-4">
            {chartDays.map((day) => (
              <div key={day.date} className="flex-1 h-full flex flex-col justify-end items-center gap-2 min-w-0">
                <div className="w-full flex items-end justify-center gap-1 h-[112px]">
                  <div className="chart-bar flex-1 max-w-7" title={`Previsto: ${fmtBRL(day.value)}`} style={{ height: `${Math.max(day.value > 0 ? 7 : 3, (day.value / chartMax) * 100)}%`, opacity: .95 }} />
                  <div className="flex-1 max-w-7 rounded-t-md" title={`Recebido: ${fmtBRL(day.paid)}`} style={{ height: `${Math.max(day.paid > 0 ? 7 : 3, (day.paid / chartMax) * 100)}%`, background: "#B9A8FF" }} />
                </div>
                <span className="text-[9px] font-semibold capitalize" style={{ color: COLORS.sub }}>{day.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4"><span className="flex items-center gap-1.5 text-[10px]" style={{ color: COLORS.sub }}><i className="w-2 h-2 rounded-sm" style={{ background: COLORS.brand }} /> Previsto</span><span className="flex items-center gap-1.5 text-[10px]" style={{ color: COLORS.sub }}><i className="w-2 h-2 rounded-sm" style={{ background: "#B9A8FF" }} /> Recebido</span></div>
        </section>

        <section className="admin-card p-4 sm:p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4"><div><h3 className="font-extrabold text-sm">Despesas registradas</h3><p className="text-[11px] mt-1" style={{ color: COLORS.sub }}>{periodoLabel}</p></div><Wallet size={18} color={COLORS.pending} /></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-xs" style={{ color: COLORS.sub }}>Tráfego pago</span><strong className="fp-mono text-sm">{fmtBRL(despesaTrafego)}</strong></div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#F0F2F7" }}><div className="h-full rounded-full" style={{ width: `${despesaTotal ? (despesaTrafego / despesaTotal) * 100 : 0}%`, background: "#F0A94A" }} /></div>
            <div className="flex items-center justify-between"><span className="text-xs" style={{ color: COLORS.sub }}>Outras despesas</span><strong className="fp-mono text-sm">{fmtBRL(despesaOutras)}</strong></div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#F0F2F7" }}><div className="h-full rounded-full" style={{ width: `${despesaTotal ? (despesaOutras / despesaTotal) * 100 : 0}%`, background: "#8B78EE" }} /></div>
            <div className="pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${COLORS.line}` }}><span className="text-xs font-bold">Total registrado</span><strong className="fp-mono text-lg">{fmtBRL(despesaTotal)}</strong></div>
          </div>
        </section>
      </div>

      {onSaveDespesa && <DespesaWidget despesas={despesas} onSave={onSaveDespesa} />}

      <section>
        <div className="flex items-center justify-between mb-3"><h3 className="font-extrabold text-sm">Acompanhamento operacional</h3><span className="text-[10px]" style={{ color: COLORS.sub }}>{periodoLabel}</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: "Pendentes", value: metrics.pendentesCount, sub: fmtBRL(metrics.pendentes), color: COLORS.pending, icon: Clock },
            { label: "Em rota", value: metrics.emRota, sub: "pedidos", color: COLORS.brand, icon: ShoppingCart },
            { label: "Entregues", value: metrics.entregues, sub: "pedidos", color: "#5975A8", icon: Store },
            { label: "Pagos", value: metrics.pagosCount, sub: fmtBRL(metrics.pagos), color: COLORS.pos, icon: CheckCircle2 },
            { label: "Frustrados", value: metrics.frustradosCount, sub: `Perda ${fmtBRL(metrics.prejuizoFrustrados)}`, color: COLORS.neg, icon: AlertTriangle },
            { label: "Não pagos", value: metrics.naoPagos, sub: "pedidos", color: COLORS.sub, icon: TrendingDown },
          ].map((item) => {
            const Icon = item.icon;
            return <div key={item.label} className="metric-card"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold" style={{ color: COLORS.sub }}>{item.label}</p><Icon size={15} color={item.color} /></div><p className="fp-mono text-2xl font-extrabold mt-2" style={{ color: item.color }}>{item.value}</p><p className="text-[10px] mt-1 truncate" style={{ color: COLORS.sub }}>{item.sub}</p></div>;
          })}
        </div>
      </section>

      {afiliados.length > 0 && (
        <section>
          <h3 className="font-extrabold text-sm mb-3">Desempenho por afiliado</h3>
          <div className="admin-card divide-y" style={{ borderColor: COLORS.line }}>
            {afiliados.map((affiliate) => {
              const affiliateMetrics = computeMetrics(filtered.filter((pedido) => pedido.afiliadoId === affiliate.id));
              return <div key={affiliate.id} className="px-4 py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-bold text-sm truncate">{affiliate.nome}</p><p className="text-[10px] mt-1" style={{ color: COLORS.sub }}>{affiliateMetrics.vendas} vendas · {affiliateMetrics.pagosCount} pagas</p></div><p className="fp-mono text-sm font-extrabold whitespace-nowrap" style={{ color: COLORS.brand }}>{fmtBRL(affiliateMetrics.faturamento)}</p></div>;
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function DespesaWidget({ despesas, onSave }) {
  const [date, setDate] = useState(todayISO());
  const [trafego, setTrafego] = useState("");
  const [outras, setOutras] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const d = getDespesaDia(despesas, date);
    setTrafego(d.trafego || "");
    setOutras(d.outras || "");
  }, [date, despesas]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(date, { trafego: Number(trafego) || 0, outras: Number(outras) || 0 });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (saveError) {
      setError(saveError?.message || "Não foi possível salvar as despesas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-xl grid place-items-center" style={{ background: "#FFF5E5", color: COLORS.pending }}><Wallet size={16} /></div><div><h3 className="font-bold text-sm">Despesas do dia</h3><p className="text-[10px]" style={{ color: COLORS.sub }}>Registre tráfego pago e outras despesas</p></div></div>
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
      {error && <p className="text-xs font-semibold mb-2" style={{ color: COLORS.neg }}>{error}</p>}
      <button onClick={handleSave} disabled={saving} className="w-full rounded-xl py-2.5 text-xs font-bold text-white" style={{ background: saved ? COLORS.pos : COLORS.brand, opacity: saving ? .7 : 1 }}>
        {saving ? "Salvando..." : saved ? "Despesas salvas ✓" : "Salvar despesas do dia"}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Cadastro e catálogo de produtos                                    */
/* ---------------------------------------------------------------- */
function ProdutoFormModal({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial || {
    nome: "", imagemUrl: "", sku: "", custo: "", precoVenda: "", ativo: true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const custo = Number(form.custo) || 0;
  const precoVenda = Number(form.precoVenda) || 0;
  const lucroUnitario = precoVenda - custo;
  const margem = precoVenda > 0 ? (lucroUnitario / precoVenda) * 100 : 0;
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSave = async () => {
    setError("");
    if (!form.nome.trim()) return setError("Informe o nome do produto.");
    if (!Number.isFinite(custo) || custo < 0) return setError("Informe um custo válido.");
    if (!Number.isFinite(precoVenda) || precoVenda <= 0) return setError("O preço de venda precisa ser maior que zero.");
    if (form.imagemUrl.trim()) {
      try {
        const url = new URL(form.imagemUrl.trim());
        if (url.protocol !== "https:") throw new Error("URL inválida");
      } catch {
        return setError("Informe um endereço de imagem válido (https://...).");
      }
    }

    setSaving(true);
    try {
      await onSave({
        ...form,
        nome: form.nome.trim(),
        imagemUrl: form.imagemUrl.trim(),
        sku: form.sku.trim(),
        custo,
        precoVenda,
      });
    } catch (saveError) {
      setError(saveError?.message || "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(9,17,40,.62)", backdropFilter: "blur(5px)" }}>
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto fp-scrollbar shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-white z-10" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
          <div>
            <p className="page-eyebrow">Catálogo da operação</p>
            <h3 className="text-lg font-extrabold mt-1">{initial ? "Editar produto" : "Novo produto"}</h3>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Fechar"><X size={19} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <FieldLabel>Nome do produto *</FieldLabel>
            <input autoFocus className="w-full rounded-xl px-3.5 py-3 text-sm" style={inputStyle} placeholder="Ex.: Regata Sauna Modeladora" value={form.nome} onChange={set("nome")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>SKU (opcional)</FieldLabel>
              <input className="w-full rounded-xl px-3.5 py-3 text-sm" style={inputStyle} placeholder="Ex.: REG-001" value={form.sku} onChange={set("sku")} />
            </div>
            <div>
              <FieldLabel>Imagem por URL (opcional)</FieldLabel>
              <input type="url" className="w-full rounded-xl px-3.5 py-3 text-sm" style={inputStyle} placeholder="https://..." value={form.imagemUrl} onChange={set("imagemUrl")} />
            </div>
          </div>
          {form.imagemUrl.trim() && (
            <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "#F5F7FB", border: `1px solid ${COLORS.line}` }}>
              <div className="product-image"><img src={form.imagemUrl} alt="Prévia do produto" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div>
              <p className="text-xs" style={{ color: COLORS.sub }}>Prévia da imagem do produto</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Custo de aquisição (R$) *</FieldLabel>
              <input type="number" min="0" step="0.01" inputMode="decimal" className="w-full rounded-xl px-3.5 py-3 text-sm fp-mono" style={inputStyle} placeholder="0,00" value={form.custo} onChange={set("custo")} />
            </div>
            <div>
              <FieldLabel>Preço de venda (R$) *</FieldLabel>
              <input type="number" min="0.01" step="0.01" inputMode="decimal" className="w-full rounded-xl px-3.5 py-3 text-sm fp-mono" style={inputStyle} placeholder="0,00" value={form.precoVenda} onChange={set("precoVenda")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3.5" style={{ background: "#F0F3FF" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6675B9" }}>Lucro bruto unitário</p>
              <p className="fp-mono text-lg font-extrabold mt-1" style={{ color: lucroUnitario >= 0 ? COLORS.brand : COLORS.neg }}>{fmtBRL(lucroUnitario)}</p>
            </div>
            <div className="rounded-xl p-3.5" style={{ background: "#F2EEFF" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#806BB8" }}>Margem bruta</p>
              <p className="fp-mono text-lg font-extrabold mt-1" style={{ color: "#7357D8" }}>{margem.toFixed(2).replace(".", ",")}%</p>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ border: `1px solid ${COLORS.line}` }}>
            <span><span className="block text-sm font-bold">Produto ativo</span><span className="block text-[11px] mt-0.5" style={{ color: COLORS.sub }}>Produtos inativos não aparecem para novos pedidos</span></span>
            <input type="checkbox" checked={form.ativo !== false} onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))} className="h-4 w-4 accent-indigo-600" />
          </label>
          {error && <p className="text-xs font-semibold px-3 py-2.5 rounded-lg" style={{ color: COLORS.neg, background: COLORS.negBg }}>{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} disabled={saving} className="secondary-button flex-1">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="primary-button flex-1">{saving ? "Salvando..." : "Salvar produto"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProdutosTab({ products, onNew, onEdit, onToggle, onDelete }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ativos");
  const ativos = products.filter((p) => p.ativo).length;
  const filtered = products
    .filter((p) => p.nome.toLowerCase().includes(query.toLowerCase()) || (p.sku || "").toLowerCase().includes(query.toLowerCase()))
    .filter((p) => filter === "todos" || (filter === "ativos" ? p.ativo : !p.ativo));

  return (
    <div className="px-4 pt-5 pb-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">Catálogo e precificação</p>
          <h2 className="text-2xl font-extrabold mt-1">Produtos</h2>
          <p className="text-sm mt-1" style={{ color: COLORS.sub }}>Cadastre custos e preços para acelerar o registro de pedidos.</p>
        </div>
        <button onClick={onNew} className="primary-button"><Plus size={15} /> Novo produto</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="metric-card"><p className="text-[11px] font-semibold" style={{ color: COLORS.sub }}>Produtos cadastrados</p><p className="text-2xl font-extrabold mt-1">{products.length}</p></div>
        <div className="metric-card"><p className="text-[11px] font-semibold" style={{ color: COLORS.sub }}>Ativos</p><p className="text-2xl font-extrabold mt-1" style={{ color: COLORS.pos }}>{ativos}</p></div>
        <div className="metric-card col-span-2 sm:col-span-1"><p className="text-[11px] font-semibold" style={{ color: COLORS.sub }}>Inativos</p><p className="text-2xl font-extrabold mt-1" style={{ color: COLORS.sub }}>{products.length - ativos}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.sub} />
          <input className="w-full rounded-xl pl-9 pr-3 py-3 text-sm" style={inputStyle} placeholder="Buscar por nome ou SKU..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="flex rounded-xl p-1" style={{ background: "#E9EDF6" }}>
          {[{ id: "ativos", label: "Ativos" }, { id: "inativos", label: "Inativos" }, { id: "todos", label: "Todos" }].map((item) => (
            <button key={item.id} onClick={() => setFilter(item.id)} className="px-3 py-2 rounded-lg text-xs font-bold" style={filter === item.id ? { background: "#fff", color: COLORS.brand, boxShadow: "0 1px 4px rgba(20,30,60,.08)" } : { color: COLORS.sub }}>{item.label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-card text-center py-14 px-5">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 grid place-items-center" style={{ background: "#EEF1FF", color: COLORS.brand }}><Boxes size={22} /></div>
          <p className="font-bold text-sm">{products.length === 0 ? "Seu catálogo começa aqui" : "Nenhum produto encontrado"}</p>
          <p className="text-xs mt-1 mb-4" style={{ color: COLORS.sub }}>{products.length === 0 ? "Cadastre seus produtos para preencher custo e venda automaticamente nos pedidos." : "Tente alterar a busca ou o filtro de status."}</p>
          {products.length === 0 && <button onClick={onNew} className="primary-button"><Plus size={15} /> Cadastrar primeiro produto</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filtered.map((product) => {
            const profit = product.precoVenda - product.custo;
            const margin = product.precoVenda > 0 ? (profit / product.precoVenda) * 100 : 0;
            return (
              <article key={product.id} className="admin-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="product-image">
                    {product.imagemUrl ? <img src={product.imagemUrl} alt={product.nome} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <Package size={23} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm truncate">{product.nome}</h3>
                        <p className="text-[11px] mt-1" style={{ color: COLORS.sub }}>{product.sku ? `SKU ${product.sku}` : "Sem SKU"} · cadastrado em {product.criadoEm ? new Date(product.criadoEm).toLocaleDateString("pt-BR") : "—"}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={product.ativo ? { background: COLORS.posBg, color: COLORS.pos } : { background: "#EEF0F5", color: COLORS.sub }}>{product.ativo ? "Ativo" : "Inativo"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div><p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: COLORS.sub }}>Custo</p><p className="fp-mono text-xs font-bold mt-1">{fmtBRL(product.custo)}</p></div>
                      <div><p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: COLORS.sub }}>Venda</p><p className="fp-mono text-xs font-bold mt-1">{fmtBRL(product.precoVenda)}</p></div>
                      <div><p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: COLORS.sub }}>Lucro / margem</p><p className="fp-mono text-xs font-bold mt-1" style={{ color: profit >= 0 ? COLORS.pos : COLORS.neg }}>{fmtBRL(profit)}</p><p className="text-[10px] font-semibold" style={{ color: COLORS.sub }}>{margin.toFixed(2).replace(".", ",")}%</p></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <button onClick={() => onToggle(product)} className="text-[11px] font-bold" style={{ color: product.ativo ? COLORS.sub : COLORS.pos }}>{product.ativo ? "Desativar" : "Reativar"}</button>
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(product)} className="secondary-button !px-3 !py-2"><Pencil size={13} /> Editar</button>
                    <button onClick={() => onDelete(product)} className="p-2 rounded-lg" style={{ background: COLORS.negBg, color: COLORS.neg }} aria-label={`Excluir ${product.nome}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Pedidos                                                            */
/* ---------------------------------------------------------------- */
function PedidosTab({ pedidos, afiliados, showAfiliadoColumn, onNovo, onEdit, onDelete }) {
  const [q, setQ] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const affName = (id) => afiliados.find((a) => a.id === id)?.nome;
  const filtered = pedidos
    .filter((p) => p.cliente.toLowerCase().includes(q.toLowerCase()))
    .filter((p) => statusFiltro === "Todos" || p.status === statusFiltro);
  const sorted = [...filtered].sort((a, b) => (a.dataPedido < b.dataPedido ? 1 : -1));
  const FILTROS = ["Todos", ...STATUS_OPTIONS];

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Pedidos</h2>
        <p className="text-sm" style={{ color: COLORS.sub }}>
          {statusFiltro === "Todos" ? `${pedidos.length} pedido${pedidos.length !== 1 ? "s" : ""} no total` : `${sorted.length} pedido${sorted.length !== 1 ? "s" : ""} com status "${statusFiltro}"`}
        </p>
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
      <div className="flex gap-2 overflow-x-auto fp-scrollbar pb-1">
        {FILTROS.map((f) => {
          const active = statusFiltro === f;
          const style = f === "Todos" || !STATUS_STYLES[f]
            ? { background: active ? COLORS.brand : "#fff", color: active ? "#fff" : COLORS.sub, border: `1.5px solid ${active ? COLORS.brand : COLORS.line}` }
            : { background: active ? STATUS_STYLES[f].color : "#fff", color: active ? "#fff" : STATUS_STYLES[f].color, border: `1.5px solid ${active ? STATUS_STYLES[f].color : COLORS.line}` };
          return (
            <button key={f} onClick={() => setStatusFiltro(f)} className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0" style={style}>
              {f}
            </button>
          );
        })}
      </div>
      {sorted.length === 0 ? (
        <div className="admin-card text-center py-16">
          <Package size={32} color={COLORS.sub} className="mx-auto mb-3" />
          <p className="text-sm font-semibold">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <>
          <div className="hidden lg:block admin-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead style={{ background: "#F8F9FC", borderBottom: `1px solid ${COLORS.line}` }}>
                  <tr className="text-[10px] uppercase tracking-wider" style={{ color: COLORS.sub }}>
                    <th className="px-4 py-3 font-extrabold">Cliente / produto</th>
                    <th className="px-4 py-3 font-extrabold">Data</th>
                    {showAfiliadoColumn && <th className="px-4 py-3 font-extrabold">Afiliado</th>}
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold text-right">Custo</th>
                    <th className="px-4 py-3 font-extrabold text-right">Venda</th>
                    <th className="px-4 py-3 font-extrabold text-right">Lucro bruto</th>
                    <th className="px-4 py-3 font-extrabold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((pedido) => {
                    const lucro = (Number(pedido.venda) || 0) - (Number(pedido.custo) || 0);
                    return (
                      <tr key={pedido.id} className="hover:bg-slate-50" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                        <td className="px-4 py-3"><p className="text-xs font-bold">{pedido.cliente}</p><p className="text-[10px] mt-1" style={{ color: COLORS.sub }}>{pedido.produtoNome || "Pedido manual"}</p></td>
                        <td className="px-4 py-3"><p className="text-xs font-semibold">{fmtDate(pedido.dataPedido)}</p><p className="text-[10px] mt-1" style={{ color: COLORS.sub }}>Prev.: {fmtDate(pedido.previsaoEntrega)}</p></td>
                        {showAfiliadoColumn && <td className="px-4 py-3 text-xs" style={{ color: COLORS.sub }}>{affName(pedido.afiliadoId) || "—"}</td>}
                        <td className="px-4 py-3"><StatusBadge status={pedido.status} /></td>
                        <td className="px-4 py-3 text-right fp-mono text-xs">{fmtBRL(pedido.custo)}</td>
                        <td className="px-4 py-3 text-right fp-mono text-xs font-semibold">{fmtBRL(pedido.venda)}</td>
                        <td className="px-4 py-3 text-right fp-mono text-xs font-bold" style={{ color: lucro >= 0 ? COLORS.pos : COLORS.neg }}>{fmtBRL(lucro)}</td>
                        <td className="px-4 py-3"><div className="flex justify-end gap-1.5"><button onClick={() => onEdit(pedido)} className="p-2 rounded-lg" style={{ background: "#EEF1FF", color: COLORS.brand }} aria-label="Editar pedido"><Pencil size={14} /></button>{onDelete && <button onClick={() => onDelete(pedido.id)} className="p-2 rounded-lg" style={{ background: COLORS.negBg, color: COLORS.neg }} aria-label="Excluir pedido"><Trash2 size={14} /></button>}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            {sorted.map((p) => {
              const lucro = (Number(p.venda) || 0) - (Number(p.custo) || 0);
              const affiliate = showAfiliadoColumn ? affName(p.afiliadoId) : null;
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4" style={{ border: `1px solid ${COLORS.line}` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm">{p.cliente}</p>
                      {affiliate && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mt-1" style={{ background: "#EEF1FF", color: COLORS.brand }}>via {affiliate}</span>}
                      {p.produtoNome && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-block mt-1 ml-1" style={{ background: "#F0F2F7", color: COLORS.sub }}>{p.produtoNome}</span>}
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
                      <p style={{ color: COLORS.pos }}>Lucro bruto <span className="font-bold">{fmtBRL(lucro)}</span></p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => onEdit(p)} className="p-2 rounded-lg" style={{ background: "#EEF1FF" }}><Pencil size={14} color={COLORS.brand} /></button>
                      {onDelete && <button onClick={() => onDelete(p.id)} className="p-2 rounded-lg" style={{ background: COLORS.negBg }}><Trash2 size={14} color={COLORS.neg} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
                  <button onClick={() => onEdit(p)} className="p-2 rounded-lg" style={{ background: "#EEF1FF" }}><Pencil size={14} color={COLORS.brand} /></button>
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
  const [products, setProducts] = useState([]);
  const [afiliados, setAfiliados] = useState([]);
  const [despesas, setDespesas] = useState({});
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState(null);
  const [productModal, setProductModal] = useState(null);

  const reload = async () => {
    try {
      const [pedidosResult, productsResult, afiliadosResult, despesasResult] = await Promise.allSettled([
        fetchPedidos(), fetchProdutos(), fetchAfiliados(), fetchDespesas(),
      ]);
      const requiredFailure = [pedidosResult, afiliadosResult, despesasResult].find((result) => result.status === "rejected");
      if (requiredFailure) throw requiredFailure.reason;
      setPedidos(pedidosResult.value);
      setProducts(productsResult.status === "fulfilled" ? productsResult.value : []);
      setAfiliados(afiliadosResult.value);
      setDespesas(despesasResult.value);
      setLoadError(productsResult.status === "rejected"
        ? "O catálogo de produtos não pôde ser carregado. Confira se a migration 202611150001_produtos_pedidos_financeiro.sql foi executada no Supabase."
        : "");
    } catch (error) {
      setLoadError(error?.message || "Não foi possível carregar os dados da operação.");
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    reload();
    const unsub = subscribeAll(() => reload());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveDespesa = async (date, values) => {
    await upsertDespesa(date, values, profile.empresa_id);
    await reload();
  };

  const handleSavePedido = async (values) => {
    if (modal && modal.id) await updatePedido(modal.id, values);
    else await createPedido(values, profile.empresa_id);
    await reload();
    setModal(null);
  };

  const handleDeletePedido = async (id) => {
    if (window.confirm("Excluir este pedido?")) {
      await deletePedido(id);
      await reload();
    }
  };

  const handleSaveProduto = async (values) => {
    if (productModal && productModal.id) await updateProduto(productModal.id, values);
    else await createProduto(values, profile.empresa_id);
    await reload();
    setProductModal(null);
  };

  const handleToggleProduto = async (product) => {
    try {
      await updateProduto(product.id, { ativo: !product.ativo });
      await reload();
    } catch (error) {
      window.alert(error?.message || "Não foi possível atualizar o produto.");
    }
  };

  const handleDeleteProduto = async (product) => {
    const confirmed = window.confirm(`Excluir o produto “${product.nome}”? Os pedidos antigos manterão o custo e o preço registrados.`);
    if (!confirmed) return;
    try {
      await deleteProduto(product.id);
      await reload();
    } catch (error) {
      window.alert(error?.message || "Não foi possível excluir o produto.");
    }
  };

  const handleAddAfiliado = async (nome, pin) => { await createAfiliadoComLogin(nome, pin); await reload(); };
  const handleRemoveAfiliado = async (id) => { await desativarAfiliado(id); await reload(); };

  const TABS = [
    { id: "dashboard", label: "Visão geral", mobileLabel: "Início", icon: LayoutDashboard },
    { id: "pedidos", label: "Pedidos", mobileLabel: "Pedidos", icon: ShoppingCart },
    { id: "produtos", label: "Produtos", mobileLabel: "Produtos", icon: Boxes },
    { id: "afiliados", label: "Afiliados", mobileLabel: "Afiliados", icon: Users },
    { id: "frustrados", label: "Frustrados", mobileLabel: "Frustrados", icon: AlertTriangle },
  ];

  if (!ready) {
    return <div className="fp-app min-h-screen flex items-center justify-center" style={{ background: COLORS.paper }}><GlobalStyle /><p className="text-sm font-semibold" style={{ color: COLORS.sub }}>Carregando sua operação...</p></div>;
  }

  return (
    <div className="fp-app admin-shell">
      <GlobalStyle />
      <aside className="admin-sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Package size={22} /></div>
          <div><p className="font-extrabold text-[17px] tracking-tight text-white">afterpay <span style={{ color: "#8D9EFF" }}>J27</span></p><p className="text-[9px] font-bold tracking-[.16em] mt-0.5" style={{ color: "#8290B2" }}>OPERATIONS HUB</p></div>
        </div>
        <p className="sidebar-kicker">Workspace</p>
        <nav className="space-y-1">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return <button key={item.id} onClick={() => setTab(item.id)} className={`sidebar-link ${active ? "active" : ""}`}><Icon size={17} /><span>{item.label}</span>{active && <ChevronRight size={14} className="ml-auto" />}</button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl grid place-items-center font-extrabold text-sm" style={{ background: "rgba(126,145,255,.18)", color: "#BFC9FF" }}>{(profile.nome || "A").slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0"><p className="text-xs font-bold text-white truncate">{profile.nome || "Administrador"}</p><p className="text-[10px] mt-0.5" style={{ color: "#8794B3" }}>Administrador</p></div>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="min-w-0">
            <p className="page-eyebrow">Operação</p>
            <h1 className="text-base sm:text-lg font-extrabold mt-0.5 truncate" style={{ color: COLORS.ink }}>{profile.empresa_nome || "Minha operação"}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block text-right"><p className="text-xs font-bold">{profile.nome || "Administrador"}</p><p className="text-[10px] mt-0.5" style={{ color: COLORS.sub }}>Painel administrativo</p></div>
            <div className="rounded-xl p-1.5" style={{ background: "#F0F3FA" }}><NotificationBell empresaId={profile.empresa_id} /></div>
            <button onClick={onLogout} className="p-2.5 rounded-xl" style={{ background: "#F0F3FA", color: "#53617C" }} aria-label="Sair"><LogOut size={17} /></button>
          </div>
        </header>

        <div className="admin-content">
          {loadError && <div className="mb-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: COLORS.negBg, color: COLORS.neg }}><p className="text-xs font-semibold">{loadError} Se você acabou de atualizar o sistema, confirme se executou a migration de produtos no Supabase.</p><button onClick={reload} className="shrink-0 text-xs font-extrabold underline">Tentar novamente</button></div>}
          <div className="admin-page">
            {tab === "dashboard" && <DashboardTab pedidos={pedidos} afiliados={afiliados} despesas={despesas} onSaveDespesa={handleSaveDespesa} onNovo={() => setModal("new")} />}
            {tab === "pedidos" && <PedidosTab pedidos={pedidos} afiliados={afiliados} showAfiliadoColumn onNovo={() => setModal("new")} onEdit={(pedido) => setModal(pedido)} onDelete={handleDeletePedido} />}
            {tab === "produtos" && <ProdutosTab products={products} onNew={() => setProductModal("new")} onEdit={(product) => setProductModal(product)} onToggle={handleToggleProduto} onDelete={handleDeleteProduto} />}
            {tab === "afiliados" && <AfiliadosTab afiliados={afiliados} pedidos={pedidos} onAdd={handleAddAfiliado} onRemove={handleRemoveAfiliado} />}
            {tab === "frustrados" && <FrustradosTab pedidos={pedidos} onEdit={(pedido) => setModal(pedido)} onDelete={handleDeletePedido} />}
          </div>
        </div>

        <nav className="mobile-nav">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return <button key={item.id} onClick={() => setTab(item.id)} className="flex flex-col items-center gap-1 rounded-xl" style={{ color: active ? COLORS.brand : COLORS.sub, background: active ? "#EEF1FF" : "transparent" }}><Icon size={18} /><span className="font-bold whitespace-nowrap">{item.mobileLabel}</span></button>;
          })}
        </nav>
      </main>

      {modal && (
        <PedidoFormModal
          title={modal === "new" ? "Novo pedido" : "Editar pedido"}
          initial={modal === "new" ? null : modal}
          afiliados={afiliados}
          products={products}
          showAfiliadoField
          onCancel={() => setModal(null)}
          onSave={handleSavePedido}
        />
      )}
      {productModal && <ProdutoFormModal initial={productModal === "new" ? null : productModal} onCancel={() => setProductModal(null)} onSave={handleSaveProduto} />}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Afiliado shell                                                     */
/* ---------------------------------------------------------------- */
function AffiliateApp({ profile, onLogout }) {
  const [pedidos, setPedidos] = useState([]);
  const [products, setProducts] = useState([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const today = todayISO();

  const reload = async () => {
    try {
      const [pedidosResult, productsResult] = await Promise.allSettled([fetchPedidos(), fetchProdutos()]);
      if (pedidosResult.status === "rejected") throw pedidosResult.reason;
      setPedidos(pedidosResult.value);
      setProducts(productsResult.status === "fulfilled" ? productsResult.value : []);
      setLoadError(productsResult.status === "rejected"
        ? "O catálogo de produtos ainda não está disponível. Você pode registrar vendas manualmente; solicite a aplicação da migration ao administrador."
        : "");
    } catch (error) {
      setLoadError(error?.message || "Não foi possível carregar suas vendas.");
    } finally {
      setReady(true);
    }
  };

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
        {loadError && <div className="rounded-xl p-3 mb-3 text-xs font-semibold" style={{ background: COLORS.negBg, color: COLORS.neg }}>{loadError} <button onClick={reload} className="underline ml-1">Tentar novamente</button></div>}
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
                  {p.produtoNome && <p className="text-[11px] font-semibold mb-1" style={{ color: COLORS.sub }}>{p.produtoNome}</p>}
                  <p className="text-xs" style={{ color: COLORS.sub }}>Previsão: {fmtDate(p.previsaoEntrega)} · {p.formaPagamento}</p>
                  <p className="fp-mono text-sm font-bold mt-1" style={{ color: COLORS.brand }}>{fmtBRL(p.venda)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showForm && (
        <PedidoFormModal title="Registrar nova venda" initial={null} afiliados={[]} products={products} showAfiliadoField={false} onCancel={() => setShowForm(false)} onSave={handleSave} />
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
      let p = await fetchMyProfile();
      if (!p) {
        // Sessão existe mas ainda não tem empresa — provavelmente acabou
        // de confirmar o e-mail. Tenta completar sozinho primeiro.
        await tentarCompletarCadastroAutomatico();
        p = await fetchMyProfile();
      }
      if (!p) { setStatus("needsCompany"); return; }
      setProfile(p);
      setStatus("ready");
    } catch {
      setStatus("needsAuth");
    }
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

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
      {status === "needsCompany" && <CompleteCompanySetup onDone={loadProfile} />}
      {status === "ready" && profile?.role === "admin" && <AdminApp profile={profile} onLogout={signOut} />}
      {status === "ready" && profile?.role === "affiliate" && <AffiliateApp profile={profile} onLogout={signOut} />}
    </>
  );
}
