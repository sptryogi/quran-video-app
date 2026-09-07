"use client";

import { useRef, useState } from "react";

type ImageItem = { base64: string; mimeType: string; previewUrl: string };
type ResultState = {
  id: string;
  operationName: string;
  judul: string;
  caption: string;
  videoUrl?: string;
  done: boolean;
  error?: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function GeneratorForm({ onNewResult }: { onNewResult: () => void }) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [productName, setProductName] = useState("");
  const [extraPrompt, setExtraPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 3 - images.length;
    const selected = Array.from(files).slice(0, remaining);
    const newItems: ImageItem[] = [];
    for (const file of selected) {
      const base64 = await fileToBase64(file);
      newItems.push({ base64, mimeType: file.type, previewUrl: URL.createObjectURL(file) });
    }
    setImages((prev) => [...prev, ...newItems]);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function pollStatus(id: string, operationName: string) {
    const poll = async () => {
      const res = await fetch(`/api/generate/status?id=${id}&operationName=${encodeURIComponent(operationName)}`);
      const data = await res.json();
      if (data.error) {
        setResult((prev) => (prev ? { ...prev, done: true, error: data.error } : prev));
        return;
      }
      if (data.done) {
        setResult((prev) => (prev ? { ...prev, done: true, videoUrl: data.videoUrl } : prev));
        onNewResult();
      } else {
        setTimeout(poll, 8000);
      }
    };
    poll();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (images.length === 0) {
      setErrorMsg("Upload minimal 1 gambar referensi produk dulu.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
          productName,
          extraPrompt,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
        setLoading(false);
        return;
      }
      setResult({
        id: data.id,
        operationName: data.operationName,
        judul: data.judul,
        caption: data.caption,
        done: false,
      });
      onNewResult();
      pollStatus(data.id, data.operationName);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="workspace">
      <form className="panel" onSubmit={handleSubmit}>
        <h2>Buat video baru</h2>

        <div className="field">
          <label>Gambar referensi produk (maksimal 3)</label>
          <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
            {images.length >= 3 ? "Sudah 3 gambar, hapus salah satu untuk ganti" : "Klik untuk pilih gambar"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          {images.length > 0 && (
            <div className="thumbs">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img.previewUrl}
                  alt={`Referensi ${idx + 1}`}
                  onClick={() => removeImage(idx)}
                  title="Klik untuk hapus"
                />
              ))}
            </div>
          )}
          <p className="hint">Klik gambar untuk menghapusnya. Lebih dari 1 gambar bersifat eksperimental di sisi AI.</p>
        </div>

        <div className="field">
          <label>Nama produk (opsional)</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Contoh: Al-Qur'an A5 Mumtaz"
          />
        </div>

        <div className="field">
          <label>Instruksi tambahan (opsional)</label>
          <textarea
            value={extraPrompt}
            onChange={(e) => setExtraPrompt(e.target.value)}
            placeholder="Contoh: tonjolkan warna sampul hijau, cocok untuk hadiah"
          />
        </div>

        <button className="btn-primary" disabled={loading}>
          {loading ? "Memulai..." : "Generate video & caption"}
        </button>
        {errorMsg && <p className="error-text">{errorMsg}</p>}
      </form>

      <div className="preview-panel">
        {!result && <div className="preview-empty">Hasil video dan caption akan muncul di sini</div>}

        {result && (
          <>
            {!result.done && (
              <div className="status-line">
                <span className="dot" />
                Sedang membuat video, biasanya 1-3 menit...
              </div>
            )}
            {result.done && result.error && <p className="error-text">{result.error}</p>}
            {result.done && result.videoUrl && (
              <video className="result-video" src={result.videoUrl} controls />
            )}
            <div className="result-text">
              <h3>{result.judul}</h3>
              <p>{result.caption}</p>
            </div>
            {result.done && result.videoUrl && (
              <div className="download-row">
                <a className="btn-secondary" href={result.videoUrl} download>
                  Unduh video
                </a>
                <button
                  className="btn-secondary"
                  onClick={() => navigator.clipboard.writeText(result.caption)}
                >
                  Salin caption
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
