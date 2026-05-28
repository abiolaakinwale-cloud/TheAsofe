"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { getBrowserSupabase } from "@/lib/supabase/client";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

type Props = {
  brand: string;
  productSlug?: string;
  defaultImages?: string[];
};

export default function ImageUploader({ brand, productSlug, defaultImages = [] }: Props) {
  const [images, setImages] = useState<string[]>(defaultImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const sb = getBrowserSupabase();
      const folder = productSlug?.trim() || "drafts";
      const next: string[] = [];

      for (const file of Array.from(files)) {
        if (!ACCEPTED.includes(file.type)) {
          throw new Error(`${file.name}: must be JPEG, PNG, WebP, or AVIF.`);
        }
        if (file.size > MAX_BYTES) {
          throw new Error(`${file.name}: max 8MB.`);
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${brand}/${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await sb.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw new Error(`${file.name}: ${upErr.message}`);
        const { data } = sb.storage.from("product-images").getPublicUrl(path);
        next.push(data.publicUrl);
      }

      startTransition(() => setImages(prev => [...prev, ...next]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(url: string) {
    setImages(prev => prev.filter(u => u !== url));
    // Best-effort delete from Storage. If the URL doesn't belong to this brand,
    // RLS will reject; that's fine — we silently leave the orphan.
    const marker = "/product-images/";
    const i = url.indexOf(marker);
    if (i === -1) return;
    const path = url.slice(i + marker.length);
    const sb = getBrowserSupabase();
    await sb.storage.from("product-images").remove([path]);
  }

  function move(index: number, delta: -1 | 1) {
    setImages(prev => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="lg:col-span-2">
      <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
        Images
      </span>

      {/* Hidden textarea keeps the existing server-action contract (newline list). */}
      <textarea name="images" value={images.join("\n")} readOnly hidden />

      {images.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
          {images.map((url, i) => (
            <li
              key={url}
              className="relative aspect-[3/4] overflow-hidden group"
              style={{ backgroundColor: "var(--color-cream)" }}
            >
              <Image src={url} alt="" fill sizes="160px" className="object-cover" />
              {i === 0 && (
                <span
                  className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] tracking-[0.18em] uppercase"
                  style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
                >
                  Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between items-center px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(26,24,21,0.75)" }}>
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-[var(--color-ground)] text-xs disabled:opacity-30" aria-label="Move left">‹</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="text-[var(--color-ground)] text-xs disabled:opacity-30" aria-label="Move right">›</button>
                </div>
                <button type="button" onClick={() => remove(url)} className="text-[var(--color-ground)] text-[10px] tracking-[0.12em] uppercase" aria-label="Remove">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="px-5 py-2.5 text-[11px] tracking-[0.18em] uppercase border disabled:opacity-50"
          style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
        >
          {uploading ? "Uploading…" : images.length === 0 ? "Upload images" : "Add more"}
        </button>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          JPEG · PNG · WebP · AVIF — up to 8MB each. First image is the cover.
        </span>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        hidden
        onChange={e => handleFiles(e.target.files)}
      />

      {error && (
        <p className="mt-3 text-xs" style={{ color: "var(--color-oxblood)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
