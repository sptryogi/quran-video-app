"use client";

import { useState } from "react";
import GeneratorForm from "./components/GeneratorForm";
import GalleryGrid from "./components/GalleryGrid";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <h1>
            Studio Video <em>Al-Qur'an</em>
          </h1>
          <p>Upload gambar produk, dapatkan video dan caption siap unggah ke TikTok Shop.</p>
        </div>
      </header>

      <GeneratorForm onNewResult={() => setRefreshKey((k) => k + 1)} />
      <GalleryGrid refreshKey={refreshKey} />
    </div>
  );
}
