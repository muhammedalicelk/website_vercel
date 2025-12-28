import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Music, Upload, Globe, User, Play, Pause, X, AlertCircle } from 'lucide-react';

/* =========================================================
   YT + SONGS
   ========================================================= */
function YT(title, youtubeId, extra = {}) {
  return {
    id: `yt_${youtubeId}`,
    title,
    type: 'youtube',
    youtubeId,
    tags: extra.tags || [],
  };
}

const SONGS = [
  /* =====================
     ÇOCUK
     ===================== */
  YT('Kukuli – Bakkal Amca', 't8moJLzPhoU', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Dandini Dandini Dastana', '4NBBFSqv_GY', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Otobüsün Tekerleği Dönüyor', 'W-nWnHmC4Gc', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Arı Vız Vız', '9xOIKkvTOdE', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Ayı', 'QSGubfzxIa0', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Gezegenler', 'rGGZnh8W7Oo', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Twinkle Twinkle Little Star', 'yCjJyiqpAuU', { tags: ['Çocuk', 'İngilizce'] }),

  /* =====================
     TÜRKÇE ROMANTİK
     ===================== */
  YT('Sen Benim Şarkılarımsın', '9GEXm1k3a1E', { tags: ['Romantik', 'Türkçe'] }),
  YT('Senden Daha Güzel', '3bfkyXtuIXk', { tags: ['Romantik', 'Türkçe'] }),
  YT('Ben Bir Tek Kadın (Adam) Sevdim', '0Dps6y-Y-ko', { tags: ['Romantik', 'Türkçe'] }),
  YT('Ben Sana Mecburum', 'GzDGB70IVCM', { tags: ['Romantik', 'Türkçe'] }),
  YT('Aşk', 'CGNcI0Fsl9c', { tags: ['Romantik', 'Türkçe'] }),

  /* =====================
     R&B
     ===================== */
  YT("What You Won't Do For Love", 'n9DmdAwUbxc', { tags: ['R&B', 'İngilizce'] }),

  /* =====================
     ROMANTİK – İSPANYOLCA
     ===================== */
  YT('La Mentira', 'P8BLkulZGX8', { tags: ['Romantik', 'İspanyolca'] }),
  YT('Love In Portofino', 'AKDLoUSaPV8', { tags: ['Romantik', 'İspanyolca'] }),
  YT('Bésame Mucho', 'M4z6xdu1iX8', { tags: ['Romantik', 'İspanyolca'] }),
  YT('Historia de un Amor', 'HzjE33U_gy8', { tags: ['Romantik', 'İspanyolca'] }),

  /* =====================
     ROMANTİK – İNGİLİZCE
     ===================== */
  YT('Dance Me to the End of Love', '8StKOyYY3Gs', { tags: ['Romantik', 'İngilizce'] }),
  YT('I Love You Baby', 'AiIBKcd4m5Q', { tags: ['Romantik', 'İngilizce'] }),
  YT('And I Love You So', 'SKp1HKM_4TY', { tags: ['Romantik', 'İngilizce'] }),
];

/* =========================================================
   Utils
   ========================================================= */
