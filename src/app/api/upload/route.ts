import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireUser } from "@/lib/auth";
import { requireActiveSubscription } from "@/lib/subscription";
import { isBlobConfigured } from "@/lib/env";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/lib/photo";
import { apiError } from "@/lib/utils";

/**
 * Mints a short-lived Vercel Blob upload token so the browser can PUT the file straight
 * to Blob storage — the bytes never pass through this function, which keeps us clear of
 * the 4.5 MB request-body limit.
 *
 * The token is the only thing standing between a stranger and our storage bill, so it is
 * minted only for a logged-in venue owner with a live subscription, and it is scoped to
 * image types under PHOTO_MAX_BYTES. Blob enforces both of those at upload time, not just
 * us here.
 */
export async function POST(req: NextRequest) {
  if (!isBlobConfigured) {
    return NextResponse.json(
      { error: "Upload foto belum aktif. Tempel URL gambar untuk sementara." },
      { status: 501 },
    );
  }

  try {
    const body = (await req.json()) as HandleUploadBody;

    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const user = await requireUser("venue_owner");
        await requireActiveSubscription(user.id);

        return {
          allowedContentTypes: PHOTO_MIME_TYPES,
          maximumSizeInBytes: PHOTO_MAX_BYTES,
          // Two owners uploading "court.jpg" must not overwrite each other.
          addRandomSuffix: true,
          tokenPayload: user.id,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.info(`[blob] owner=${tokenPayload} mengunggah ${blob.url}`);
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
