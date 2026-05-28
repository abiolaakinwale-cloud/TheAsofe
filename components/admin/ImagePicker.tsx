"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

type Props = {
  /** Form field name (e.g. "hero.image" or "hero_image"). */
  name: string;
  label: string;
  /** Path prefix inside the `site-images` bucket (e.g. "cms/hero", "brands"). */
  folder: string;
  defaultValue?: string;
  full?: boolean;
};

export default function ImagePicker({ name, label, folder, defaultValue = "", full }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Must be JPEG, PNG, WebP, or AVIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Max 8MB.");
      return;
    }

    setUploading(true);
    try {
      const sb = getBrowserSupabase();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("site-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      const { data } = sb.storage.from("site-images").getPublicUrl(path);
      setValue(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <label className={full ? "block lg:col-span-2" : "block"}>
      <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
        {label}
      </span>

      <div className="flex gap-4 items-start">
        <div
          className="relative w-24 h-24 flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: "var(--color-cream)", boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
        >
          {value && (
            <Image src={value} alt="" fill sizes="96px" className="object-cover" unoptimized />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            name={name}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Paste a URL or use Upload"
            className="w-full bg-transparent border-b py-2 text-sm font-mono outline-none focus:border-[var(--color-ink)]"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="px-4 py-1.5 text-[10px] tracking-[0.18em] uppercase border disabled:opacity-50"
              style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
            >
              {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => setValue("")}
                className="text-[10px] tracking-[0.18em] uppercase lux-link"
                style={{ color: "var(--color-oxblood)" }}
              >
                Clear
              </button>
            )}
            <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
              JPEG · PNG · WebP · AVIF · up to 8MB
            </span>
          </div>
          {error && (
            <p className="text-xs" style={{ color: "var(--color-oxblood)" }}>{error}</p>
          )}
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED.join(",")}
        hidden
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </label>
  );
}
