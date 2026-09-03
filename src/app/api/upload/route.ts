//src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { auth } from "@/server/modules/auth/auth.config";
import { generateKey, getPresignedUploadUrl } from "@/lib/r2";

const limits = {
  image: 10 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  document: 25 * 1024 * 1024,
} as const;

type UploadKind = keyof typeof limits;

type UploadRequest = {
  fileName: string;
  contentType: string;
  fileSize: number;
  kind: UploadKind;
};

function isUploadRequest(value: unknown): value is UploadRequest {
  if (typeof value !== "object" || value === null) return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.fileName === "string" &&
    input.fileName.length > 0 &&
    input.fileName.length <= 255 &&
    typeof input.contentType === "string" &&
    input.contentType.length <= 200 &&
    typeof input.fileSize === "number" &&
    Number.isSafeInteger(input.fileSize) &&
    input.fileSize > 0 &&
    (input.kind === "image" || input.kind === "video" || input.kind === "document")
  );
}

function isAllowedType(kind: UploadKind, contentType: string): boolean {
  if (kind === "image") return contentType.startsWith("image/");
  if (kind === "video") return contentType.startsWith("video/");
  return (
    contentType === "application/pdf" ||
    contentType === "text/plain" ||
    contentType === "application/zip" ||
    contentType.startsWith("application/vnd.openxmlformats-officedocument.")
  );
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const body: unknown = await request.json();
    if (!isUploadRequest(body)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid upload request" });
    }
    if (!isAllowedType(body.kind, body.contentType)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "File type is not allowed" });
    }
    if (body.fileSize > limits[body.kind]) {
      throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File exceeds the allowed size" });
    }

    const key = generateKey(session.user.id, `courses/${body.kind}`, body.fileName);
    const uploadUrl = await getPresignedUploadUrl(key, body.contentType, body.fileSize);

    // Generate public URL
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : null;

    return NextResponse.json({
      key,
      uploadUrl,
      publicUrl,
    });
  } catch (error: unknown) {
    if (error instanceof TRPCError) {
      const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Upload URL generation failed:", error);
    return NextResponse.json({ error: "Unable to prepare upload" }, { status: 500 });
  }
}