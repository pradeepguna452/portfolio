"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionShell } from "@/components/SectionShell";
import { supabase } from "@/lib/supabase/client";

type DocRow = {
  id: string;
  title: string;
  tags: string[];
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export default function DocumentsPage() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<DocRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parsedTags = useMemo(() => {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
  }, [tags]);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error: e } = await supabase
      .from("documents")
      .select(
        "id,title,tags,storage_bucket,storage_path,mime_type,size_bytes,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (e) setError(e.message);
    setRows((data ?? []) as DocRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setLoading(true);
      const { data, error: e } = await supabase
        .from("documents")
        .select(
          "id,title,tags,storage_bucket,storage_path,mime_type,size_bytes,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (e) setError(e.message);
      setRows((data ?? []) as DocRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!file) throw new Error("Choose a file");

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const bucket = "documents";
      const safeName = file.name.replaceAll(/[^\w.\-]+/g, "_");
      const path = `${userId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { error: insertErr } = await supabase.from("documents").insert({
        user_id: userId,
        title: title.trim() ? title.trim() : file.name,
        tags: parsedTags,
        storage_bucket: bucket,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size ?? null,
      });
      if (insertErr) throw insertErr;

      setTitle("");
      setTags("");
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function openDoc(doc: DocRow) {
    setBusy(true);
    setError(null);
    try {
      const { data, error: e } = await supabase.storage
        .from(doc.storage_bucket)
        .createSignedUrl(doc.storage_path, 60);
      if (e) throw e;
      if (!data?.signedUrl) throw new Error("Could not create download link");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open file");
    } finally {
      setBusy(false);
    }
  }

  async function remove(doc: DocRow) {
    setBusy(true);
    setError(null);
    try {
      const { error: delRowErr } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);
      if (delRowErr) throw delRowErr;

      // Best-effort: delete file from storage too.
      await supabase.storage.from(doc.storage_bucket).remove([doc.storage_path]);
      setRows((prev) => prev.filter((r) => r.id !== doc.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionShell
      title="Important documents"
      description="Uploads go to Supabase Storage bucket “documents”."
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
        Before using this page: create a Supabase Storage bucket named{" "}
        <span className="font-semibold">documents</span> and enable RLS/policies
        to allow only your user to access their own files.
      </div>

      <form onSubmit={upload} className="mt-4 grid gap-3 sm:grid-cols-6 sm:items-end">
        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Title</div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Passport scan"
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Tags (comma separated)
          </div>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="id, travel, 2026"
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">File</div>
          <input
            type="file"
            className="block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>

        <div className="flex gap-2 sm:col-span-6">
          <button
            type="submit"
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            Upload
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
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-12 bg-slate-50/50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:bg-slate-800/50 dark:text-slate-400">
          <div className="col-span-5">Title</div>
          <div className="col-span-4">Tags</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">No documents yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <div className="col-span-5 min-w-0">
                  <div className="truncate text-sm text-slate-900 dark:text-white">{r.title}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="col-span-4 min-w-0">
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {r.tags?.length ? r.tags.join(", ") : "—"}
                  </div>
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  <button
                    onClick={() => openDoc(r)}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => remove(r)}
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
    </SectionShell>
  );
}

