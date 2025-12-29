import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Music, Upload, Globe, User, Play, Pause, X, AlertCircle } from 'lucide-react';
const AUDIO_ACCEPT = 'audio/*';
const MAX_TOTAL_SEC = 310;
const MIN_GAP = 0.05;
const STEP_FINE = 0.005;
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
  /*  
  YT('Kukuli – Bakkal Amca', 't8moJLzPhoU', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Dandini Dandini Dastana', '4NBBFSqv_GY', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Otobüsün Tekerleği Dönüyor', 'W-nWnHmC4Gc', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Arı Vız Vız', '9xOIKkvTOdE', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Ayı', 'QSGubfzxIa0', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Gezegenler', 'rGGZnh8W7Oo', { tags: ['Çocuk', 'Türkçe'] }),
  YT('Twinkle Twinkle Little Star', 'yCjJyiqpAuU', { tags: ['Çocuk', 'İngilizce'] }),
  */
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
  YT('Besame Mucho', 'M4z6xdu1iX8', { tags: ['Romantik', 'İspanyolca'] }),
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
const MAX_RANGE_SEC = 310; // 5dk 10sn

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toMS(totalSec) {
  const s = Math.max(0, Number(totalSec) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return { m, s: r };
}

function fromMS(m, s) {
  return (Number(m) || 0) * 60 + (Number(s) || 0);
}

function fmtMS(totalSec) {
  const { m, s } = toMS(totalSec);
  return `${m}:${String(s).padStart(2, '0')}`;
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
   const fileDialogOpenRef = useRef(false);
const fileInputRef = useRef(null);
const fileInputRef2 = useRef(null);
  const [activeTab, setActiveTab] = useState('hazir');
 const [ytDurationSec, setYtDurationSec] = useState(null);
const [formData, setFormData] = useState({
  musteriAdi: '',
  telefon: '',
 hazirClips: [],
  yukluDosyalar: [],
  youtubeLink: '',

  // 👇 YENİ
  ytStartSec: '',
  ytEndSec: '',
});

  const [showNotice, setShowNotice] = useState(false);
 const internetVideoId = useMemo(
    () => extractYouTubeId(formData.youtubeLink),
    [formData.youtubeLink]
  );
   useEffect(() => {
  // Link silindiyse / geçersizse, eski video süresi ekranda kalmasın
  if (!internetVideoId) {
    setYtDurationSec(null);
  }
}, [internetVideoId]);
 useEffect(() => {
  if (!internetVideoId) {
    setYtDurationSec(null);
    setFormData((p) => ({ ...p, ytStartSec: '', ytEndSec: '' }));
  }
}, [internetVideoId]);
  useEffect(() => {
  const cleanupAfterFileDialog = () => {
    if (!fileDialogOpenRef.current) return;
    fileDialogOpenRef.current = false;

    setTimeout(() => {
      fileInputRef.current?.blur?.();
      fileInputRef2.current?.blur?.();
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur?.();
      }
    }, 0);
  };

  const onFocus = () => cleanupAfterFileDialog();

  const onVisibility = () => {
    // sayfa yeniden görünür olunca (file dialog kapanınca) tetiklenir
    if (document.visibilityState === 'visible') cleanupAfterFileDialog();
  };

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}, []);

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
  // Sekmeden çıkınca internet sekmesine ait hatalar/uyarılar taşınmasın
  if (activeTab !== 'internet') {
    setYtDurationSec(null);

    setFormData((p) => ({
      ...p,
      youtubeLink: '',
      ytStartSec: '',
      ytEndSec: '',
    }));
  }



  // Dosya sekmesi için isteğe bağlı:
  // Eğer "dosyalar tablar arasında kalsın" istiyorsan bunu ekleme.
  // if (activeTab !== 'yukle') {
  //   setFormData(p => ({ ...p, yukluDosyalar: [] }));
  // }
}, [activeTab]);
  useEffect(() => {
  setShowNotice(true);
}, []);

 const hazirTotalSec = useMemo(() => {
  return (formData.hazirClips || []).reduce(
    (sum, c) => sum + Math.max(0, (Number(c.end) || 0) - (Number(c.start) || 0)),
    0
  );
}, [formData.hazirClips]);
 const submitDisabled = useMemo(() => {

    // temel zorunlular
    if (!formData.musteriAdi.trim()) return true;
    if (!formData.telefon.trim()) return true;

    if (activeTab === 'hazir') {
  const clips = formData.hazirClips || [];
  if (clips.length === 0) return true;

  const total = hazirTotalSec;
  if (total > MAX_TOTAL_SEC + 0.01) return true;

  const anyMissing = clips.some((c) => c.toyOk === false);
  if (anyMissing) return true;
}

    if (activeTab === 'yukle') {
      if (!formData.yukluDosyalar || formData.yukluDosyalar.length === 0) return true;
      // en az 1 dosya metadata hazır olmalı (isteğe bağlı)
      const anyReady = formData.yukluDosyalar.some((f) => f?.isReady);
      if (!anyReady) return true;
      // süre limitini aşan var mı (isteğe bağlı)
      const anyTooLong = formData.yukluDosyalar.some((f) => (f.trimEnd - f.trimStart) > 310);
      if (anyTooLong) return true;
    }

    if (activeTab === 'internet') {
      // youtube linki geçerli mi
      if (!internetVideoId) return true;

      // video uzun ve kullanıcı ne dosya yüklemiş ne aralık girmişse disable
      const hasUpload = (formData.yukluDosyalar || []).length > 0;
      const hasManualRange = formData.ytStartSec !== '' && formData.ytEndSec !== '';

      if (ytDurationSec && ytDurationSec > 310 && !hasUpload && !hasManualRange) return true;

      if (hasManualRange) {
        const start = Number(formData.ytStartSec);
        const end = Number(formData.ytEndSec);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return true;
        if (end - start > 310) return true;
        if (ytDurationSec && end > ytDurationSec) return true;
      }
    }

    return false;
  }, [
    formData.musteriAdi,
    formData.telefon,
    formData.hazirMuzikId,
    formData.yukluDosyalar,
    formData.ytStartSec,
    formData.ytEndSec,
    activeTab,
    internetVideoId,
    ytDurationSec,
    hazirTotalSec,
  ]);
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

    e.target.value = '';
     e.target.blur?.();
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
      alert('Lütfen ad ve telefon bilgilerini doldurunuz.');
      return;
    }

