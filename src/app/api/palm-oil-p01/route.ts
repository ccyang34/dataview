import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 棕榈油主力合约 01/05/09 同比分析数据
 * 数据源文件由 .github/workflows/palm-oil-update.yml 定时更新并提交入库。
 * 每次请求读取磁盘最新 JSON（force-dynamic），前端"刷新"按钮即可拿到 GitHub Action 更新后的数据。
 */
export async function GET() {
  try {
    const file = path.join(process.cwd(), "src", "data", "palm-oil-p01.json");
    if (!fs.existsSync(file)) {
      return NextResponse.json(
        { success: false, error: "数据文件尚未生成，请先运行 scripts/update-palm-oil.mjs" },
        { status: 404 }
      );
    }
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return NextResponse.json({
      success: true,
      data,
      meta: {
        fetch_date: data.fetch_date,
        updated_at: data.updated_at,
        source: data.source,
      },
    });
  } catch (error) {
    console.error("palm-oil-p01 API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
