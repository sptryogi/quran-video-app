-- Jalankan di SQL Editor Supabase (bisa project baru atau reuse yang lama)

CREATE TABLE generations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name                TEXT,
    extra_prompt                TEXT,
    judul                       TEXT,
    caption                     TEXT,
    operation_name              TEXT,
    video_url                   TEXT,
    status                      TEXT NOT NULL CHECK (status IN ('processing','success','failed')) DEFAULT 'processing',
    error_message               TEXT,
    used_fallback_single_image  BOOLEAN DEFAULT false,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at                TIMESTAMPTZ
);

CREATE INDEX idx_generations_created_at ON generations(created_at DESC);

-- Setelah ini, buka menu Storage di Supabase, buat 1 bucket baru namanya "videos", set jadi Public.