if (activeTab === 'hazir') {
  const clips = formData.hazirClips || [];
  if (clips.length === 0) {
    alert('Lütfen en az bir hazır müzik ekleyin!');
    return;
  }

  const total = clips.reduce((s, c) => s + Math.max(0, c.end - c.start), 0);
  if (total > MAX_TOTAL_SEC + 0.01) {
    alert('Toplam süre 310 sn’yi aşıyor. Lütfen kısaltın.');
    return;
  }

  const missing = clips.find((c) => c.toyOk === false);
  if (missing) {
    alert('Bazı hazır müziklerde 16 kHz önizleme dosyası yok. Lütfen düzeltin veya başka parça seçin.');
    return;
  }
}




    if (activeTab === 'yukle' && formData.yukluDosyalar.length === 0) {
      alert('Lütfen en az bir dosya yükleyiniz.');
      return;
    }

if (activeTab === 'internet') {
  const hasUpload = formData.yukluDosyalar.length > 0;
  const hasManualRange =
    formData.ytStartSec !== '' && formData.ytEndSec !== '';

  if (!hasUpload && !hasManualRange) {
    alert(
      'YouTube seçimi için lütfen ses dosyasını yükleyiniz ya da süre aralığını belirtiniz.'
    );
    return;
  }

  if (hasManualRange) {
    const start = Number(formData.ytStartSec);
    const end = Number(formData.ytEndSec);

    if (isNaN(start) || isNaN(end) || end <= start) {
      alert('Lütfen geçerli bir başlangıç ve bitiş süresi giriniz.');
      return;
    }

    if (end - start > 310) {
      alert(
        'Seçilen süre 310 saniyeden uzundur. Lütfen aşağıdan süre aralığı belirtiniz.'
      );
      return;
    }
  }
}
if (activeTab === 'internet') {
  if (!internetVideoId) {
    alert('Link geçersizdir.');
    return;
  }

  const hasUpload = formData.yukluDosyalar.length > 0;
  const hasManualRange = formData.ytStartSec !== '' && formData.ytEndSec !== '';

  if (ytDurationSec && ytDurationSec > 310 && !hasUpload && !hasManualRange) {
    alert('Video 310 sn’den uzundur. Lütfen dosya yükleyiniz veya süre aralığı belirtiniz.');
    return;
  }

  if (hasManualRange) {
    const start = Number(formData.ytStartSec);
    const end = Number(formData.ytEndSec);

    if (isNaN(start) || isNaN(end) || end <= start) {
      alert('Lütfen geçerli bir başlangıç ve bitiş süresi giriniz.');
      return;
    }
    if (end - start > 310) {
      alert('Seçilen süre 310 sn’den uzundur. Lütfen aşağıdan süre aralığı belirtiniz.');
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

    // 👇 HAZIR MÜZİKLER (backend için sadeleştirilmiş)
    hazirClips: (formData.hazirClips || []).map(c => ({
      title: c.title,
      youtubeId: c.youtubeId,
      start: c.start,
      end: c.end,
    })),

    // diğerleri
    youtubeLink: formData.youtubeLink || '',
    internetVideoId: internetVideoId || '',
    yukluDosyaAdlari: (formData.yukluDosyalar || []).map(f => f.name),
  }),
});

      const j = await resp.json();
      if (!j.ok) {
        alert('Sipariş oluşturulamadı lütfen daha sonra tekrar deneyiniz. ' + (j.error || 'unknown'));
        return;
      }
    } catch (e) {
      alert('Sipariş oluşturulamadı lütfen daha sonra tekrar deneyiniz.' + (e?.message || e));
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
                 value={formData?.musteriAdi ?? ''}
                  onChange={(v) => setFormData(p => ({ ...p, musteriAdi: v }))}
                  placeholder="Ad soyad giriniz."
                />
                <Input
                  label="Telefon *"
value={formData?.telefon ?? ''}
onChange={(v) => setFormData(p => ({ ...p, telefon: v }))}
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
  {/* HAZIR */}
   {activeTab === 'hazir' && (
  <div className="mb-3 text-xs text-stone-700">
    Toplam: <b>{Math.round(hazirTotalSec)} sn</b> • Kalan: <b>{Math.max(0, MAX_TOTAL_SEC - hazirTotalSec)} sn</b>
  </div>
)}
  {activeTab === 'hazir' && (
  <HazirMuzikMulti
    formData={formData}
    setFormData={setFormData}
  />
)}

  {/* DOSYA */}
  {activeTab === 'yukle' && (
    <div>
      <p className="text-sm text-stone-700 mb-4">Dosya yükle (MP3 / WAV / M4A vb.)</p>

      <div className="border-2 border-dashed border-amber-200 rounded-xl p-8 text-center hover:border-amber-500 transition mb-4 bg-white">
        <Upload className="w-12 h-12 mx-auto text-amber-700 mb-3" />
        <label className="cursor-pointer">
          <span className="text-amber-800 font-medium hover:text-amber-900">
            Dosya Seç (Birden fazla seçilebilir)
          </span>

          <input
            ref={fileInputRef}
            type="file"
            accept={AUDIO_ACCEPT}
            multiple
            onPointerDown={() => {
              fileDialogOpenRef.current = true;
            }}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {formData.yukluDosyalar.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-stone-700">Yüklenen Dosyalar:</p>
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
    </div>
  )}

  {/* INTERNET */}
  {activeTab === 'internet' && (
    <>
      <InternetMuzik
        youtubeLink={formData.youtubeLink}
        onChange={(v) => setFormData({ ...formData, youtubeLink: v })}
        videoId={internetVideoId}
        onDuration={(sec) => setYtDurationSec(sec)}
      />

      {/* Video süresi bilgisi */}
      {internetVideoId && (
        <div className="mt-3 text-xs text-stone-700">
          {ytDurationSec ? (
            <>
              Video süresi: <b>{Math.floor(ytDurationSec / 60)}:{String(Math.floor(ytDurationSec % 60)).padStart(2, '0')}</b>
            </>
          ) : (
            <>Video süresi okunuyor...</>
          )}
        </div>
      )}

      {/* 310 sn uyarısı (sadece internet + geçerli videoId) */}
      {internetVideoId && ytDurationSec && ytDurationSec > 310 && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
          Bu video <b>310 sn’den uzun</b>. Lütfen ya dosya yükleyin ya da aşağıdan süre aralığı seçin.
        </div>
      )}

      {/* YouTube için dosya yükleme */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="text-sm font-semibold text-stone-800 mb-2">
          Oyuncakta Duyulacak (16 kHz)
        </div>

        <p className="text-xs text-stone-600 mb-3">
          YouTube’dan ses dönüştürülmez. Oyuncakta duyulacak 16 kHz önizleme için
          lütfen aynı müziğin dosyasını yükleyin (MP3 / WAV / M4A vb.).
        </p>

        <label className="inline-flex items-center gap-2 cursor-pointer text-amber-800 font-medium">
          <Upload className="w-4 h-4" />
          Dosya Yükle

          <input
            ref={fileInputRef2}
            type="file"
            accept={AUDIO_ACCEPT}
            onPointerDown={() => {
              fileDialogOpenRef.current = true;
            }}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Yüklenen dosyalar – kırpma */}
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

      {/* Dakika:saniye seçmeli aralık */}
      <YouTubeRangePicker
        ytDurationSec={ytDurationSec}
        formData={formData}
        setFormData={setFormData}
      />
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

function HazirMuzikMulti({ formData, setFormData }) {
  const [query, setQuery] = useState('');
  const [selectedSongId, setSelectedSongId] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SONGS;
    return SONGS.filter((s) => {
      const inTitle = s.title.toLowerCase().includes(q);
      const inTags = (s.tags || []).some((t) => t.toLowerCase().includes(q));
      return inTitle || inTags;
    });
  }, [query]);

  const totalSec = useMemo(() => {
    return (formData.hazirClips || []).reduce((sum, c) => sum + Math.max(0, c.end - c.start), 0);
  }, [formData.hazirClips]);

  const remaining = Math.max(0, MAX_TOTAL_SEC - totalSec);

  const selected = SONGS.find((s) => s.id === selectedSongId);

  // mp3 duration oku
  const readDuration = (url) =>
    new Promise((resolve) => {
      const a = new Audio();
      a.preload = 'metadata';
      a.src = url;
      a.onloadedmetadata = () => resolve(a.duration || 0);
      a.onerror = () => resolve(0);
      a.load();
    });

  const headExists = async (url) => {
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return !!r.ok;
    } catch {
      return false;
    }
  };

  const addClip = async () => {
    if (!selected) return;

    const toyUrl = `/previews16k/${selected.id}.mp3`;

    // 1) preview var mı?
    const ok = await headExists(toyUrl);

    // 2) duration oku (yoksa 0)
    const dur = await readDuration(toyUrl);

    // 3) yeni clip default aralığı:
    // - yeni clip, kalan kadar yer varsa o kadar (veya tüm şarkı, hangisi küçükse)
    // - kalan yoksa 1sn ekle (kullanıcı isterse diğerlerini kısaltıp bunu büyütür)
    const maxLenForNew = remaining > 0 ? remaining : 1;
    const end = Math.min(dur || maxLenForNew, maxLenForNew);

    const clip = {
      clipId: makeId(),
      songId: selected.id,
      title: selected.title,
      youtubeId: selected.youtubeId,
      toyUrl,
      songDur: dur || 0,
      start: 0,
      end: Math.max(0.5, end), // en az 0.5 sn
      toyOk: ok,
      tags: selected.tags || [],
    };

    setFormData((p) => ({
      ...p,
      hazirClips: [...(p.hazirClips || []), clip],
    }));
  };

  const removeClip = (clipId) => {
    setFormData((p) => ({
      ...p,
      hazirClips: (p.hazirClips || []).filter((c) => c.clipId !== clipId),
    }));
  };

  // Kırpma update: total 310 aşarsa sadece o clip clamp’lensin (diğerleri sabit)
  const updateClip = (clipId, updates) => {
    setFormData((p) => {
      const clips = p.hazirClips || [];
      const idx = clips.findIndex((c) => c.clipId === clipId);
      if (idx < 0) return p;

      const next = { ...clips[idx], ...updates };
      const othersTotal = clips.reduce((sum, c, i) => {
        if (i === idx) return sum;
        return sum + Math.max(0, c.end - c.start);
      }, 0);

      const maxLen = Math.max(0.5, MAX_TOTAL_SEC - othersTotal);
      const minEnd = next.start + 0.5;
      const hardMaxEnd = (next.songDur && next.songDur > 0) ? next.songDur : Infinity;

      // end: hem şarkı süresini hem maxLen’i aşmasın
      const allowedEnd = Math.min(next.start + maxLen, hardMaxEnd);
      if (next.end > allowedEnd) next.end = allowedEnd;
      if (next.end < minEnd) next.end = minEnd;

      const newClips = clips.slice();
      newClips[idx] = next;
      return { ...p, hazirClips: newClips };
    });
  };

  return (
    <div>
      <div className="mb-3 text-xs text-stone-700">
        Toplam: <b>{Math.round(totalSec)} sn</b> • Kalan: <b>{Math.max(0, Math.round(MAX_TOTAL_SEC - totalSec))} sn</b>
      </div>

      <p className="text-sm text-stone-700 mb-3">Hazır müzik ekle (çoklu seçim):</p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none transition mb-3 bg-white"
        placeholder="Ara: Şarkı İsmi / Tür / Dil"
      />

      <div className="flex gap-2">
        <select
          value={selectedSongId}
          onChange={(e) => setSelectedSongId(e.target.value)}
          className="flex-1 px-4 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none transition bg-white"
        >
          <option value="">— Müzik seç —</option>
          {filtered.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={addClip}
          disabled={!selectedSongId}
          className={`px-4 rounded-xl font-semibold ${
            selectedSongId ? 'bg-amber-700 text-white' : 'bg-stone-300 text-stone-500'
          }`}
        >
          Ekle
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="mt-3 text-sm text-amber-800">Sonuç yok. Arama kelimesini değiştir.</div>
      )}

      {/* Seçili clip listesi */}
      {(formData.hazirClips || []).length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="text-sm font-semibold text-stone-800">
            Seçilen Parçalar (kırpılabilir):
          </div>

          {(formData.hazirClips || []).map((c) => (
            <HazirClipTrimmer
              key={c.clipId}
              clip={c}
              onRemove={() => removeClip(c.clipId)}
              onUpdate={(u) => updateClip(c.clipId, u)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function HazirClipTrimmer({ clip, onRemove, onUpdate }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeThumb, setActiveThumb] = useState(null);

  const duration = clip.songDur || 0;
  const start = clip.start || 0;
  const end = clip.end || Math.max(0.5, start + 0.5);

  // 🔥 clamp01 ismini değiştir (duplicate riskini sıfırlar)
  const clampPct = (x) => Math.max(0, Math.min(100, x));
  const startPct = duration ? clampPct((start / duration) * 100) : 0;
  const endPct   = duration ? clampPct((end   / duration) * 100) : 0;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const selectedDur = Math.max(0, end - start);

  const handleStart = (val) => {
    const nextStart = Math.min(val, end - 0.5);
    onUpdate({ start: Math.max(0, nextStart) });
  };

  const handleEnd = (val) => {
    const nextEnd = Math.max(val, start + 0.5);
    onUpdate({ end: nextEnd });
  };

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4">
      <audio ref={audioRef} src={clip.toyUrl} preload="metadata" />

      {/* ... üstteki UI aynı kalsın ... */}

      {duration > 0 && (
        <div className="mt-4">
          <div
            className="h-2 rounded-lg bg-stone-200"
            style={{
              background: `linear-gradient(to right,
                #e7e5e4 0%,
                #e7e5e4 ${startPct}%,
                #2563eb ${startPct}%,
                #2563eb ${endPct}%,
                #e7e5e4 ${endPct}%,
                #e7e5e4 100%)`,
            }}
          />

          <div className="relative mt-2 pt-7">
            <div
              className="absolute -top-1 text-[11px] px-2 py-1 rounded-md bg-blue-600 text-white shadow"
              style={{ left: `${startPct}%`, transform: 'translateX(-50%)' }}
            >
              {formatTime(start)}
            </div>

            <div
              className="absolute -top-1 text-[11px] px-2 py-1 rounded-md bg-blue-800 text-white shadow"
              style={{ left: `${endPct}%`, transform: 'translateX(-50%)' }}
            >
              {formatTime(end)}
            </div>

            <input
              type="range"
              min="0"
              max={Math.max(0, duration - 0.5)}
              step={STEP_FINE}
              value={start}
              onPointerDown={() => setActiveThumb('start')}
              onChange={(e) => handleStart(parseFloat(e.target.value))}
              className="w-full"
              style={{ zIndex: activeThumb === 'start' ? 3 : 2 }}
            />

            <input
              type="range"
              min="0.5"
              max={duration}
              step={STEP_FINE}
              value={end}
              onPointerDown={() => setActiveThumb('end')}
              onChange={(e) => handleEnd(parseFloat(e.target.value))}
              className="w-full -mt-6"
              style={{ zIndex: activeThumb === 'end' ? 3 : 2 }}
            />
          </div>

          <div className="flex justify-between text-xs text-stone-500 mt-2">
            <span>{formatTime(0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
function YouTubeRangePicker({ ytDurationSec, formData, setFormData }) {
  // Video süresi varsa...
  const FALLBACK_MAX = 2 * 60 * 60;
const videoMax = Math.floor(
  (Number.isFinite(ytDurationSec) && ytDurationSec > 0) ? ytDurationSec : FALLBACK_MAX
);

  // start: 0..videoMax-1 (end > start şartı için)
  const start = clamp(Number(formData.ytStartSec || 0), 0, Math.max(0, videoMax - 1));

  // end default: start+30sn (ama videoMax’i aşamaz)
  const endDefault = clamp(start + 30, 1, videoMax);
  const endInput = formData.ytEndSec === '' ? endDefault : Number(formData.ytEndSec);
  const end = clamp(endInput, 0, videoMax);

  // Kurallar:
  // - end > start (min 1 sn)
  // - (end - start) <= 310
  // - end <= videoMax
  const minEnd = clamp(start + 1, 1, videoMax);
  const maxEnd = clamp(Math.min(start + MAX_RANGE_SEC, videoMax), 1, videoMax);
  const safeEnd = clamp(end, minEnd, maxEnd);

  // state tutarsızsa düzelt
  useEffect(() => {
    const ns = String(start);
    const ne = String(safeEnd);
    if (String(formData.ytStartSec) !== ns || String(formData.ytEndSec) !== ne) {
      setFormData((p) => ({ ...p, ytStartSec: ns, ytEndSec: ne }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, safeEnd]);

  const startMS = toMS(start);
  const endMS = toMS(safeEnd);

  // Start dakika seçenekleri: 0..floor((videoMax-1)/60)
  const startMaxMinute = Math.floor(Math.max(0, videoMax - 1) / 60);
  const startMinuteOptions = Array.from({ length: startMaxMinute + 1 }, (_, i) => i);

  // Start saniye seçenekleri: son dakikadaysa (videoMax-1)%60’a kadar
  const startLastSecMax =
    startMS.m === startMaxMinute ? (Math.max(0, videoMax - 1) % 60) : 59;
  const startSecondOptions = Array.from({ length: startLastSecMax + 1 }, (_, i) => i);

  // End seçenekleri minEnd..maxEnd aralığında
  const endMin = toMS(minEnd);
  const endMax = toMS(maxEnd);

  const endMinuteOptions = Array.from(
    { length: endMax.m - endMin.m + 1 },
    (_, k) => endMin.m + k
  );

  const endSecondOptions = (m) => {
    const lo = (m === endMin.m) ? endMin.s : 0;
    const hi = (m === endMax.m) ? endMax.s : 59;
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  };

  const setStartMS = (m, s) => {
    const nextStart = clamp(fromMS(m, s), 0, Math.max(0, videoMax - 1));

    // start değişince end’i otomatik uygun aralığa çek
    const nextMinEnd = clamp(nextStart + 1, 1, videoMax);
    const nextMaxEnd = clamp(Math.min(nextStart + MAX_RANGE_SEC, videoMax), 1, videoMax);
    const nextEnd = clamp(safeEnd, nextMinEnd, nextMaxEnd);

    setFormData((p) => ({
      ...p,
      ytStartSec: String(nextStart),
      ytEndSec: String(nextEnd),
    }));
  };

  const setEndMS = (m, s) => {
    const nextEndRaw = fromMS(m, s);
    const nextEnd = clamp(nextEndRaw, minEnd, maxEnd);
    setFormData((p) => ({ ...p, ytEndSec: String(nextEnd) }));
  };

  return (
    <div className="mt-4 bg-white border border-amber-200 rounded-xl p-4">
      <div className="text-sm font-semibold text-stone-800 mb-2">
        Süre Belirt (Opsiyonel)
      </div>

      <p className="text-xs text-stone-600 mb-3">
        Videonun istediğiniz bölümünü seçin.
        <br />
        <b>Maksimum aralık: {fmtMS(MAX_RANGE_SEC)}</b>
        {Number.isFinite(ytDurationSec) && ytDurationSec > 0 ? (
          <>
            <br />
            Video süresi: <b>{fmtMS(Math.floor(ytDurationSec))}</b>
          </>
        ) : (
          <>
            <br />
            Video süresi okunuyor... (gelince seçenekler genişler)
          </>
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* START */}
        <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-stone-700 mb-2">Başlangıç</div>
          <div className="flex gap-2">
            <select
              className="w-1/2 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white"
              value={startMS.m}
              onChange={(e) => setStartMS(Number(e.target.value), startMS.s)}
            >
              {startMinuteOptions.map((m) => (
                <option key={m} value={m}>{m} dk</option>
              ))}
            </select>

            <select
              className="w-1/2 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white"
              value={startMS.s}
              onChange={(e) => setStartMS(startMS.m, Number(e.target.value))}
            >
              {startSecondOptions.map((s) => (
                <option key={s} value={s}>{String(s).padStart(2, '0')} sn</option>
              ))}
            </select>
          </div>

          <div className="mt-2 text-[11px] text-stone-500">
            Seçilen: <b>{fmtMS(start)}</b>
          </div>
        </div>

        {/* END */}
        <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-stone-700 mb-2">Bitiş</div>
          <div className="flex gap-2">
            <select
              className="w-1/2 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white"
              value={endMS.m}
              onChange={(e) => {
                const m = Number(e.target.value);
                const secs = endSecondOptions(m);
                const nextS = secs.includes(endMS.s) ? endMS.s : secs[0];
                setEndMS(m, nextS);
              }}
            >
              {endMinuteOptions.map((m) => (
                <option key={m} value={m}>{m} dk</option>
              ))}
            </select>

            <select
              className="w-1/2 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white"
              value={endMS.s}
              onChange={(e) => setEndMS(endMS.m, Number(e.target.value))}
            >
              {endSecondOptions(endMS.m).map((s) => (
                <option key={s} value={s}>{String(s).padStart(2, '0')} sn</option>
              ))}
            </select>
          </div>

          <div className="mt-2 text-[11px] text-stone-500">
            Seçilen: <b>{fmtMS(safeEnd)}</b> • Aralık: <b>{fmtMS(safeEnd - start)}</b>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-stone-500">
        Sistem, bitişi otomatik olarak <b>başlangıç + {fmtMS(MAX_RANGE_SEC)}</b> sınırı içinde tutar.
      </div>
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
    <p className="text-sm text-stone-700 mb-3">Listeden seçiniz ya da arama yapınız.:</p>

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


    {/* ✅ BU BLOK ARTIK ROOT DIV’İN İÇİNDE */}
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
            Lütfen <b>public/previews16k/{selected?.id}.mp3</b> dosyasını ekleyin
            veya kullanıcıya “dosya yükle / süre belirt” seçeneklerini kullandırın.
          </div>
        )}

        {toyPreviewExists === true && (
          <audio controls src={toyUrl} className="w-full" />
        )}
      </div>
    )}
  </div>
);
}

/* =========================================================
   İNTERNETTEN MÜZİK (YouTube preview)
   ========================================================= */
function InternetMuzik({ youtubeLink, onChange, videoId, onDuration }) {
  const hasInput = (youtubeLink || '').trim().length > 0;
  const playerRef = useRef(null);
  const hostRef = useRef(null);

  useEffect(() => {
    if (!videoId) onDuration?.(null);
  }, [videoId, onDuration]);

  useEffect(() => {
    if (!videoId) return;

    let destroyed = false;
    let pollTimer = null;

    function createPlayer() {
      if (destroyed) return;
      if (!hostRef.current) return;
      if (!(window.YT && window.YT.Player)) return;

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        width: '100%',
        height: '220',
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            let tries = 0;
            if (pollTimer) clearInterval(pollTimer);

            pollTimer = setInterval(() => {
              tries++;
              const dur = playerRef.current?.getDuration?.();
              if (dur && dur > 0) {
                onDuration?.(dur);
                clearInterval(pollTimer);
                pollTimer = null;
              }
              if (tries >= 20) {
                clearInterval(pollTimer);
                pollTimer = null;
              }
            }, 500);
          },
          onStateChange: () => {
            const dur = playerRef.current?.getDuration?.();
            if (dur && dur > 0) onDuration?.(dur);
          },
        },
      });
    }

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

      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId, onDuration]);

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

      {hasInput && !videoId && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
          <div className="text-xs text-red-700">Linki YouTube olarak okuyamadım.</div>
        </div>
      )}

      {videoId && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-stone-700 mb-2">Önizleme:</div>
          <div className="rounded-xl overflow-hidden border border-amber-100 bg-white">
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
