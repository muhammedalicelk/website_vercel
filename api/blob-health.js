export default function handler(req, res) {
  const has = !!process.env.BLOB_READ_WRITE_TOKEN;
  res.status(200).json({
    ok: true,
    hasBlobToken: has,
    // token'ın kendisini asla yazdırmıyoruz
  });
}