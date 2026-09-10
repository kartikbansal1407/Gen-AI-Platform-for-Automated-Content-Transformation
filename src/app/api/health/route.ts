import { NextResponse } from "next/server";
import { getPool, hasDatabase } from "@/backend/db";

export async function GET() {
  let database = false;
  if (hasDatabase()) {
    try {
      await getPool().query("select 1 from transformation_jobs limit 1");
      database = true;
    } catch {
      database = false;
    }
  }

  // PDF §5.8H — extend health with elevenlabs/presenton/ingestion booleans
  const ingestion = {
    pdf: true, // via pdf-parse fallback — always best-effort
    docx: true, // via mammoth fallback
    vision: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
    video: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
  };

  return NextResponse.json({
    status: "ok",
    demoMode: !database,
    integrations: {
      database,
      ai: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
      aiProvider:
        process.env.AI_PROVIDER === "demo"
          ? "demo"
          : process.env.AI_PROVIDER === "openai" && process.env.OPENAI_API_KEY
            ? "openai"
            : process.env.GEMINI_API_KEY
              ? "gemini"
              : process.env.OPENAI_API_KEY
                ? "openai"
                : "demo",
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
      presenton: Boolean(process.env.PRESENTON_API_URL),
      ingestion,
    },
  });
}
