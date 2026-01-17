
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
    ReferenceLine,
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
                        <YAxis yAxisId="right" orientation="right" stroke="green" fontSize={12} tickLine={false} axisLine={false} label={{ value: '油粕比 / 基差率(%)', angle: 90, position: 'insideRight' }} />
                        <Tooltip
                            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        {/* Left Axis: Basis */}
                        <Line yAxisId="left" type="monotone" dataKey="soybeanOilBasis" name="豆油基差" stroke="darkorange" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                        <Line yAxisId="left" type="monotone" dataKey="soybeanMealBasis" name="豆粕基差" stroke="blue" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                        <ReferenceLine y={0} stroke="gray" strokeDasharray="3 3" yAxisId="left" opacity={0.5} />

                        {/* Right Axis: Ratio (Area) + BasisRate (Line) */}
                        <Area yAxisId="right" type="monotone" dataKey="spotOilMealRatio" name="现货油粕比" fill="green" fillOpacity={0.25} stroke="green" strokeWidth={1} />
                        <Line yAxisId="right" type="monotone" dataKey="oilBasisRate" name="豆油基差率(%)" stroke="purple" strokeWidth={1.5} dot={false} />
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

                        {/* 0 Line */}
                        <ReferenceLine y={0} stroke="red" strokeWidth={1} label="盈亏平衡" />

                        {/* 盘面榨利 area (Orange) */}
                        <Area type="monotone" dataKey="futuresMargin" name="盘面榨利(不含基差)" fill="orange" fillOpacity={0.3} stroke="orange" strokeWidth={1} />

                        {/* 含基差榨利 line (Purple) */}
                        <Line type="monotone" dataKey="grossMargin" name="现货榨利(含基差)" stroke="purple" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
