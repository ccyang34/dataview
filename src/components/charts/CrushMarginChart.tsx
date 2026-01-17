
"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Area,
    ComposedChart,
} from "recharts";
import { CrushMarginData } from "@/lib/crush-margin";

interface MarginChartProps {
    data: CrushMarginData[];
    title?: string;
    height?: number;
}

export function CrushMarginDashboard({ data, title = "大豆压榨利润分析", height = 800 }: MarginChartProps) {
    if (!data || data.length === 0) return <div>暂无数据</div>;

    const latest = data[data.length - 1];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="text-sm text-[var(--muted)]">
                        最新数据: {latest.date} | 现货榨利: <span className={latest.grossMargin >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>{latest.grossMargin.toFixed(0)}</span>
                    </p>
                </div>
            </div>

            {/* 1. 期货价格走势 (上图) */}
            <div className="card p-4 h-[300px]">
                <h3 className="font-semibold text-sm mb-4">期货价格走势 (双轴)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" stroke="var(--muted)" fontSize={12} tickLine={false} />
                        <YAxis yAxisId="left" stroke="darkorange" fontSize={12} tickLine={false} axisLine={false} label={{ value: '豆油(元/吨)', angle: -90, position: 'insideLeft', fill: 'darkorange' }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#2563eb" fontSize={12} tickLine={false} axisLine={false} label={{ value: '豆粕/豆二', angle: 90, position: 'insideRight', fill: '#2563eb' }} />
                        <Tooltip
                            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
                            labelStyle={{ color: "var(--foreground)" }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line yAxisId="left" type="monotone" dataKey="soybeanOilPrice" name="豆油价格" stroke="darkorange" dot={false} strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="soybeanMealPrice" name="豆粕价格" stroke="#2563eb" dot={false} strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="soybeanNo2Price" name="豆二价格" stroke="#10b981" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* 2. 基差走势 (中图) */}
            <div className="card p-4 h-[300px]">
                <h3 className="font-semibold text-sm mb-4">基差走势 & 油粕比</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" stroke="var(--muted)" fontSize={12} tickLine={false} />
                        <YAxis yAxisId="left" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} label={{ value: '基差', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} label={{ value: '油粕比', angle: 90, position: 'insideRight' }} />
                        <Tooltip
                            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line yAxisId="left" type="monotone" dataKey="soybeanOilBasis" name="豆油基差" stroke="darkorange" strokeDasharray="3 3" dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="soybeanMealBasis" name="豆粕基差" stroke="#2563eb" strokeDasharray="3 3" dot={false} />

                        <Area yAxisId="right" type="monotone" dataKey="spotOilMealRatio" name="现货油粕比" fill="#10b981" fillOpacity={0.1} stroke="#10b981" strokeWidth={1} />
                        {/* 0 line for basis */}
                        {/* <ReferenceLine y={0} stroke="#666" yAxisId="left"/> */}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* 3. 榨利走势 (下图) */}
            <div className="card p-4 h-[300px]">
                <h3 className="font-semibold text-sm mb-4">压榨利润走势</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" stroke="var(--muted)" fontSize={12} tickLine={false} />
                        <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} label={{ value: '利润(元/吨)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        {/* 盘面榨利 area */}
                        <Area type="monotone" dataKey="futuresMargin" name="盘面榨利(不含基差)" fill="#f59e0b" fillOpacity={0.2} stroke="#f59e0b" strokeWidth={1} />
                        {/* 含基差榨利 line */}
                        <Line type="monotone" dataKey="grossMargin" name="现货榨利(含基差)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
