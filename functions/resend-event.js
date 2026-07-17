/**
 * Resend webhook handler — receives email.opened / email.clicked / email.bounced events
 * Updates Beehiiv subscriber tags so email_engine.py can read open/click history.
 *
 * Registered at: https://nis2-bg.eu/resend-event
 * Signing secret: stored in RESEND_WEBHOOK_SECRET env var
 */

const RESEND_WEBHOOK_SECRET = "whsec_5fNhbhcwSrXjRWneVKNI7xFZBoxu5gks";

export async function onRequestPost({ request, env }) {
  const body    = await request.text();
  const sigHeader = request.headers.get("svix-signature") || "";

  // Verify Resend webhook signature (HMAC-SHA256 via svix)
  if (RESEND_WEBHOOK_SECRET) {
    const verified = await verifySignature(
      body,
      request.headers.get("svix-id") || "",
      request.headers.get("svix-timestamp") || "",
      sigHeader,
      RESEND_WEBHOOK_SECRET
    );
    if (!verified) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let event;
  try { event = JSON.parse(body); }
  catch { return new Response("Bad JSON", { status: 400 }); }

  const type  = event.type;   // e.g. "email.opened"
  const email = event.data?.to?.[0];
  if (!email) return new Response("OK", { status: 200 });

  const BEEHIIV_KEY = env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB = env.BEEHIIV_PUB_ID;

  // Map event type to a Beehiiv tag
  const tagMap = {
    "email.opened":    "email_opened",
    "email.clicked":   "email_clicked",
    "email.bounced":   "email_bounced",
    "email.delivered": "email_delivered",
  };
  const tag = tagMap[type];
  if (!tag || !BEEHIIV_KEY) return new Response("OK", { status: 200 });

  // Find subscriber in Beehiiv by email
  const searchUrl = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB}/subscriptions/by_email/${encodeURIComponent(email)}`;
  const subRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${BEEHIIV_KEY}` }
  });

  if (subRes.ok) {
    const subData = await subRes.json();
    const subId   = subData?.data?.id;
    if (subId) {
      // Add tag to subscriber
      await fetch(
        `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB}/subscriptions/${subId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${BEEHIIV_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ tags: [tag] }),
        }
      );
    }
  }

  return new Response("OK", { status: 200 });
}

// Svix HMAC-SHA256 signature verification
async function verifySignature(body, msgId, msgTimestamp, sigHeader, secret) {
  try {
    const keyBytes = base64ToBytes(secret.replace("whsec_", ""));
    const key = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const toSign = `${msgId}.${msgTimestamp}.${body}`;
    const sigs = sigHeader.split(" ").map(s => s.replace(/^v\d,/, ""));
    for (const sig of sigs) {
      const sigBytes = base64ToBytes(sig);
      const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(toSign));
      if (valid) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
