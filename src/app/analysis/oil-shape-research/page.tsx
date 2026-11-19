"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { OilShapeResearchCharts } from "@/components/charts/OilShapeResearchCharts";
import { OilShapeResearchData } from "@/lib/oil-shape-research";
import { RefreshCw, Database, Clock, FlaskConical } from "lucide-react";

export default function OilShapeResearchPage() {
  const [data, setData] = useState<OilShapeResearchData | null>(null);
  const [meta, setMeta] = useState<{ fetch_date: string; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/oil-shape-research", { cache: "no-store" });
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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 text-[var(--primary)]">
              <FlaskConical className="w-4 h-4" />
              <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">Shape Research · 形态研究</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight mt-1">油脂主力合约形态研究与 2705 预判</h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1 max-w-3xl">
              从「先走高再走低」的观察出发，验证形态、检验预判信号，到最后落到 2705 合约
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
            <div className="text-xs mt-1 opacity-80">请确认已运行 <code>node scripts/update-oil-shape-research.mjs</code> 生成数据文件。</div>
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
            <p className="mt-4 text-[var(--muted)]">正在加载数据...</p>
          </div>
        )}

        {!loading && !error && data && <OilShapeResearchCharts data={data} />}
      </main>
    </div>
  );
}
