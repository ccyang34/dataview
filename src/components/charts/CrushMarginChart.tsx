
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
    AreaChart,
} from "recharts";
import { CrushMarginData } from "@/lib/crush-margin";

// Types for additional data
export interface PositionData {
    date: string;
    Y2505?: number;
    Y2509?: number;
    Y2601?: number;
    Y2605?: number;
    Y2609?: number;
}

export interface OilComparisonData {
    date: string;
    soybeanOil: number;     // 豆油
    palmOil: number;        // 棕榈油
    rapeseedOil: number;    // 菜油
}

interface FullDashboardProps {
    data: CrushMarginData[];
    positionData?: PositionData[];
    oilData?: OilComparisonData[];
    title?: string;
}

// Color palette matching Python matplotlib style
const COLORS = {
    // Position chart colors
    Y2505: '#FF6B6B',
    Y2509: '#4ECDC4',
    Y2601: '#45B7D1',
    Y2605: '#96CEB4',
    Y2609: '#FFEAA7',
    // Price chart colors
    soybeanOil: '#FF8C00',      // darkorange
    soybeanMeal: '#8B4513',     // brown
    soybeanNo2: '#228B22',      // green
    // Basis chart colors
    oilBasis: '#FF8C00',
    mealBasis: '#0000FF',
    oilMealRatio: '#228B22',
    basisRate: '#800080',       // purple
    // Margin chart colors
    futuresMargin: '#FFA500',
    grossMargin: '#800080',
    breakeven: '#FF0000',
    oilOverlay: '#5F9EA0',
    // Oil comparison colors
    palm: '#228B22',
    rapeseed: '#FFD700',
};

// Common chart config
const CHART_HEIGHT = 280;
const CHART_MARGIN = { top: 20, right: 60, left: 60, bottom: 20 };

