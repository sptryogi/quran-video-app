import { NextRequest, NextResponse } from "next/server";

// Basic auth sederhana: browser akan menampilkan dialog login bawaan.
// Cocok untuk tim internal kecil, bukan sistem akun multi-user.
export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expectedUser = process.env.APP_USERNAME || "admin";
  const expectedPass = process.env.APP_PASSWORD || "";

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString();
      const [user, pass] = decoded.split(":");
      if (user === expectedUser && pass === expectedPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Autentikasi diperlukan.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Quran Video Studio"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
