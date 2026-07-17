/**
 * Cloudflare Pages Function: /subscribe
 * Accepts POST { email, source } from site.js
 * Forwards to beehiiv API (free tier handles subscriber creation)
 *
 * Environment variables required (set in Cloudflare Pages dashboard):
 *   BEEHIIV_API_KEY  — beehiiv API key (Settings → API Keys)
 *   BEEHIIV_PUB_ID   — beehiiv Publication ID (from your publication URL)
 *
 * If env vars are not set, returns 200 anyway (fail-open) so UX is never broken.
 */
export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false, error: "invalid email" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const apiKey = env.BEEHIIV_API_KEY;
  const pubId  = env.BEEHIIV_PUB_ID;

  // Fail-open: if not configured, return 200 so UX works before beehiiv is set up
  if (!apiKey || !pubId) {
    return new Response(JSON.stringify({ ok: true, note: "not configured" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const tags = buildTags(body);

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: false,
          utm_source: "nis2-narzedzia.pl",
          utm_medium: "email-gate",
          utm_campaign: body.source || "inline",
          tags: [...tags, "seq_started"],
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    const ok = res.status === 200 || res.status === 201;

    // Send sequence email 0 immediately via Resend
    if (ok && env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      const tier = tags.find(t => t === "score_low") ? "A"
                 : tags.find(t => t === "score_high") ? "C" : "B";
      await sendSequenceEmail0(email, tier, env).catch(() => {});
    }

    return new Response(JSON.stringify({ ok, status: res.status, data }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    // Network error — still return 200 so UX isn't broken
    return new Response(JSON.stringify({ ok: true, note: "upstream error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// Build Beehiiv tags from quiz answers for segmented email sequences
function buildTags(body) {
  const tags = [];
  const qa   = body.quiz_answers || {};
  const score = Number(qa.score) || 0;

  // Score tier — drives which nurture sequence subscriber receives
  if (score <= 3)      tags.push("score_low");
  else if (score <= 6) tags.push("score_mid");
  else                 tags.push("score_high");

  // Sector
  if (qa.sector) tags.push("sector_" + qa.sector);

  // Role
  if (qa.role)   tags.push("role_" + qa.role);

  // Missing items — used for personalised email subject lines + content
  if (qa.registered === "no" || qa.registered === "unknown") tags.push("missing_registration");
  if (qa.has_isms === "no" || qa.has_isms === "partial")      tags.push("missing_isms");
  if (qa.has_training === "no")                               tags.push("missing_training");
  if (qa.has_insurance === "no" || qa.has_insurance === "unknown") tags.push("missing_insurance");

  // Source tag
  if (body.source) tags.push("source_" + body.source.replace(/[^a-z0-9_]/gi, "_"));

  return tags.filter(Boolean);
}

// Immediate sequence email — sent the moment someone subscribes
async function sendSequenceEmail0(email, tier, env) {
  const EMAILS = {"A": {"subject": "Вашият план за действие по NIS2 — 3 дни, 3 стъпки", "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Току-що завършихте теста по NIS2 — резултатът ви показва, че има още какво да се направи преди крайния срок.<br><br><strong>Добрата новина:</strong> Компании в подобна ситуация постигат съответствие за 60–90 дни, ако започнат с правилните стъпки.</p><h3 style=\"font-family:sans-serif;color:#1e3a5f;\">Вашият 3-дневен стартов план:</h3><p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"><strong>Ден 1 (30 мин) — Проверете дали попадате под NIS2:</strong><br><a href=\"https://nis2-bg.eu/kalkulator.html\" style=\"color:#1e3a5f;\">Проверете дали вашата фирма е задължена по NIS2 →</a><br><br><strong>Ден 2 (20 мин) — Стартирайте безплатна ISMS система:</strong><br><a href=\"https://nis2-bg.eu/instrumenti/isms-online.html\" style=\"color:#1e3a5f;\">ISMS.online — безплатен план до 25 служители →</a><br><br><strong>Ден 3 (30 мин) — Обучете ръководството:</strong><br><a href=\"https://www.knowbe4.com/\" style=\"color:#1e3a5f;\">KnowBe4 — 14-дневен пробен период →</a><br><br><a href=\"https://nis2-bg.eu/#tracker-section\" style=\"color:#1e3a5f;\">Следете напредъка си в NIS2 тракера →</a></p>"}, "B": {"subject": "Вашият резултат по NIS2: добро начало — ето как да стигнете до 100%", "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Вече имате основите на NIS2 — добър знак. Липсват ви 2–3 елемента, които се проверяват най-често от надзорния орган.</p><p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"><strong>Тестове за проникване (чл. 21(2)(f)):</strong><br><a href=\"https://nis2-bg.eu/testy-penetracyjne.html\" style=\"color:#1e3a5f;\">Ръководство за тестове за проникване →</a><br><br><strong>MFA за привилегировани акаунти (чл. 21(2)(i)):</strong><br><a href=\"https://nis2-bg.eu/instrumenti/1password.html\" style=\"color:#1e3a5f;\">1Password Business — MFA + мениджър на пароли →</a><br><br><strong>Сигурност на веригата на доставки (чл. 21(2)(d)):</strong><br><a href=\"https://nis2-bg.eu/bezpieczenstwo-lancucha-dostaw.html\" style=\"color:#1e3a5f;\">Ръководство за сигурност на доставчиците →</a><br><br><a href=\"https://nis2-bg.eu/#tracker-section\" style=\"color:#1e3a5f;\">Отбележете напредъка си в NIS2 тракера →</a></p>"}, "C": {"subject": "Отличен резултат по NIS2 — ето вашата последна стъпка", "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Висока степен на готовност по NIS2 — наистина добър резултат. Остава един неприключен въпрос: формална външна валидация.</p><p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"><strong>Тест за проникване</strong> — доказателство за ефективност на защитите (чл. 21(2)(f)):<br><a href=\"https://cobalt.io/\" style=\"color:#1e3a5f;\">Cobalt.io →</a><br><br><strong>Сертификация ISO 27001</strong> — външна валидация на цялата ISMS система:<br><a href=\"https://nis2-bg.eu/certyfikacja-iso-27001.html\" style=\"color:#1e3a5f;\">Ръководство за ISO 27001 →</a><br><br><a href=\"https://nis2-bg.eu/#tracker-section\" style=\"color:#1e3a5f;\">Проверете последните контролни точки →</a></p>"}};

  const msg = EMAILS[tier] || EMAILS["B"];
  const footer = `<hr style="margin:2rem 0;border:none;border-top:1px solid #e5e7eb;">
<p style="font-family:sans-serif;font-size:12px;color:#9ca3af;">
  nis2-bg.eu &nbsp;|&nbsp;
  <a href="https://nis2-narzedzia.pl/unsubscribe?email=${encodeURIComponent(email)}" style="color:#9ca3af;">Wypisz się</a>
</p>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      subject: msg.subject,
      html: msg.html + footer,
    }),
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
