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
      const s = Math.max(0, Number(sec) || 0);
      const m = Math.floor(s / 60);
      const r = Math.floor(s % 60);
      return `${m}:${String(r).padStart(2, '0')}`;
    };

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
          `\n🎶 Hazır Seçimler:\n` +
          lines.join('\n') +
          `\n\n⏱️ Toplam: ${fmt(total)}`;
      } else {
        hazirText = `\n⚠️ Hazır seçim bulunamadı (hazirClips boş).`;
      }
    }

    const text = `
🧸 Memory Drop Studio – Yeni Ön Sipariş

👤 Ad Soyad: ${d.musteriAdi || '-'}
📞 Telefon: ${d.telefon || '-'}
🎵 Sekme: ${d.activeTab || '-'}${hazirText}

${d.youtubeLink ? `\n🔗 YouTube: ${d.youtubeLink}` : ''}
${d.yukluDosyaAdlari?.length ? `\n📁 Dosyalar: ${d.yukluDosyaAdlari.join(', ')}` : ''}
    `.trim();

    const tg = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
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
