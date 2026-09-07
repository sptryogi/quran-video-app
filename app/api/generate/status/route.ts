import { NextRequest, NextResponse } from "next/server";
import { checkVideoStatus, downloadVideoBytes } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const operationName = req.nextUrl.searchParams.get("operationName");

  if (!id || !operationName) {
    return NextResponse.json({ error: "Parameter id dan operationName wajib." }, { status: 400 });
  }

  try {
    const status = await checkVideoStatus(operationName);

    if (!status.done) {
      return NextResponse.json({ done: false });
    }

    if (status.error || !status.videoUri) {
      await supabaseAdmin
        .from("generations")
        .update({ status: "failed", error_message: status.error || "Video URI tidak ditemukan" })
        .eq("id", id);
      return NextResponse.json({ done: true, error: status.error || "Gagal generate video" });
    }

    // Download dari Gemini lalu simpan permanen ke Supabase Storage
    const videoBytes = await downloadVideoBytes(status.videoUri);
    const filePath = `${id}.mp4`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("videos")
      .upload(filePath, videoBytes, { contentType: "video/mp4", upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseAdmin.storage.from("videos").getPublicUrl(filePath);
    const videoUrl = publicUrlData.publicUrl;

    await supabaseAdmin
      .from("generations")
      .update({ status: "success", video_url: videoUrl, completed_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ done: true, videoUrl });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Terjadi kesalahan." }, { status: 500 });
  }
}
