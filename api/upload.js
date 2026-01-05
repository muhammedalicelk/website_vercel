import { handleUpload } from "@vercel/blob/client";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    const jsonResponse = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "audio/wav",
            "audio/mpeg",
            "audio/aac",
            "audio/mp4",
            "audio/x-m4a",
            "audio/ogg",
            "audio/webm",
          ],
          maximumSizeInBytes: 20 * 1024 * 1024,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Upload completed:", blob.pathname);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (e) {
    console.error("UPLOAD TOKEN ERROR:", e);
    return res.status(400).json({ error: e?.message || String(e) });
  }
}
