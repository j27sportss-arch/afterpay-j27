// Supabase Edge Function: push-notification
//
// Recebe o payload de um Database Webhook de public.notificacoes.
// As credenciais VAPID ficam somente nos secrets da Edge Function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

type NotificationRecord = {
  id: string;
  empresa_id: string;
  usuario_id?: string | null;
  titulo: string;
  mensagem: string;
  pedido_id?: string | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
    if (webhookSecret) {
      const received = req.headers.get("x-webhook-secret");
      if (received !== webhookSecret) return json({ error: "Não autorizado." }, 401);
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@afterpayj27.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Secrets VAPID não configurados na Edge Function.");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const body = await req.json();
    if (body?.type && body.type !== "INSERT") {
      return json({ ok: true, skipped: true, reason: "Evento não é INSERT." });
    }

    const record: NotificationRecord = body?.record;
    if (
      !record?.id ||
      !record?.empresa_id ||
      !record?.titulo ||
      !record?.mensagem
    ) {
      return json({ error: "Payload de webhook inválido." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    let query = admin
      .from("push_subscriptions")
      .select("id, user_id, empresa_id, endpoint, p256dh, auth")
      .eq("empresa_id", record.empresa_id);

    if (record.usuario_id) {
      query = query.or(`user_id.eq.${record.usuario_id},user_id.is.null`);
    }

    const { data: subscriptions, error: subscriptionError } = await query;
    if (subscriptionError) throw subscriptionError;

    const payload = JSON.stringify({
      title: record.titulo || "Afterpay J27",
      body: record.mensagem || "Você recebeu uma nova notificação.",
      url: record.pedido_id ? `/?pedido=${encodeURIComponent(record.pedido_id)}` : "/",
    });

    let sent = 0;
    let removed = 0;
    const failures: Array<{ id: string; status?: number; message: string }> = [];

    for (const subscription of subscriptions || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
        sent += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error
          ? Number(error.statusCode)
          : undefined;
        const message = error instanceof Error ? error.message : "Falha ao enviar Web Push.";

        // 404/410 significam que a subscription não pode mais ser usada.
        if (statusCode === 404 || statusCode === 410) {
          const { error: deleteError } = await admin
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);

          if (!deleteError) removed += 1;
          else failures.push({ id: subscription.id, status: statusCode, message: deleteError.message });
        } else {
          failures.push({ id: subscription.id, status: statusCode, message });
        }
      }
    }

    return json({
      ok: true,
      notification_id: record.id,
      subscriptions: subscriptions?.length || 0,
      sent,
      removed,
      failures,
    });
  } catch (error) {
    console.error("push-notification:", error);
    return json({ error: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});
