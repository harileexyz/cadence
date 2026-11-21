"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

interface ApiKeyDTO {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function DeveloperApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://cadence-urn7.onrender.com";

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/user/api-keys");
      if (res.ok) {
        const data = (await res.json()) as { keys: ApiKeyDTO[] };
        setKeys(data.keys);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    setRevealedKey(null);
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = (await res.json()) as {
        rawKey?: string;
        error?: string;
      };
      if (!res.ok || !data.rawKey) {
        throw new Error(data.error || "Failed to create API key");
      }
      setRevealedKey(data.rawKey);
      setNewName("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/user/api-keys/${id}`, { method: "DELETE" });
    await loadKeys();
  }

  function copyKey(val: string) {
    void navigator.clipboard?.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const curlSnippet = `curl -X POST ${origin}/api/v1/drafts \\
  -H "Authorization: Bearer ${revealedKey || "cad_live_YOUR_API_KEY"}" \\
  -F "file=@./final-short.mp4" \\
  -F "title=Why Jatayu Fought Ravana #shorts" \\
  -F "caption=Full story in 45 seconds! #MythLantern" \\
  -F "channels=@mythlanterntales" \\
  -F "status=DRAFT"`;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Developer API Keys (Draft Upload API)
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Push finished MP4s + metadata straight from your local scripts or AI studio pipelines into Cadence as Drafts for 1-click review and publish.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {revealedKey && (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
          <p className="text-xs font-semibold text-emerald-900">
            API Key Created — copy it now (shown only once):
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-900 ring-1 ring-emerald-200">
              {revealedKey}
            </code>
            <button
              type="button"
              onClick={() => copyKey(revealedKey)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Key name (e.g. Myth Lantern Studio, Clips Pipeline)"
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <span>Generate API Key</span>
        </button>
      </form>

      {/* Active Keys List */}
      {loading ? (
        <div className="py-4 text-center text-xs text-slate-400">
          Loading API keys...
        </div>
      ) : keys.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-xs text-slate-500">
          No API keys generated yet. Create one above to connect your local scripts.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate text-xs font-semibold text-slate-900">
                    {k.name}
                  </span>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                    {k.keyPrefix}…
                  </code>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt
                    ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                    : " · Never used"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRevoke(k.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Revoke</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick Usage Snippet */}
      <div className="rounded-xl bg-slate-900 p-3.5 text-slate-100">
        <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Quick Upload Draft Example (`POST /api/v1/drafts`)</span>
          <span>Also supports `GET /api/v1/channels`</span>
        </div>
        <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-indigo-200">
          {curlSnippet}
        </pre>
      </div>
    </section>
  );
}
