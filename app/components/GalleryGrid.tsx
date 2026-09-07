"use client";

import { useEffect, useState } from "react";

type Generation = {
  id: string;
  product_name: string | null;
  judul: string;
  caption: string;
  video_url: string | null;
  status: string;
  created_at: string;
};

export default function GalleryGrid({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<Generation[]>([]);

  useEffect(() => {
    fetch("/api/generations")
      .then((res) => res.json())
      .then((data) => setItems(data.generations || []));
  }, [refreshKey]);

  if (items.length === 0) return null;

  return (
    <div className="gallery-section">
      <h2>Riwayat generate</h2>
      <div className="gallery-grid">
        {items.map((item) => (
          <div className="gallery-card" key={item.id}>
            {item.video_url ? (
              <video src={item.video_url} muted loop onMouseOver={(e) => (e.target as HTMLVideoElement).play()} />
            ) : (
              <div className="placeholder-thumb">
                {item.status === "processing" ? "Sedang diproses..." : "Gagal dibuat"}
              </div>
            )}
            <div className="gallery-card-body">
              <h4>{item.judul || item.product_name || "Tanpa judul"}</h4>
              <span className="status-badge">
                {new Date(item.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
