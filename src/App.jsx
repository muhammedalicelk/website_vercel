import { upload } from "@vercel/blob/client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Music, Upload, User, X, AlertCircle } from "lucide-react";

const AUDIO_ACCEPT = "audio/*";
const MAX_TOTAL_SEC = 310;
const MIN_GAP = 0.05;
const STEP_FINE = 0.005;
const MAX_RANGE_SEC = 310; // 5dk 10sn

/* =========================================================
   THEME (from your JSON) - injected as CSS variables
   ========================================================= */
const THEME_VARS = `
:root{
  /* BACKGROUND (foto dokusu üstüne oturacak referans tonlar) */
  --bg-primary:#C93D45;     /* orta kırmızı */
  --bg-deep:#AD2530;        /* koyu kırmızı */
  --bg-edge:#E88C86;        /* yumuşak pembe kırmızı */

  /* TEXT (MEMORA yazısı gibi krem) */
  --text-primary:#FBDFC3;   /* krem */
  --text-secondary:#FFE9D7; /* daha açık krem */
  --text-muted:#F2C9B2;
  --text-inverse:#FFFFFF;

  /* ACCENT (çember şeftali) */
  --accent:#FAC2A4;         /* şeftali */
  --accent-dark:#E9AA8E;

  /* GREEN (wave gibi zeytin yeşili) */
  --wave-primary:#525F32;   /* zeytin */
  --wave-dark:#3F4A26;

  /* Flower */
  --flower-petal:#FFFFFF;
  --flower-center:#F5BA55;

  /* UI */
  --ui-btn-bg:var(--accent);
  --ui-btn-text:#3A1F1F;     /* buton yazısı krem değil, daha şık koyu */
  --ui-btn-hover:var(--accent-dark);

  --ui-input-bg:rgba(255,255,255,0.14); /* input beyaz değil, cam gibi */
  --ui-input-border:rgba(250,194,164,0.42);
  --ui-input-text:#3A1F1F;

  --card-bg:rgba(255,255,255,0.10);     /* CAM CARD */
  --card-border:rgba(255,255,255,0.18);

  --danger:#7F1D1D;
  --danger-bg:rgba(127,29,29,0.18);
  --danger-border:rgba(127,29,29,0.28);
}
`;


// Helper styles (no Tailwind color palette usage)
const S = {
  pageBg: {
    background: "radial-gradient(circle, var(--bg-primary) 0%, var(--bg-secondary) 70%)",
  },
card: {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
},
  textPrimary: { color: "var(--text-primary)" },
  textSecondary: { color: "var(--text-secondary)" },
  textMuted: { color: "var(--text-muted)" },
  titleOnWhite: { color: "var(--bg-primary)" },
  bodyOnWhite: { color: "var(--ui-input-text)" },
  btnPrimary: {
    background: "var(--ui-btn-bg)",
    color: "var(--ui-btn-text)",
  },
  btnPrimaryHover: {
    background: "var(--ui-btn-hover)",
    color: "var(--ui-btn-text)",
  },
input: {
  background: "var(--ui-input-bg)",
  borderColor: "var(--ui-input-border)",
  color: "var(--ui-input-text)",
},
};

/* =========================================================
   YT + SONGS
   ========================================================= */
function YT(title, youtubeId, extra = {}) {
  return {
    id: `yt_${youtubeId}`,
    title,
    type: "youtube",
    youtubeId,
    tags: extra.tags || [],
  };
}

const SONGS = [
  /* TÜRKÇE ROMANTİK */
  YT("Sen Benim Şarkılarımsın", "9GEXm1k3a1E", { tags: ["Romantik", "Türkçe"] }),
  YT("Senden Daha Güzel", "3bfkyXtuIXk", { tags: ["Romantik", "Türkçe"] }),
  YT("Ben Bir Tek Kadın (Adam) Sevdim", "0Dps6y-Y-ko", { tags: ["Romantik", "Türkçe"] }),
  YT("Ben Sana Mecburum", "GzDGB70IVCM", { tags: ["Romantik", "Türkçe"] }),
  YT("Aşk", "CGNcI0Fsl9c", { tags: ["Romantik", "Türkçe"] }),

  /* R&B */
  YT("What You Won't Do For Love", "n9DmdAwUbxc", { tags: ["R&B", "İngilizce"] }),

  /* ROMANTİK – İSPANYOLCA */
  YT("La Mentira", "P8BLkulZGX8", { tags: ["Romantik", "İspanyolca"] }),
  YT("Love In Portofino", "AKDLoUSaPV8", { tags: ["Romantik", "İspanyolca"] }),
  YT("Besame Mucho", "M4z6xdu1iX8", { tags: ["Romantik", "İspanyolca"] }),
  YT("Historia de un Amor", "HzjE33U_gy8", { tags: ["Romantik", "İspanyolca"] }),

  /* ROMANTİK – İNGİLİZCE */
  YT("Dance Me to the End of Love", "8StKOyYY3Gs", { tags: ["Romantik", "İngilizce"] }),
  YT("I Love You Baby", "AiIBKcd4m5Q", { tags: ["Romantik", "İngilizce"] }),
  YT("And I Love You So", "SKp1HKM_4TY", { tags: ["Romantik", "İngilizce"] }),
];

/* =========================================================
   Utils
   ========================================================= */
function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
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
  return `${m}:${String(s).padStart(2, "0")}`;
}
function extractYouTubeId(input) {
  if (!input) return "";
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
    return "";
  }

  const host = (url.hostname || "").replace("www.", "");
  const v = url.searchParams.get("v");
  if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] || "";
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
  }

  if (url.pathname.includes("/shorts/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("shorts");
    const id = idx >= 0 ? parts[idx + 1] : "";
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
  }

  if (url.pathname.includes("/embed/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("embed");
    const id = idx >= 0 ? parts[idx + 1] : "";
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
  }

  if (host.endsWith("youtube.com") || host.endsWith("music.youtube.com")) {
    const m1 = url.pathname.match(/\/(v|embed)\/([a-zA-Z0-9_-]{11})/);
    if (m1) return m1[2];
  }
  return "";
}

/* =========================================================
   Audio convert helpers (unchanged logic)
   ========================================================= */
async function fileTo16kWavBlob(file, trimStart, trimEnd, targetSampleRate = 16000) {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);

  const startSample = Math.floor(trimStart * decoded.sampleRate);
  const endSample = Math.floor(trimEnd * decoded.sampleRate);
  const frameCount = Math.max(1, endSample - startSample);

  // mono mix
  const mono = audioCtx.createBuffer(1, frameCount, decoded.sampleRate);
  const out = mono.getChannelData(0);

  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const data = decoded.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      out[i] += data[startSample + i] / decoded.numberOfChannels;
    }
  }

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

  const writeString = (str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    offset += str.length;
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2; // PCM
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, byteRate, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitDepth, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let i = 0; i < pcm.length; i++, offset += 2) {
    view.setInt16(offset, pcm[i], true);
  }

  return new Blob([view], { type: "audio/wav" });
}

const NOTICE_TEXT = `Bu sayfa seri üretim öncesi deneme üretimi kapsamında oluşturulmuştur.
Ürünler sınırlı sayıda hazırlanmakta olup, ticari satış kapsamında değildir.
Amaç kullanıcı geri bildirimi ve ürün geliştirmedir. Fatura düzenlenmemektedir.
Katılım bedeli ve kargo daha sonraki aşamada paylaşılacaktır.`;

/* =========================================================
   MAIN
   ========================================================= */
