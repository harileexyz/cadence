"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Film,
  Image as ImageIcon,
  Loader2,
  Send,
  Sliders,
  Upload,
  X,
} from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";
import { VideoCoverScrubber } from "@/components/VideoCoverScrubber";
import {
  YOUTUBE_CATEGORIES,
  type AccountDefaults,
} from "@/lib/platforms/types";

interface AccountDTO {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  metadata?: {
    defaults?: AccountDefaults;
    [key: string]: unknown;
  } | null;
  isActive: boolean;
}

interface UploadedAsset {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  publicUrl: string;
}

interface PerChannelOverride {
  customTitle?: string;
  customCaption?: string;
  categoryId?: string;
  tags?: string;
  playlistId?: string;
  containsSyntheticMedia?: boolean;
  firstComment?: string;
}

function defaultScheduleDateTime(): string {
  const dt = new Date(Date.now() + 15 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours()
  )}:${pad(dt.getMinutes())}`;
}

export default function ComposePage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [baseCaption, setBaseCaption] = useState("");

  // Shared YouTube Studio options
  const [ytPrivacy, setYtPrivacy] = useState<"private" | "unlisted" | "public">(
    "private"
  );
  const [ytCategoryId, setYtCategoryId] = useState("24");
  const [ytIsShort, setYtIsShort] = useState(true);
  const [ytTags, setYtTags] = useState("");
  const [ytLanguage, setYtLanguage] = useState("en");
  const [ytLicense, setYtLicense] = useState<"youtube" | "creativeCommon">(
    "youtube"
  );
  const [ytPlaylistId, setYtPlaylistId] = useState("");
  const [ytMadeForKids, setYtMadeForKids] = useState(false);
  const [ytSyntheticMedia, setYtSyntheticMedia] = useState(false);
  const [ytNotifySubscribers, setYtNotifySubscribers] = useState(true);
  const [ytEmbeddable, setYtEmbeddable] = useState(true);
  const [ytFirstComment, setYtFirstComment] = useState("");
  const [ytThumbnailAsset, setYtThumbnailAsset] =
    useState<UploadedAsset | null>(null);
  const [ytCustomTitle, setYtCustomTitle] = useState("");
  const [ytCustomCaption, setYtCustomCaption] = useState("");

  // Shared Instagram Studio options
  const [igMediaType, setIgMediaType] = useState<
    "AUTO" | "REELS" | "IMAGE" | "CAROUSEL"
  >("AUTO");
  const [igShareToFeed, setIgShareToFeed] = useState(true);
  const [igCoverAsset, setIgCoverAsset] = useState<UploadedAsset | null>(null);
  const [igThumbOffsetSec, setIgThumbOffsetSec] = useState("0");
  const [igCollaborators, setIgCollaborators] = useState("");
  const [igUserTags, setIgUserTags] = useState("");
  const [igAudioName, setIgAudioName] = useState("");
  const [igLocationId, setIgLocationId] = useState("");
  const [igFirstComment, setIgFirstComment] = useState("");
  const [igCustomCaption, setIgCustomCaption] = useState("");

  // Per-channel overrides (auto-initialized from saved channel defaults)
  const [channelOverrides, setChannelOverrides] = useState<
    Record<string, PerChannelOverride>
  >({});
  const [showPerChannel, setShowPerChannel] = useState(false);

  const [scheduleAt, setScheduleAt] = useState(defaultScheduleDateTime);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/accounts");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { accounts: AccountDTO[] };
        const active = data.accounts.filter((a) => a.isActive);
        setAccounts(active);
        setSelectedAccountIds(active.map((a) => a.id));

        const initialOverrides: Record<string, PerChannelOverride> = {};
        for (const acc of active) {
          const defs = acc.metadata?.defaults;
          if (defs) {
            initialOverrides[acc.id] = {
              categoryId: defs.categoryId,
              tags: defs.tags ? defs.tags.join(", ") : undefined,
              playlistId: defs.playlistId,
              containsSyntheticMedia: defs.containsSyntheticMedia,
            };
          }
        }
        setChannelOverrides(initialOverrides);
      }
    })();
  }, []);

  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selectedAccountIds.includes(a.id)),
    [accounts, selectedAccountIds]
  );

  const hasYouTube = selectedAccounts.some((a) => a.platform === "YOUTUBE");
  const hasInstagram = selectedAccounts.some((a) => a.platform === "INSTAGRAM");

  const hasLocalhostMediaForIg =
    hasInstagram &&
    assets.some(
      (a) =>
        !a.publicUrl.startsWith("https://") ||
        a.publicUrl.includes("localhost") ||
        a.publicUrl.includes("127.0.0.1")
    );

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function updateChannelOverride(
    accountId: string,
    patch: Partial<PerChannelOverride>
  ) {
    setChannelOverrides((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] ?? {}),
        ...patch,
      },
    }));
  }

  async function uploadSingleFile(file: File): Promise<UploadedAsset> {
    const res = await fetch("/api/media/upload", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        "X-File-Type": file.type || "application/octet-stream",
        "X-File-Size": String(file.size),
      },
      body: file,
    });
    const rawText = await res.text();
    let data: { asset?: UploadedAsset; error?: string } = {};
    if (rawText.trim()) {
      try {
        data = JSON.parse(rawText) as {
          asset?: UploadedAsset;
          error?: string;
        };
      } catch {
        throw new Error(
          `Server returned an invalid response (HTTP ${res.status}) while uploading ${file.name}.`
        );
      }
    } else if (!res.ok) {
      throw new Error(
        `Upload interrupted (HTTP ${res.status}) for ${file.name}. Please try again.`
      );
    }

    if (!res.ok || !data.asset) {
      throw new Error(data.error || `Upload failed for ${file.name}`);
    }
    return data.asset;
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const uploaded: UploadedAsset[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadSingleFile(file));
      }
      setAssets((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleThumbnailUpload(
    files: FileList | null,
    target: "youtube" | "instagram"
  ) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const asset = await uploadSingleFile(files[0]);
      if (target === "youtube") {
        setYtThumbnailAsset(asset);
      } else {
        setIgCoverAsset(asset);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thumbnail upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submitPost(mode: "draft" | "now" | "schedule") {
    setError(null);
    if (selectedAccountIds.length === 0) {
      setError("Select at least one YouTube or Instagram channel.");
      return;
    }

    setSubmitting(true);
    try {
      const sharedTags = ytTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const parsedCollabs = igCollaborators
        .split(",")
        .map((c) => c.replace(/^@/, "").trim())
        .filter(Boolean)
        .slice(0, 3);

      const parsedUserTags = igUserTags
        .split(",")
        .map((u) => u.replace(/^@/, "").trim())
        .filter(Boolean)
        .map((username) => ({ username, x: 0.5, y: 0.5 }));

      const thumbOffsetSecNum = Number.parseFloat(igThumbOffsetSec || "0");
      const thumbOffsetMs =
        Number.isFinite(thumbOffsetSecNum) && thumbOffsetSecNum > 0
          ? Math.round(thumbOffsetSecNum * 1000)
          : undefined;

      const targets = selectedAccounts.map((acc) => {
        const chOverride = channelOverrides[acc.id] ?? {};
        const defs = acc.metadata?.defaults ?? {};

        if (acc.platform === "YOUTUBE") {
          const channelTags = chOverride.tags
            ? chOverride.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : sharedTags.length > 0
              ? sharedTags
              : defs.tags;

          return {
            accountId: acc.id,
            customTitle:
              chOverride.customTitle?.trim() || ytCustomTitle.trim() || null,
            customCaption:
              chOverride.customCaption?.trim() ||
              ytCustomCaption.trim() ||
              null,
            platformOptions: {
              privacyStatus: ytPrivacy,
              categoryId:
                chOverride.categoryId || defs.categoryId || ytCategoryId,
              isShort: ytIsShort,
              tags:
                channelTags && channelTags.length > 0 ? channelTags : undefined,
              defaultLanguage: defs.defaultLanguage || ytLanguage || "en",
              license: ytLicense,
              playlistId:
                chOverride.playlistId?.trim() ||
                ytPlaylistId.trim() ||
                defs.playlistId ||
                undefined,
              madeForKids: ytMadeForKids,
              containsSyntheticMedia:
                chOverride.containsSyntheticMedia ??
                defs.containsSyntheticMedia ??
                ytSyntheticMedia,
              notifySubscribers: ytNotifySubscribers,
              embeddable: ytEmbeddable,
              thumbnailAssetId: ytThumbnailAsset?.id || undefined,
              firstComment:
                chOverride.firstComment?.trim() ||
                ytFirstComment.trim() ||
                undefined,
            },
          };
        }

        return {
          accountId: acc.id,
          customCaption:
            chOverride.customCaption?.trim() || igCustomCaption.trim() || null,
          platformOptions: {
            mediaType: igMediaType,
            shareToFeed: igShareToFeed,
            coverAssetId: igCoverAsset?.id || undefined,
            thumbOffsetMs,
            collaborators:
              parsedCollabs.length > 0
                ? parsedCollabs
                : defs.collaborators || undefined,
            userTags: parsedUserTags.length > 0 ? parsedUserTags : undefined,
            audioName: igAudioName.trim() || defs.audioName || undefined,
            locationId: igLocationId.trim() || undefined,
            firstComment:
              chOverride.firstComment?.trim() ||
              igFirstComment.trim() ||
              undefined,
          },
        };
      });

      const scheduledIso =
        mode === "schedule" ? new Date(scheduleAt).toISOString() : null;

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          baseCaption,
          mediaAssetIds: assets.map((a) => a.id),
          targets,
          mode,
          scheduledAt: scheduledIso,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save post");
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Compose Cross-Post
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload media once, configure full YouTube Studio & Instagram settings, and publish across all selected channels.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Target Channels */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          1. Select Target Channels ({selectedAccountIds.length} selected)
        </h2>

        {accounts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No active accounts connected yet. Go to{" "}
            <a href="/accounts" className="font-medium text-indigo-600 underline">
              Accounts
            </a>{" "}
            to connect YouTube or Instagram.
          </p>
        ) : (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {accounts.map((acc) => {
              const selected = selectedAccountIds.includes(acc.id);
              const catId =
                channelOverrides[acc.id]?.categoryId ||
                acc.metadata?.defaults?.categoryId;
              const catLabel = YOUTUBE_CATEGORIES.find(
                (c) => c.id === catId
              )?.label;

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggleAccount(acc.id)}
                  className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition ${
                    selected
                      ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={acc.platform} />
                      <span className="truncate text-sm font-medium text-slate-900">
                        {acc.displayName}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      {acc.username && <span>{acc.username}</span>}
                      {catLabel && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {catLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Media Upload */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          2. Upload Video / Images
        </h2>

        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          ) : (
            <Upload className="h-8 w-8 text-slate-400" />
          )}
          <span className="mt-2 text-sm font-medium text-slate-700">
            {uploading
              ? "Uploading & inspecting with ffprobe..."
              : "Click to upload MP4/MOV video or JPG/PNG images"}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            Up to 250 MB per file. Multiple files create an Instagram Carousel.
          </span>
          <input
            type="file"
            multiple
            accept="video/*,image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void handleFileUpload(e.target.files)}
          />
        </label>

        {assets.length > 0 && (
          <div className="mt-4 space-y-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-3">
                  {asset.mimeType.startsWith("video/") ? (
                    <Film className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-pink-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {asset.filename}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                      {asset.width && asset.height
                        ? ` · ${asset.width}x${asset.height}`
                        : ""}
                      {asset.durationSec
                        ? ` · ${asset.durationSec.toFixed(1)}s`
                        : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAssets((prev) => prev.filter((a) => a.id !== asset.id))
                  }
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {hasLocalhostMediaForIg && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Instagram requires a public HTTPS media URL. Your uploaded asset resolves to{" "}
              <code>{assets[0]?.publicUrl}</code>.
            </span>
          </div>
        )}

        {assets.find((a) => a.mimeType.startsWith("video/")) && (
          <VideoCoverScrubber
            asset={assets.find((a) => a.mimeType.startsWith("video/"))!}
            currentReelOffsetSec={igThumbOffsetSec}
            hasYouTube={hasYouTube}
            hasInstagram={hasInstagram}
            ytIsShort={ytIsShort}
            onSetReelOffsetSec={(sec) => setIgThumbOffsetSec(sec)}
            onCaptureYouTubeThumbnail={async (file) => {
              const uploaded = await uploadSingleFile(file);
              setYtThumbnailAsset(uploaded);
            }}
          />
        )}
      </section>

      {/* 3. Shared Copy & Full Platform Studio Settings */}
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          3. Content & Full Platform Settings
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Video Title {hasYouTube ? "(Required for YouTube)" : "(Optional)"}
          </label>
          <input
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Catchy title for your YouTube video / Short"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Shared Caption / Description
          </label>
          <textarea
            rows={4}
            value={baseCaption}
            onChange={(e) => setBaseCaption(e.target.value)}
            placeholder="Write your main caption, description, and hashtags here..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            {baseCaption.length} characters (Instagram max: 2,200 · YouTube max: 5,000)
          </p>
        </div>

        {/* YouTube Studio Settings */}
        {hasYouTube && (
          <div className="space-y-4 rounded-xl border border-red-100 bg-red-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PlatformBadge platform="YOUTUBE" size="md" />
              <span className="text-xs text-slate-500">
                Full YouTube Studio Metadata & Upload Options
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Visibility
                </label>
                <select
                  value={ytPrivacy}
                  onChange={(e) =>
                    setYtPrivacy(
                      e.target.value as "private" | "unlisted" | "public"
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="private">Private (Testing)</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Category (Fallback if no channel default)
                </label>
                <select
                  value={ytCategoryId}
                  onChange={(e) => setYtCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {YOUTUBE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Video Language
                </label>
                <select
                  value={ytLanguage}
                  onChange={(e) => setYtLanguage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="en">English (en)</option>
                  <option value="hi">Hindi (hi)</option>
                  <option value="ml">Malayalam (ml)</option>
                  <option value="ta">Tamil (ta)</option>
                  <option value="te">Telugu (te)</option>
                  <option value="es">Spanish (es)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={ytTags}
                  onChange={(e) => setYtTags(e.target.value)}
                  placeholder="shorts, viral, tech, mythology"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Add to Playlist ID (optional)
                </label>
                <input
                  type="text"
                  value={ytPlaylistId}
                  onChange={(e) => setYtPlaylistId(e.target.value)}
                  placeholder="PL..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Custom Thumbnail Image (optional .jpg / .png)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>
                      {ytThumbnailAsset
                        ? ytThumbnailAsset.filename
                        : "Upload Thumbnail"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        void handleThumbnailUpload(e.target.files, "youtube")
                      }
                    />
                  </label>
                  {ytThumbnailAsset && (
                    <button
                      type="button"
                      onClick={() => setYtThumbnailAsset(null)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  License
                </label>
                <select
                  value={ytLicense}
                  onChange={(e) =>
                    setYtLicense(
                      e.target.value as "youtube" | "creativeCommon"
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="youtube">Standard YouTube License</option>
                  <option value="creativeCommon">
                    Creative Commons - Attribution
                  </option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ytIsShort}
                  onChange={(e) => setYtIsShort(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>Tag as YouTube Short (#Shorts)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ytSyntheticMedia}
                  onChange={(e) => setYtSyntheticMedia(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>Altered / Synthetic Content (AI disclosure)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ytNotifySubscribers}
                  onChange={(e) => setYtNotifySubscribers(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>Publish to subscriptions feed & notify subscribers</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ytEmbeddable}
                  onChange={(e) => setYtEmbeddable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>Allow embedding</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ytMadeForKids}
                  onChange={(e) => setYtMadeForKids(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>Made for Kids</span>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                value={ytCustomTitle}
                onChange={(e) => setYtCustomTitle(e.target.value)}
                placeholder="Optional YouTube title override"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={ytCustomCaption}
                onChange={(e) => setYtCustomCaption(e.target.value)}
                placeholder="Optional YouTube description override"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={ytFirstComment}
                onChange={(e) => setYtFirstComment(e.target.value)}
                placeholder="Optional auto first comment on YouTube"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>
          </div>
        )}

        {/* Instagram Studio Settings */}
        {hasInstagram && (
          <div className="space-y-4 rounded-xl border border-pink-100 bg-pink-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PlatformBadge platform="INSTAGRAM" size="md" />
              <span className="text-xs text-slate-500">
                Full Instagram Reels & Post Options
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Format
                </label>
                <select
                  value={igMediaType}
                  onChange={(e) =>
                    setIgMediaType(
                      e.target.value as "AUTO" | "REELS" | "IMAGE" | "CAROUSEL"
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="AUTO">Auto-detect from media</option>
                  <option value="REELS">Reels (Video)</option>
                  <option value="IMAGE">Single Image</option>
                  <option value="CAROUSEL">Carousel (2-10 items)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Reel Cover Frame Offset (seconds)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={igThumbOffsetSec}
                  onChange={(e) => setIgThumbOffsetSec(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Or Upload Custom Reel Cover
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>
                      {igCoverAsset ? igCoverAsset.filename : "Upload Cover"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) =>
                        void handleThumbnailUpload(e.target.files, "instagram")
                      }
                    />
                  </label>
                  {igCoverAsset && (
                    <button
                      type="button"
                      onClick={() => setIgCoverAsset(null)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Collaborators (up to 3 @handles)
                </label>
                <input
                  type="text"
                  value={igCollaborators}
                  onChange={(e) => setIgCollaborators(e.target.value)}
                  placeholder="handle1, handle2"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Tag Users (@handles, comma-separated)
                </label>
                <input
                  type="text"
                  value={igUserTags}
                  onChange={(e) => setIgUserTags(e.target.value)}
                  placeholder="user1, user2"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Original Audio Name (Reels)
                </label>
                <input
                  type="text"
                  value={igAudioName}
                  onChange={(e) => setIgAudioName(e.target.value)}
                  placeholder="Original Audio"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={igShareToFeed}
                  onChange={(e) => setIgShareToFeed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>Share Reel to main profile grid</span>
              </label>

              <input
                type="text"
                value={igLocationId}
                onChange={(e) => setIgLocationId(e.target.value)}
                placeholder="Optional Meta Location Page ID"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={igCustomCaption}
                onChange={(e) => setIgCustomCaption(e.target.value)}
                placeholder="Optional Instagram-only caption override"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={igFirstComment}
                onChange={(e) => setIgFirstComment(e.target.value)}
                placeholder="Optional auto first comment (e.g. extra hashtags)"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>
          </div>
        )}

        {/* Per-Channel Overrides Accordion */}
        {selectedAccounts.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <button
              type="button"
              onClick={() => setShowPerChannel((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-800"
            >
              <span className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600" />
                <span>
                  Per-Channel Customizations ({selectedAccounts.length} channels)
                </span>
              </span>
              {showPerChannel ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>

            {showPerChannel && (
              <div className="mt-4 space-y-3">
                {selectedAccounts.map((acc) => {
                  const ov = channelOverrides[acc.id] ?? {};
                  return (
                    <div
                      key={acc.id}
                      className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={acc.platform} />
                          <span className="text-sm font-semibold text-slate-900">
                            {acc.displayName}
                          </span>
                          {acc.username && (
                            <span className="text-xs text-slate-500">
                              {acc.username}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {acc.platform === "YOUTUBE" && (
                          <>
                            <input
                              type="text"
                              value={ov.customTitle || ""}
                              onChange={(e) =>
                                updateChannelOverride(acc.id, {
                                  customTitle: e.target.value,
                                })
                              }
                              placeholder={`Title override for ${acc.displayName}`}
                              className="rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                            />
                            <select
                              value={ov.categoryId || ytCategoryId}
                              onChange={(e) =>
                                updateChannelOverride(acc.id, {
                                  categoryId: e.target.value,
                                })
                              }
                              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                            >
                              {YOUTUBE_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                  Category: {c.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={ov.tags || ""}
                              onChange={(e) =>
                                updateChannelOverride(acc.id, {
                                  tags: e.target.value,
                                })
                              }
                              placeholder="Channel-specific tags"
                              className="rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                            />
                          </>
                        )}

                        <input
                          type="text"
                          value={ov.customCaption || ""}
                          onChange={(e) =>
                            updateChannelOverride(acc.id, {
                              customCaption: e.target.value,
                            })
                          }
                          placeholder={`Caption override for ${acc.displayName}`}
                          className="rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                        />

                        <input
                          type="text"
                          value={ov.firstComment || ""}
                          onChange={(e) =>
                            updateChannelOverride(acc.id, {
                              firstComment: e.target.value,
                            })
                          }
                          placeholder={`First comment for ${acc.displayName}`}
                          className="rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                        />

                        {acc.platform === "YOUTUBE" && (
                          <label className="flex items-center gap-1.5 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={
                                ov.containsSyntheticMedia ?? ytSyntheticMedia
                              }
                              onChange={(e) =>
                                updateChannelOverride(acc.id, {
                                  containsSyntheticMedia: e.target.checked,
                                })
                              }
                            />
                            <span>Altered / AI Content Disclosure</span>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Schedule & Actions */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-500" />
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Schedule Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="mt-0.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitPost("draft")}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitPost("now")}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>Post Now</span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitPost("schedule")}
            className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:col-span-1"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Schedule Post</span>
          </button>
        </div>
      </section>
    </div>
  );
}
