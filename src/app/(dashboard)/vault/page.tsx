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
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
        Important: your passphrase is never stored. If you forget it, the data
        cannot be recovered.
      </div>

      <label className="mt-4 block space-y-1">
        <div className="text-xs font-medium text-zinc-700">Vault passphrase</div>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
          placeholder="Your master passphrase"
        />
      </label>

      <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-6 sm:items-end">
        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-zinc-700">Label</div>
          <input
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Gmail"
            required
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-zinc-700">
            Username (optional)
          </div>
          <input
            className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@gmail.com"
          />
        </label>

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="h-10 flex-1 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Add encrypted secret
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => load()}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <label className="block space-y-1 sm:col-span-6">
          <div className="text-xs font-medium text-zinc-700">
            Secret JSON (encrypted)
          </div>
          <textarea
            className="min-h-32 w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-zinc-400"
            value={secretJson}
            onChange={(e) => setSecretJson(e.target.value)}
          />
        </label>
      </form>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div className="grid grid-cols-12 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
            <div className="col-span-7">Label</div>
            <div className="col-span-5 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="px-3 py-3 text-sm text-zinc-600">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-3 py-3 text-sm text-zinc-600">No secrets yet.</div>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {rows.map((r) => (
                <li key={r.id} className="grid grid-cols-12 items-center px-3 py-2">
                  <div className="col-span-7 min-w-0">
                    <div className="truncate text-sm text-zinc-900">{r.label}</div>
                    <div className="truncate text-xs text-zinc-500">
                      {r.username ?? "—"}
                    </div>
                  </div>
                  <div className="col-span-5 flex justify-end gap-2">
                    <button
                      onClick={() => reveal(r)}
                      disabled={busy}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Reveal
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={busy}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs font-medium text-zinc-700">
            Decrypted preview
          </div>
          <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            {selected ? (
              <div className="text-xs text-zinc-600">
                <div className="font-medium text-zinc-900">{selected.label}</div>
                <div>{selected.username ?? "—"}</div>
              </div>
            ) : (
              <div className="text-xs text-zinc-600">Select “Reveal”.</div>
            )}
            <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-zinc-900">
              {decrypted ?? ""}
            </pre>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