export default function SesliOyuncakSiparis() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const fileDialogOpenRef = useRef(false);
  const fileInputRef = useRef(null);
  const fileInputRef2 = useRef(null);

  const [activeTab, setActiveTab] = useState("hazir");
  const [ytDurationSec, setYtDurationSec] = useState(null);

  const [formData, setFormData] = useState({
    musteriAdi: "",
    telefon: "",
    hazirClips: [],
    yukluDosyalar: [],
    youtubeLink: "",
    ytStartSec: "",
    ytEndSec: "",
  });

  const fmtSec2 = (n) => (Math.max(0, Number(n) || 0)).toFixed(2);

  const [showNotice, setShowNotice] = useState(false);

  const totalSec = useMemo(() => {
    return (formData.hazirClips || []).reduce((sum, c) => sum + Math.max(0, c.end - c.start), 0);
  }, [formData.hazirClips]);

  const hazirTotalSec = useMemo(() => {
    return (formData.hazirClips || []).reduce(
      (sum, c) => sum + Math.max(0, (Number(c.end) || 0) - (Number(c.start) || 0)),
      0
    );
  }, [formData.hazirClips]);

  const internetVideoId = useMemo(() => extractYouTubeId(formData.youtubeLink), [formData.youtubeLink]);

  useEffect(() => {
    if (!internetVideoId) setYtDurationSec(null);
  }, [internetVideoId]);

  useEffect(() => {
    if (!internetVideoId) {
      setYtDurationSec(null);
      setFormData((p) => ({ ...p, ytStartSec: "", ytEndSec: "" }));
    }
  }, [internetVideoId]);

  useEffect(() => {
    if (window.YT && window.YT.Player) return;
    if (document.querySelector('script[data-yt-iframe-api="1"]')) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.dataset.ytIframeApi = "1";
    document.body.appendChild(tag);
  }, []);

  useEffect(() => {
    setShowNotice(true);
  }, []);

  // Fix file dialog focus issues (same logic)
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
      if (document.visibilityState === "visible") cleanupAfterFileDialog();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Title + favicon (unchanged)
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.title = "Memora Ön Sipariş Ekranı";

    const href = "/memora-bg.png";
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = href;
  }, []);

  const resetByTab = (tab) => {
    setFormData((p) => {
      const prevUploads = p.yukluDosyalar || [];
      prevUploads.forEach((f) => {
        try {
          if (f?.url) URL.revokeObjectURL(f.url);
        } catch {}
        try {
          if (f?.preview16kUrl) URL.revokeObjectURL(f.preview16kUrl);
        } catch {}
      });

      const base = {
        ...p,
        hazirClips: [],
        yukluDosyalar: [],
        youtubeLink: "",
        ytStartSec: "",
        ytEndSec: "",
      };

      return base;
    });

    setYtDurationSec(null);
    setActiveTab(tab);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map((file) => ({
      preview16kUrl: "",
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

    e.target.value = "";
    e.target.blur?.();
  };

  const removeDosya = (id) => {
    setFormData((p) => {
      const target = p.yukluDosyalar.find((x) => x.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      if (target?.preview16kUrl) URL.revokeObjectURL(target.preview16kUrl);
      return { ...p, yukluDosyalar: p.yukluDosyalar.filter((x) => x.id !== id) };
    });
  };

  const updateDosya = (id, updates) => {
    setFormData((p) => ({
      ...p,
      yukluDosyalar: p.yukluDosyalar.map((x) => (x.id === id ? { ...x, ...updates } : x)),
    }));
  };

  const submitDisabled = useMemo(() => {
    if (!formData.musteriAdi.trim()) return true;
    if (!formData.telefon.trim()) return true;

    if (activeTab === "hazir") {
      const clips = formData.hazirClips || [];
      if (clips.length === 0) return true;

      const total = hazirTotalSec;
      if (total > MAX_TOTAL_SEC + 0.01) return true;

      const anyMissing = clips.some((c) => c.toyOk === false);
      if (anyMissing) return true;
    }

    if (activeTab === "yukle") {
      if (!formData.yukluDosyalar || formData.yukluDosyalar.length === 0) return true;
      const anyReady = formData.yukluDosyalar.some((f) => f?.isReady);
      if (!anyReady) return true;
      const anyTooLong = formData.yukluDosyalar.some((f) => f.trimEnd - f.trimStart > 310);
      if (anyTooLong) return true;
    }

    if (activeTab === "internet") {
      if (!internetVideoId) return true;

      const hasUpload = (formData.yukluDosyalar || []).length > 0;
      const hasManualRange = formData.ytStartSec !== "" && formData.ytEndSec !== "";

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
    formData.yukluDosyalar,
    formData.ytStartSec,
    formData.ytEndSec,
    activeTab,
    internetVideoId,
    ytDurationSec,
    hazirTotalSec,
    formData.hazirClips,
  ]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // VALIDATIONS (same)
    if (!formData.musteriAdi.trim() || !formData.telefon.trim()) {
      alert("Lütfen ad ve telefon bilgilerini doldurunuz.");
      return;
    }

    if (activeTab === "hazir") {
      const clips = formData.hazirClips || [];
      if (clips.length === 0) {
        alert("Lütfen en az bir hazır müzik ekleyin!");
        return;
      }

      const total = clips.reduce((s, c) => s + Math.max(0, Number(c.end) - Number(c.start)), 0);
      if (total > MAX_TOTAL_SEC + 0.01) {
        alert("Toplam süre 310 sn’yi aşıyor. Lütfen kısaltın.");
        return;
      }

      const missing = clips.find((c) => c.toyOk === false);
      if (missing) {
        alert("Bazı hazır müziklerde 16 kHz önizleme dosyası yok. Lütfen düzeltin veya başka parça seçin.");
        return;
      }
    }

    if (activeTab === "yukle" && formData.yukluDosyalar.length === 0) {
      alert("Lütfen en az bir dosya yükleyiniz.");
      return;
    }

    if (activeTab === "internet") {
      if (!internetVideoId) {
        alert("Link geçersizdir.");
        return;
      }

      const hasUpload = formData.yukluDosyalar.length > 0;
      const hasManualRange = formData.ytStartSec !== "" && formData.ytEndSec !== "";

      if (!hasUpload && !hasManualRange) {
        alert("YouTube seçimi için lütfen ses dosyasını yükleyiniz ya da süre aralığını belirtiniz.");
        return;
      }

      if (ytDurationSec && ytDurationSec > 310 && !hasUpload && !hasManualRange) {
        alert("Video 310 sn’den uzundur. Lütfen dosya yükleyiniz veya süre aralığı belirtiniz.");
        return;
      }

      if (hasManualRange) {
        const start = Number(formData.ytStartSec);
        const end = Number(formData.ytEndSec);

        if (isNaN(start) || isNaN(end) || end <= start) {
          alert("Lütfen geçerli bir başlangıç ve bitiş süresi giriniz.");
          return;
        }
        if (end - start > 310) {
          alert("Seçilen süre 310 sn’den uzundur. Lütfen aşağıdan süre aralığı belirtiniz.");
          return;
        }
        if (ytDurationSec && end > ytDurationSec) {
          alert("Bitiş süresi video süresinden büyük olamaz.");
          return;
        }
      }
    }

    setIsSubmitting(true);
    setSubmitMsg("Siparişiniz gönderiliyor…");

    const orderId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const upload16kFromLocalFiles = async (orderId_) => {
      const items = (formData.yukluDosyalar || []).filter((f) => f?.file);
      const out = [];

      for (const f of items) {
        const start = Number(f.trimStart ?? 0);
        const end = Number(f.trimEnd ?? 0);

        if (!isFinite(start) || !isFinite(end) || end <= start) continue;

        if (end - start > 310.01) {
          throw new Error(`Dosya ${f.name} için seçilen süre 310 sn’yi aşıyor.`);
        }

        const wavBlob = await fileTo16kWavBlob(f.file, start, end, 16000);

        const safeName = `${Date.now()}_${f.id || "file"}.wav`;
        const pathname = `orders/${orderId_}/16k/${safeName}`;

        const blob = await upload(pathname, wavBlob, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "audio/wav",
        });

        out.push({
          originalName: f.name,
          trimStart: start,
          trimEnd: end,
          blobPath: blob.pathname,
          blobUrl: blob.url,
        });
      }

      return out;
    };

    const fetchBlobFromPublicUrl = async (url) => {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`Preview indirilemedi: ${url}`);
      return await r.blob();
    };

    const blobTo16kWavBlob = async (blob, trimStart, trimEnd, targetSampleRate = 16000) => {
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);

      const safeStart = Math.max(0, Number(trimStart) || 0);
      const safeEnd = Math.min(Number(trimEnd) || 0, decoded.duration || safeStart);

      if (!isFinite(safeStart) || !isFinite(safeEnd) || safeEnd <= safeStart) {
        audioCtx.close?.();
        throw new Error("Geçersiz trim aralığı");
      }

      const startSample = Math.floor(safeStart * decoded.sampleRate);
      const endSample = Math.floor(safeEnd * decoded.sampleRate);
      const frameCount = Math.max(1, endSample - startSample);

      const mono = audioCtx.createBuffer(1, frameCount, decoded.sampleRate);
      const out = mono.getChannelData(0);

      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        const data = decoded.getChannelData(ch);
        for (let i = 0; i < frameCount; i++) {
          out[i] += data[startSample + i] / decoded.numberOfChannels;
        }
      }

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
    };

    const upload16kFromHazirClips = async (orderId_) => {
      const clips = formData.hazirClips || [];
      const out = [];

      for (const c of clips) {
        const start = Number(c.start ?? 0);
        const end = Number(c.end ?? 0);
        if (!isFinite(start) || !isFinite(end) || end <= start) continue;

        const toyUrl = c.toyUrl || `/previews16k/${c.songId}.mp3`;
        const mp3Blob = await fetchBlobFromPublicUrl(toyUrl);
        const wavBlob = await blobTo16kWavBlob(mp3Blob, start, end, 16000);

        const safeName = `${Date.now()}_${c.clipId || c.songId || "hazir"}.wav`;
        const pathname = `orders/${orderId_}/16k/${safeName}`;

        const blob = await upload(pathname, wavBlob, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "audio/wav",
        });

        out.push({
          source: "hazir",
          title: c.title,
          youtubeId: c.youtubeId,
          trimStart: start,
          trimEnd: end,
          blobPath: blob.pathname,
          blobUrl: blob.url,
        });
      }

      return out;
    };

    try {
      let uploaded16k = [];

      if (activeTab === "yukle" && formData.yukluDosyalar.length > 0) {
        setSubmitMsg("16 kHz ses dosyası hazırlanıyor…");
        uploaded16k = await upload16kFromLocalFiles(orderId);
        setSubmitMsg("Dosyalar yükleniyor…");
      }

      if (activeTab === "hazir" && (formData.hazirClips || []).length > 0) {
        setSubmitMsg("16 kHz hazır müzik hazırlanıyor…");
        uploaded16k = await upload16kFromHazirClips(orderId);
        setSubmitMsg("Dosyalar yükleniyor…");
      }

      const ytStartSec = formData.ytStartSec !== "" ? Number(formData.ytStartSec) : null;
      const ytEndSec = formData.ytEndSec !== "" ? Number(formData.ytEndSec) : null;

      setSubmitMsg("Sipariş kaydediliyor…");
      const resp = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musteriAdi: formData.musteriAdi,
          telefon: formData.telefon,
          activeTab,
          orderId,
          uploaded16k,
          hazirClips: (formData.hazirClips || []).map((c) => ({
            title: c.title,
            youtubeId: c.youtubeId,
            start: c.start,
            end: c.end,
          })),
          youtubeLink: formData.youtubeLink || "",
          internetVideoId: internetVideoId || "",
          ytDurationSec: Number(ytDurationSec) || 0,
          ytStartSec,
          ytEndSec,
          yukluDosyaAdlari: (formData.yukluDosyalar || []).map((f) => f.name),
        }),
      });

      const j = await resp.json();
      if (!j.ok) {
        alert("Sipariş oluşturulamadı lütfen daha sonra tekrar deneyiniz. " + (j.error || "unknown"));
        return;
      }

      alert("Siparişiniz alındı! En kısa sürede sizinle iletişime geçeceğiz.");
    } catch (e) {
      alert("Sipariş oluşturulamadı lütfen daha sonra tekrar deneyiniz. " + (e?.message || e));
      return;
    } finally {
      setIsSubmitting(false);
      setSubmitMsg("");
    }
  };

  return (
    <>
      {/* GLOBAL THEME VARS */}
      <style jsx global>{THEME_VARS}</style>

      {/* GLOBAL SPIN ANIM */}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* LOADING OVERLAY */}
      {isSubmitting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(184,52,58,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 18,
              borderRadius: 12,
              minWidth: 260,
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--ui-input-text)" }}>
              Lütfen bekleyin
            </div>
            <div style={{ marginBottom: 12, color: "var(--ui-input-text)" }}>{submitMsg || "Gönderiliyor…"}</div>

            <div
              style={{
                width: 28,
                height: 28,
                border: "3px solid rgba(0,0,0,0.12)",
                borderTop: "3px solid var(--bg-primary)",
                borderRadius: "50%",
                margin: "0 auto",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        </div>
      )}

      {/* NOTICE MODAL */}
      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
          <div className="relative w-full max-w-xl rounded-2xl shadow-2xl border bg-white" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--ui-input-text)" }}>
                Önemli Bilgilendirme
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "rgba(58,31,31,0.85)" }}>
                {NOTICE_TEXT}
              </p>
              <button
                type="button"
                onClick={() => setShowNotice(false)}
                className="mt-5 w-full py-3 rounded-xl font-semibold hover:opacity-95"
                style={S.btnPrimary}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ui-btn-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ui-btn-bg)")}
              >
                Okudum, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

