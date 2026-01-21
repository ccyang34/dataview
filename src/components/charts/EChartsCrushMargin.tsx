"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
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

// Format date string for display (shorter format)
const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear().toString().slice(2)}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function EChartsCrushMargin({
    data,
    positionData,
    oilData,
    title = "大豆压榨利润分析"
}: FullDashboardProps) {
    const [isMobile, setIsMobile] = useState(false);

    // Interaction State
    const [activeData, setActiveData] = useState<CrushMarginData | null>(null);
    const [activeBasisData, setActiveBasisData] = useState<CrushMarginData | null>(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!data || data.length === 0) return <div className="text-center py-20">暂无数据</div>;

    const latest = data[data.length - 1];
    const latestDate = latest.date;

    // Current displayed data (Header)
    const currentData = activeData || latest;
    const currentBasisData = activeBasisData || latest;

    // Find min/max for annotations
    const marginMax = Math.max(...data.map(d => d.grossMargin));
    const marginMin = Math.min(...data.map(d => d.grossMargin));
    const maxMarginPoint = data.find(d => d.grossMargin === marginMax);
    const minMarginPoint = data.find(d => d.grossMargin === marginMin);

    // Common Chart Options
    const commonGrid = {
        left: isMobile ? '0%' : '5%',
        right: isMobile ? '0%' : '5%',
        top: isMobile ? '12%' : '15%', // Reduced top margin for mobile
        bottom: '0%', // Minimized bottom
        containLabel: true
    };

    // 1. Crush Margin Chart Option
    const getMarginOption = () => {
        const dates = data.map(d => d.date);
        return {
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                textStyle: { color: 'var(--foreground)', fontSize: 11 },
                confine: true,
                formatter: (params: any) => {
                    // Ensure Tooltip is visible (standard behavior)
                    let html = `<div style="margin-bottom:2px;font-weight:500">${params[0].axisValue}</div>`;
                    params.forEach((param: any) => {
                        const val = param.value !== undefined ? (typeof param.value === 'number' ? param.value.toFixed(0) : param.value) : '-';
                        html += `<div style="display:flex;align-items:center;gap:4px;font-size:10px">
                            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:${param.color}"></span>
                            <span style="flex:1">${param.seriesName}</span>
                            <strong>${val}</strong>
                         </div>`;
                    });
                    return html;
                },
                padding: [4, 8] // Compact padding
            },
            legend: {
                data: ['盘面榨利', '现货榨利', '豆油(右)'],
                top: 0,
                icon: 'roundRect',
                itemWidth: 10,
                itemHeight: 6,
                textStyle: { fontSize: 10 },
                itemGap: 10
            },
            grid: { ...commonGrid, right: isMobile ? '1%' : '5%' }, // Slightly more for right axis
            xAxis: {
                type: 'category',
                data: dates,
                axisLabel: {
                    formatter: formatDateLabel,
                    fontSize: 9,
                    color: 'var(--muted)'
                },
                axisLine: { lineStyle: { color: 'var(--border)' } }
            },
            yAxis: [
                {
                    type: 'value',
                    scale: true,
                    axisLabel: { fontSize: 9, color: 'var(--muted)' },
                    splitLine: { lineStyle: { type: 'dashed', color: 'var(--border)', opacity: 0.3 } },
                    axisLine: { show: false }
                },
                {
                    type: 'value',
                    scale: true,
                    position: 'right',
                    axisLabel: {
                        fontSize: 9,
                        color: COLORS.oilOverlay,
                        formatter: (val: number) => (val / 1000).toFixed(1) + 'k'
                    },
                    splitLine: { show: false }
                }
            ],
            series: [
                {
                    name: '盘面榨利',
                    type: 'line',
                    smooth: true,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(255, 165, 0, 0.4)' },
                            { offset: 1, color: 'rgba(255, 165, 0, 0.1)' }
                        ])
                    },
                    lineStyle: { color: COLORS.futuresMargin, width: 1 },
                    itemStyle: { color: COLORS.futuresMargin },
                    showSymbol: false,
                    data: data.map(d => d.futuresMargin)
                },
                {
                    name: '现货榨利',
                    type: 'line',
                    smooth: false,
                    lineStyle: { color: COLORS.grossMargin, width: 2 },
                    itemStyle: { color: COLORS.grossMargin },
                    showSymbol: false,
                    data: data.map(d => d.grossMargin)
                },
                {
                    name: '盈亏平衡',
                    type: 'line',
                    markLine: {
                        symbol: 'none',
                        label: { show: false },
                        data: [{ yAxis: 0 }],
                        lineStyle: { color: COLORS.breakeven, width: 1.5 }
                    },
                    data: [] // Helper for markLine
                },
                {
                    name: '豆油(右)',
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    lineStyle: { color: COLORS.oilOverlay, width: 1, type: 'dashed' },
                    itemStyle: { color: COLORS.oilOverlay },
                    showSymbol: false,
                    data: data.map(d => d.soybeanOilPrice)
                }
            ]
        };
    };

    // 2. Basis Chart Option
    const getBasisOption = () => {
        const dates = data.map(d => d.date);
        return {
            tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', textStyle: { color: 'var(--foreground)', fontSize: 11 }, confine: true, padding: [4, 8] },
            legend: {
                data: ['豆油基差', '豆粕基差', '油粕比', '基差率%'],
                top: 0,
                textStyle: { fontSize: 10 },
                itemWidth: 10, itemHeight: 6,
                itemGap: 10
            },
            grid: { ...commonGrid, right: isMobile ? '1%' : '5%' },
            xAxis: {
                type: 'category',
                data: dates,
                axisLabel: { formatter: formatDateLabel, fontSize: 9, color: 'var(--muted)' }
            },
            yAxis: [
                { type: 'value', scale: true, axisLabel: { fontSize: 9, color: 'var(--muted)' }, splitLine: { lineStyle: { type: 'dashed', opacity: 0.3 } } },
                {
                    type: 'value', scale: true, position: 'right',
                    axisLabel: { fontSize: 9, color: COLORS.oilMealRatio },
                    splitLine: { show: false }
                }
            ],
            series: [
                {
                    name: '豆油基差', type: 'line', data: data.map(d => d.soybeanOilBasis),
                    lineStyle: { color: COLORS.oilBasis, width: 1.5, type: 'dashed' }, showSymbol: false, itemStyle: { color: COLORS.oilBasis }
                },
                {
                    name: '豆粕基差', type: 'line', data: data.map(d => d.soybeanMealBasis),
                    lineStyle: { color: COLORS.mealBasis, width: 1.5, type: 'dashed' }, showSymbol: false, itemStyle: { color: COLORS.mealBasis }
                },
                {
                    name: '油粕比', type: 'line', yAxisIndex: 1, data: data.map(d => d.spotOilMealRatio),
                    areaStyle: { color: COLORS.oilMealRatio, opacity: 0.2 },
                    lineStyle: { color: COLORS.oilMealRatio, width: 1 }, showSymbol: false, itemStyle: { color: COLORS.oilMealRatio }
                },
                {
                    name: '基差率%', type: 'line', yAxisIndex: 1, data: data.map(d => d.oilBasisRate),
                    lineStyle: { color: COLORS.basisRate, width: 1.5 }, showSymbol: false, itemStyle: { color: COLORS.basisRate }
                }
            ]
        }
    };

    // 3. Oil Comparison Option
    const getOilComparisonOption = () => {
        if (!oilData) return {};
        const dates = oilData.map(d => d.date);
        return {
            tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', textStyle: { color: 'var(--foreground)' }, confine: true, padding: [4, 8] },
            legend: { data: ['豆油(Y)', '棕榄油(P)', '菜油(OI)'], top: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 6, itemGap: 10 },
            grid: commonGrid,
            xAxis: { type: 'category', data: dates, axisLabel: { formatter: formatDateLabel, fontSize: 9, color: 'var(--muted)' } },
            yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 9, color: 'var(--muted)' }, splitLine: { lineStyle: { opacity: 0.3 } } },
            series: [
                { name: '豆油(Y)', type: 'line', data: oilData.map(d => d.soybeanOil), showSymbol: false, itemStyle: { color: COLORS.soybeanOil } },
                { name: '棕榄油(P)', type: 'line', data: oilData.map(d => d.palmOil), showSymbol: false, itemStyle: { color: COLORS.palm } },
                { name: '菜油(OI)', type: 'line', data: oilData.map(d => d.rapeseedOil), showSymbol: false, itemStyle: { color: COLORS.rapeseed } },
            ]
        };
    };

    // 4. Futures Price Option
    const getFuturesOption = () => {
        const dates = data.map(d => d.date);
        return {
            tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', textStyle: { color: 'var(--foreground)' }, confine: true, padding: [4, 8] },
            legend: { data: ['豆油', '豆粕', '豆二'], top: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 6, itemGap: 10 },
            grid: { ...commonGrid, right: isMobile ? '1%' : '5%' },
            xAxis: { type: 'category', data: dates, axisLabel: { formatter: formatDateLabel, fontSize: 9, color: 'var(--muted)' } },
            yAxis: [
                { type: 'value', scale: true, axisLabel: { fontSize: 9, color: COLORS.soybeanOil, formatter: (v: number) => (v / 1000).toFixed(0) + 'k' } },
                { type: 'value', scale: true, position: 'right', axisLabel: { fontSize: 9, color: COLORS.soybeanMeal } }
            ],
            series: [
                { name: '豆油', type: 'line', data: data.map(d => d.soybeanOilPrice), showSymbol: false, itemStyle: { color: COLORS.soybeanOil } },
                { name: '豆粕', type: 'line', yAxisIndex: 1, data: data.map(d => d.soybeanMealPrice), showSymbol: false, itemStyle: { color: COLORS.soybeanMeal } },
                { name: '豆二', type: 'line', yAxisIndex: 1, data: data.map(d => d.soybeanNo2Price), lineStyle: { type: 'dashed' }, showSymbol: false, itemStyle: { color: COLORS.soybeanNo2 } }
            ]
        };
    };

    // 5. Position Option
    const getPositionOption = () => {
        if (!positionData) return {};
        const dates = positionData.map(d => d.date);

        // Map price data to position dates
        const priceMap = new Map(data.map(d => [d.date, d.soybeanOilPrice]));
        const priceSeriesData = dates.map(date => priceMap.get(date) || undefined);

        // Map spot price data (Price + Basis) to position dates
        const spotPriceMap = new Map(data.map(d => [d.date, d.soybeanOilPrice + d.soybeanOilBasis]));
        const spotPriceSeriesData = dates.map(date => spotPriceMap.get(date) || undefined);

        const seriesNames = ['Y2505', 'Y2509', 'Y2601', 'Y2605', 'Y2609'];
        const series: any[] = seriesNames.map(name => ({
            name,
            type: 'line',
            stack: 'Total',
            areaStyle: {},
            showSymbol: false,
            // @ts-ignore
            data: positionData.map(d => d[name] || 0),
            itemStyle: { color: (COLORS as any)[name] }
        }));

        // Add Future Price Series
        series.push({
            name: '豆油价格(右)',
            type: 'line',
            yAxisIndex: 1, // Right axis
            data: priceSeriesData,
            symbol: 'none',
            itemStyle: { color: COLORS.soybeanOil },
            lineStyle: { width: 1.5, type: 'dashed' }
        });

        // Add Spot Price Series
        series.push({
            name: '豆油现货(右)',
            type: 'line',
            yAxisIndex: 1, // Right axis
            data: spotPriceSeriesData,
            symbol: 'none',
            itemStyle: { color: '#FF4500' }, // Distinct OrangeRed for Spot
            lineStyle: { width: 1.5, type: 'dashed' }
        });

        return {
            tooltip: { trigger: 'axis', backgroundColor: 'var(--card)', borderColor: 'var(--border)', textStyle: { color: 'var(--foreground)' }, confine: true, padding: [4, 8] },
            legend: {
                data: [...seriesNames, '豆油价格(右)', '豆油现货(右)'],
                top: 0,
                textStyle: { fontSize: 10 },
                itemWidth: 10, itemHeight: 6,
                itemGap: 5
            },
            grid: { ...commonGrid, right: isMobile ? '1%' : '5%' }, // Slight right margin for axis
            xAxis: { type: 'category', data: dates, axisLabel: { formatter: formatDateLabel, fontSize: 9, color: 'var(--muted)' } },
            yAxis: [
                {
                    type: 'value',
                    scale: true, // Auto scale for position
                    axisLabel: { fontSize: 9, color: 'var(--muted)', formatter: (v: number) => (v / 1000).toFixed(0) + 'k' }
                },
                {
                    type: 'value',
                    scale: true, // Auto scale for price
                    position: 'right',
                    splitLine: { show: false },
                    axisLabel: { fontSize: 9, color: COLORS.soybeanOil, formatter: (v: number) => (v / 1000).toFixed(1) + 'k' }
                }
            ],
            series
        };
    };

    // Handlers for interaction syncing
    const onChartEvents = {
        updateAxisPointer: (params: any) => {
            const dataIndex = params.dataIndex;
            if (dataIndex != null && data[dataIndex]) {
                setActiveData(data[dataIndex]);
            }
        },
        globalout: () => {
            // Optional: reset on leave, but ECharts sometimes triggers globalout easily. 
            // Ideally we want to keep last value or reset? 
            // Recharts logic was 'onMouseLeave={() => setActiveData(null)}'
            // In ECharts 'globalout' corresponds to mouse leave.
            setActiveData(null);
        }
    };

    // Basis chart handlers
    const onBasisChartEvents = {
        updateAxisPointer: (params: any) => {
            const dataIndex = params.dataIndex;
            if (dataIndex != null && data[dataIndex]) {
                setActiveBasisData(data[dataIndex]);
            }
        },
        globalout: () => setActiveBasisData(null)
    };

    return (
        <div className="space-y-3 md:space-y-6">
            {/* Header with latest stats */}
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

            {/* 1. Crush Margin Chart */}
            <div className="card p-0 pb-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2 md:px-0 pt-2 md:pt-0">
                    <span className="w-1 h-3 md:h-4 bg-[#800080] rounded"></span>
                    压榨利润走势 - 现货: {currentData.grossMargin.toFixed(0)}
                    {activeData && <span className="text-[var(--muted)] ml-2 text-[10px] font-normal">({activeData.date})</span>}
                </h3>
                <div className="h-[200px] md:h-[300px]">
                    <ReactECharts
                        option={getMarginOption()}
                        style={{ height: '100%', width: '100%' }}
                        onEvents={onChartEvents}
                        opts={{ renderer: 'svg' }}
                    />
                </div>
                {/* Annotations - hidden on mobile */}
                <div className="hidden md:flex justify-between text-xs text-[var(--muted)] mt-2 px-12">
                    <span>最高: <span className="text-purple-600 font-medium">{marginMax.toFixed(0)}</span> ({maxMarginPoint?.date})</span>
                    <span>最低: <span className="text-purple-600 font-medium">{marginMin.toFixed(0)}</span> ({minMarginPoint?.date})</span>
                </div>
            </div>

            {/* 2. Basis Chart */}
            <div className="card p-0 pb-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2 md:px-0 pt-2 md:pt-0">
                    <span className="w-1 h-3 md:h-4 bg-[#228B22] rounded"></span>
                    基差走势 & 油粕比: {currentBasisData.spotOilMealRatio.toFixed(3)}
                    {activeBasisData && <span className="text-[var(--muted)] ml-2 text-[10px] font-normal">({activeBasisData.date})</span>}
                </h3>
                <div className="h-[200px] md:h-[300px]">
                    <ReactECharts
                        option={getBasisOption()}
                        style={{ height: '100%', width: '100%' }}
                        onEvents={onBasisChartEvents}
                        opts={{ renderer: 'svg' }}
                    />
                </div>
            </div>

            {/* 3. Oil Comparison */}
            <div className="card p-0 pb-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2 md:px-0 pt-2 md:pt-0">
                    <span className="w-1 h-3 md:h-4 bg-[#FFD700] rounded"></span>
                    油脂板块价格对比 (豆、棕、菜)
                </h3>
                <div className="h-[200px] md:h-[300px]">
                    <ReactECharts
                        option={getOilComparisonOption()}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'svg' }}
                    />
                </div>
            </div>

            {/* 4. Futures Price */}
            <div className="card p-0 pb-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2 md:px-0 pt-2 md:pt-0">
                    <span className="w-1 h-3 md:h-4 bg-[#FF8C00] rounded"></span>
                    期货价格走势 (双轴)
                </h3>
                <div className="h-[200px] md:h-[300px]">
                    <ReactECharts
                        option={getFuturesOption()}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'svg' }}
                    />
                </div>
            </div>

            {/* 5. Position Chart */}
            <div className="card p-0 pb-2 md:p-4">
                <h3 className="font-semibold text-xs md:text-sm mb-1 md:mb-2 flex items-center gap-1 md:gap-2 md:px-0 pt-2 md:pt-0">
                    <span className="w-1 h-3 md:h-4 bg-[#FF6B6B] rounded"></span>
                    中粮期货豆油空单持仓走势
                </h3>
                <div className="h-[200px] md:h-[300px]">
                    <ReactECharts
                        option={getPositionOption()}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'svg' }}
                    />
                </div>
            </div>
        </div>
    );
}
