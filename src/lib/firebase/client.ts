import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
} from "firebase/storage";

export const FIREBASE_PROJECT_ID = "psychic-era-515102-r4";
export const FIREBASE_STORAGE_BUCKET = "psychic-era-515102-r4.firebasestorage.app";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyCEeuSTIHixzp4QOi-xx3oUkw1IuEH-TZ8",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "psychic-era-515102-r4.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "420527287569",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:420527287569:web:eb20ec050b5a2e976530b0",
};

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

export interface BrowserMediaProbe {
  width: number | null;
  height: number | null;
  durationSec: number | null;
}

export async function probeMediaInBrowser(file: File): Promise<BrowserMediaProbe> {
  if (typeof window === "undefined") {
    return { width: null, height: null, durationSec: null };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("video/")) {
      return await new Promise<BrowserMediaProbe>((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        const timeout = setTimeout(() => {
          resolve({ width: null, height: null, durationSec: null });
        }, 4000);
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve({
            width: video.videoWidth || null,
            height: video.videoHeight || null,
            durationSec: Number.isFinite(video.duration)
              ? Number(video.duration.toFixed(2))
              : null,
          });
        };
        video.onerror = () => {
          clearTimeout(timeout);
          resolve({ width: null, height: null, durationSec: null });
        };
        video.src = objectUrl;
      });
    }

    if (file.type.startsWith("image/")) {
      return await new Promise<BrowserMediaProbe>((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
          resolve({ width: null, height: null, durationSec: null });
        }, 3000);
        img.onload = () => {
          clearTimeout(timeout);
          resolve({
            width: img.naturalWidth || null,
            height: img.naturalHeight || null,
            durationSec: null,
          });
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve({ width: null, height: null, durationSec: null });
        };
        img.src = objectUrl;
      });
    }

    return { width: null, height: null, durationSec: null };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadMediaDirectToFirebase(
  file: File,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<{
  storageKey: string;
  publicUrl: string;
  metadata: BrowserMediaProbe;
}> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const storageKey = `media/${userId}/${Date.now()}-${uniqueId}-${safeName}`;

  const storage = getFirebaseStorage();
  const storageRef = ref(storage, storageKey);

  const [metadata, publicUrl] = await Promise.all([
    probeMediaInBrowser(file),
    new Promise<string>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type || "application/octet-stream",
      });

      task.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            onProgress(pct);
          }
        },
        (error) => reject(error),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    }),
  ]);

  return { storageKey, publicUrl, metadata };
}