// Date formatter
const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function CrushMarginDashboard({
    data,
    positionData,
    oilData,
    title = "大豆压榨利润分析"
}: FullDashboardProps) {
    if (!data || data.length === 0) return <div className="text-center py-20">暂无数据</div>;

    const latest = data[data.length - 1];
    const latestDate = latest.date;

    // Find min/max for annotations
    const marginMax = Math.max(...data.map(d => d.grossMargin));
    const marginMin = Math.min(...data.map(d => d.grossMargin));
    const maxMarginPoint = data.find(d => d.grossMargin === marginMax);
    const minMarginPoint = data.find(d => d.grossMargin === marginMin);

    return (
        <div className="space-y-6">
            {/* Header with latest stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
                <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="text-sm text-[var(--muted)]">
                        最新数据: {latestDate} | 现货榨利:
                        <span className={latest.grossMargin >= 0 ? "text-[var(--success)] ml-1" : "text-[var(--danger)] ml-1"}>
                            {latest.grossMargin.toFixed(0)} 元/吨
                        </span>
                    </p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-md bg-amber-100 text-amber-800">
                    数据截止: {latestDate}
                </div>
            </div>

            {/* 1. Position Chart - 中粮期货豆油空单持仓走势 */}
            <div className="card p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#FF6B6B] rounded"></span>
                    中粮期货豆油空单持仓走势
                </h3>
                <div style={{ height: CHART_HEIGHT }}>
                    <ResponsiveContainer width="100%" height="100%">
                        {positionData && positionData.length > 0 ? (
                            <AreaChart data={positionData} margin={CHART_MARGIN}>
                                <defs>
                                    <linearGradient id="colorY2505" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.Y2505} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={COLORS.Y2505} stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorY2509" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.Y2509} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={COLORS.Y2509} stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorY2601" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.Y2601} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={COLORS.Y2601} stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorY2605" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.Y2605} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={COLORS.Y2605} stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorY2609" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.Y2609} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={COLORS.Y2609} stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="date" stroke="var(--muted)" fontSize={10} tickFormatter={formatDate} />
                                <YAxis stroke="var(--muted)" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                    label={{ value: '持仓量(手)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--muted)' }} />
                                <Tooltip
                                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                                    formatter={(value) => [`${Number(value).toLocaleString()} 手`, '']}
                                />
                                <Legend verticalAlign="top" height={36} iconType="square" />
                                <Area type="monotone" dataKey="Y2505" name="Y2505" stroke={COLORS.Y2505} fill="url(#colorY2505)" strokeWidth={1.5} />
                                <Area type="monotone" dataKey="Y2509" name="Y2509" stroke={COLORS.Y2509} fill="url(#colorY2509)" strokeWidth={1.5} />
                                <Area type="monotone" dataKey="Y2601" name="Y2601" stroke={COLORS.Y2601} fill="url(#colorY2601)" strokeWidth={1.5} />
                                <Area type="monotone" dataKey="Y2605" name="Y2605" stroke={COLORS.Y2605} fill="url(#colorY2605)" strokeWidth={1.5} />
                                <Area type="monotone" dataKey="Y2609" name="Y2609" stroke={COLORS.Y2609} fill="url(#colorY2609)" strokeWidth={1.5} />
                            </AreaChart>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[var(--muted)]">暂无持仓数据</div>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Futures Price Chart - 期货价格走势 (双轴) */}
            <div className="card p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#FF8C00] rounded"></span>
                    期货价格走势 (双轴)
                </h3>
                <div style={{ height: CHART_HEIGHT }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={CHART_MARGIN}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="date" stroke="var(--muted)" fontSize={10} tickFormatter={formatDate} />
                            <YAxis
                                yAxisId="left"
                                stroke={COLORS.soybeanOil}
                                fontSize={10}
                                domain={['auto', 'auto']}
                                label={{ value: '豆油(元/吨)', angle: -90, position: 'insideLeft', fontSize: 10, fill: COLORS.soybeanOil }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke={COLORS.soybeanMeal}
                                fontSize={10}
                                domain={['auto', 'auto']}
                                label={{ value: '豆粕/豆二', angle: 90, position: 'insideRight', fontSize: 10, fill: COLORS.soybeanMeal }}
                            />
                            <Tooltip
                                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                                formatter={(value, name) => [`${Number(value).toFixed(0)} 元/吨`, String(name)]}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Line yAxisId="left" type="monotone" dataKey="soybeanOilPrice" name="豆油价格" stroke={COLORS.soybeanOil} dot={false} strokeWidth={1.5} />
                            <Line yAxisId="right" type="monotone" dataKey="soybeanMealPrice" name="豆粕价格" stroke={COLORS.soybeanMeal} dot={false} strokeWidth={1.5} />
                            <Line yAxisId="right" type="monotone" dataKey="soybeanNo2Price" name="豆二价格" stroke={COLORS.soybeanNo2} strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Basis Chart - 基差走势 & 油粕比 */}
            <div className="card p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#228B22] rounded"></span>
                    基差走势 & 油粕比 - 最新油粕比: {latest.spotOilMealRatio.toFixed(3)}
                </h3>
                <div style={{ height: CHART_HEIGHT }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={CHART_MARGIN}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="date" stroke="var(--muted)" fontSize={10} tickFormatter={formatDate} />
                            <YAxis
                                yAxisId="left"
                                stroke="var(--muted)"
                                fontSize={10}
                                label={{ value: '基差(元/吨)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--muted)' }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke={COLORS.oilMealRatio}
                                fontSize={10}
                                label={{ value: '油粕比 / 基差率(%)', angle: 90, position: 'insideRight', fontSize: 10, fill: COLORS.oilMealRatio }}
                            />
                            <Tooltip
                                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <ReferenceLine y={0} stroke="gray" strokeDasharray="3 3" yAxisId="left" opacity={0.5} />
                            {/* Left Axis: Basis */}
                            <Line yAxisId="left" type="monotone" dataKey="soybeanOilBasis" name="豆油基差" stroke={COLORS.oilBasis} strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                            <Line yAxisId="left" type="monotone" dataKey="soybeanMealBasis" name="豆粕基差" stroke={COLORS.mealBasis} strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                            {/* Right Axis: Ratio (Area) + BasisRate (Line) */}
                            <Area yAxisId="right" type="monotone" dataKey="spotOilMealRatio" name="现货油粕比" fill={COLORS.oilMealRatio} fillOpacity={0.2} stroke={COLORS.oilMealRatio} strokeWidth={1} />
                            <Line yAxisId="right" type="monotone" dataKey="oilBasisRate" name="豆油基差率(%)" stroke={COLORS.basisRate} strokeWidth={1.5} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. Crush Margin Chart - 大豆压榨利润走势 */}
            <div className="card p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#800080] rounded"></span>
                    大豆压榨利润走势 - 现货榨利: {latest.grossMargin.toFixed(2)}
                </h3>
                <div style={{ height: CHART_HEIGHT }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={CHART_MARGIN}>
                            <defs>
                                <linearGradient id="colorFuturesMargin" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.futuresMargin} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={COLORS.futuresMargin} stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="date" stroke="var(--muted)" fontSize={10} tickFormatter={formatDate} />
                            <YAxis
                                yAxisId="left"
                                stroke="var(--muted)"
                                fontSize={10}
                                label={{ value: '利润(元/吨)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--muted)' }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke={COLORS.oilOverlay}
                                fontSize={10}
                                label={{ value: '豆油价格', angle: 90, position: 'insideRight', fontSize: 10, fill: COLORS.oilOverlay }}
                            />
                            <Tooltip
                                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                                formatter={(value, name) => {
                                    if (name === '豆油期货(右轴)') return [`${Number(value).toFixed(0)} 元/吨`, String(name)];
                                    return [`${Number(value).toFixed(2)} 元/吨`, String(name)];
                                }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            {/* 0 Line - 盈亏平衡 */}
                            <ReferenceLine y={0} yAxisId="left" stroke={COLORS.breakeven} strokeWidth={1.5} label={{ value: '盈亏平衡', position: 'right', fontSize: 10, fill: COLORS.breakeven }} />
                            {/* 盘面榨利 area (Orange) */}
                            <Area yAxisId="left" type="monotone" dataKey="futuresMargin" name="盘面榨利(不含基差)" fill="url(#colorFuturesMargin)" stroke={COLORS.futuresMargin} strokeWidth={1} />
                            {/* 含基差榨利 line (Purple) */}
                            <Line yAxisId="left" type="monotone" dataKey="grossMargin" name="现货榨利(含基差)" stroke={COLORS.grossMargin} strokeWidth={2} dot={false} />
                            {/* 豆油期货右轴 */}
                            <Line yAxisId="right" type="monotone" dataKey="soybeanOilPrice" name="豆油期货(右轴)" stroke={COLORS.oilOverlay} strokeDasharray="5 5" strokeWidth={1} dot={false} opacity={0.7} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                {/* Annotations for max/min */}
                <div className="flex justify-between text-xs text-[var(--muted)] mt-2 px-16">
                    <span>最高: <span className="text-purple-600 font-medium">{marginMax.toFixed(0)}</span> ({maxMarginPoint?.date})</span>
                    <span>最低: <span className="text-purple-600 font-medium">{marginMin.toFixed(0)}</span> ({minMarginPoint?.date})</span>
                </div>
            </div>

            {/* 5. Oil Comparison Chart - 油脂板块价格对比 */}
            <div className="card p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#FFD700] rounded"></span>
                    油脂板块价格对比 (豆、棕、菜)
                </h3>
                <div style={{ height: CHART_HEIGHT }}>
                    <ResponsiveContainer width="100%" height="100%">
                        {oilData && oilData.length > 0 ? (
                            <LineChart data={oilData} margin={CHART_MARGIN}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="date" stroke="var(--muted)" fontSize={10} tickFormatter={formatDate} />
                                <YAxis
                                    stroke="var(--muted)"
                                    fontSize={10}
                                    domain={['auto', 'auto']}
                                    label={{ value: '价格(元/吨)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--muted)' }}
                                />
                                <Tooltip
                                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                                    formatter={(value) => [`${Number(value).toFixed(0)} 元/吨`, '']}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Line type="monotone" dataKey="soybeanOil" name="豆油 (Y)" stroke={COLORS.soybeanOil} dot={false} strokeWidth={2} />
                                <Line type="monotone" dataKey="palmOil" name="棕榈油 (P)" stroke={COLORS.palm} dot={false} strokeWidth={1.5} />
                                <Line type="monotone" dataKey="rapeseedOil" name="菜油 (OI)" stroke={COLORS.rapeseed} dot={false} strokeWidth={1.5} />
                            </LineChart>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[var(--muted)]">暂无油脂对比数据</div>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
