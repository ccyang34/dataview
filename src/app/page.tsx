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
  Zap,
  Newspaper,
  PieChart,
  Filter,
} from "lucide-react";
import {
  AreaChartComponent,
  PieChartComponent,
  DonutChart,
  KLineChart,
  ComparisonChart,
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
      } relative overflow-hidden`}>
      {/* 扫光特效 */}
      {flash && <div className={`absolute inset-0 opacity-10 animate-pulse ${flash === "up" ? "bg-[#ff4d4f]" : "bg-[#52c41a]"}`} />}

      <div className="flex items-start justify-between gap-1 sm:gap-2 relative z-10">
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
  const [sentiment, setSentiment] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [lhbData, setLhbData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [kdata, setKData] = useState<any[]>([]);
  const [crushLatest, setCrushLatest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeK, setActiveK] = useState("sh000001");
  const [mainChartType, setMainChartType] = useState<"kline" | "comparison">("kline");

  const fetchData = async () => {
    // Keep internal state updated, don't show full loading after first time
    try {
      const [mRes, cRes, sRes, nRes, lRes, compRes] = await Promise.all([
        fetch('/api/market/indices'),
        fetch('/api/crush-margin'),
        fetch('/api/market/sentiment'),
        fetch('/api/market/news'),
        fetch('/api/market/dragon-tiger'),
        fetch('/api/market/comparison')
      ]);

      const mData = await mRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      const nData = await nRes.json();
      const lData = await lRes.json();
      const compData = await compRes.json();

      if (mData.success) setIndices(mData.data);
      if (sData.success) setSentiment(sData.data);
      if (nData.success) setNews(nData.data);
      if (lData.success) setLhbData(lData.data);
      if (compData.success) setComparisonData(compData.data);
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
      fetch('/api/market/sentiment').then(res => res.json()).then(sData => {
        if (sData.success) setSentiment(sData.data);
      });
      fetch('/api/market/news').then(res => res.json()).then(nData => {
        if (nData.success) setNews(nData.data);
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
    return () => clearInterval(kTimer);
  }, [activeK]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />

      {/* 实时滚动行情条 - 自研高性能版 (100% 访问性) */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-[var(--card)]/90 backdrop-blur-md border-b border-[var(--border)] h-9 flex items-center overflow-hidden">
        <div className="flex animate-marquee-fast hover:pause-marquee py-1">
          {/* Double the list for seamless loop */}
          {[...indices, ...indices].map((idx, i) => (
            <TickerItem key={`${idx.symbol}-${i}`} label={idx.name} value={idx.current} change={idx.changePct} />
          ))}
        </div>
      </div>

      <main className="pt-24 sm:pt-28 pb-8 sm:pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-8">
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
        </div>

        {/* Mobile App Style Dashboard */}
        <div className="space-y-4">

          {/* 1. Main Market Overview Card (Black Theme) */}
          <div className="bg-[#1e1e1e] text-white rounded-xl p-4 shadow-lg relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />

            {/* Header: Northbound & Status */}
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3 bg-[#ff4d4f] rounded-full" />
                <span className="text-sm font-bold">A股 · 实时盘口</span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold flex items-center justify-end gap-1 ${sentiment?.northbound?.total >= 0 ? 'text-[#ff4d4f]' : 'text-[#52c41a]'}`}>
                  {sentiment?.northbound?.total > 0 ? '+' : ''}{sentiment?.northbound?.total?.toFixed(2)}亿
                  <ArrowRightLeft className="w-3 h-3" />
                </div>
                <div className="text-[10px] text-white/50">北向资金净流向</div>
              </div>
            </div>

            {/* Indices Row */}
            <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
              {indices.slice(0, 3).map((idx) => (
                <div key={idx.symbol} className="text-center">
                  <div className="text-[11px] text-white/70 mb-0.5">{idx.name}</div>
                  <div className={`text-lg font-bold leading-none mb-1 ${idx.changePct >= 0 ? 'text-[#ff4d4f]' : 'text-[#52c41a]'}`}>
                    {idx.current.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-medium flex justify-center gap-1 ${idx.changePct >= 0 ? 'text-[#ff4d4f]' : 'text-[#52c41a]'}`}>
                    <span>{idx.changePct >= 0 ? '+' : ''}{idx.changePct.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sentiment Bar (Embedded) */}
            <div className="relative z-10">
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span className="text-[#52c41a]">跌 {sentiment?.sentiment?.down}</span>
                <span>总成交 {sentiment?.sentiment?.totalVolume}</span>
                <span className="text-[#ff4d4f]">涨 {sentiment?.sentiment?.up}</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full flex overflow-hidden">
                <div className="bg-[#52c41a] transition-all duration-1000" style={{ width: `${(sentiment?.sentiment?.down / (sentiment?.sentiment?.up + sentiment?.sentiment?.down + sentiment?.sentiment?.neutral) * 100) || 0}%` }} />
                <div className="bg-white/10 transition-all duration-1000" style={{ width: `${(sentiment?.sentiment?.neutral / (sentiment?.sentiment?.up + sentiment?.sentiment?.down + sentiment?.sentiment?.neutral) * 100) || 0}%` }} />
                <div className="bg-[#ff4d4f] transition-all duration-1000" style={{ width: `${(sentiment?.sentiment?.up / (sentiment?.sentiment?.up + sentiment?.sentiment?.down + sentiment?.sentiment?.neutral) * 100) || 0}%` }} />
              </div>
            </div>
          </div>

          {/* 2. Quick Actions Grid (Golden Zone) */}
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { name: '大盘云图', icon: <PieChart className="w-5 h-5 text-blue-500" />, url: 'https://52etf.site/' },
              { name: '压榨利润', icon: <Filter className="w-5 h-5 text-orange-500" />, action: 'crush' },
              { name: '龙虎榜', icon: <Zap className="w-5 h-5 text-red-500" />, action: 'lhb' },
              { name: '宽基对比', icon: <TrendingUp className="w-5 h-5 text-purple-500" />, action: 'comp' },
              { name: '7x24快讯', icon: <Newspaper className="w-5 h-5 text-teal-500" />, action: 'news' },
            ].map((item, i) => (
              <a
                key={i}
                href={item.url || `#${item.action}`}
                onClick={(e) => {
                  if (!item.url) {
                    e.preventDefault();
                    const el = document.getElementById(item.action || '');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[var(--card-hover)] transition-colors cursor-pointer"
              >
                <div className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-full shadow-sm">
                  {item.icon}
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-[var(--foreground)]">{item.name}</span>
              </a>
            ))}
          </div>

          {/* 3. Mini Data Cards Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[var(--muted)] mb-1">昨日涨停表现</div>
                <div className="text-base font-bold text-[#ff4d4f]">+2.58%</div>
              </div>
              <div className="h-8 w-16 opacity-50">
                {/* Placeholder Trend */}
                <svg viewBox="0 0 100 40" className="w-full h-full stroke-[#ff4d4f] fill-none stroke-2">
                  <path d="M0,35 Q20,30 40,20 T100,5" />
                </svg>
              </div>
            </div>
            <div className="card p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[var(--muted)] mb-1">涨跌停对比</div>
                <div className="flex gap-2 text-sm font-bold">
                  <span className="text-[#ff4d4f]">{Math.round(sentiment?.sentiment?.up / 30) || '60'}</span>
                  <span className="text-[var(--muted)]">:</span>
                  <span className="text-[#52c41a]">{Math.round(sentiment?.sentiment?.down / 30) || '20'}</span>
                </div>
              </div>
              <div className="h-8 w-16 opacity-50">
                {/* Placeholder Trend */}
                <svg viewBox="0 0 100 40" className="w-full h-full stroke-[#52c41a] fill-none stroke-2">
                  <path d="M0,10 Q30,22 60,30 T100,35" />
                </svg>
              </div>
            </div>
          </div>



        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart: KLine */}
          <div className="lg:col-span-2 card overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)]/50">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 sm:w-2 h-4 sm:h-5 rounded-full ${mainChartType === 'kline' ? 'bg-[var(--primary)]' : 'bg-[var(--accent)]'}`} />
                <div className="flex bg-[var(--background)] p-1 rounded-lg border border-[var(--border)]">
                  <button
                    onClick={() => setMainChartType("kline")}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap ${mainChartType === "kline"
                      ? "bg-[var(--card)] text-[var(--primary)] shadow-sm border border-[var(--border)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                  >
                    指数技术面
                  </button>
                  <button
                    onClick={() => setMainChartType("comparison")}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap ${mainChartType === "comparison"
                      ? "bg-[var(--card)] text-[var(--accent)] shadow-sm border border-[var(--border)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                  >
                    宽基累计收益
                  </button>
                </div>
              </div>

              {mainChartType === 'kline' ? (
                <div className="flex bg-[var(--background)] p-0.5 sm:p-1 rounded-lg border border-[var(--border)] self-start sm:self-auto">
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
              ) : (
                <div className="flex gap-x-3 gap-y-1 flex-wrap justify-end max-w-full sm:max-w-none">
                  {comparisonData.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 text-[9px] sm:text-xs whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ['#2962FF', '#8B5CF6', '#E91E63', '#F59E0B', '#10B981', '#06B6D4'][i % 6] }} />
                      <span className="text-[var(--muted)]">{s.name}</span>
                      <span className={`font-bold ${s.currentPct >= 0 ? 'text-[#ff4d4f]' : 'text-[#52c41a]'}`}>
                        {s.currentPct >= 0 ? '+' : ''}{s.currentPct.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-2 sm:p-4 flex-1 min-h-[320px]">
              {mainChartType === 'kline' ? (
                kdata.length > 0 ? (
                  <KLineChart data={kdata} height={320} />
                ) : (
                  <div className="flex items-center justify-center h-full opacity-30">加载数据中...</div>
                )
              ) : (
                comparisonData.length > 0 ? (
                  <ComparisonChart data={comparisonData} height={320} />
                ) : (
                  <div className="flex items-center justify-center h-full opacity-30">加载数据中...</div>
                )
              )}
            </div>

            {/* Dragon Tiger List (LHB) */}
            <div id="lhb" className="card overflow-hidden border-t border-[var(--border)]">
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]/50">
                <h3 className="font-bold text-sm sm:text-lg flex items-center gap-2">
                  <span className="w-1.5 sm:w-2 h-4 sm:h-5 bg-[#ff4d4f] rounded-full" />
                  龙虎榜 · 资金搏杀
                </h3>
                <span className="text-[10px] text-[var(--muted)]">净买入TOP榜</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[var(--background)] text-[var(--muted)]">
                    <tr>
                      <th className="p-3 font-medium">股票</th>
                      <th className="p-3 font-medium text-right">涨跌幅</th>
                      <th className="p-3 font-medium text-right">龙虎榜净买入</th>
                      <th className="p-3 font-medium hidden sm:table-cell">上榜原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {lhbData.slice(0, 5).map((stock, i) => (
                      <tr key={stock.code} className="hover:bg-[var(--card-hover)] transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center justify-center w-4 h-4 text-[9px] rounded ${i < 3 ? 'bg-[#ff4d4f]/10 text-[#ff4d4f] font-bold' : 'bg-[var(--muted)]/10 text-[var(--muted)]'}`}>
                              {i + 1}
                            </span>
                            <div>
                              <div className="font-bold">{stock.name}</div>
                              <div className="text-[9px] text-[var(--muted)]">{stock.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`p-3 text-right font-bold ${stock.change >= 0 ? 'text-[#ff4d4f]' : 'text-[#52c41a]'}`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                        </td>
                        <td className="p-3 text-right">
                          <div className="font-mono font-bold text-[#ff4d4f]">
                            {(stock.netBuy / 10000).toFixed(0)} <span className="text-[9px] font-normal opacity-70">万</span>
                          </div>
                          <div className="text-[9px] text-[var(--muted)]">
                            买: {(stock.buy / 10000).toFixed(0)}万
                          </div>
                        </td>
                        <td className="p-3 text-[10px] text-[var(--muted)] hidden sm:table-cell max-w-[200px] truncate" title={stock.reason}>
                          {stock.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div >

          <div className="space-y-6">
            {/* Real-time Sector Ranking (Professional List) */}
            <div className="card p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--primary)]" />
                  板块涨幅榜
                </h3>
                <span className="text-[9px] bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded">实时更新</span>
              </div>
              <div className="space-y-2">
                {sentiment?.sectors?.slice(0, 6).map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-[var(--card-hover)] rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-4 ${i < 3 ? 'text-[#ff4d4f]' : 'text-[var(--muted)]'}`}>{i + 1}</span>
                      <div>
                        <p className="text-xs font-bold truncate max-w-[80px]">{s.name}</p>
                        <p className="text-[9px] text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors">{s.leadStock}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-[#ff4d4f]">+{s.change.toFixed(2)}%</p>
                      <p className="text-[9px] text-[var(--muted)]">领涨: +{s.leadChange.toFixed(2)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7x24 News Flash (Live Feed) */}
            <div id="news" className="card p-4 h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="font-bold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[var(--primary)] animate-spin-slow" />
                  7x24 财经快讯
                </h3>
                <span className="text-[9px] bg-[var(--danger)]/10 text-[var(--danger)] px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
              </div>
              <div className="space-y-4 overflow-y-auto flex-1 pl-2 pr-2 custom-scrollbar">
                {news.map((n, i) => (
                  <div key={n.id} className="relative pl-4 border-l border-[var(--border)] pb-1 last:pb-0">
                    <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 bg-[var(--card)] border border-[var(--primary)] rounded-full">
                      {i === 0 && <div className="absolute inset-0 bg-[var(--primary)] rounded-full animate-ping opacity-75" />}
                      {i === 0 && <div className="absolute inset-0.5 bg-[var(--primary)] rounded-full" />}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-[var(--muted)] font-mono">{n.time}</span>
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className={`block text-xs font-medium hover:text-[var(--primary)] transition-colors leading-snug ${n.isImportant ? 'text-[#ff4d4f] font-bold' : ''}`}>
                        {n.title}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
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
    </div >
  );
}