<div
  className="min-h-screen py-10 px-4"
  style={{
    backgroundImage: "url('/memora-bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
  }}
>
        <div className="max-w-2xl mx-auto">
          {/* HEADER */}
         <div className="rounded-3xl shadow-xl p-8 mb-8 text-center border" style={S.card}>
            <div
              className="w-32 h-32 mx-auto mb-4 rounded-2xl shadow-inner border overflow-hidden flex items-center justify-center"
              style={{
                background: "rgba(201,122,91,0.18)",
                borderColor: "rgba(201,122,91,0.22)",
              }}
            >
              <img
                src="/memora-bg.png"
                alt="MEMORA"
                className="w-full h-full object-cover"
                draggable={false}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Memora Ön Sipariş Ekranı
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>Sevdikleriniz için özel, sesli bir oyuncak oluşturun!</p>
          </div>

          {/* FORM */}
          <div className="rounded-3xl shadow-xl p-8 border" style={S.card}>
            {/* İLETİŞİM */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={S.titleOnWhite}>
                <User className="w-5 h-5 mr-2" style={{ color: "var(--accent-dark)" }} />
                İletişim Bilgileri
              </h2>

              <div className="space-y-4">
                <Input
                  label="Ad Soyad *"
                  value={formData?.musteriAdi ?? ""}
                  onChange={(v) => setFormData((p) => ({ ...p, musteriAdi: v }))}
                  placeholder="Ad soyad giriniz."
                />
                <Input
                  label="Telefon *"
                  value={formData?.telefon ?? ""}
                  onChange={(v) => setFormData((p) => ({ ...p, telefon: v }))}
                  placeholder="0555 555 55 55"
                />
              </div>
            </div>

            {/* MÜZİK */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold flex items-center mb-4" style={S.titleOnWhite}>
                <Music className="w-5 h-5 mr-2" style={{ color: "var(--accent-dark)" }} />
                Müzik Seçimi *
              </h2>

              <div
                className="rounded-xl p-4 mb-4 flex items-start gap-3 border"
                style={{
background: "rgba(246,188,170,0.14)",  // --accent’in transparanı
borderColor: "rgba(246,188,170,0.22)",
                }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--accent-dark)" }} />
                <div className="text-sm" style={{ color: "rgba(58,31,31,0.86)" }}>
                  <strong>Önemli:</strong> Seçmiş olduğunuz müziklerin toplam süresi maksimum 310 saniye (5dk 10sn)
                  olmalıdır.
                </div>
              </div>

              <div className="flex gap-2 mb-6 flex-wrap">
                <TabButton active={activeTab === "hazir"} onClick={() => resetByTab("hazir")}>
                  Hazır
                </TabButton>
                <TabButton active={activeTab === "yukle"} onClick={() => resetByTab("yukle")}>
                  Dosya
                </TabButton>
                <TabButton active={activeTab === "internet"} onClick={() => resetByTab("internet")}>
                  İnternet
                </TabButton>
              </div>

              <div
                className="rounded-xl p-6 border"
                style={{ background: "rgba(201,122,91,0.08)", borderColor: "rgba(201,122,91,0.18)" }}
              >
                {activeTab === "hazir" && (
                  <div className="mb-3 text-xs" style={{ color: "rgba(58,31,31,0.70)" }}>
                    Toplam: <b>{fmtSec2(totalSec)} sn</b> • Kalan: <b>{fmtSec2(MAX_TOTAL_SEC - totalSec)} sn</b>
                  </div>
                )}

                {activeTab === "hazir" && <HazirMuzikMulti formData={formData} setFormData={setFormData} />}

                {activeTab === "yukle" && (
                  <div>
                    <p className="text-sm mb-4" style={{ color: "rgba(58,31,31,0.80)" }}>
                      Dosya yükle (MP3 / WAV / M4A vb.)
                    </p>

                    <div
                      className="border-2 border-dashed rounded-xl p-8 text-center transition mb-4"
                      style={{
                        borderColor: "rgba(201,122,91,0.35)",
                        background: "white",
                      }}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--accent-dark)" }} />
                      <label className="cursor-pointer">
                        <span className="font-medium" style={{ color: "var(--accent-dark)" }}>
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
                        <p className="text-sm font-medium" style={{ color: "rgba(58,31,31,0.78)" }}>
                          Yüklenen Dosyalar:
                        </p>
                        {formData.yukluDosyalar.map((dosya) => (
                          <DosyaTrimmer key={dosya.id} dosya={dosya} onRemove={removeDosya} onUpdate={updateDosya} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "internet" && (
                  <>
                    <InternetMuzik
                      youtubeLink={formData.youtubeLink}
                      onChange={(v) => setFormData({ ...formData, youtubeLink: v })}
                      videoId={internetVideoId}
                      onDuration={(sec) => setYtDurationSec(sec)}
                    />

                    {internetVideoId && (
                      <div className="mt-3 text-xs" style={{ color: "rgba(58,31,31,0.72)" }}>
                        {ytDurationSec ? (
                          <>
                            Video süresi:{" "}
                            <b>
                              {Math.floor(ytDurationSec / 60)}:{String(Math.floor(ytDurationSec % 60)).padStart(2, "0")}
                            </b>
                          </>
                        ) : (
                          <>Video süresi okunuyor...</>
                        )}
                      </div>
                    )}

                    {internetVideoId && ytDurationSec && ytDurationSec > 310 && (
                      <div
                        className="mt-3 rounded-lg p-3 text-xs border"
                        style={{
                          background: "var(--danger-bg)",
                          borderColor: "var(--danger-border)",
                          color: "var(--danger)",
                        }}
                      >
                        Bu video <b>310 sn’den uzundur</b>. Lütfen ses dosyasını yükleyiniz ya da aşağıdan süre aralığı
                        belirtiniz.
                      </div>
                    )}

                    <div
                      className="mt-4 rounded-xl p-4 border"
                      style={{
                        background: "rgba(201,122,91,0.14)",
                        borderColor: "rgba(201,122,91,0.22)",
                      }}
                    >
                      <div className="text-sm font-semibold mb-2" style={{ color: "rgba(58,31,31,0.90)" }}>
                        Oyuncakta Duyulacak (16 kHz)
                      </div>

                      <p className="text-xs mb-3" style={{ color: "rgba(58,31,31,0.72)" }}>
                        YouTube’dan ses dönüştürülmez. Oyuncakta duyulacak 16 kHz önizleme için lütfen aynı müziğin
                        dosyasını yükleyin (MP3 / WAV / M4A vb.).
                      </p>

                      <label className="inline-flex items-center gap-2 cursor-pointer font-medium" style={{ color: "var(--accent-dark)" }}>
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

                    {formData.yukluDosyalar.length > 0 && (
                      <div className="mt-4 space-y-4">
                        <div className="text-sm font-medium" style={{ color: "rgba(58,31,31,0.78)" }}>
                          Yüklediğin dosya(lar) – burada kırpabilirsin:
                        </div>

                        {formData.yukluDosyalar.map((dosya) => (
                          <DosyaTrimmer key={dosya.id} dosya={dosya} onRemove={removeDosya} onUpdate={updateDosya} />
                        ))}
                      </div>
                    )}

                    <YouTubeRangePicker ytDurationSec={ytDurationSec} formData={formData} setFormData={setFormData} />
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={submitDisabled || isSubmitting}
              onClick={handleSubmit}
              className="w-full py-4 rounded-xl font-semibold text-lg transition shadow-lg"
style={
  submitDisabled || isSubmitting
    ? { background: "rgba(0,0,0,0.12)", color: "rgba(255,255,255,0.65)", cursor: "not-allowed" }
    : { background: "var(--ui-btn-bg)", color: "var(--ui-btn-text)" }
}
              onMouseEnter={(e) => {
                if (submitDisabled || isSubmitting) return;
                e.currentTarget.style.background = "var(--ui-btn-hover)";
              }}
              onMouseLeave={(e) => {
                if (submitDisabled || isSubmitting) return;
                e.currentTarget.style.background = "var(--ui-btn-bg)";
              }}
            >
              {isSubmitting ? "Gönderiliyor…" : "Siparişi Tamamla"}
            </button>

            <p className="text-xs text-center mt-4" style={{ color: "rgba(58,31,31,0.55)" }}>
              Siparişiniz alındıktan sonra sizinle iletişime geçeceğiz
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   BASIC UI
   ========================================================= */
function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: "rgba(58,31,31,0.80)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-4 py-3 rounded-xl outline-none transition border-2"
        style={S.input}
        placeholder={placeholder}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-dark)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ui-input-border)")}
      />
    </div>
  );
}

function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-[140px] py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 border"
      style={
        active
          ? { background: "var(--ui-btn-bg)", color: "white", borderColor: "rgba(0,0,0,0.06)", boxShadow: "0 10px 20px rgba(0,0,0,0.08)" }
          : { background: "rgba(201,122,91,0.10)", color: "rgba(58,31,31,0.78)", borderColor: "rgba(201,122,91,0.20)" }
      }
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.background = "rgba(201,122,91,0.16)";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.background = "rgba(201,122,91,0.10)";
      }}
    >
      {icon}
      {children}
    </button>
  );
}

