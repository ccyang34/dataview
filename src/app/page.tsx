"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Database,
  RefreshCw,
  BarChart3,
  ArrowRightLeft,
} from "lucide-react";
import {
  AreaChartComponent,
  DonutChart,
  KLineChart,
} from "@/components/charts";
import Link from "next/link";

interface MarketIndex {
  symbol: string;
  name: string;
  current: number;
  change: number;
  changePct: number;
  time: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  isStock?: boolean;
}

function StatCard({ title, value, change, icon, isStock = true }: StatCardProps) {
  const isPositive = change >= 0;
  // Financial coloring: A-Share usually Red for UP, Green for DOWN
  // But standard UI is Green for UP, Red for DOWN. Let's stick to standard for consistency with previous charts.
  const colorClass = isPositive ? "text-[var(--success)]" : "text-[var(--danger)]";
  const bgClass = isPositive ? "bg-[var(--success)]/10" : "bg-[var(--danger)]/10";
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="card p-3 sm:p-5 group hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-[var(--muted)] mb-0.5 sm:mb-1 truncate">{title}</p>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <p className="text-base sm:text-xl font-bold tracking-tight truncate">{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 1 }) : value}</p>
          </div>
          <div className={`flex items-center gap-0.5 sm:gap-1 mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold ${colorClass}`}>
            <Icon className="w-2.5 h-2.5 sm:w-3 h-3" />
            <span>{isPositive ? "+" : ""}{change.toFixed(2)}%</span>
          </div>
        </div>
        <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${bgClass} ${colorClass} group-hover:scale-110 transition-transform shrink-0`}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-3.5 h-3.5 sm:w-5 h-5" }) : icon}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [kdata, setKData] = useState<any[]>([]);
  const [crushLatest, setCrushLatest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeK, setActiveK] = useState("sh000001");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mRes, kRes, cRes] = await Promise.all([
        fetch('/api/market/indices'),
        fetch(`/api/market/kline?symbol=${activeK}`),
        fetch('/api/crush-margin')
      ]);

      const mData = await mRes.json();
      const kData = await kRes.json();
      const cData = await cRes.json();

      if (mData.success) setIndices(mData.data);
      if (kData.success) setKData(kData.data);
      if (cData.success && cData.data.length > 0) {
        setCrushLatest(cData.data[cData.data.length - 1]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(timer);
  }, [activeK]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />

      <main className="pt-16 sm:pt-20 pb-8 sm:pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-2 text-[var(--primary)]">
              <Activity className="w-4 h-4 sm:w-5 h-5 animate-pulse" />
              <span className="text-[10px] sm:text-sm font-bold tracking-widest uppercase">Finance Hub</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">全球金融市场概览</h1>
            <p className="text-xs sm:text-[var(--muted)]">实时追踪指数行情、压榨利润及行业数据</p>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="btn btn-secondary flex items-center gap-2 px-6 py-2.5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "更新中..." : "实时刷新"}
          </button>
        </div>

        {/* Indices Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {indices.slice(0, 4).map((idx) => (
            <StatCard
              key={idx.symbol}
              title={idx.name}
              value={idx.current}
              change={idx.changePct}
              icon={<Globe className="w-5 h-5" />}
            />
          ))}
          {/* Soy Crush Margin Spotlight */}
          {crushLatest && (
            <div className="sm:col-span-2 lg:col-span-4 mt-2">
              <Link href="/analysis/crush-margin" className="block">
                <div className="card p-3 sm:p-4 border-l-4 border-[var(--primary)] hover:translate-x-1 transition-all flex items-center justify-between bg-gradient-to-r from-[var(--primary)]/5 to-transparent">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-[var(--primary)] text-white rounded-lg sm:rounded-xl shadow-lg shadow-[var(--primary)]/20">
                      <ArrowRightLeft className="w-4 h-4 sm:w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm">最新榨利分析</h3>
                      <p className="text-[10px] sm:text-xs text-[var(--muted)]">截止: {crushLatest.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] sm:text-xs text-[var(--muted)] block">现货榨利</span>
                    <span className={`text-base sm:text-xl font-black ${crushLatest.grossMargin >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {crushLatest.grossMargin.toFixed(0)} <small className="text-[9px] sm:text-[10px] opacity-70">元/吨</small>
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart: KLine */}
          <div className="lg:col-span-2 card overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]/50">
              <div>
                <h3 className="font-bold text-sm sm:text-lg flex items-center gap-2">
                  <span className="w-1.5 sm:w-2 h-4 sm:h-5 bg-[var(--primary)] rounded-full" />
                  指数技术面分析
                </h3>
              </div>
              <div className="flex bg-[var(--background)] p-0.5 sm:p-1 rounded-lg border border-[var(--border)]">
                {[
                  { id: 'sh000001', n: '上证' },
                  { id: 'sz399001', n: '深证' },
                  { id: 'sz399006', n: '创业' }
                ].map(b => (
                  <button
                    key={b.id}
                    onClick={() => setActiveK(b.id)}
                    className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold rounded-md transition-all ${activeK === b.id ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--muted)] hover:bg-[var(--card-hover)]'}`}
                  >
                    {b.n}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2 sm:p-4 flex-1 min-h-[300px] sm:min-h-[400px]">
              {kdata.length > 0 ? (
                <KLineChart data={kdata} height={400} />
              ) : (
                <div className="flex items-center justify-center h-full opacity-30">加载数据中...</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Sector Distribution */}
            <div className="card p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--primary)]" />
                热门板块分布
              </h3>
              <DonutChart data={[
                { name: "能源", value: 400 },
                { name: "金融", value: 300 },
                { name: "技术", value: 500 },
                { name: "基建", value: 200 },
              ]} height={220} />
            </div>

            {/* Global Market Mini Cards */}
            <div className="card p-0 overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-[var(--border)] font-bold text-[10px] sm:text-xs uppercase tracking-widest text-[var(--muted)] bg-[var(--card)]/50">
                外盘早报
              </div>
              <div className="divide-y divide-[var(--border)]">
                {indices.slice(4).map(idx => (
                  <div key={idx.symbol} className="p-3 sm:p-4 flex items-center justify-between hover:bg-[var(--card-hover)] transition-colors">
                    <div>
                      <p className="font-bold text-xs sm:text-sm">{idx.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-[var(--muted)]">{idx.time.split(' ')[1] || idx.time}</p>
                    </div>
                    <div className={`text-right font-mono font-bold text-xs sm:text-sm ${idx.changePct >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {idx.changePct >= 0 ? '+' : ''}{idx.changePct.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-8 px-4 bg-[var(--card)]/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <span className="font-black text-[var(--foreground)] tracking-tighter">DATAVIEW</span>
            <span className="opacity-40">|</span>
            <p>© 2024 一站式金融数据可视化分析平台</p>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-[var(--primary)]">首页</Link>
            <Link href="/warehouse" className="hover:text-[var(--primary)]">仓库</Link>
            <Link href="/analysis/crush-margin" className="hover:text-[var(--primary)]">研究</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
