import { put } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/firebase/server-auth";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "File type not supported" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
  }

  const blob = await put(`uploads/${userId}/${file.name}`, file, {
    access: "public",
  });

  return Response.json({
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type,
  });
}
