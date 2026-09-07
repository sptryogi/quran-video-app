const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const VIDEO_MODEL = "veo-3.1-generate-preview";

type ReferenceImage = { base64: string; mimeType: string };

function apiKeyHeaders() {
  return { "x-goog-api-key": process.env.GEMINI_API_KEY!, "Content-Type": "application/json" };
}

const VIDEO_PROMPT_TEMPLATE = (productName: string, extraPrompt: string) => `
Video iklan TikTok Shop untuk produk Al-Qur'an${productName ? ` "${productName}"` : ""}.
Gaya video energik dan menarik ala TikTok, sinematik, close-up detail sampul dan kualitas kertas,
pencahayaan hangat, gerakan kamera yang smooth dan bikin penasaran, akhiri dengan visual ajakan checkout yang jelas.
Pastikan produk yang tampil PERSIS sama seperti gambar referensi - jangan mengganti desain sampul, warna, atau motif,
dan konsisten dari awal sampai akhir video.
${extraPrompt ? `Instruksi tambahan dari user: ${extraPrompt}` : ""}
`.trim();

const CAPTION_PROMPT_TEMPLATE = (productName: string, extraPrompt: string) => `
Buat JUDUL singkat menarik dan CAPTION iklan TikTok Shop untuk produk Al-Qur'an${productName ? ` "${productName}"` : ""},
berdasarkan gambar referensi produk yang diberikan.
Gaya bahasa persuasif khas TikTok Shop, ajak audiens klik Keranjang Kuning untuk checkout sekarang,
sebutkan keunggulan produk (kualitas kertas, cocok untuk ibadah/hadiah), sertakan urgensi (stok terbatas/promo hari ini),
sertakan hashtag relevan, gaya santai tapi tetap santun karena produk religius, maksimal 150 kata.
${extraPrompt ? `Instruksi tambahan dari user: ${extraPrompt}` : ""}
Balas HANYA dalam format JSON persis seperti ini tanpa teks lain: {"judul": "...", "caption": "..."}
`.trim();

/**
 * Mulai generate video. Kalau gambar referensi lebih dari 1, coba pakai
 * fitur referenceImages (maks 3, fitur ini kadang tidak stabil di API Google).
 * Kalau gagal, otomatis fallback pakai gambar pertama saja (mode "image" biasa, lebih stabil).
 */
export async function startVideoGeneration(
  images: ReferenceImage[],
  productName: string,
  extraPrompt: string
): Promise<{ operationName: string; usedFallback: boolean }> {
  const prompt = VIDEO_PROMPT_TEMPLATE(productName, extraPrompt);

  if (images.length > 1) {
    const multiBody = {
      instances: [
        {
          prompt,
          referenceImages: images.slice(0, 3).map((img) => ({
            image: { bytesBase64Encoded: img.base64, mimeType: img.mimeType },
            referenceType: "asset",
          })),
        },
      ],
      parameters: { durationSeconds: 8, aspectRatio: "9:16" },
    };

    const res = await fetch(`${GEMINI_BASE}/models/${VIDEO_MODEL}:predictLongRunning`, {
      method: "POST",
      headers: apiKeyHeaders(),
      body: JSON.stringify(multiBody),
    });

    if (res.ok) {
      const data = await res.json();
      return { operationName: data.name, usedFallback: false };
    }
    // kalau gagal (referenceImages belum didukung penuh), lanjut ke fallback di bawah
  }

  const singleBody = {
    instances: [
      {
        prompt,
        image: { bytesBase64Encoded: images[0].base64, mimeType: images[0].mimeType },
      },
    ],
    parameters: { durationSeconds: 8, aspectRatio: "9:16" },
  };

  const res = await fetch(`${GEMINI_BASE}/models/${VIDEO_MODEL}:predictLongRunning`, {
    method: "POST",
    headers: apiKeyHeaders(),
    body: JSON.stringify(singleBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal memulai generate video: ${errText}`);
  }
  const data = await res.json();
  return { operationName: data.name, usedFallback: images.length > 1 };
}

export async function checkVideoStatus(
  operationName: string
): Promise<{ done: boolean; videoUri?: string; error?: string }> {
  const res = await fetch(`${GEMINI_BASE}/${operationName}`, { headers: apiKeyHeaders() });
  if (!res.ok) {
    const errText = await res.text();
    return { done: true, error: errText };
  }
  const data = await res.json();
  if (!data.done) return { done: false };
  if (data.error) return { done: true, error: data.error.message };

  const videoUri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  return { done: true, videoUri };
}

export async function downloadVideoBytes(videoUri: string): Promise<Buffer> {
  const res = await fetch(videoUri, { headers: apiKeyHeaders() });
  if (!res.ok) throw new Error("Gagal mengunduh file video dari Gemini");
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateCaption(
  images: ReferenceImage[],
  productName: string,
  extraPrompt: string
): Promise<{ judul: string; caption: string }> {
  const parts: any[] = [{ text: CAPTION_PROMPT_TEMPLATE(productName, extraPrompt) }];
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  }

  const res = await fetch(`${GEMINI_BASE}/models/gemini-2.5-flash:generateContent`, {
    method: "POST",
    headers: apiKeyHeaders(),
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal generate caption: ${errText}`);
  }
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { judul: "Produk Al-Qur'an Pilihan", caption: cleaned };
  }
}
