"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ImagePlus, Loader2, X } from "lucide-react";
import { PHOTO_MAX_BYTES, PHOTO_MAX_MB, PHOTO_MIME_TYPES } from "@/lib/photo";
import { toast } from "@/stores/toast";

/**
 * Venue photo picker. With Blob configured the file goes straight from the browser to
 * Blob storage and we keep only the returned URL; without it, the owner pastes an image
 * URL — the same field this replaced. Either way the form reads one input named `photo`,
 * so the submit handler doesn't care which mode is live.
 */
export function PhotoField({ blobEnabled }: { blobEnabled: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  if (!blobEnabled) {
    return (
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Foto (URL)</span>
        <input
          name="photo"
          type="url"
          placeholder="https://…"
          className="input w-full"
        />
      </label>
    );
  }

  async function onPick(file: File) {
    if (!PHOTO_MIME_TYPES.includes(file.type)) {
      toast("Format harus JPG, PNG, WebP, atau AVIF.");
      return;
    }
    // Blob rejects an oversized file too, but only after uploading it — checking here
    // saves the owner from watching a doomed upload run to completion.
    if (file.size > PHOTO_MAX_BYTES) {
      toast(`Ukuran maksimal ${PHOTO_MAX_MB} MB.`);
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setUrl(blob.url);
      toast("Foto terunggah.");
    } catch {
      toast("Upload gagal. Coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-semibold">Foto Venue</span>

      {/* What the form actually submits. */}
      <input type="hidden" name="photo" value={url} />

      <input
        ref={fileRef}
        type="file"
        accept={PHOTO_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onPick(file);
        }}
      />

      {url ? (
        <div className="relative h-32 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Foto venue" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              setUrl("");
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/80"
            aria-label="Hapus foto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-60 dark:border-white/10 dark:text-gray-400"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Mengunggah…
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              Pilih foto (maks {PHOTO_MAX_MB} MB)
            </>
          )}
        </button>
      )}
    </div>
  );
}
