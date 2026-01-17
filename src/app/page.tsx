"use client";

import { Navbar } from "@/components/layout/Navbar";
import {
  LineChart,
  AreaChartComponent,
  BarChartComponent,
  DonutChart,
  KLineChart,
} from "@/components/charts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Database,
  RefreshCw,
} from "lucide-react";

// 模拟数据
const lineData = [
  { name: "1月", value: 4000 },
  { name: "2月", value: 3000 },
  { name: "3月", value: 5000 },
  { name: "4月", value: 2780 },
  { name: "5月", value: 1890 },
  { name: "6月", value: 2390 },
  { name: "7月", value: 3490 },
];

const pieData = [
  { name: "技术", value: 400 },
  { name: "金融", value: 300 },
  { name: "医疗", value: 200 },
  { name: "消费", value: 278 },
  { name: "能源", value: 189 },
];

const klineData = [
  { time: "2024-01-02", open: 100, high: 105, low: 98, close: 103, volume: 1200000 },
  { time: "2024-01-03", open: 103, high: 108, low: 102, close: 107, volume: 1500000 },
  { time: "2024-01-04", open: 107, high: 110, low: 105, close: 106, volume: 1100000 },
  { time: "2024-01-05", open: 106, high: 109, low: 104, close: 108, volume: 1300000 },
  { time: "2024-01-08", open: 108, high: 112, low: 107, close: 111, volume: 1600000 },
  { time: "2024-01-09", open: 111, high: 115, low: 110, close: 114, volume: 1800000 },
  { time: "2024-01-10", open: 114, high: 116, low: 112, close: 113, volume: 1400000 },
  { time: "2024-01-11", open: 113, high: 117, low: 111, close: 116, volume: 1700000 },
  { time: "2024-01-12", open: 116, high: 118, low: 114, close: 115, volume: 1200000 },
  { time: "2024-01-15", open: 115, high: 120, low: 114, close: 119, volume: 2000000 },
];

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? "text-up" : "text-down"}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? "+" : ""}{change}%</span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">数据概览</h1>
            <p className="text-[var(--muted)] mt-1">实时数据监控与可视化分析</p>
          </div>
          <button className="btn btn-secondary self-start sm:self-auto cursor-pointer">
            <RefreshCw className="w-4 h-4" />
            刷新数据
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="总访问量"
            value="128,430"
            change={12.5}
            icon={<Activity className="w-5 h-5" />}
          />
          <StatCard
            title="活跃用户"
            value="3,642"
            change={-2.3}
            icon={<Users className="w-5 h-5" />}
          />
          <StatCard
            title="数据条目"
            value="892,156"
            change={8.7}
            icon={<Database className="w-5 h-5" />}
          />
          <StatCard
            title="今日涨幅"
            value="+3.24%"
            change={3.24}
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 趋势图 */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">月度趋势</h3>
            <AreaChartComponent data={lineData} height={250} />
          </div>

          {/* 分布图 */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">行业分布</h3>
            <DonutChart data={pieData} height={250} />
          </div>
        </div>

        {/* K线图 */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">股票走势 (K线图)</h3>
            <div className="flex gap-2">
              <button className="btn btn-secondary text-xs py-1 px-3 cursor-pointer">日K</button>
              <button className="btn btn-secondary text-xs py-1 px-3 cursor-pointer">周K</button>
              <button className="btn btn-secondary text-xs py-1 px-3 cursor-pointer">月K</button>
            </div>
          </div>
          <KLineChart data={klineData} height={400} />
        </div>

        {/* 数据柱状图 */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">数据对比</h3>
          <BarChartComponent data={lineData} height={250} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-[var(--muted)]">
          <p>DataView © 2024 - 数据可视化平台</p>
        </div>
      </footer>
    </div>
  );
}
