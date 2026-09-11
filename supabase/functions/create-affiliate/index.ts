// Supabase Edge Function: create-affiliate
//
// Só o administrador logado pode chamar. Cria um login de verdade
// (Supabase Auth) pro afiliado, usando um e-mail sintético + o PIN
// como senha. O afiliado nunca aparece com PIN salvo em texto puro
// em nenhuma tabela — a senha fica só dentro do Supabase Auth.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(url, serviceKey);

    // 1) Confirma quem está chamando (precisa ser admin autenticado)
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) throw new Error("Não autenticado.");

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) throw new Error("Sessão inválida.");
    const requester = userData.user;

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("role, empresa_id")
      .eq("user_id", requester.id)
      .single();
    if (profileErr || !profile) throw new Error("Perfil não encontrado.");
    if (profile.role !== "admin") throw new Error("Apenas administradores podem criar afiliados.");

    // 2) Valida os dados recebidos
    const { nome, pin } = await req.json();
    if (typeof nome !== "string" || nome.trim().length < 2) {
      throw new Error("Nome inválido.");
    }
    if (!/^\d{4,6}$/.test(String(pin))) {
      throw new Error("PIN deve ter de 4 a 6 números.");
    }

    // 3) Cria o login de verdade (e-mail sintético + PIN como senha)
    const afiliadoId = crypto.randomUUID();
    const syntheticEmail = `afiliado-${afiliadoId.replaceAll("-", "")}@afterpayj27.app`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password: String(pin),
      email_confirm: true,
      user_metadata: { role: "affiliate" },
    });
    if (createErr || !created?.user) throw createErr || new Error("Falha ao criar login.");

    // 4) Cria a linha do afiliado, já vinculada à empresa do admin
    const { error: afiliadoErr } = await admin.from("afiliados").insert({
      id: afiliadoId,
      empresa_id: profile.empresa_id,
      nome: nome.trim(),
      auth_user_id: created.user.id,
    });
    if (afiliadoErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw afiliadoErr;
    }

    // 5) Cria o profile do afiliado (mesma empresa do admin)
    const { error: profileInsertErr } = await admin.from("profiles").insert({
      user_id: created.user.id,
      empresa_id: profile.empresa_id,
      role: "affiliate",
      afiliado_id: afiliadoId,
      nome: nome.trim(),
    });
    if (profileInsertErr) {
      await admin.from("afiliados").delete().eq("id", afiliadoId);
      await admin.auth.admin.deleteUser(created.user.id);
      throw profileInsertErr;
    }

    return new Response(
      JSON.stringify({ ok: true, id: afiliadoId, nome: nome.trim(), loginEmail: syntheticEmail }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Erro ao criar afiliado." }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
