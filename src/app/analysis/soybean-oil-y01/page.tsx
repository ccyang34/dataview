"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { SoybeanOilCharts } from "@/components/charts/SoybeanOilCharts";
import { ReportToc, TocItem } from "@/components/charts/ReportToc";
import { SoybeanOilData } from "@/lib/soybean-oil-y01";
import { RefreshCw, Database, Clock } from "lucide-react";

const TOC: TocItem[] = [
  { id: "tldr", label: "核心结论", group: "先看这里" },
  { id: "kpi", label: "关键指标", group: "先看这里" },
  { id: "chart1", label: "① 历年窗口走势", group: "走势对比" },
  { id: "chart2", label: "② 平均路径对比", group: "走势对比" },
  { id: "chart3", label: "③ 窗口涨跌幅", group: "走势对比" },
  { id: "chart32", label: "③-2 起始→最高价", group: "走势对比" },
  { id: "table", label: "④ 数据明细", group: "数据口径" },
  { id: "method", label: "口径与方法说明", group: "数据口径" },
];

export default function SoybeanOilAnalysisPage() {
  const [data, setData] = useState<SoybeanOilData | null>(null);
  const [meta, setMeta] = useState<{ fetch_date: string; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/soybean-oil-y01", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json.data);
      setMeta(json.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />
      <main className="pt-20 pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 text-[var(--primary)]">
              <Database className="w-4 h-4" />
              <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">Commodity Seasonality</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight mt-1">豆油期货 01 / 05 / 09 主力合约 · 同比走势分析</h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              大商所豆油（Y）· 对称主力期窗口 · 数据源：新浪财经
              {meta && <span className="ml-2 inline-flex items-center gap-1"><Clock className="w-3 h-3" />更新于 {meta.fetch_date}</span>}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-secondary cursor-pointer disabled:opacity-50 px-3 py-1.5 text-xs sm:text-sm inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "刷新中..." : "刷新数据"}
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg">
            ❌ 加载失败：{error}
            <div className="text-xs mt-1 opacity-80">请确认已运行 <code>node scripts/update-soybean-oil.mjs</code> 生成数据文件。</div>
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
            <p className="mt-4 text-[var(--muted)]">正在加载数据...</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="flex flex-col lg:flex-row gap-5">
            <ReportToc items={TOC} />
            <div className="flex-1 min-w-0"><SoybeanOilCharts data={data} /></div>
          </div>
        )}
      </main>
    </div>
  );
}
