import { NextRequest, NextResponse } from "next/server";
import { startVideoGeneration, generateCaption } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, productName, extraPrompt } = body as {
      images: { base64: string; mimeType: string }[];
      productName: string;
      extraPrompt: string;
    };

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "Minimal 1 gambar referensi diperlukan." }, { status: 400 });
    }
    if (images.length > 3) {
      return NextResponse.json({ error: "Maksimal 3 gambar referensi." }, { status: 400 });
    }

    const [videoResult, captionResult] = await Promise.all([
      startVideoGeneration(images, productName || "", extraPrompt || ""),
      generateCaption(images, productName || "", extraPrompt || ""),
    ]);

    const { data, error } = await supabaseAdmin
      .from("generations")
      .insert({
        product_name: productName || null,
        extra_prompt: extraPrompt || null,
        judul: captionResult.judul,
        caption: captionResult.caption,
        operation_name: videoResult.operationName,
        status: "processing",
        used_fallback_single_image: videoResult.usedFallback,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      operationName: videoResult.operationName,
      judul: captionResult.judul,
      caption: captionResult.caption,
      usedFallback: videoResult.usedFallback,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Terjadi kesalahan." }, { status: 500 });
  }
}
