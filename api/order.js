export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ ok: false, error: 'Env missing' });
    }

    const d = req.body || {};

    const fmt = (sec) => {
      const s = Math.max(0, Math.floor(Number(sec) || 0));
      const m = Math.floor(s / 60);
      const r = s % 60;
      return `${m}:${String(r).padStart(2, '0')}`;
    };

    // Debug (Vercel logs’ta görürsün)
    console.log('ORDER_INTERNET_FIELDS', {
      activeTab: d.activeTab,
      ytDurationSec: d.ytDurationSec,
      ytStartSec: d.ytStartSec,
      ytEndSec: d.ytEndSec,
      youtubeLink: d.youtubeLink,
    });

    // ✅ Çoklu hazır klipleri Telegram'a yaz
    let hazirText = '';
    if (d.activeTab === 'hazir') {
      const clips = Array.isArray(d.hazirClips) ? d.hazirClips : [];

      if (clips.length > 0) {
        const lines = clips.map((c, i) => {
          const start = Number(c.start) || 0;
          const end = Number(c.end) || 0;
          const dur = Math.max(0, end - start);
          return `${i + 1}) ${c.title || '-'}  (${fmt(start)}–${fmt(end)} | ${fmt(dur)})`;
        });

        const total = clips.reduce((sum, c) => {
          const start = Number(c.start) || 0;
          const end = Number(c.end) || 0;
          return sum + Math.max(0, end - start);
        }, 0);

        hazirText =
          `\n\n🎶 Hazır Seçimler:\n` +
          lines.join('\n') +
          `\n\n⏱️ Toplam: ${fmt(total)}`;
      } else {
        hazirText = `\n\n⚠️ Hazır seçim bulunamadı (hazirClips boş).`;
      }
    }

    // ✅ 16k WAV upload sonuçlarını Telegram'a yaz
    let files16kText = '';
    if (Array.isArray(d.uploaded16k) && d.uploaded16k.length > 0) {
      const lines = d.uploaded16k.map((f, i) => {
        const name = f.originalName || f.title || '-';
        const s = f.trimStart ?? 0;
        const e = f.trimEnd ?? 0;
        return `${i + 1}) ${name} (${fmt(s)}–${fmt(e)})\n${f.blobUrl || f.blobPath || '-'}`;
      });
      files16kText = `\n\n🎛️ 16 kHz WAV (Blob):\n` + lines.join('\n\n');
    }

    // ✅ YouTube (internet tab) detayları (default yok!)
    let ytText = '';
    if (d.activeTab === 'internet') {
      const dur = Number(d.ytDurationSec) || 0;
      const s = Number(d.ytStartSec);
      const e = Number(d.ytEndSec);

      ytText += `\n\n🌐 YouTube:\n🔗 ${d.youtubeLink || '-'}`;
      ytText += `\n⏱️ Video Süresi: ${dur > 0 ? fmt(dur) : '-'}`;

      if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
        ytText += `\n✂️ Seçim: ${fmt(s)}–${fmt(e)} | ${fmt(e - s)}`;
      } else {
        ytText += `\n✂️ Seçim: belirtilmedi`;
      }
    }

    const text = `
🧸 Memory Drop Studio – Yeni Ön Sipariş

👤 Ad Soyad: ${d.musteriAdi || '-'}
📞 Telefon: ${d.telefon || '-'}
🎵 Sekme: ${d.activeTab || '-'}
🆔 OrderId: ${d.orderId || '-'}${hazirText}${files16kText}${ytText}

${d.yukluDosyaAdlari?.length ? `\n📁 Orijinal Dosyalar: ${d.yukluDosyaAdlari.join(', ')}` : ''}
    `.trim();

    const tg = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
    });

    const result = await tg.json();

    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.description || 'Telegram error' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
