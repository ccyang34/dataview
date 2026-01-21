"use client";

import React, { useState, useEffect } from "react";
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

// Common chart config - responsive heights
const CHART_HEIGHT_MOBILE = 200;
const CHART_HEIGHT_DESKTOP = 260;
const CHART_MARGIN_MOBILE = { top: 10, right: 10, left: 5, bottom: 10 };
const CHART_MARGIN_DESKTOP = { top: 15, right: 50, left: 50, bottom: 15 };


// Format date string for display (shorter format)
const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear().toString().slice(2)}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Calculate optimal tick interval based on data length
const getInterval = (dataLength: number): number => {
    if (dataLength <= 30) return 5;
    if (dataLength <= 90) return Math.floor(dataLength / 8);
    if (dataLength <= 180) return Math.floor(dataLength / 10);
    if (dataLength <= 365) return Math.floor(dataLength / 12);
    return Math.floor(dataLength / 14);
};

export function CrushMarginDashboard({
    data,
    positionData,
    oilData,
    title = "大豆压榨利润分析"
}: FullDashboardProps) {
    const [isMobile, setIsMobile] = useState(false);

    // 各图表的隐藏系列状态
    const [hiddenMargin, setHiddenMargin] = useState<Set<string>>(new Set());
    const [hiddenBasis, setHiddenBasis] = useState<Set<string>>(new Set());
    const [hiddenOil, setHiddenOil] = useState<Set<string>>(new Set());
    const [hiddenPrice, setHiddenPrice] = useState<Set<string>>(new Set());
    const [hiddenPosition, setHiddenPosition] = useState<Set<string>>(new Set());

    // 通用图例点击处理
    const createLegendHandler = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (entry: any) => {
            const key = entry?.dataKey || entry?.value;
            if (!key) return;
            setter(prev => {
                const newSet = new Set(prev);
                if (newSet.has(key)) {
                    newSet.delete(key);
                } else {
                    newSet.add(key);
                }
                return newSet;
            });
        };
    };

    // 可复用的交互式图例渲染
    const renderInteractiveLegend = (
        hidden: Set<string>,
        handler: (entry: { dataKey?: string; value?: string }) => void,
        colorMap: Record<string, string>
    ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ({ payload }: any) => (
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 text-[10px]">
                {payload?.map((entry: { value: string; color: string; dataKey?: string }, index: number) => {
                    const key = entry.dataKey || entry.value;
                    const isHidden = hidden.has(key);
                    const color = colorMap[key] || entry.color;
                    return (
                        <span
                            key={`legend-${index}`}
                            onClick={() => handler({ dataKey: key, value: entry.value })}
                            className="flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80"
                            style={{ opacity: isHidden ? 0.4 : 1, WebkitTapHighlightColor: 'transparent' }}
                        >
                            <span
                                className="inline-block w-3 h-0.5 rounded"
                                style={{ backgroundColor: isHidden ? '#ccc' : color }}
                            />
                            <span style={{
                                color: isHidden ? '#999' : 'var(--foreground)',
                                textDecoration: isHidden ? 'line-through' : 'none'
                            }}>
                                {entry.value}
                            </span>
                        </span>
                    );
                })}
            </div>
        );
    };

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!data || data.length === 0) return <div className="text-center py-20">暂无数据</div>;

    const latest = data[data.length - 1];
    const latestDate = latest.date;

    // Find min/max for annotations
    const marginMax = Math.max(...data.map(d => d.grossMargin));
    const marginMin = Math.min(...data.map(d => d.grossMargin));
    const maxMarginPoint = data.find(d => d.grossMargin === marginMax);
    const minMarginPoint = data.find(d => d.grossMargin === marginMin);
    // 交互数据状态
    const [activeData, setActiveData] = useState<any>(null);
    const [activeBasisData, setActiveBasisData] = useState<any>(null);

    // 计算当前显示的数据 (如果有交互则显示交互数据，否则显示最新数据)
    const currentData = activeData || latest;
    const currentBasisData = activeBasisData || latest;

    return (
        <div className="space-y-3 md:space-y-6">
            {/* Header with latest stats - compact on mobile */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
                <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="text-sm text-[var(--muted)]">
                        {/* Mobile: Show date from interaction */}
                        {isMobile && activeData ? (
                            <span className="text-[var(--primary)] font-medium">📅 {activeData.date}</span>
                        ) : (
                            <span>最新数据: {latestDate}</span>
                        )}
                        | 现货榨利:
                        <span className={currentData.grossMargin >= 0 ? "text-[var(--success)] ml-1" : "text-[var(--danger)] ml-1"}>
                            {currentData.grossMargin.toFixed(0)} 元/吨
                        </span>
                    </p>
                </div>
                {!isMobile && (
                    <div className="text-xs px-3 py-1.5 rounded-md bg-amber-100 text-amber-800">
                        数据截止: {latestDate}
                    </div>
                )}
            </div>

            {/* 1. Crush Margin Chart - 大豆压榨利润走势 */}
            <div className="card p-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
                    <span className="w-1 h-3 md:h-4 bg-[#800080] rounded"></span>
                    压榨利润走势 - 现货: {currentData.grossMargin.toFixed(0)}
                    {activeData && <span className="text-[var(--muted)] ml-2 text-[10px] font-normal">({activeData.date})</span>}
                </h3>
                <div className="h-[180px] md:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={data}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                            onMouseMove={(state: any) => {
                                if (state.activePayload && state.activePayload.length) {
                                    setActiveData(state.activePayload[0].payload);
                                }
                            }}
                            onMouseLeave={() => setActiveData(null)}
                        >
                            <defs>
                                <linearGradient id="colorFuturesMargin" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.futuresMargin} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={COLORS.futuresMargin} stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="date" stroke="var(--muted)" fontSize={9} tickFormatter={formatDateLabel} interval={getInterval(data.length)} minTickGap={isMobile ? 50 : 30} />
                            <YAxis yAxisId="left" stroke="var(--muted)" fontSize={8} width={32} domain={['auto', 'auto']} />
                            <YAxis yAxisId="right" orientation="right" stroke={COLORS.oilOverlay} fontSize={8} width={32} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                            <Tooltip
                                content={isMobile ? () => null : undefined} // Mobile: content is null (invisible)
                                cursor={{ stroke: 'var(--muted)', strokeWidth: 1, strokeDasharray: '4 4' }} // Keep cursor visible
                                wrapperStyle={isMobile ? { display: 'none' } : undefined} // Double safety to hide the box
                                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11, padding: "4px 8px" }}
                                formatter={(value, name) => {
                                    if (name === '豆油(右)') return [`${Number(value).toFixed(0)}`, String(name)];
                                    return [`${Number(value).toFixed(0)}`, String(name)];
                                }}
                            />
                            <Legend verticalAlign="top" height={28} wrapperStyle={{ cursor: 'pointer' }} content={renderInteractiveLegend(hiddenMargin, createLegendHandler(setHiddenMargin), { futuresMargin: COLORS.futuresMargin, grossMargin: COLORS.grossMargin, soybeanOilPrice: COLORS.oilOverlay })} />
                            <ReferenceLine y={0} yAxisId="left" stroke={COLORS.breakeven} strokeWidth={1.5} />
                            <Area yAxisId="left" type="monotone" dataKey="futuresMargin" name="盘面榨利" fill="url(#colorFuturesMargin)" stroke={COLORS.futuresMargin} strokeWidth={1} hide={hiddenMargin.has('futuresMargin')} />
                            <Line yAxisId="left" type="monotone" dataKey="grossMargin" name="现货榨利" stroke={COLORS.grossMargin} strokeWidth={2} dot={false} hide={hiddenMargin.has('grossMargin')} />
                            <Line yAxisId="right" type="monotone" dataKey="soybeanOilPrice" name="豆油(右)" stroke={COLORS.oilOverlay} strokeDasharray="5 5" strokeWidth={1} dot={false} opacity={hiddenMargin.has('soybeanOilPrice') ? 0 : 0.7} hide={hiddenMargin.has('soybeanOilPrice')} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                {/* Annotations - hidden on mobile */}
                <div className="hidden md:flex justify-between text-xs text-[var(--muted)] mt-2 px-12">
                    <span>最高: <span className="text-purple-600 font-medium">{marginMax.toFixed(0)}</span> ({maxMarginPoint?.date})</span>
                    <span>最低: <span className="text-purple-600 font-medium">{marginMin.toFixed(0)}</span> ({minMarginPoint?.date})</span>
                </div>
            </div>

            {/* 2. Basis Chart - 基差走势 & 油粕比 */}
            <div className="card p-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
                    <span className="w-1 h-3 md:h-4 bg-[#228B22] rounded"></span>
                    基差走势 & 油粕比: {currentBasisData.spotOilMealRatio.toFixed(3)}
                    {activeBasisData && <span className="text-[var(--muted)] ml-2 text-[10px] font-normal">({activeBasisData.date})</span>}
                </h3>
                <div className="h-[180px] md:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={data}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                            onMouseMove={(state: any) => {
                                if (state.activePayload && state.activePayload.length) {
                                    setActiveBasisData(state.activePayload[0].payload);
                                }
                            }}
                            onMouseLeave={() => setActiveBasisData(null)}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="date" stroke="var(--muted)" fontSize={9} tickFormatter={formatDateLabel} interval={getInterval(data.length)} minTickGap={isMobile ? 50 : 30} />
                            <YAxis yAxisId="left" stroke="var(--muted)" fontSize={8} width={32} domain={['auto', 'auto']} />
                            <YAxis yAxisId="right" orientation="right" stroke={COLORS.oilMealRatio} fontSize={8} width={24} domain={['auto', 'auto']} />
                            <Tooltip
                                content={isMobile ? () => null : undefined}
                                cursor={{ stroke: 'var(--muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                wrapperStyle={isMobile ? { display: 'none' } : undefined}
                                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11, padding: "4px 8px" }}
                                formatter={(value, name) => {
                                    if (name === '油粕比' || name === '基差率%') return [`${Number(value).toFixed(2)}`, String(name)];
                                    return [`${Number(value).toFixed(0)}`, String(name)];
                                }}
                            />
                            <Legend verticalAlign="top" height={28} wrapperStyle={{ cursor: 'pointer' }} content={renderInteractiveLegend(hiddenBasis, createLegendHandler(setHiddenBasis), { soybeanOilBasis: COLORS.oilBasis, soybeanMealBasis: COLORS.mealBasis, spotOilMealRatio: COLORS.oilMealRatio, oilBasisRate: COLORS.basisRate })} />
                            <ReferenceLine y={0} stroke="gray" strokeDasharray="3 3" yAxisId="left" opacity={0.5} />
                            <Line yAxisId="left" type="monotone" dataKey="soybeanOilBasis" name="豆油基差" stroke={COLORS.oilBasis} strokeDasharray="5 5" dot={false} strokeWidth={1.5} hide={hiddenBasis.has('soybeanOilBasis')} />
                            <Line yAxisId="left" type="monotone" dataKey="soybeanMealBasis" name="豆粕基差" stroke={COLORS.mealBasis} strokeDasharray="5 5" dot={false} strokeWidth={1.5} hide={hiddenBasis.has('soybeanMealBasis')} />
                            <Area yAxisId="right" type="monotone" dataKey="spotOilMealRatio" name="油粕比" fill={COLORS.oilMealRatio} fillOpacity={hiddenBasis.has('spotOilMealRatio') ? 0 : 0.2} stroke={COLORS.oilMealRatio} strokeWidth={1} hide={hiddenBasis.has('spotOilMealRatio')} />
                            <Line yAxisId="right" type="monotone" dataKey="oilBasisRate" name="基差率%" stroke={COLORS.basisRate} strokeWidth={1.5} dot={false} hide={hiddenBasis.has('oilBasisRate')} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Oil Comparison Chart - 油脂板块价格对比 */}
            <div className="card p-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
                    <span className="w-1 h-3 md:h-4 bg-[#FFD700] rounded"></span>
                    油脂板块价格对比 (豆、棕、菜)
                </h3>
                <div className="h-[180px] md:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {oilData && oilData.length > 0 ? (
                            <LineChart data={oilData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="date" stroke="var(--muted)" fontSize={9} tickFormatter={formatDateLabel} interval={getInterval(oilData?.length || 0)} minTickGap={isMobile ? 50 : 30} />
                                <YAxis stroke="var(--muted)" fontSize={8} domain={['auto', 'auto']} width={32} />
                                {!isMobile && (
                                    <Tooltip
                                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11, padding: "4px 8px" }}
                                        formatter={(value, name) => [`${Number(value).toFixed(0)}`, String(name)]}
                                    />
                                )}
                                <Legend verticalAlign="top" height={28} wrapperStyle={{ cursor: 'pointer' }} content={renderInteractiveLegend(hiddenOil, createLegendHandler(setHiddenOil), { soybeanOil: COLORS.soybeanOil, palmOil: COLORS.palm, rapeseedOil: COLORS.rapeseed })} />
                                <Line type="monotone" dataKey="soybeanOil" name="豆油(Y)" stroke={COLORS.soybeanOil} dot={false} strokeWidth={2} hide={hiddenOil.has('soybeanOil')} />
                                <Line type="monotone" dataKey="palmOil" name="棕榄油(P)" stroke={COLORS.palm} dot={false} strokeWidth={1.5} hide={hiddenOil.has('palmOil')} />
                                <Line type="monotone" dataKey="rapeseedOil" name="菜油(OI)" stroke={COLORS.rapeseed} dot={false} strokeWidth={1.5} hide={hiddenOil.has('rapeseedOil')} />
                            </LineChart>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[var(--muted)] text-sm">暂无油脂对比数据</div>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. Futures Price Chart - 期货价格走势 (双轴) */}
            <div className="card p-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
                    <span className="w-1 h-3 md:h-4 bg-[#FF8C00] rounded"></span>
                    期货价格走势 (双轴)
                </h3>
                <div className="h-[180px] md:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="date" stroke="var(--muted)" fontSize={9} tickFormatter={formatDateLabel} interval={getInterval(data.length)} minTickGap={isMobile ? 50 : 30} />
                            <YAxis yAxisId="left" stroke={COLORS.soybeanOil} fontSize={8} domain={['auto', 'auto']} width={32} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <YAxis yAxisId="right" orientation="right" stroke={COLORS.soybeanMeal} fontSize={8} domain={['auto', 'auto']} width={28} />
                            {!isMobile && (
                                <Tooltip
                                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11, padding: "4px 8px" }}
                                    formatter={(value, name) => [`${Number(value).toFixed(0)}`, String(name)]}
                                />
                            )}
                            <Legend verticalAlign="top" height={28} wrapperStyle={{ cursor: 'pointer' }} content={renderInteractiveLegend(hiddenPrice, createLegendHandler(setHiddenPrice), { soybeanOilPrice: COLORS.soybeanOil, soybeanMealPrice: COLORS.soybeanMeal, soybeanNo2Price: COLORS.soybeanNo2 })} />
                            <Line yAxisId="left" type="monotone" dataKey="soybeanOilPrice" name="豆油" stroke={COLORS.soybeanOil} dot={false} strokeWidth={1.5} hide={hiddenPrice.has('soybeanOilPrice')} />
                            <Line yAxisId="right" type="monotone" dataKey="soybeanMealPrice" name="豆粕" stroke={COLORS.soybeanMeal} dot={false} strokeWidth={1.5} hide={hiddenPrice.has('soybeanMealPrice')} />
                            <Line yAxisId="right" type="monotone" dataKey="soybeanNo2Price" name="豆二" stroke={COLORS.soybeanNo2} strokeDasharray="5 5" dot={false} strokeWidth={1.5} hide={hiddenPrice.has('soybeanNo2Price')} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 5. Position Chart - 中粮期货豆油空单持仓走势 */}
            <div className="card p-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
                    <span className="w-1 h-3 md:h-4 bg-[#FF6B6B] rounded"></span>
                    中粮期货豆油空单持仓走势
                </h3>
                <div className="h-[180px] md:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {positionData && positionData.length > 0 ? (
                            <AreaChart data={positionData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
                                <XAxis dataKey="date" stroke="var(--muted)" fontSize={9} tickFormatter={formatDateLabel} interval={getInterval(positionData?.length || 0)} minTickGap={isMobile ? 50 : 30} />
                                <YAxis stroke="var(--muted)" fontSize={8} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={28} domain={['auto', 'auto']} />
                                {!isMobile && (
                                    <Tooltip
                                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11, padding: "4px 8px" }}
                                        formatter={(value, name) => [`${Number(value).toLocaleString()} 手`, String(name)]}
                                    />
                                )}
                                <Legend verticalAlign="top" height={24} wrapperStyle={{ cursor: 'pointer' }} content={renderInteractiveLegend(hiddenPosition, createLegendHandler(setHiddenPosition), { Y2505: COLORS.Y2505, Y2509: COLORS.Y2509, Y2601: COLORS.Y2601, Y2605: COLORS.Y2605, Y2609: COLORS.Y2609 })} />

                                <Area type="monotone" dataKey="Y2505" name="Y2505" stroke={COLORS.Y2505} fill="url(#colorY2505)" strokeWidth={1.5} hide={hiddenPosition.has('Y2505')} />
                                <Area type="monotone" dataKey="Y2509" name="Y2509" stroke={COLORS.Y2509} fill="url(#colorY2509)" strokeWidth={1.5} hide={hiddenPosition.has('Y2509')} />
                                <Area type="monotone" dataKey="Y2601" name="Y2601" stroke={COLORS.Y2601} fill="url(#colorY2601)" strokeWidth={1.5} hide={hiddenPosition.has('Y2601')} />
                                <Area type="monotone" dataKey="Y2605" name="Y2605" stroke={COLORS.Y2605} fill="url(#colorY2605)" strokeWidth={1.5} hide={hiddenPosition.has('Y2605')} />
                                <Area type="monotone" dataKey="Y2609" name="Y2609" stroke={COLORS.Y2609} fill="url(#colorY2609)" strokeWidth={1.5} hide={hiddenPosition.has('Y2609')} />
                            </AreaChart>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[var(--muted)]">暂无持仓数据</div>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