function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function extractYouTubeId(input) {
  if (!input) return '';
  const raw = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  let url;
  try {
    url = new URL(raw);
  } catch {
    const vMatch = raw.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (vMatch) return vMatch[1];
    const shortMatch = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    const shortsMatch = raw.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    const embedMatch = raw.match(/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    return '';
  }

  const host = (url.hostname || '').replace('www.', '');
  const v = url.searchParams.get('v');
  if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] || '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
  }

  if (url.pathname.includes('/shorts/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('shorts');
    const id = idx >= 0 ? parts[idx + 1] : '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
  }

  if (url.pathname.includes('/embed/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('embed');
    const id = idx >= 0 ? parts[idx + 1] : '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
  }

  if (host.endsWith('youtube.com') || host.endsWith('music.youtube.com')) {
    const m1 = url.pathname.match(/\/(v|embed)\/([a-zA-Z0-9_-]{11})/);
    if (m1) return m1[2];
  }

  return '';
}
async function fileTo16kWavBlob(
  file,
  trimStart,
  trimEnd,
  targetSampleRate = 16000
) {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);

  const startSample = Math.floor(trimStart * decoded.sampleRate);
  const endSample = Math.floor(trimEnd * decoded.sampleRate);
  const frameCount = Math.max(1, endSample - startSample);

  // mono buffer (oyuncak için ideal)
  const mono = audioCtx.createBuffer(1, frameCount, decoded.sampleRate);
  const out = mono.getChannelData(0);

  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const data = decoded.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      out[i] += data[startSample + i] / decoded.numberOfChannels;
    }
  }

  // resample
  const offline = new OfflineAudioContext(
    1,
    Math.ceil((frameCount / decoded.sampleRate) * targetSampleRate),
    targetSampleRate
  );

  const src = offline.createBufferSource();
  src.buffer = mono;
  src.connect(offline.destination);
  src.start(0);

  const rendered = await offline.startRendering();
  audioCtx.close?.();

  return audioBufferToWavBlob(rendered);
}
function audioBufferToWavBlob(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;

  const length = buffer.length * numChannels;
  const interleaved = new Float32Array(length);

  for (let ch = 0; ch < numChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < buffer.length; i++) {
      interleaved[i * numChannels + ch] = data[i];
    }
  }

  const pcm = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    let s = Math.max(-1, Math.min(1, interleaved[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length * bytesPerSample;

  const view = new DataView(new ArrayBuffer(44 + dataSize));
  let offset = 0;

  const writeString = (s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    offset += s.length;
  };

  writeString('RIFF');
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2; // PCM
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bitDepth, true); offset += 2;
  writeString('data');
  view.setUint32(offset, dataSize, true); offset += 4;

  for (let i = 0; i < pcm.length; i++, offset += 2) {
    view.setInt16(offset, pcm[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

const NOTICE_TEXT = `Bu sayfa seri üretim öncesi deneme üretimi kapsamında oluşturulmuştur.
Ürünler sınırlı sayıda hazırlanmakta olup, ticari satış kapsamında değildir.
Amaç kullanıcı geri bildirimi ve ürün geliştirmedir. Fatura düzenlenmemektedir.
Katılım bedeli ve kargo daha sonraki aşamada paylaşılacaktır.`;

export default function SesliOyuncakSiparis() {
   const [hazirToyOk, setHazirToyOk] = useState(null); 
  const [activeTab, setActiveTab] = useState('hazir');
 const [ytDurationSec, setYtDurationSec] = useState(null);
const [formData, setFormData] = useState({
  musteriAdi: '',
  telefon: '',
  hazirMuzikId: '',
  yukluDosyalar: [],
  youtubeLink: '',

  // 👇 YENİ
  ytStartSec: '',
  ytEndSec: '',
});

  const [showNotice, setShowNotice] = useState(false);
useEffect(() => {
  if (window.YT && window.YT.Player) return;

  // zaten ekliysek tekrar ekleme
  if (document.querySelector('script[data-yt-iframe-api="1"]')) return;

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.async = true;
  tag.dataset.ytIframeApi = '1';
  document.body.appendChild(tag);
}, []);
  useEffect(() => {
  setShowNotice(true);
}, []);

  const internetVideoId = useMemo(
    () => extractYouTubeId(formData.youtubeLink),
    [formData.youtubeLink]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = 'Memory Drop Studio Ön Sipariş Ekranı';

    const href = '/memory-drop-logo.png';
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = href;
  }, []);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map((file) => ({
      preview16kUrl: '',
       preview16kReady: false,
       id: makeId(),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      duration: 0,
      trimStart: 0,
      trimEnd: 0,
      isReady: false,
    }));

   setFormData((p) => ({
  ...p,
  yukluDosyalar: [...p.yukluDosyalar, ...newFiles],
}));

for (const nf of newFiles) {
  try {
    const wavBlob = await fileTo16kWavBlob(nf.file, 16000);
    const purl = URL.createObjectURL(wavBlob);
    updateDosya(nf.id, { preview16kUrl: purl, preview16kReady: true });
  } catch (err) {
    console.error('16k convert failed:', err);
    updateDosya(nf.id, { preview16kReady: false });
  }
}
    e.target.value = '';
  };

  const removeDosya = (id) => {
    setFormData((p) => {
      const target = p.yukluDosyalar.find((x) => x.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return { ...p, yukluDosyalar: p.yukluDosyalar.filter((x) => x.id !== id) };
    });
  };

  const updateDosya = (id, updates) => {
    setFormData((p) => ({
      ...p,
      yukluDosyalar: p.yukluDosyalar.map((x) => (x.id === id ? { ...x, ...updates } : x)),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.musteriAdi.trim() || !formData.telefon.trim()) {
      alert('Lütfen ad ve telefon bilgilerini doldurun!');
      return;
    }

  if (activeTab === 'hazir') {
  if (!formData.hazirMuzikId) {
    alert('Lütfen bir müzik seçin!');
    return;
  }

  if (hazirToyOk === false) {
    alert(
      'Seçtiğiniz hazır müzik için oyuncakta çalınacak 16 kHz ses bulunmuyor.\n' +
      'Lütfen başka bir müzik seçin veya Dosya / YouTube seçeneklerini kullanın.'
    );
    return;
  }

  if (hazirToyOk === null) {
    alert('Oyuncak sesi kontrol ediliyor, lütfen bir saniye bekleyin.');
    return;
  }
}


    if (activeTab === 'yukle' && formData.yukluDosyalar.length === 0) {
      alert('Lütfen en az bir dosya yükleyin!');
      return;
    }

if (activeTab === 'internet') {
  const hasUpload = formData.yukluDosyalar.length > 0;
  const hasManualRange =
    formData.ytStartSec !== '' && formData.ytEndSec !== '';

  if (!hasUpload && !hasManualRange) {
    alert(
      'YouTube seçimi için lütfen ya ses dosyasını yükleyin ya da süre aralığını belirtin.'
    );
    return;
  }

  if (hasManualRange) {
    const start = Number(formData.ytStartSec);
    const end = Number(formData.ytEndSec);

    if (isNaN(start) || isNaN(end) || end <= start) {
      alert('Lütfen geçerli bir başlangıç ve bitiş süresi girin.');
      return;
    }

    if (end - start > 310) {
      alert(
        'Seçilen süre 310 saniyeden uzun. Lütfen süreyi kısaltın veya dosya yükleyin.'
      );
      return;
    }
  }
}
if (activeTab === 'internet') {
  if (!internetVideoId) {
    alert('YouTube linki geçersiz görünüyor.');
    return;
  }

  const hasUpload = formData.yukluDosyalar.length > 0;
  const hasManualRange = formData.ytStartSec !== '' && formData.ytEndSec !== '';

  if (ytDurationSec && ytDurationSec > 310 && !hasUpload && !hasManualRange) {
    alert('Video 310 sn’den uzun. Lütfen dosya yükleyin veya süre aralığı belirtin.');
    return;
  }

  if (hasManualRange) {
    const start = Number(formData.ytStartSec);
    const end = Number(formData.ytEndSec);

    if (isNaN(start) || isNaN(end) || end <= start) {
      alert('Lütfen geçerli bir başlangıç ve bitiş süresi girin.');
      return;
    }
    if (end - start > 310) {
      alert('Seçilen süre 310 sn’den uzun. Lütfen kısaltın.');
      return;
    }
    if (ytDurationSec && end > ytDurationSec) {
      alert('Bitiş süresi video süresinden büyük olamaz.');
      return;
    }
  }
}
    const selectedSong = SONGS.find((s) => s.id === formData.hazirMuzikId);

    try {
      const resp = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musteriAdi: formData.musteriAdi,
          telefon: formData.telefon,
          activeTab,
          hazirMuzikTitle: selectedSong?.title || '',
          youtubeLink: formData.youtubeLink || '',
          internetVideoId: internetVideoId || '',
          yukluDosyaAdlari: (formData.yukluDosyalar || []).map((f) => f.name),
        }),
      });

      const j = await resp.json();
      if (!j.ok) {
        alert('Sipariş oluştu ama Telegram mesajı gidmedi: ' + (j.error || 'unknown'));
        return;
      }
    } catch (e) {
      alert('Sipariş oluştu ama Telegram mesajı gönderilemedi: ' + (e?.message || e));
      return;
    }

    alert('Siparişiniz alındı! En kısa sürede sizinle iletişime geçeceğiz.');
    console.log('Sipariş Detayları:', formData);
    console.log('Seçilen Hazır Müzik:', selectedSong);
    console.log('İnternet VideoId:', internetVideoId);
  };

  return (
    <>
      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-amber-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-3">Önemli Bilgilendirme</h3>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{NOTICE_TEXT}</p>
              <button
                type="button"
                onClick={() => {
                  setShowNotice(false);
                }}
                className="mt-5 w-full bg-gradient-to-r from-amber-700 to-yellow-600 text-white py-3 rounded-xl font-semibold hover:opacity-90"
              >
                Okudum, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-stone-100 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          {/* HEADER */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-200 to-yellow-200 shadow-inner border border-amber-200 overflow-hidden flex items-center justify-center">
              <img
                src="/memory-drop-logo.png"
                alt="Memory Drop Studio"
                className="w-full h-full object-cover"
                draggable={false}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <h1 className="text-3xl font-bold text-stone-800 mb-2">Memory Drop Studio Ön Sipariş Ekranı</h1>
            <p className="text-stone-600">Sevdikleriniz için özel, sesli bir oyuncak oluşturun!</p>
          </div>

          {/* FORM */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            {/* İLETİŞİM */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-stone-800 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-amber-700" />
                İletişim Bilgileri
              </h2>

              <div className="space-y-4">
                <Input
                  label="Ad Soyad *"
                  value={formData.musteriAdi}
                  onChange={(v) => setFormData({ ...formData, musteriAdi: v })}
                  placeholder="Ad soyad giriniz."
                />
                <Input
                  label="Telefon *"
                  value={formData.telefon}
                  onChange={(v) => setFormData({ ...formData, telefon: v })}
                  placeholder="0555 555 55 55"
                />
              </div>
            </div>

            {/* MÜZİK */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-stone-800 flex items-center mb-4">
                <Music className="w-5 h-5 mr-2 text-amber-700" />
                Müzik Seçimi *
              </h2>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <strong>Önemli:</strong> Seçmiş olduğunuz müziklerin toplam süresi süresi maksimum 310 saniye (5dk 10sn) olmalıdır. 
                </div>
              </div>

              <div className="flex gap-2 mb-6 flex-wrap">
                <TabButton active={activeTab === 'hazir'} onClick={() => setActiveTab('hazir')} icon={<Music className="w-4 h-4" />}>
                  Hazır
                </TabButton>

                <TabButton active={activeTab === 'yukle'} onClick={() => setActiveTab('yukle')} icon={<Upload className="w-4 h-4" />}>
                  Dosya
                </TabButton>

                <TabButton active={activeTab === 'internet'} onClick={() => setActiveTab('internet')} icon={<Globe className="w-4 h-4" />}>
                  İnternet
                </TabButton>
              </div>

              <div className="bg-amber-50/30 rounded-xl p-6 border border-amber-100">
                {activeTab === 'hazir' && <HazirMuzikPicker formData={formData} setFormData={setFormData} onToyPreviewCheck={setHazirToyOk}/>}

                {activeTab === 'yukle' && (
                  <div>
                    <p className="text-sm text-stone-700 mb-4">Dosya yükle (MP3 / WAV)</p>

                    <div className="border-2 border-dashed border-amber-200 rounded-xl p-8 text-center hover:border-amber-500 transition mb-4 bg-white">
                      <Upload className="w-12 h-12 mx-auto text-amber-700 mb-3" />
                      <label className="cursor-pointer">
                        <span className="text-amber-800 font-medium hover:text-amber-900">Dosya Seç (Birden fazla seçilebilir)</span>
                        <input type="file" accept="audio/*" multiple onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>

                    {formData.yukluDosyalar.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-sm font-medium text-stone-700">Yüklenen Dosyalar:</p>
                        {formData.yukluDosyalar.map((dosya) => (
                          <DosyaTrimmer key={dosya.id} dosya={dosya} onRemove={removeDosya} onUpdate={updateDosya} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
{activeTab === 'internet' && internetVideoId && (
  <div className="mt-3 text-xs text-stone-700">
    {ytDurationSec
      ? <>Video süresi: <b>{Math.floor(ytDurationSec / 60)}:{String(Math.floor(ytDurationSec % 60)).padStart(2,'0')}</b></>
      : <>Video süresi okunuyor...</>
    }
  </div>
)}

{ytDurationSec && ytDurationSec > 310 && (
  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
    Bu video <b>310 sn’den uzun</b>. Lütfen ya dosya yükleyin ya da aşağıdan süre aralığı belirtin.
  </div>
)}
{activeTab === 'internet' && (
  <>
<InternetMuzik
  youtubeLink={formData.youtubeLink}
  onChange={(v) => setFormData({ ...formData, youtubeLink: v })}
  videoId={internetVideoId}
  onDuration={(sec) => setYtDurationSec(sec)}
/>

    {/* YouTube için dosya yükleme */}
    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="text-sm font-semibold text-stone-800 mb-2">
        Oyuncakta Duyulacak (16 kHz)
      </div>

      <p className="text-xs text-stone-600 mb-3">
        YouTube’dan ses dönüştürülmez. Oyuncakta duyulacak 16 kHz önizleme için
        lütfen aynı müziğin dosyasını yükleyin (MP3 / WAV).
      </p>

      <label className="inline-flex items-center gap-2 cursor-pointer text-amber-800 font-medium">
        <Upload className="w-4 h-4" />
        Dosya Yükle
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
    </div>

    {/* 👇 BURAYA KOY */}
    {formData.yukluDosyalar.length > 0 && (
      <div className="mt-4 space-y-4">
        <div className="text-sm font-medium text-stone-700">
          Yüklediğin dosya(lar) – burada kırpabilirsin:
        </div>

        {formData.yukluDosyalar.map((dosya) => (
          <DosyaTrimmer
            key={dosya.id}
            dosya={dosya}
            onRemove={removeDosya}
            onUpdate={updateDosya}
          />
        ))}
      </div>
    )}
  
   {/* ⏱️ Süre Belirtme (Opsiyonel) */}
<div className="mt-4 bg-white border border-amber-200 rounded-xl p-4">
  <div className="text-sm font-semibold text-stone-800 mb-2">
    Süre Belirt (Opsiyonel)
  </div>

  <p className="text-xs text-stone-600 mb-3">
    Eğer şarkı uzunsa ve dosya yüklemek istemiyorsanız,
    oyuncakta çalınmasını istediğiniz aralığı saniye cinsinden belirtin.
    <br />
    <b>Maksimum süre: 310 saniye</b>
  </p>

  <div className="flex gap-3">
    <input
      type="number"
      min="0"
      placeholder="Başlangıç (sn)"
      value={formData.ytStartSec}
      onChange={(e) =>
        setFormData({ ...formData, ytStartSec: e.target.value })
      }
      className="w-1/2 px-3 py-2 border border-amber-200 rounded-lg text-sm"
    />

    <input
      type="number"
      min="0"
      placeholder="Bitiş (sn)"
      value={formData.ytEndSec}
      onChange={(e) =>
        setFormData({ ...formData, ytEndSec: e.target.value })
      }
      className="w-1/2 px-3 py-2 border border-amber-200 rounded-lg text-sm"
    />
  </div>
</div>
</>
)}

              </div>
            </div>

<button
  type="button"
  disabled={submitDisabled}
  onClick={handleSubmit}
  className={`w-full py-4 rounded-xl font-semibold text-lg transition shadow-lg
    ${
      submitDisabled
        ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
        : 'bg-gradient-to-r from-amber-700 to-yellow-600 text-white hover:from-amber-800 hover:to-yellow-700'
    }`}
>
  Siparişi Tamamla
</button>


            <p className="text-xs text-stone-500 text-center mt-4">
              Siparişiniz alındıktan sonra sizinle iletişime geçeceğiz
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   UI HELPERS
   ========================================================= */
function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
        active
          ? 'bg-gradient-to-r from-amber-700 to-yellow-600 text-white shadow-lg'
          : 'bg-amber-50 text-stone-700 hover:bg-amber-100'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none transition bg-white"
        placeholder={placeholder}
      />
    </div>
  );
}


/* =========================================================
   HAZIR MÜZİK PICKER
   ========================================================= */
function HazirMuzikPicker({ formData, setFormData, onToyPreviewCheck }) {
  const [query, setQuery] = useState('');
  
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SONGS;
    return SONGS.filter((s) => {
      const inTitle = s.title.toLowerCase().includes(q);
      const inTags = (s.tags || []).some((t) => t.toLowerCase().includes(q));
      return inTitle || inTags;
    });
  }, [query]);
  const [toyPreviewExists, setToyPreviewExists] = useState(null); // null | true | false

const selected = SONGS.find((s) => s.id === formData.hazirMuzikId);
const toyUrl = selected ? `/previews16k/${selected.id}.mp3` : '';

useEffect(() => {
  let cancelled = false;

  async function check() {
    if (!selected) {
      setToyPreviewExists(null);
      onToyPreviewCheck?.(null);
      return;
    }

    setToyPreviewExists(null); // kontrol ediliyor

    try {
      const r = await fetch(toyUrl, { method: 'HEAD', cache: 'no-store' });
      if (cancelled) return;

      if (r.ok) {
        setToyPreviewExists(true);
        onToyPreviewCheck?.(true);   // ✅ İŞTE BU EKSİKTİ
      } else {
        setToyPreviewExists(false);
        onToyPreviewCheck?.(false);
      }
    } catch {
      if (cancelled) return;
      setToyPreviewExists(false);
      onToyPreviewCheck?.(false);
    }
  }

  check();
  return () => {
    cancelled = true;
  };
}, [selected?.id]);

  return (
    <div>
      <p className="text-sm text-stone-700 mb-3">Listeden seç (istersen ara):</p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none transition mb-3 bg-white"
        placeholder="Ara: Şarkı İsmi / Tür / Dil"
      />

      <select
        value={formData.hazirMuzikId}
        onChange={(e) => setFormData((p) => ({ ...p, hazirMuzikId: e.target.value }))}
        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none transition bg-white"
      >
        <option value="">— Müzik seç —</option>
        {filtered.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>

      {filtered.length === 0 && (
        <div className="mt-3 text-sm text-amber-800">Sonuç yok. Arama kelimesini değiştir.</div>
      )}

      {selected?.type === 'youtube' && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-stone-700">Seçilen: {selected.title}</div>
            <div className="text-xs text-stone-500">{selected.tags?.length ? selected.tags.join(' • ') : ''}</div>
          </div>

          <div className="rounded-xl overflow-hidden border border-amber-100 bg-white">
            <iframe
              width="100%"
              height="220"
              src={`https://www.youtube.com/embed/${selected.youtubeId}`}
              title={selected.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
{selected && (
  <div className="mt-4 bg-white border border-amber-200 rounded-xl p-4">
    <div className="text-sm font-semibold text-stone-800 mb-2">
      Oyuncakta Duyulacak (16 kHz • Mono)
    </div>

    {toyPreviewExists === null && (
      <div className="text-xs text-stone-600">Kontrol ediliyor...</div>
    )}

    {toyPreviewExists === false && (
      <div className="text-xs text-red-700">
        Bu şarkı için 16 kHz önizleme dosyası bulunamadı.
        <br />
        Lütfen <b>public/previews16k/{selected.id}.mp3</b> dosyasını ekleyin
        veya kullanıcıya “dosya yükle / süre belirt” seçeneklerini kullandırın.
      </div>
    )}

    {toyPreviewExists === true && (
      <audio controls src={toyUrl} className="w-full" />
    )}
  </div>
)}

/* =========================================================
   İNTERNETTEN MÜZİK (YouTube preview)
   ========================================================= */
function InternetMuzik({ youtubeLink, onChange, videoId, onDuration }) {
  const hasInput = (youtubeLink || '').trim().length > 0;
  const playerRef = useRef(null);
  const hostRef = useRef(null);

  useEffect(() => {
    if (!videoId) return;

    let destroyed = false;

    const createPlayer = () => {
      if (destroyed) return;
      if (!hostRef.current) return;
      if (!(window.YT && window.YT.Player)) return;

      // eski player varsa temizle
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        width: '100%',
        height: '220',
        playerVars: {
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            const dur = playerRef.current.getDuration();
            if (dur && dur > 0) onDuration?.(dur);
          },
          onStateChange: () => {
            // bazı videolarda duration geç geliyor
            const dur = playerRef.current.getDuration();
            if (dur && dur > 0) onDuration?.(dur);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        createPlayer();
      };
    }

    return () => {
      destroyed = true;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  return (
    <div>
      <p className="text-sm text-stone-700 mb-3">
        YouTube linki gir (yapıştırınca otomatik önizleme çıkar):
      </p>

      <input
        type="url"
        value={youtubeLink}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none transition bg-white"
        placeholder="https://youtube.com/watch?v=...  veya  https://youtu.be/..."
      />

      {/* Hata */}
      {hasInput && !videoId && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
          <div className="text-xs text-red-700">
            Linki YouTube olarak okuyamadım.
          </div>
        </div>
      )}

      {/* Preview */}
      {videoId && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-stone-700 mb-2">
            Önizleme:
          </div>
          <div className="rounded-xl overflow-hidden border border-amber-100 bg-white">
            {/* 👇 YouTube iframe'ı BURAYA API basıyor */}
            <div ref={hostRef} />
          </div>
        </div>
      )}
    </div>
  );
}


/* =========================================================
   DOSYA TRIMMER (multi-file metadata fix + trim sırasında kırpma)
   ========================================================= */
function DosyaTrimmer({ dosya, onRemove, onUpdate }) {
  const MAX_DURATION = 310;
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeThumb, setActiveThumb] = useState(null);
  const audioRef = useRef(null);

  const MIN_GAP = 0.05;
  const STEP_NORMAL = 0.05;
  const STEP_FINE = 0.005;
  console.log(dosya.preview16kReady, dosya.preview16kUrl);
useEffect(() => {
  if (!dosya.isReady) return;
  if (dosya.trimEnd <= dosya.trimStart) return;

  // Kullanıcı sürüklüyorken spam üretme
  const t = setTimeout(async () => {
    try {
      // eski preview url'i temizle
      if (dosya.preview16kUrl) URL.revokeObjectURL(dosya.preview16kUrl);

      // "hazırlanıyor" göstermek için (istersen)
      onUpdate(dosya.id, { preview16kReady: false });

      const wavBlob = await fileTo16kWavBlob(
        dosya.file,
        dosya.trimStart,
        dosya.trimEnd,
        16000
      );

      const purl = URL.createObjectURL(wavBlob);
      onUpdate(dosya.id, { preview16kUrl: purl, preview16kReady: true });
    } catch (e) {
      console.error('trim 16k failed', e);
    }
  }, 300); // 300ms: kasmayı ciddi azaltır (istersen 500 yap)

  return () => clearTimeout(t);
}, [dosya.isReady, dosya.trimStart, dosya.trimEnd]);
  // metadata probe (2. dosya takılma fix)
  useEffect(() => {
    let cancelled = false;

    if (dosya.isReady && dosya.duration > 0) return;

    const probe = new Audio();
    probe.preload = 'metadata';
    probe.src = dosya.url;

    const done = (dur) => {
      if (cancelled) return;
      if (!dur || isNaN(dur) || dur <= 0) return;

      onUpdate(dosya.id, {
        duration: dur,
        isReady: true,
        trimStart: 0,
        trimEnd: Math.min(310, dur),
      });
    };

    probe.onloadedmetadata = () => done(probe.duration);
    probe.onerror = () => {
      setTimeout(() => {
        if (cancelled) return;
        const retry = new Audio();
        retry.preload = 'metadata';
        retry.src = dosya.url;
        retry.onloadedmetadata = () => done(retry.duration);
        retry.load();
      }, 150);
    };

    probe.load();

    return () => {
      cancelled = true;
      probe.src = '';
    };
  }, [dosya.id, dosya.url]);

  // play sırasında trim uygula
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      if (!isPlaying) return;
      const t = audio.currentTime;

      if (t < dosya.trimStart) audio.currentTime = dosya.trimStart;
      if (t >= dosya.trimEnd) {
        audio.pause();
        audio.currentTime = dosya.trimStart;
        setIsPlaying(false);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.currentTime = dosya.trimStart;
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [isPlaying, dosya.trimStart, dosya.trimEnd]);

  const formatTime = (s) => {
    if (s === null || s === undefined || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !dosya.isReady) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      audio.currentTime = dosya.trimStart;
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
      alert('Tarayıcı ses çalmayı engelledi. Play’e tekrar bas.');
    }
  };

  const snap = (val, step) => Math.round(val / step) * step;
  const getStep = (e) => (e.shiftKey ? STEP_FINE : STEP_NORMAL);

  const handleStartChange = (e) => {
    const step = getStep(e);
    const raw = parseFloat(e.target.value);
    const value = snap(raw, step);
    const clamped = Math.min(value, dosya.trimEnd - MIN_GAP);
    const next = Math.max(0, clamped);

    onUpdate(dosya.id, { trimStart: next });
    if (audioRef.current && isPlaying) audioRef.current.currentTime = next;
  };

 const handleEndChange = (e) => {
  const step = getStep(e);
  const raw = parseFloat(e.target.value);
  const value = snap(raw, step);

  // HARD LIMIT
  const hardEnd = Math.min(
    dosya.trimStart + MAX_DURATION,
    dosya.duration
  );

  const clamped = Math.max(value, dosya.trimStart + MIN_GAP);
  const next = Math.min(clamped, hardEnd);

  onUpdate(dosya.id, { trimEnd: next });
};

  const handleWheel = (type, e) => {
  e.preventDefault();
  const step = e.shiftKey ? STEP_FINE : STEP_NORMAL;
  const dir = e.deltaY < 0 ? step : -step;

  if (type === 'start') {
    const next = Math.min(
      Math.max(0, dosya.trimStart + dir),
      dosya.trimEnd - MIN_GAP
    );
    onUpdate(dosya.id, { trimStart: next });
    if (audioRef.current && isPlaying) audioRef.current.currentTime = next;
  } else {
    const hardEnd = Math.min(
      dosya.trimStart + MAX_DURATION,
      dosya.duration
    );

    const next = Math.max(
      Math.min(dosya.trimEnd + dir, hardEnd),
      dosya.trimStart + MIN_GAP
    );

    onUpdate(dosya.id, { trimEnd: next });
  }
};

  const selectedDuration = dosya.trimEnd - dosya.trimStart;
  const startPct = dosya.duration ? (dosya.trimStart / dosya.duration) * 100 : 0;
  const endPct = dosya.duration ? (dosya.trimEnd / dosya.duration) * 100 : 0;

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4">
      <style>{`
        .trimRange {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 26px;
          background: transparent;
          pointer-events: none;
          position: absolute;
          left: 0;
          top: -10px;
        }
        .trimRange::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: white;
          border: 2px solid #b45309;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          pointer-events: auto;
          cursor: grab;
        }
        .trimRange.end::-webkit-slider-thumb { border-color: #92400e; }
        .trimRange::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: white;
          border: 2px solid #b45309;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          pointer-events: auto;
          cursor: grab;
        }
        .trimRange.end::-moz-range-thumb { border-color: #92400e; }
        .trimRange::-moz-range-track { background: transparent; border: none; }
      `}</style>

      <audio ref={audioRef} src={dosya.url} preload="metadata" />
      {/* Oyuncakta duyulacak 16k preview */}
<div className="mt-3">
  <div className="text-xs font-semibold text-stone-700 mb-1">
    Oyuncakta Duyulacak (16 kHz)
  </div>

  {!dosya.preview16kReady && (
    <div className="text-xs text-amber-700">⏳ 16 kHz önizleme hazırlanıyor...</div>
  )}

  {dosya.preview16kReady && dosya.preview16kUrl && (
    <audio controls src={dosya.preview16kUrl} className="w-full" />
  )}
</div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!dosya.isReady}
            className={`p-2 rounded-full transition flex-shrink-0 ${
              dosya.isReady ? 'bg-amber-100 hover:bg-amber-200 active:scale-95' : 'bg-stone-100 opacity-50 cursor-not-allowed'
            }`}
            title={dosya.isReady ? (isPlaying ? 'Durdur' : 'Oynat') : 'Dosya hazırlanıyor'}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-amber-800" /> : <Play className="w-4 h-4 text-amber-800" />}
          </button>

          <div className="flex-1 min-w-0">
            <span className="text-sm text-stone-800 truncate block">{dosya.name}</span>
            {!dosya.isReady ? (
              <span className="text-xs text-amber-700 animate-pulse">⏳ Dosya hazırlanıyor...</span>
            ) : (
              <span className="text-xs text-stone-600">✓ Hazır - Toplam: {formatTime(dosya.duration)}</span>
            )}
            <div className="text-[11px] text-stone-500 mt-1">
              İpucu: Hassas ayar için <b>SHIFT</b> + <b>mouse tekerleğini</b> kullanınız
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(dosya.id)}
          className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition flex-shrink-0"
          title="Sil"
        >
          <X className="w-4 h-4 text-red-600" />
        </button>
      </div>

      {dosya.isReady && dosya.duration > 0 && (
        <div className="space-y-3 mt-4">
          <div className="flex justify-between text-xs text-stone-700">
            <span>
              Başlangıç: <strong>{formatTime(dosya.trimStart)}</strong>
            </span>
            <span>
              Bitiş: <strong>{formatTime(dosya.trimEnd)}</strong>
            </span>
            <span className={selectedDuration > 310 ? 'text-red-600 font-bold' : 'text-green-700 font-bold'}>
              Süre: {formatTime(selectedDuration)}
            </span>
          </div>

          <div className="relative">
            <div
              className="h-2 rounded-lg bg-stone-200"
              style={{
                background: `linear-gradient(to right,
                  #e7e5e4 0%,
                  #e7e5e4 ${startPct}%,
                  #b45309 ${startPct}%,
                  #b45309 ${endPct}%,
                  #e7e5e4 ${endPct}%,
                  #e7e5e4 100%)`,
              }}
            />

            <input
              type="range"
              min="0"
              max={Math.max(0, dosya.duration - MIN_GAP)}
              step={STEP_FINE}
              value={dosya.trimStart}
              onPointerDown={() => setActiveThumb('start')}
              onMouseDown={() => setActiveThumb('start')}
              onTouchStart={() => setActiveThumb('start')}
              onWheel={(e) => handleWheel('start', e)}
              onChange={handleStartChange}
              className="trimRange start"
              style={{ zIndex: activeThumb === 'start' ? 3 : 2 }}
            />

            <input
              type="range"
              min={MIN_GAP}
              max={dosya.duration}
              step={STEP_FINE}
              value={dosya.trimEnd}
              onPointerDown={() => setActiveThumb('end')}
              onMouseDown={() => setActiveThumb('end')}
              onTouchStart={() => setActiveThumb('end')}
              onWheel={(e) => handleWheel('end', e)}
              onChange={handleEndChange}
              className="trimRange end"
              style={{ zIndex: activeThumb === 'end' ? 3 : 2 }}
            />

            <div className="flex justify-between text-xs text-stone-400 mt-2">
              <span>0:00</span>
              <span>{formatTime(dosya.duration)}</span>
            </div>
          </div>

          {selectedDuration > 310 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-600">Seçili süre 310 saniyeden fazla! Lütfen kısaltın.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
