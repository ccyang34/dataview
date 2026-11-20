import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 油脂研究数据库元信息（表清单/行数/来源），由 scripts/build-oil-database.mjs 生成 */
export async function GET() {
  try {
    const file = path.join(process.cwd(), "src", "data", "oil-database-meta.json");
    if (!fs.existsSync(file)) {
      return NextResponse.json({ success: false, error: "数据库元信息尚未生成，请先运行 scripts/build-oil-database.mjs" }, { status: 404 });
    }
    const meta = JSON.parse(fs.readFileSync(file, "utf-8"));
    return NextResponse.json({ success: true, meta });
  } catch (error) {
    console.error("oil-database API error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
