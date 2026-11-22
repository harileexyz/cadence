import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";

const FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "psychic-era-515102-r4";
const FIREBASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "psychic-era-515102-r4.firebasestorage.app";

interface ServiceAccountCreds {
  client_email: string;
  private_key: string;
  project_id?: string;
}

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null;

function getServiceAccountCreds(): ServiceAccountCreds | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Partial<ServiceAccountCreds>;
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
          project_id: parsed.project_id,
        };
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const key = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (email && key) {
    return {
      client_email: email,
      private_key: key.replace(/\\n/g, "\n"),
      project_id: FIREBASE_PROJECT_ID,
    };
  }

  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  return getServiceAccountCreds() !== null;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getGoogleAccessToken(): Promise<string | null> {
  const creds = getServiceAccountCreds();
  if (!creds) return null;

  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: creds.client_email,
      scope:
        "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/devstorage.full_control",
      aud: "https://oauth2.googleapis.com/token",
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );

  const signingInput = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = base64UrlEncode(signer.sign(creds.private_key));
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) return null;

  cachedToken = {
    accessToken: data.access_token,
    expiresAtMs: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

export async function sendPushNotificationToUser(
  prismaClient: PrismaClient,
  userId: string,
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<number> {
  try {
    const tokens = await prismaClient.deviceToken.findMany({
      where: { userId },
      select: { id: true, token: true },
    });
    if (tokens.length === 0) return 0;

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) return 0;

    const projectId = getServiceAccountCreds()?.project_id || FIREBASE_PROJECT_ID;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sent = 0;
    for (const row of tokens) {
      try {
        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: row.token,
              notification: {
                title: payload.title,
                body: payload.body,
              },
              data: payload.data ?? {},
              android: {
                priority: "high",
                notification: {
                  channel_id: "cadence_publishing",
                  color: "#4F46E5",
                },
              },
            },
          }),
        });

        if (res.ok) {
          sent++;
        } else if (res.status === 404 || res.status === 400) {
          // Clean up unregistered/stale FCM tokens
          const errText = await res.text().catch(() => "");
          if (errText.includes("UNREGISTERED") || errText.includes("INVALID_ARGUMENT")) {
            await prismaClient.deviceToken
              .delete({ where: { id: row.id } })
              .catch(() => {});
          }
        }
      } catch {
        // Non-fatal push error
      }
    }

    return sent;
  } catch {
    return 0;
  }
}

export async function deleteFirebaseStorageObject(
  storageKey: string
): Promise<boolean> {
  if (!storageKey.startsWith("media/")) return false;
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return false;

  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
    FIREBASE_STORAGE_BUCKET
  )}/o/${encodeURIComponent(storageKey)}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => null);

  return Boolean(res && (res.ok || res.status === 404));
}