/* =========================================================
   HazirMuzikMulti (theme colors applied)
   ========================================================= */
function HazirMuzikMulti({ formData, setFormData }) {
  const [query, setQuery] = useState("");
  const [selectedSongId, setSelectedSongId] = useState("");

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
    return (formData.hazirClips || []).reduce(
      (sum, c) => sum + Math.max(0, (Number(c.end) || 0) - (Number(c.start) || 0)),
      0
    );
  }, [formData.hazirClips]);

  const remaining = Math.max(0, MAX_TOTAL_SEC - totalSec);
  const selected = SONGS.find((s) => s.id === selectedSongId);

  const readDuration = (url) =>
    new Promise((resolve) => {
      const a = new Audio();
      a.preload = "metadata";
      a.src = url;
      a.onloadedmetadata = () => resolve(a.duration || 0);
      a.onerror = () => resolve(0);
      a.load();
    });

  const headExists = async (url) => {
    try {
      const r = await fetch(url, { method: "HEAD", cache: "no-store" });
      return !!r.ok;
    } catch {
      return false;
    }
  };

  const addClip = async () => {
    if (!selected) return;

    if (remaining < 0.5) {
      alert("Toplam süre 310 sn sınırında. Yeni parça eklemek için önce bir parçayı kısaltın veya silin.");
      return;
    }

    const toyUrl = `/previews16k/${selected.id}.mp3`;
    const ok = await headExists(toyUrl);
    const dur = await readDuration(toyUrl);

    const maxLenForNew = remaining;
    const endByRemaining = maxLenForNew;
    const endByDur = dur > 0 ? dur : endByRemaining;
    const end = Math.min(endByDur, endByRemaining);

    const clip = {
      clipId: makeId(),
      songId: selected.id,
      title: selected.title,
      youtubeId: selected.youtubeId,
      toyUrl,
      songDur: dur || 0,
      start: 0,
      end: Math.max(0.5, end),
      toyOk: ok,
      tags: selected.tags || [],
    };

    const addLen = Math.max(0, clip.end - clip.start);
    if (totalSec + addLen > MAX_TOTAL_SEC + 0.01) {
      alert("Bu ekleme toplam süreyi 310 sn üstüne çıkarır. Önce bir parçayı kısaltın.");
      return;
    }

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

  const updateClip = (clipId, updates) => {
    setFormData((p) => {
      const clips = p.hazirClips || [];
      const idx = clips.findIndex((c) => c.clipId === clipId);
      if (idx < 0) return p;

      const next = { ...clips[idx], ...updates };

      const othersTotal = clips.reduce((sum, c, i) => {
        if (i === idx) return sum;
        return sum + Math.max(0, (Number(c.end) || 0) - (Number(c.start) || 0));
      }, 0);

      const maxLen = Math.max(0.5, MAX_TOTAL_SEC - othersTotal);
      const minEnd = (Number(next.start) || 0) + 0.5;

      const hardMaxEnd = next.songDur && next.songDur > 0 ? next.songDur : Infinity;
      const allowedEnd = Math.min((Number(next.start) || 0) + maxLen, hardMaxEnd);

      if ((Number(next.end) || 0) > allowedEnd) next.end = allowedEnd;
      if ((Number(next.end) || 0) < minEnd) next.end = minEnd;

      const newClips = clips.slice();
      newClips[idx] = next;
      return { ...p, hazirClips: newClips };
    });
  };

  return (
    <div>
      <div className="mb-3 text-xs" style={{ color: "rgba(58,31,31,0.70)" }}>
        Toplam: <b>{Math.round(totalSec)} sn</b> • Kalan: <b>{Math.max(0, Math.round(MAX_TOTAL_SEC - totalSec))} sn</b>
      </div>

      <p className="text-sm mb-3" style={{ color: "rgba(58,31,31,0.80)" }}>
        Hazır müzik ekle (çoklu seçim):
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-xl outline-none transition border-2 mb-3"
        style={S.input}
        placeholder="Ara: Şarkı İsmi / Tür / Dil"
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-dark)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ui-input-border)")}
      />

      <div className="flex gap-2">
        <select
          value={selectedSongId}
          onChange={(e) => setSelectedSongId(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl outline-none transition border-2"
          style={S.input}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-dark)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ui-input-border)")}
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
          className="px-4 rounded-xl font-semibold transition"
          style={
            selectedSongId
              ? { background: "var(--ui-btn-bg)", color: "white" }
              : { background: "rgba(0,0,0,0.10)", color: "rgba(0,0,0,0.45)", cursor: "not-allowed" }
          }
          onMouseEnter={(e) => {
            if (!selectedSongId) return;
            e.currentTarget.style.background = "var(--ui-btn-hover)";
          }}
          onMouseLeave={(e) => {
            if (!selectedSongId) return;
            e.currentTarget.style.background = "var(--ui-btn-bg)";
          }}
        >
          Ekle
        </button>
      </div>

      {(formData.hazirClips || []).length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="text-sm font-semibold" style={{ color: "rgba(58,31,31,0.88)" }}>
            Seçilen Parçalar (kırpılabilir):
          </div>
          {(formData.hazirClips || []).map((c) => (
            <HazirClipTrimmer key={c.clipId} clip={c} onRemove={() => removeClip(c.clipId)} onUpdate={(u) => updateClip(c.clipId, u)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   HazirClipTrimmer (theme sliders)
   ========================================================= */
function HazirClipTrimmer({ clip, onRemove, onUpdate }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeThumb, setActiveThumb] = useState(null);

  const MIN_GAP_LOCAL = 0.05;
  const STEP_NORMAL = 0.05;
  const STEP_FINE_LOCAL = typeof STEP_FINE !== "undefined" ? STEP_FINE : 0.005;

  const duration = Number(clip.songDur) || 0;
  const start = Number(clip.start) || 0;
  const end = Number(clip.end) || Math.max(0.5, start + 0.5);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => {
      const dur = a.duration || 0;
      if (!dur || !Number.isFinite(dur)) return;

      const safeStart = Math.max(0, Math.min(start, Math.max(0, dur - 0.5)));
      const safeEnd = Math.max(safeStart + 0.5, Math.min(end || dur, dur));

      if (!clip.songDur || Math.abs(Number(clip.songDur) - dur) > 0.01) {
        onUpdate({ songDur: dur, start: safeStart, end: safeEnd });
      } else {
        if (safeStart !== start || safeEnd !== end) onUpdate({ start: safeStart, end: safeEnd });
      }
    };

    a.addEventListener("loadedmetadata", onMeta);
    return () => a.removeEventListener("loadedmetadata", onMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.clipId, clip.id, clip.toyUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      if (!isPlaying) return;
      if (a.currentTime < start) a.currentTime = start;
      if (a.currentTime >= end) {
        a.pause();
        a.currentTime = start;
        setIsPlaying(false);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      try {
        a.currentTime = start;
      } catch {}
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
    };
  }, [isPlaying, start, end]);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a || !duration) return;

    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
      return;
    }

    try {
      a.currentTime = start;
      await a.play();
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
      alert("Tarayıcı ses çalmayı engelledi. Play’e tekrar bas.");
    }
  };

  const snap = (val, step) => Math.round(val / step) * step;
  const getStep = (e) => (e.shiftKey ? STEP_FINE_LOCAL : STEP_NORMAL);

  const handleStartChange = (e) => {
    const step = getStep(e);
    const raw = parseFloat(e.target.value);
    const value = snap(raw, step);

    const nextStart = Math.max(0, Math.min(value, end - MIN_GAP_LOCAL));
    onUpdate({ start: nextStart });

    if (audioRef.current && isPlaying) audioRef.current.currentTime = nextStart;
  };

  const handleEndChange = (e) => {
    const step = getStep(e);
    const raw = parseFloat(e.target.value);
    const value = snap(raw, step);

    const nextEnd = Math.min(duration, Math.max(value, start + MIN_GAP_LOCAL));
    onUpdate({ end: nextEnd });
  };

  const handleWheel = (type, e) => {
    e.preventDefault();
    const step = e.shiftKey ? STEP_FINE_LOCAL : STEP_NORMAL;
    const dir = e.deltaY < 0 ? step : -step;

    if (type === "start") {
      const nextStart = Math.max(0, Math.min(start + dir, end - MIN_GAP_LOCAL));
      onUpdate({ start: nextStart });
      if (audioRef.current && isPlaying) audioRef.current.currentTime = nextStart;
    } else {
      const nextEnd = Math.min(duration, Math.max(end + dir, start + MIN_GAP_LOCAL));
      onUpdate({ end: nextEnd });
    }
  };

  const selectedDuration = Math.max(0, end - start);
  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? (end / duration) * 100 : 0;

  return (
    <div className="bg-white border rounded-xl p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
      <style>{`
        .hazirTrimRange{
          -webkit-appearance:none;
          appearance:none;
          width:100%;
          height:26px;
          background:transparent;
          pointer-events:none;
          position:absolute;
          left:0;
          top:-10px;
        }
        .hazirTrimRange::-webkit-slider-runnable-track{
          height:0px;
          background:transparent;
          border:none;
        }
        .hazirTrimRange::-webkit-slider-thumb{
          -webkit-appearance:none;
          appearance:none;
          width:18px;
          height:18px;
          border-radius:9999px;
          background:white;
          border:2px solid var(--accent-dark);
          box-shadow:0 1px 3px rgba(0,0,0,0.25);
          pointer-events:auto;
          cursor:grab;
        }
        .hazirTrimRange.end::-webkit-slider-thumb{
          border-color:var(--accent-dark);
        }
        .hazirTrimRange::-moz-range-track{ background:transparent; border:none; }
        .hazirTrimRange::-moz-range-thumb{
          width:18px;height:18px;border-radius:9999px;
          background:white;border:2px solid var(--accent-dark);
          box-shadow:0 1px 3px rgba(0,0,0,0.25);
          pointer-events:auto;cursor:grab;
        }
        .hazirTrimRange.end::-moz-range-thumb{ border-color:var(--accent-dark); }
      `}</style>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold truncate" style={{ color: "rgba(58,31,31,0.90)" }}>
          {clip.title}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="px-3 py-2 rounded-lg text-sm transition"
            style={{ background: "rgba(201,122,91,0.16)", color: "rgba(58,31,31,0.90)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201,122,91,0.22)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(201,122,91,0.16)")}
            title={isPlaying ? "Durdur" : "Dinle"}
          >
            {isPlaying ? "Dur" : "Dinle"}
          </button>

          <button
            type="button"
            onClick={() => {
              try {
                audioRef.current?.pause?.();
              } catch {}
              setIsPlaying(false);
              onRemove?.();
            }}
            className="p-2 rounded-full transition"
            style={{ background: "var(--danger-bg)" }}
            title="Sil"
          >
            <X className="w-4 h-4" style={{ color: "var(--danger)" }} />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(58,31,31,0.78)" }}>
          Oyuncakta Duyulacak (16 kHz)
        </div>

        <audio ref={audioRef} src={clip.toyUrl} preload="metadata" />

        <div className="text-xs mt-2" style={{ color: "rgba(58,31,31,0.72)" }}>
          Başlangıç: <b>{formatTime(start)}</b> • Bitiş: <b>{formatTime(end)}</b> • Seçili: <b>{formatTime(selectedDuration)}</b>
        </div>

        <div className="text-[11px] mt-1" style={{ color: "rgba(58,31,31,0.55)" }}>
          İpucu: Hassas ayar için <b>SHIFT</b> basılıyken sürükle / tekerlek
        </div>
      </div>

      {duration > 0 ? (
        <div className="space-y-3 mt-4">
          <div
            className="h-2 rounded-lg"
            style={{
              background: `linear-gradient(to right,
                rgba(0,0,0,0.10) 0%,
                rgba(0,0,0,0.10) ${startPct}%,
                var(--accent-dark) ${startPct}%,
                var(--accent-dark) ${endPct}%,
                rgba(0,0,0,0.10) ${endPct}%,
                rgba(0,0,0,0.10) 100%)`,
            }}
          />

          <div className="relative mt-2 pt-7">
            <div
              className="absolute -top-1 text-[11px] px-2 py-1 rounded-md text-white shadow"
              style={{ left: `${startPct}%`, transform: "translateX(-50%)", background: "var(--accent)" }}
            >
              {formatTime(start)}
            </div>

            <div
              className="absolute -top-1 text-[11px] px-2 py-1 rounded-md text-white shadow"
              style={{ left: `${endPct}%`, transform: "translateX(-50%)", background: "var(--accent-dark)" }}
            >
              {formatTime(end)}
            </div>

            <input
              type="range"
              min="0"
              max={Math.max(0, duration - MIN_GAP_LOCAL)}
              step={STEP_FINE_LOCAL}
              value={start}
              onPointerDown={() => setActiveThumb("start")}
              onMouseDown={() => setActiveThumb("start")}
              onTouchStart={() => setActiveThumb("start")}
              onWheel={(e) => handleWheel("start", e)}
              onChange={handleStartChange}
              className="w-full hazirTrimRange start"
              style={{ zIndex: activeThumb === "start" ? 3 : 2 }}
            />

            <input
              type="range"
              min={MIN_GAP_LOCAL}
              max={duration}
              step={STEP_FINE_LOCAL}
              value={end}
              onPointerDown={() => setActiveThumb("end")}
              onMouseDown={() => setActiveThumb("end")}
              onTouchStart={() => setActiveThumb("end")}
              onWheel={(e) => handleWheel("end", e)}
              onChange={handleEndChange}
              className="w-full -mt-6 hazirTrimRange end"
              style={{ zIndex: activeThumb === "end" ? 3 : 2 }}
            />
          </div>

          <div className="flex justify-between text-xs mt-2" style={{ color: "rgba(58,31,31,0.55)" }}>
            <span>{formatTime(0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs" style={{ color: "rgba(58,31,31,0.65)" }}>
          ⏳ Önizleme hazırlanıyor... (toyUrl doğruysa 1–2 sn içinde slider gelir)
        </div>
      )}
    </div>
  );
}

/* =========================================================
   YouTubeRangePicker (theme applied)
   ========================================================= */
function YouTubeRangePicker({ ytDurationSec, formData, setFormData }) {
  const FALLBACK_MAX = 2 * 60 * 60;
  const videoMax = Math.floor(Number.isFinite(ytDurationSec) && ytDurationSec > 0 ? ytDurationSec : FALLBACK_MAX);

  const start = clamp(Number(formData.ytStartSec || 0), 0, Math.max(0, videoMax - 1));

  const endDefault = clamp(start + 30, 1, videoMax);
  const endInput = formData.ytEndSec === "" ? endDefault : Number(formData.ytEndSec);
  const end = clamp(endInput, 0, videoMax);

  const minEnd = clamp(start + 1, 1, videoMax);
  const maxEnd = clamp(Math.min(start + MAX_RANGE_SEC, videoMax), 1, videoMax);
  const safeEnd = clamp(end, minEnd, maxEnd);

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

  const startMaxMinute = Math.floor(Math.max(0, videoMax - 1) / 60);
  const startMinuteOptions = Array.from({ length: startMaxMinute + 1 }, (_, i) => i);

  const startLastSecMax = startMS.m === startMaxMinute ? Math.max(0, videoMax - 1) % 60 : 59;
  const startSecondOptions = Array.from({ length: startLastSecMax + 1 }, (_, i) => i);

  const endMin = toMS(minEnd);
  const endMax = toMS(maxEnd);

  const endMinuteOptions = Array.from({ length: endMax.m - endMin.m + 1 }, (_, k) => endMin.m + k);

  const endSecondOptions = (m) => {
    const lo = m === endMin.m ? endMin.s : 0;
    const hi = m === endMax.m ? endMax.s : 59;
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  };

  const setStartMS = (m, s) => {
    const nextStart = clamp(fromMS(m, s), 0, Math.max(0, videoMax - 1));
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
    <div className="mt-4 bg-white border rounded-xl p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
      <div className="text-sm font-semibold mb-2" style={{ color: "rgba(58,31,31,0.90)" }}>
        Süre Belirt (Opsiyonel)
      </div>

      <p className="text-xs mb-3" style={{ color: "rgba(58,31,31,0.72)" }}>
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
          </>
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border rounded-lg p-3" style={{ background: "rgba(201,122,91,0.10)", borderColor: "rgba(201,122,91,0.20)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "rgba(58,31,31,0.78)" }}>
            Başlangıç
          </div>
          <div className="flex gap-2">
            <select
              className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white outline-none"
              style={{ borderColor: "rgba(201,122,91,0.25)", color: "var(--ui-input-text)" }}
              value={startMS.m}
              onChange={(e) => setStartMS(Number(e.target.value), startMS.s)}
            >
              {startMinuteOptions.map((m) => (
                <option key={m} value={m}>
                  {m} dk
                </option>
              ))}
            </select>

            <select
              className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white outline-none"
              style={{ borderColor: "rgba(201,122,91,0.25)", color: "var(--ui-input-text)" }}
              value={startMS.s}
              onChange={(e) => setStartMS(startMS.m, Number(e.target.value))}
            >
              {startSecondOptions.map((s) => (
                <option key={s} value={s}>
                  {String(s).padStart(2, "0")} sn
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 text-[11px]" style={{ color: "rgba(58,31,31,0.55)" }}>
            Seçilen: <b>{fmtMS(start)}</b>
          </div>
        </div>

        <div className="border rounded-lg p-3" style={{ background: "rgba(201,122,91,0.10)", borderColor: "rgba(201,122,91,0.20)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "rgba(58,31,31,0.78)" }}>
            Bitiş
          </div>
          <div className="flex gap-2">
            <select
              className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white outline-none"
              style={{ borderColor: "rgba(201,122,91,0.25)", color: "var(--ui-input-text)" }}
              value={endMS.m}
              onChange={(e) => {
                const m = Number(e.target.value);
                const secs = endSecondOptions(m);
                const nextS = secs.includes(endMS.s) ? endMS.s : secs[0];
                setEndMS(m, nextS);
              }}
            >
              {endMinuteOptions.map((m) => (
                <option key={m} value={m}>
                  {m} dk
                </option>
              ))}
            </select>

            <select
              className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white outline-none"
              style={{ borderColor: "rgba(201,122,91,0.25)", color: "var(--ui-input-text)" }}
              value={endMS.s}
              onChange={(e) => setEndMS(endMS.m, Number(e.target.value))}
            >
              {endSecondOptions(endMS.m).map((s) => (
                <option key={s} value={s}>
                  {String(s).padStart(2, "0")} sn
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 text-[11px]" style={{ color: "rgba(58,31,31,0.55)" }}>
            Seçilen: <b>{fmtMS(safeEnd)}</b> • Aralık: <b>{fmtMS(safeEnd - start)}</b>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px]" style={{ color: "rgba(58,31,31,0.55)" }}>
        Sistem, bitişi otomatik olarak <b>başlangıç + {fmtMS(MAX_RANGE_SEC)}</b> sınırı içinde tutar.
      </div>
    </div>
  );
}

/* =========================================================
   InternetMuzik (theme applied)
   ========================================================= */
function InternetMuzik({ youtubeLink, onChange, videoId, onDuration }) {
  const hasInput = (youtubeLink || "").trim().length > 0;
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
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        width: "100%",
        height: "220",
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
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId, onDuration]);

  return (
    <div>
      <p className="text-sm mb-3" style={{ color: "rgba(58,31,31,0.80)" }}>
        YouTube linki gir (yapıştırınca otomatik önizleme çıkar):
      </p>

      <input
        type="url"
        value={youtubeLink}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl outline-none transition border-2 bg-white"
        style={S.input}
        placeholder="https://youtube.com/watch?v=...  veya  https://youtu.be/..."
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-dark)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ui-input-border)")}
      />

      {hasInput && !videoId && (
        <div className="mt-3 rounded-lg p-3 flex items-start gap-2 border" style={{ background: "var(--danger-bg)", borderColor: "var(--danger-border)" }}>
          <AlertCircle className="w-4 h-4 mt-0.5" style={{ color: "var(--danger)" }} />
          <div className="text-xs" style={{ color: "var(--danger)" }}>
            Linki YouTube olarak okuyamadım.
          </div>
        </div>
      )}

      {videoId && (
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2" style={{ color: "rgba(58,31,31,0.78)" }}>
            Önizleme:
          </div>
          <div className="rounded-xl overflow-hidden border bg-white" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
            <div ref={hostRef} />
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DosyaTrimmer (theme + slider colors)
   ========================================================= */
function DosyaTrimmer({ dosya, onRemove, onUpdate }) {
  const MAX_DURATION = 310;
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeThumb, setActiveThumb] = useState(null);
  const audioRef = useRef(null);

  const MIN_GAP_LOCAL = 0.05;
  const STEP_NORMAL = 0.05;
  const STEP_FINE_LOCAL = 0.005;

  useEffect(() => {
    if (!dosya.isReady) return;
    if (dosya.trimEnd <= dosya.trimStart) return;

    const t = setTimeout(async () => {
      try {
        if (dosya.preview16kUrl) URL.revokeObjectURL(dosya.preview16kUrl);
        onUpdate(dosya.id, { preview16kReady: false });

        const wavBlob = await fileTo16kWavBlob(dosya.file, dosya.trimStart, dosya.trimEnd, 16000);
        const purl = URL.createObjectURL(wavBlob);
        onUpdate(dosya.id, { preview16kUrl: purl, preview16kReady: true });
      } catch (e) {
        console.error("trim 16k failed", e);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [dosya.isReady, dosya.trimStart, dosya.trimEnd]);

  useEffect(() => {
    let cancelled = false;

    if (dosya.isReady && dosya.duration > 0) return;

    const probe = new Audio();
    probe.preload = "metadata";
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
        retry.preload = "metadata";
        retry.src = dosya.url;
        retry.onloadedmetadata = () => done(retry.duration);
        retry.load();
      }, 150);
    };

    probe.load();

    return () => {
      cancelled = true;
      probe.src = "";
    };
  }, [dosya.id, dosya.url]);

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

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [isPlaying, dosya.trimStart, dosya.trimEnd]);

  const formatTime = (s) => {
    if (s === null || s === undefined || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const snap = (val, step) => Math.round(val / step) * step;
  const getStep = (e) => (e.shiftKey ? STEP_FINE_LOCAL : STEP_NORMAL);

  const handleStartChange = (e) => {
    const step = getStep(e);
    const raw = parseFloat(e.target.value);
    const value = snap(raw, step);
    const clamped = Math.min(value, dosya.trimEnd - MIN_GAP_LOCAL);
    const next = Math.max(0, clamped);

    onUpdate(dosya.id, { trimStart: next });
    if (audioRef.current && isPlaying) audioRef.current.currentTime = next;
  };

  const handleEndChange = (e) => {
    const step = getStep(e);
    const raw = parseFloat(e.target.value);
    const value = snap(raw, step);

    const hardEnd = Math.min(dosya.trimStart + MAX_DURATION, dosya.duration);
    const clamped = Math.max(value, dosya.trimStart + MIN_GAP_LOCAL);
    const next = Math.min(clamped, hardEnd);

    onUpdate(dosya.id, { trimEnd: next });
  };

  const handleWheel = (type, e) => {
    e.preventDefault();
    const step = e.shiftKey ? STEP_FINE_LOCAL : STEP_NORMAL;
    const dir = e.deltaY < 0 ? step : -step;

    if (type === "start") {
      const next = Math.min(Math.max(0, dosya.trimStart + dir), dosya.trimEnd - MIN_GAP_LOCAL);
      onUpdate(dosya.id, { trimStart: next });
      if (audioRef.current && isPlaying) audioRef.current.currentTime = next;
    } else {
      const hardEnd = Math.min(dosya.trimStart + MAX_DURATION, dosya.duration);
      const next = Math.max(Math.min(dosya.trimEnd + dir, hardEnd), dosya.trimStart + MIN_GAP_LOCAL);
      onUpdate(dosya.id, { trimEnd: next });
    }
  };

  const selectedDuration = dosya.trimEnd - dosya.trimStart;
  const startPct = dosya.duration ? (dosya.trimStart / dosya.duration) * 100 : 0;
  const endPct = dosya.duration ? (dosya.trimEnd / dosya.duration) * 100 : 0;

  return (
    <div className="bg-white border rounded-xl p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
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
          border: 2px solid var(--accent-dark);
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          pointer-events: auto;
          cursor: grab;
        }
        .trimRange.end::-webkit-slider-thumb { border-color: var(--accent-dark); }
        .trimRange::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: white;
          border: 2px solid var(--accent-dark);
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          pointer-events: auto;
          cursor: grab;
        }
        .trimRange.end::-moz-range-thumb { border-color: var(--accent-dark); }
        .trimRange::-moz-range-track { background: transparent; border: none; }
      `}</style>

      <audio ref={audioRef} src={dosya.url} preload="metadata" />

      <div className="mt-3">
        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(58,31,31,0.78)" }}>
          Orijinal Ses
        </div>
        <audio controls src={dosya.url} className="w-full" />
      </div>

      <div className="mt-3">
        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(58,31,31,0.78)" }}>
          Oyuncakta Duyulacak (16 kHz)
        </div>

        {!dosya.preview16kReady && <div className="text-xs" style={{ color: "rgba(58,31,31,0.65)" }}>⏳ 16 kHz önizleme hazırlanıyor...</div>}
        {dosya.preview16kReady && dosya.preview16kUrl && <audio controls src={dosya.preview16kUrl} className="w-full" />}
      </div>

      <div className="flex items-center justify-between mb-3 mt-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <span className="text-sm truncate block" style={{ color: "rgba(58,31,31,0.90)" }}>
              {dosya.name}
            </span>
            {!dosya.isReady ? (
              <span className="text-xs animate-pulse" style={{ color: "rgba(58,31,31,0.65)" }}>
                ⏳ Dosya hazırlanıyor...
              </span>
            ) : (
<span className="text-xs" style={{ color: "var(--wave-primary)" }}>
  ✓ Hazır - Toplam: {formatTime(dosya.duration)}
</span>
            )}
            <div className="text-[11px] mt-1" style={{ color: "rgba(58,31,31,0.55)" }}>
              İpucu: Hassas ayar için <b>SHIFT</b> + <b>mouse tekerleğini</b> kullanınız
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(dosya.id)}
          className="p-2 rounded-full transition flex-shrink-0"
          style={{ background: "var(--danger-bg)" }}
          title="Sil"
        >
          <X className="w-4 h-4" style={{ color: "var(--danger)" }} />
        </button>
      </div>

      {dosya.isReady && dosya.duration > 0 && (
        <div className="space-y-3 mt-4">
          <div className="flex justify-between text-xs" style={{ color: "rgba(58,31,31,0.75)" }}>
            <span>
              Başlangıç: <strong>{formatTime(dosya.trimStart)}</strong>
            </span>
            <span>
              Bitiş: <strong>{formatTime(dosya.trimEnd)}</strong>
            </span>
            <span style={{ fontWeight: 700, color: selectedDuration > 310 ? "var(--danger)" : "var(--wave-primary)" }}>
              Süre: {formatTime(selectedDuration)}
            </span>
          </div>

          <div className="relative">
            <div
              className="h-2 rounded-lg"
              style={{
                background: `linear-gradient(to right,
                  rgba(0,0,0,0.10) 0%,
                  rgba(0,0,0,0.10) ${startPct}%,
                  var(--accent-dark) ${startPct}%,
                  var(--accent-dark) ${endPct}%,
                  rgba(0,0,0,0.10) ${endPct}%,
                  rgba(0,0,0,0.10) 100%)`,
              }}
            />

            <input
              type="range"
              min="0"
              max={Math.max(0, dosya.duration - MIN_GAP_LOCAL)}
              step={STEP_FINE_LOCAL}
              value={dosya.trimStart}
              onPointerDown={() => setActiveThumb("start")}
              onMouseDown={() => setActiveThumb("start")}
              onTouchStart={() => setActiveThumb("start")}
              onWheel={(e) => handleWheel("start", e)}
              onChange={handleStartChange}
              className="trimRange start"
              style={{ zIndex: activeThumb === "start" ? 3 : 2 }}
            />

            <input
              type="range"
              min={MIN_GAP_LOCAL}
              max={dosya.duration}
              step={STEP_FINE_LOCAL}
              value={dosya.trimEnd}
              onPointerDown={() => setActiveThumb("end")}
              onMouseDown={() => setActiveThumb("end")}
              onTouchStart={() => setActiveThumb("end")}
              onWheel={(e) => handleWheel("end", e)}
              onChange={handleEndChange}
              className="trimRange end"
              style={{ zIndex: activeThumb === "end" ? 3 : 2 }}
            />

            <div className="flex justify-between text-xs mt-2" style={{ color: "rgba(58,31,31,0.50)" }}>
              <span>0:00</span>
              <span>{formatTime(dosya.duration)}</span>
            </div>
          </div>

          {selectedDuration > 310 && (
            <div className="rounded-lg p-2 flex items-center gap-2 border" style={{ background: "var(--danger-bg)", borderColor: "var(--danger-border)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--danger)" }} />
              <p className="text-xs" style={{ color: "var(--danger)" }}>
                Seçili süre 310 saniyeden fazla! Lütfen kısaltın.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
