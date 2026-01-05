import { handleUpload } from "@vercel/blob/client";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const jsonResponse = await handleUpload({
      request: req,
      body: req.body,

      onBeforeGenerateToken: async (pathname) => {
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
          // 310sn 16kHz mono WAV ~ 10MB civarı
          maximumSizeInBytes: 15 * 1024 * 1024,
        };
      },

      onUploadCompleted: async ({ blob }) => {
        // Burada istersen logla / db’ye yaz
        console.log("Upload completed:", blob.pathname);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e?.message || "Upload failed" });
  }
}
