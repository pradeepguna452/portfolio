"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionShell } from "@/components/SectionShell";
import { supabase } from "@/lib/supabase/client";
import { decryptSecret, encryptSecret } from "@/lib/crypto/vault";

type VaultRow = {
  id: string;
  label: string;
  username: string | null;
  salt_b64: string;
  iv_b64: string;
  ciphertext_b64: string;
  created_at: string;
};

export default function VaultPage() {
  const [passphrase, setPassphrase] = useState("");
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [secretJson, setSecretJson] = useState(
    JSON.stringify({ password: "", note: "" }, null, 2),
  );

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<VaultRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("vault_secrets")
      .select(
        "id,label,username,salt_b64,iv_b64,ciphertext_b64,created_at",
      )
      .order("created_at", { ascending: false });
    if (e) setError(e.message);
    setRows((data ?? []) as VaultRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setLoading(true);
      const { data, error: e } = await supabase
        .from("vault_secrets")
        .select(
          "id,label,username,salt_b64,iv_b64,ciphertext_b64,created_at",
        )
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (e) setError(e.message);
      setRows((data ?? []) as VaultRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!passphrase.trim()) throw new Error("Enter a vault passphrase");

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      // Validate JSON early so we don't store junk.
      JSON.parse(secretJson);

      const enc = await encryptSecret({
        passphrase,
        plaintext: secretJson,
      });

      const { error: insertErr } = await supabase.from("vault_secrets").insert({
        user_id: userId,
        label,
        username: username.trim() ? username.trim() : null,
        ...enc,
      });
      if (insertErr) throw insertErr;

      setLabel("");
      setUsername("");
      setSecretJson(JSON.stringify({ password: "", note: "" }, null, 2));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add secret");
    } finally {
      setBusy(false);
    }
  }

  async function reveal(row: VaultRow) {
    setBusy(true);
    setError(null);
    setDecrypted(null);
    try {
      if (!passphrase.trim()) throw new Error("Enter your vault passphrase");
      const plaintext = await decryptSecret({
        passphrase,
        salt_b64: row.salt_b64,
        iv_b64: row.iv_b64,
        ciphertext_b64: row.ciphertext_b64,
      });
      setSelectedId(row.id);
      setDecrypted(plaintext);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to decrypt (wrong passphrase?)",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("vault_secrets").delete().eq("id", id);
      if (e) throw e;
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setDecrypted(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionShell
      title="Keys / passwords"
      description="Encrypted in your browser; database stores only ciphertext."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50 p-3 text-xs text-slate-700 dark:text-slate-300">
        Important: your passphrase is never stored. If you forget it, the data
        cannot be recovered.
      </div>

      <label className="mt-4 block space-y-1">
        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Vault passphrase</div>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
          placeholder="Your master passphrase"
        />
      </label>

      <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-6 sm:items-end">
        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Label</div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Gmail"
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Username (optional)
          </div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@gmail.com"
          />
        </label>

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            Add encrypted secret
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => load()}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>

        <label className="block space-y-1 sm:col-span-6">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Secret JSON (encrypted)
          </div>
          <textarea
            className="min-h-32 w-full resize-y rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={secretJson}
            onChange={(e) => setSecretJson(e.target.value)}
          />
        </label>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-12 bg-slate-50/50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:bg-slate-800/50 dark:text-slate-400">
            <div className="col-span-7">Label</div>
            <div className="col-span-5 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">No secrets yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {rows.map((r) => (
                <li key={r.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <div className="col-span-7 min-w-0">
                    <div className="truncate text-sm text-slate-900 dark:text-white">{r.label}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {r.username ?? "—"}
                    </div>
                  </div>
                  <div className="col-span-5 flex justify-end gap-2">
                    <button
                      onClick={() => reveal(r)}
                      disabled={busy}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Reveal
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={busy}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-3">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Decrypted preview
          </div>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50 p-3">
            {selected ? (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <div className="font-medium text-slate-900 dark:text-white">{selected.label}</div>
                <div>{selected.username ?? "—"}</div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">Select “Reveal”.</div>
            )}
            <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-slate-900 dark:text-white">
              {decrypted ?? ""}
            </pre>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

