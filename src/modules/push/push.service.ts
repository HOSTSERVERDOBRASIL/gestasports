import webpush from "web-push";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapid()) return { sent: 0, failed: 0 };
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  return sendPushToSubscriptions(subscriptions, payload);
}

export async function sendPushToTenant(tenantId: string, payload: PushPayload) {
  if (!ensureVapid()) return { sent: 0, failed: 0 };
  const subscriptions = await prisma.pushSubscription.findMany({ where: { tenantId } });
  return sendPushToSubscriptions(subscriptions, payload);
}

async function sendPushToSubscriptions(
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload
) {
  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  await Promise.allSettled(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 86400 }
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      // 410 Gone = subscription expirada, remover
      if (
        typeof err === "object" &&
        err !== null &&
        "statusCode" in err &&
        ((err as { statusCode: number }).statusCode === 410 ||
          (err as { statusCode: number }).statusCode === 404)
      ) {
        expired.push(sub.endpoint);
      }
    }
  }));

  // Limpar subscriptions expiradas
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } });
  }

  return { sent, failed };
}
