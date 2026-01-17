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
import TradingViewWidget from "@/components/charts/TradingViewWidget";
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
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [prevValue, setPrevValue] = useState(value);

  const isPositive = change >= 0;
  const colorClass = isPositive ? "text-[#ff4d4f]" : "text-[#52c41a]";
  const bgClass = isPositive ? "bg-[#ff4d4f]/10" : "bg-[#52c41a]/10";
  const Icon = isPositive ? TrendingUp : TrendingDown;

  // Real-time flash effect when value changes
  useEffect(() => {
    if (value !== prevValue) {
      setFlash(parseFloat(String(value)) > parseFloat(String(prevValue)) ? "up" : "down");
      setPrevValue(value);
      const timer = setTimeout(() => setFlash(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  return (
    <div className={`card p-2 sm:p-5 group hover:shadow-lg transition-all duration-500 border-2 ${flash === "up" ? "border-[#ff4d4f]/50 shadow-[0_0_15px_rgba(255,77,79,0.2)]" :
      flash === "down" ? "border-[#52c41a]/50 shadow-[0_0_15px_rgba(82,196,26,0.2)]" :
        "border-transparent"
      }`}>
      <div className="flex items-start justify-between gap-1 sm:gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-[var(--muted)] mb-0.5 sm:mb-1 truncate">{title}</p>
          <div className="flex items-baseline gap-0.5 sm:gap-2">
            <p className={`text-sm sm:text-xl font-bold tracking-tight truncate transition-colors duration-300 ${flash === "up" ? "text-[#ff4d4f]" : flash === "down" ? "text-[#52c41a]" : ""
              }`}>
              {/* Always show at least 2 decimal places to see micro-movements */}
              {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : value}
            </p>
          </div>
          <div className={`flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-2 text-[9px] sm:text-xs font-bold ${colorClass}`}>
            <Icon className="w-2 h-2 sm:w-3 h-3" />
            <span>{isPositive ? "+" : ""}{change.toFixed(2)}%</span>
          </div>
        </div>
        <div className={`hidden sm:flex p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${bgClass} ${colorClass} group-hover:scale-110 transition-transform shrink-0`}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-3.5 h-3.5 sm:w-5 h-5" }) : icon}
        </div>
      </div>
    </div>
  );
}

// 跑马灯项组件
function TickerItem({ label, value, change }: { label: string, value: number, change: number }) {
  const isPositive = change >= 0;
  return (
    <div className="flex items-center gap-2 px-4 border-r border-[var(--border)] whitespace-nowrap">
      <span className="text-[10px] font-medium text-[var(--muted)]">{label}</span>
      <span className="text-[10px] font-bold font-mono">{value.toLocaleString()}</span>
      <span className={`text-[10px] font-bold ${isPositive ? 'text-[#ff4d4f]' : 'text-[#52c41a]'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
      </span>
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
    // Keep internal state updated, don't show full loading after first time
    try {
      const [mRes, cRes] = await Promise.all([
        fetch('/api/market/indices'),
        fetch('/api/crush-margin')
      ]);

      const mData = await mRes.json();
      const cData = await cRes.json();

      if (mData.success) setIndices(mData.data);
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
    // Only show global loading on first mount
    fetchData();
    const timer = setInterval(() => {
      // Silent update
      fetch('/api/market/indices').then(res => res.json()).then(mData => {
        if (mData.success) setIndices(mData.data);
      });
      fetch('/api/crush-margin').then(res => res.json()).then(cData => {
        if (cData.success && cData.data.length > 0) {
          setCrushLatest(cData.data[cData.data.length - 1]);
        }
      });
    }, 3000); // 3 seconds real-time update
    return () => clearInterval(timer);
  }, []);

  // Update K-line separately when activeK changes or periodically
  useEffect(() => {
    const fetchK = async () => {
      const res = await fetch(`/api/market/kline?symbol=${activeK}`);
      const kData = await res.json();
      if (kData.success) setKData(kData.data);
    };
    fetchK();
    const kTimer = setInterval(fetchK, 60000);
  }, [activeK]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />

      {/* 第一部分：官方原厂移植滚动组件 (方案A) */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-[var(--card)] border-b border-[var(--border)] h-10 overflow-hidden">
        <iframe
          src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js?parent=null"
          title="TradingView Ticker Tape"
          className="w-full h-full border-none"
          ref={(el) => {
            if (el && !el.dataset.loaded) {
              const script = document.createElement('script');
              script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
              script.async = true;
              script.innerHTML = JSON.stringify({
                "symbols": [
                  { "proName": "FOREXCOM:SPX500", "title": "S&P 500" },
                  { "proName": "FOREXCOM:NSXUSD", "title": "Nasdaq 100" },
                  { "proName": "FX_IDC:USDCNH", "title": "USD/CNH" },
                  { "proName": "BITSTAMP:BTCUSD", "title": "Bitcoin" },
                  { "description": "黄金", "proName": "OANDA:XAUUSD" },
                  { "description": "原油", "proName": "TVC:USOIL" }
                ],
                "showSymbolLogo": true,
                "colorTheme": "dark",
                "isTransparent": true,
                "displayMode": "adaptive",
                "locale": "zh_CN"
              });
              el.parentElement?.appendChild(script);
              el.remove(); // 移除 placeholder
            }
          }}
        />
      </div>

      <main className="pt-28 sm:pt-32 pb-8 sm:pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-8">
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
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {indices.slice(0, 3).map((idx) => (
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
            <div className="col-span-3 lg:col-span-4 mt-2">
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
            <div className="flex-1 min-h-[450px] sm:min-h-[500px]">
              <TradingViewWidget
                symbol={activeK === 'sh000001' ? 'SSE:000001' : activeK === 'sz399001' ? 'SZSE:399001' : 'SZSE:399006'}
              />
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
              <div className="p-3 sm:p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card)]/50">
                <span className="font-bold text-[10px] sm:text-xs uppercase tracking-widest text-[var(--muted)]">全球市场 & 大宗商品</span>
                <span className="text-[9px] text-[var(--muted)] opacity-60">部分数据有延时</span>
              </div>
              <div className="divide-y divide-[var(--border)] overflow-y-auto max-h-[400px]">
                {indices.slice(4).map(idx => (
                  <div key={idx.symbol} className="p-3 sm:p-4 flex items-center justify-between hover:bg-[var(--card-hover)] transition-colors">
                    <div>
                      <p className="font-bold text-xs sm:text-sm">{idx.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-[var(--muted)]">{idx.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs font-medium">{idx.current.toLocaleString()}</p>
                      <p className={`font-mono font-bold text-[10px] sm:text-xs ${idx.changePct >= 0 ? 'text-[#ff4d4f]' : 'text-[#52c41a]'}`}>
                        {idx.changePct >= 0 ? '+' : ''}{idx.changePct.toFixed(2)}%
                      </p>
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
