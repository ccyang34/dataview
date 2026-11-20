"use client";

import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { CrushMarginData } from "@/lib/crush-margin";

// Types for additional data
export interface PositionData {
    date: string;
    [contract: string]: string | number | undefined;
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
    positionContracts?: string[];
    oilData?: OilComparisonData[];
    title?: string;
}

/** 读取 CSS 变量作为图表颜色（适配深浅主题） */
function useThemeColors() {
    const [t, setT] = useState({ fg: "#0F172A", muted: "#64748B", border: "#E2E8F0", card: "#FFFFFF", split: "#EEF2F6" });
    useEffect(() => {
        const read = () => {
            const cs = getComputedStyle(document.documentElement);
            setT({
                fg: cs.getPropertyValue("--foreground").trim() || "#0F172A",
                muted: cs.getPropertyValue("--muted").trim() || "#64748B",
                border: cs.getPropertyValue("--border").trim() || "#E2E8F0",
                card: cs.getPropertyValue("--card").trim() || "#FFFFFF",
                split: document.documentElement.classList.contains("dark") ? "#243247" : "#EEF2F6",
            });
        };
        read();
        window.addEventListener("resize", read);
        const obs = new MutationObserver(read);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => { window.removeEventListener("resize", read); obs.disconnect(); };
    }, []);
    return t;
}

/** 协调现代色板（深浅主题通用） */
const C = {
    futures: "#F59E0B",     // 盘面榨利 琥珀
    gross: "#8B5CF6",       // 现货榨利 紫（主线）
    breakeven: "#EF4444",   // 盈亏平衡
    oilOverlay: "#0EA5E9",  // 豆油右轴 天蓝
    oilBasis: "#F59E0B",
    mealBasis: "#0EA5E9",
    ratio: "#10B981",
    basisRate: "#EC4899",
    soybeanOil: "#F59E0B",
    soybeanMeal: "#8B5CF6",
    soybeanNo2: "#0EA5E9",
    palm: "#10B981",
    rapeseed: "#EAB308",
    futuresPrice: "#0EA5E9",
    spotPrice: "#EF4444",
    positions: ["#F59E0B", "#0EA5E9", "#10B981", "#8B5CF6", "#EC4899"],
};

const fmtDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear().toString().slice(2)}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const n0 = (v: number | undefined | null) => v == null || Number.isNaN(v) ? "-" : Math.round(v).toLocaleString();

/** 通用图表卡片：统一标题栏 + 图表区 */
function ChartCard({ title, accent, extra, children, id }: { title: string; accent: string; extra?: React.ReactNode; children: React.ReactNode; id?: string }) {
    return (
        <div id={id} className="card p-3 sm:p-4" style={{ scrollMarginTop: 92 }}>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className="w-1 h-4 rounded" style={{ backgroundColor: accent }} />
                    {title}
                </h3>
                {extra}
            </div>
            {children}
        </div>
    );
}

export function EChartsCrushMargin({
    data,
    positionData,
    positionContracts,
    oilData,
    title = "大豆压榨利润分析"
}: FullDashboardProps) {
    const t = useThemeColors();
    const [isMobile, setIsMobile] = useState(false);
    const [activeData, setActiveData] = useState<CrushMarginData | null>(null);
    const [activeBasisData, setActiveBasisData] = useState<CrushMarginData | null>(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    if (!data || data.length === 0) return <div className="text-center py-20 text-[var(--muted)]">暂无数据</div>;

    const latest = data[data.length - 1];
    const latestDate = latest.date;
    const currentData = activeData || latest;
    const currentBasisData = activeBasisData || latest;

    const marginMax = Math.max(...data.map(d => d.grossMargin));
    const marginMin = Math.min(...data.map(d => d.grossMargin));
    const maxMarginPoint = data.find(d => d.grossMargin === marginMax);
    const minMarginPoint = data.find(d => d.grossMargin === marginMin);

    // ---------- 通用 ECharts 片段 ----------
    const axisLabel = { fontSize: 10, color: t.muted };
    const splitLine = { lineStyle: { type: "dashed" as const, color: t.border, opacity: 0.7 } };
    const legend = (names: string[]) => ({
        data: names, top: 0, icon: "roundRect", itemWidth: 12, itemHeight: 7, itemGap: 14,
        textStyle: { fontSize: 11, color: t.muted },
    });
    const tooltip = (formatter?: (p: any) => string) => ({
        trigger: "axis" as const, backgroundColor: t.card, borderColor: t.border, borderWidth: 1,
        textStyle: { color: t.fg, fontSize: 11 }, confine: true, padding: [6, 10],
        extraCssText: "box-shadow:0 6px 20px rgba(0,0,0,.12);border-radius:8px;",
        axisPointer: { type: "line" as const, lineStyle: { color: t.muted, type: "dashed" as const } },
        ...(formatter ? { formatter } : {}),
    });
    const dataZoom = [
        { type: "inside" as const, start: 0, end: 100 },
        { type: "slider" as const, height: 14, bottom: 4, start: 0, end: 100,
          borderColor: "transparent", backgroundColor: t.split, fillerColor: "rgba(59,130,246,.15)",
          handleStyle: { color: "#3B82F6" }, moveHandleStyle: { color: "#3B82F6" },
          dataBackground: { lineStyle: { color: t.muted, opacity: .4 }, areaStyle: { color: t.muted, opacity: .12 } },
          textStyle: { color: t.muted, fontSize: 9 } },
    ];
    const grid = (right?: string) => ({ left: 6, right: right || 8, top: 30, bottom: 44, containLabel: true });
    const baseSeries = (name: string, values: any[], color: string, extra: Record<string, any> = {}) => ({
        name, type: "line", data: values, showSymbol: false, smooth: false,
        lineStyle: { color, width: 1.5 }, itemStyle: { color }, ...extra,
    });

    // ---------- 1. 榨利主图 ----------
    const getMarginOption = () => ({
        backgroundColor: "transparent",
        textStyle: { color: t.fg },
        tooltip: tooltip((params: any) => {
            let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValue || ""}</div>`;
            [...params].sort((a: any, b: any) => b.seriesName.localeCompare(a.seriesName)).forEach((p: any) => {
                const val = p.value == null ? "-" : (typeof p.value === "number" ? p.value.toFixed(0) : p.value);
                html += `<div style="display:flex;justify-content:space-between;gap:16px;line-height:1.7">
                    <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.color};margin-right:5px"></span>${p.seriesName}</span>
                    <strong style="font-variant-numeric:tabular-nums">${val}</strong></div>`;
            });
            return html;
        }),
        legend: legend(["现货榨利", "盘面榨利", "豆油(右)"]),
        grid: grid(isMobile ? "2%" : "4%"),
        xAxis: { type: "category", data: data.map(d => d.date), boundaryGap: false,
            axisLabel: { ...axisLabel, formatter: fmtDate, hideOverlap: true }, axisLine: { lineStyle: { color: t.border } }, axisTick: { show: false } },
        yAxis: [
            { type: "value", scale: true, axisLabel, splitLine, axisLine: { show: false } },
            { type: "value", scale: true, position: "right", axisLabel: { ...axisLabel, color: C.oilOverlay, formatter: (v: number) => (v / 1000).toFixed(1) + "k" }, splitLine: { show: false }, axisLine: { show: false } },
        ],
        dataZoom,
        series: [
            { ...baseSeries("现货榨利", data.map(d => d.grossMargin), C.gross, { smooth: true, lineStyle: { color: C.gross, width: 2.2 },
                markPoint: { symbol: "pin", symbolSize: 34, data: [
                    { name: "最高", value: marginMax, coord: [maxMarginPoint?.date, marginMax], itemStyle: { color: C.gross }, label: { fontSize: 9, color: "#fff", formatter: () => Math.round(marginMax).toString() } },
                    { name: "最低", value: marginMin, coord: [minMarginPoint?.date, marginMin], itemStyle: { color: C.breakeven }, label: { fontSize: 9, color: "#fff", formatter: () => Math.round(marginMin).toString() } },
                ] } }) },
            { ...baseSeries("盘面榨利", data.map(d => d.futuresMargin), C.futures, { smooth: true,
                lineStyle: { color: C.futures, width: 1.4 },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "rgba(245,158,11,.22)" }, { offset: 1, color: "rgba(245,158,11,.02)" }]) } }) },
            { name: "盈亏平衡", type: "line", silent: true, symbol: "none", data: [],
                markLine: { data: [{ yAxis: 0 }], symbol: "none", label: { show: false }, lineStyle: { color: C.breakeven, width: 1, type: "dashed", opacity: .7 } } },
            { ...baseSeries("豆油(右)", data.map(d => d.soybeanOilPrice), C.oilOverlay, { yAxisIndex: 1, smooth: true,
                lineStyle: { color: C.oilOverlay, width: 1.2, type: "dashed", opacity: .85 } }) },
        ],
    });

    // ---------- 2. 基差 & 油粕比 ----------
    const getBasisOption = () => ({
        backgroundColor: "transparent", textStyle: { color: t.fg }, tooltip: tooltip(),
        legend: legend(["豆油基差", "豆粕基差", "油粕比", "基差率%"]),
        grid: grid(isMobile ? "2%" : "4%"),
        xAxis: { type: "category", data: data.map(d => d.date), boundaryGap: false,
            axisLabel: { ...axisLabel, formatter: fmtDate, hideOverlap: true }, axisLine: { lineStyle: { color: t.border } }, axisTick: { show: false } },
        yAxis: [
            { type: "value", scale: true, axisLabel, splitLine, axisLine: { show: false } },
            { type: "value", scale: true, position: "right", axisLabel: { ...axisLabel, color: C.ratio }, splitLine: { show: false }, axisLine: { show: false } },
        ],
        dataZoom,
        series: [
            baseSeries("豆油基差", data.map(d => d.soybeanOilBasis), C.oilBasis, { lineStyle: { color: C.oilBasis, width: 1.4, type: "dashed" } }),
            baseSeries("豆粕基差", data.map(d => d.soybeanMealBasis), C.mealBasis, { lineStyle: { color: C.mealBasis, width: 1.4, type: "dashed" } }),
            baseSeries("油粕比", data.map(d => d.spotOilMealRatio), C.ratio, { yAxisIndex: 1, smooth: true,
                lineStyle: { color: C.ratio, width: 1.8 },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "rgba(16,185,129,.18)" }, { offset: 1, color: "rgba(16,185,129,.01)" }]) } }),
            baseSeries("基差率%", data.map(d => d.oilBasisRate), C.basisRate, { yAxisIndex: 1, lineStyle: { color: C.basisRate, width: 1.3 } }),
        ],
    });

    // ---------- 3. 油脂板块对比 ----------
    const getOilComparisonOption = () => ({
        backgroundColor: "transparent", textStyle: { color: t.fg }, tooltip: tooltip(),
        legend: legend(["豆油(Y)", "棕榈油(P)", "菜油(OI)"]),
        grid: grid(),
        xAxis: { type: "category", data: (oilData || []).map(d => d.date), boundaryGap: false,
            axisLabel: { ...axisLabel, formatter: fmtDate, hideOverlap: true }, axisLine: { lineStyle: { color: t.border } }, axisTick: { show: false } },
        yAxis: { type: "value", scale: true, axisLabel: { ...axisLabel, formatter: (v: number) => (v / 1000).toFixed(0) + "k" }, splitLine, axisLine: { show: false } },
        dataZoom,
        series: [
            baseSeries("豆油(Y)", oilData?.map(d => d.soybeanOil) || [], C.soybeanOil, { lineStyle: { color: C.soybeanOil, width: 1.6 } }),
            baseSeries("棕榈油(P)", oilData?.map(d => d.palmOil) || [], C.palm, { lineStyle: { color: C.palm, width: 1.6 } }),
            baseSeries("菜油(OI)", oilData?.map(d => d.rapeseedOil) || [], C.rapeseed, { lineStyle: { color: C.rapeseed, width: 1.6 } }),
        ],
    });

    // ---------- 4. 期货价格 ----------
    const getFuturesOption = () => ({
        backgroundColor: "transparent", textStyle: { color: t.fg }, tooltip: tooltip(),
        legend: legend(["豆油", "豆粕", "豆二"]),
        grid: grid(isMobile ? "2%" : "4%"),
        xAxis: { type: "category", data: data.map(d => d.date), boundaryGap: false,
            axisLabel: { ...axisLabel, formatter: fmtDate, hideOverlap: true }, axisLine: { lineStyle: { color: t.border } }, axisTick: { show: false } },
        yAxis: [
            { type: "value", scale: true, axisLabel: { ...axisLabel, color: C.soybeanOil, formatter: (v: number) => (v / 1000).toFixed(1) + "k" }, splitLine, axisLine: { show: false } },
            { type: "value", scale: true, position: "right", axisLabel: { ...axisLabel, color: C.soybeanMeal }, splitLine: { show: false }, axisLine: { show: false } },
        ],
        dataZoom,
        series: [
            baseSeries("豆油", data.map(d => d.soybeanOilPrice), C.soybeanOil, { lineStyle: { color: C.soybeanOil, width: 1.6 } }),
            baseSeries("豆粕", data.map(d => d.soybeanMealPrice), C.soybeanMeal, { yAxisIndex: 1, lineStyle: { color: C.soybeanMeal, width: 1.5 } }),
            baseSeries("豆二", data.map(d => d.soybeanNo2Price), C.soybeanNo2, { yAxisIndex: 1, lineStyle: { color: C.soybeanNo2, width: 1.3, type: "dashed" } }),
        ],
    });

    // 合约名来自 API meta（不从首行取，首行只有最早上市的合约）
    const positionNames = (positionContracts || []).length
        ? positionContracts!
        : [...new Set((positionData || []).flatMap(d => Object.keys(d).filter(k => /^Y\d{4}$/i.test(k))))];

    // ---------- 5. 持仓走势 ----------
    const getPositionOption = () => {
        const dates = (positionData || []).map(d => d.date);
        const priceMap = new Map(data.map(d => [d.date, d.soybeanOilPrice]));
        const spotMap = new Map(data.map(d => [d.date, d.soybeanOilPrice + d.soybeanOilBasis]));
        const names = positionNames;

        // 上游接口在某些交易日只返回部分合约数据（如主力缺失），堆叠时塌到 0 形成垂直尖峰。
        // 处理：合约生命周期内（首次~末次出现）缺失日沿用前值；上市前/退市后保持 undefined。
        const ffillInSpan = (raw: (number | undefined)[]): (number | undefined)[] => {
            const valid = raw.map((v, i) => v != null ? i : -1).filter(i => i >= 0);
            if (!valid.length) return raw;
            const first = valid[0], last = valid[valid.length - 1];
            let carry: number | undefined;
            return raw.map((v, i) => {
                if (v != null) { carry = v; return v; }
                return i >= first && i <= last ? carry : undefined;
            });
        };

        const series: any[] = names.map((name, i) => {
            const raw = (positionData || []).map(d => {
                const v = d[name];
                return typeof v === "number" ? v : undefined;
            });
            return {
                name, type: "line", stack: "Total", showSymbol: false, connectNulls: false,
                itemStyle: { color: C.positions[i % C.positions.length] },
                lineStyle: { color: C.positions[i % C.positions.length], width: 1 },
                areaStyle: { color: C.positions[i % C.positions.length], opacity: 0.28 },
                data: ffillInSpan(raw),
            };
        });
        series.push({ name: "豆油期货(右)", type: "line", yAxisIndex: 1, showSymbol: false, symbol: "none",
            data: ffillInSpan(dates.map(d => priceMap.get(d))), itemStyle: { color: C.futuresPrice }, lineStyle: { color: C.futuresPrice, width: 1.5, type: "dashed" } });
        series.push({ name: "豆油现货(右)", type: "line", yAxisIndex: 1, showSymbol: false, symbol: "none",
            data: ffillInSpan(dates.map(d => spotMap.get(d))), itemStyle: { color: C.spotPrice }, lineStyle: { color: C.spotPrice, width: 1.5, type: "dashed" } });
        return {
            backgroundColor: "transparent", textStyle: { color: t.fg }, tooltip: tooltip(),
            legend: legend([...names, "豆油期货(右)", "豆油现货(右)"]),
            grid: grid(isMobile ? "2%" : "4%"),
            xAxis: { type: "category", data: dates, boundaryGap: false,
                axisLabel: { ...axisLabel, formatter: fmtDate, hideOverlap: true }, axisLine: { lineStyle: { color: t.border } }, axisTick: { show: false } },
            yAxis: [
                { type: "value", scale: true, axisLabel: { ...axisLabel, formatter: (v: number) => (v / 1000).toFixed(0) + "k" }, splitLine, axisLine: { show: false } },
                { type: "value", scale: true, position: "right", axisLabel: { ...axisLabel, color: C.soybeanOil, formatter: (v: number) => (v / 1000).toFixed(1) + "k" }, splitLine: { show: false }, axisLine: { show: false } },
            ],
            dataZoom,
            series,
        };
    };

    const onMarginEvents = {
        updateAxisPointer: (p: any) => { if (p?.dataIndex != null && data[p.dataIndex]) setActiveData(data[p.dataIndex]); },
        globalout: () => setActiveData(null),
    };
    const onBasisEvents = {
        updateAxisPointer: (p: any) => { if (p?.dataIndex != null && data[p.dataIndex]) setActiveBasisData(data[p.dataIndex]); },
        globalout: () => setActiveBasisData(null),
    };

    const kpis = [
        { label: "现货榨利", value: n0(currentData.grossMargin), unit: "元/吨", color: currentData.grossMargin >= 0 ? C.gross : C.breakeven },
        { label: "盘面榨利", value: n0(currentData.futuresMargin), unit: "元/吨", color: currentData.futuresMargin >= 0 ? C.futures : C.breakeven },
        { label: "油粕比", value: currentBasisData.spotOilMealRatio.toFixed(3), unit: "", color: C.ratio },
        { label: "豆油现货", value: n0((latest.soybeanOilPrice || 0) + (latest.soybeanOilBasis || 0)), unit: "元/吨", color: C.soybeanOil },
    ];

    return (
        <div className="space-y-4">
            {/* KPI 概览 */}
            <div id="kpi" className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ scrollMarginTop: 92 }}>
                {kpis.map(k => (
                    <div key={k.label} className="card p-3 sm:p-4">
                        <div className="text-xs text-[var(--muted)] mb-1">{k.label}</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl sm:text-2xl font-semibold tabular-nums" style={{ color: k.color }}>{k.value}</span>
                            {k.unit && <span className="text-[10px] text-[var(--muted)]">{k.unit}</span>}
                        </div>
                        <div className="text-[10px] text-[var(--muted)] mt-1">{activeData?.date || latestDate}</div>
                    </div>
                ))}
            </div>

            {/* 1. 榨利主图（独占整行） */}
            <ChartCard id="margin" title={`压榨利润走势 · ${title}`} accent={C.gross}
                extra={<span className="text-[11px] text-[var(--muted)] tabular-nums">最高 {n0(marginMax)} · 最低 {n0(marginMin)}</span>}>
                <div className="h-[260px] sm:h-[340px]">
                    <ReactECharts option={getMarginOption()} style={{ height: "100%", width: "100%" }}
                        onEvents={onMarginEvents} opts={{ renderer: "svg" }} notMerge={true} />
                </div>
            </ChartCard>

            {/* 2-5. 四图两列网格 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard id="basis" title={`基差走势 & 油粕比 · ${currentBasisData.spotOilMealRatio.toFixed(3)}`} accent={C.ratio}
                    extra={activeBasisData && <span className="text-[10px] text-[var(--muted)]">{activeBasisData.date}</span>}>
                    <div className="h-[240px] sm:h-[280px]">
                        <ReactECharts option={getBasisOption()} style={{ height: "100%", width: "100%" }}
                            onEvents={onBasisEvents} opts={{ renderer: "svg" }} notMerge={true} />
                    </div>
                </ChartCard>

                <ChartCard id="oil" title="油脂板块价格对比（豆 · 棕 · 菜）" accent={C.palm}>
                    <div className="h-[240px] sm:h-[280px]">
                        <ReactECharts option={getOilComparisonOption()} style={{ height: "100%", width: "100%" }}
                            opts={{ renderer: "svg" }} notMerge={true} />
                    </div>
                </ChartCard>

                <ChartCard id="futures" title="期货价格走势（双轴）" accent={C.soybeanOil}>
                    <div className="h-[240px] sm:h-[280px]">
                        <ReactECharts option={getFuturesOption()} style={{ height: "100%", width: "100%" }}
                            opts={{ renderer: "svg" }} notMerge={true} />
                    </div>
                </ChartCard>

                <ChartCard id="position" title="中粮期货豆油净持仓走势" accent={C.positions[0]}
                    extra={
                        <span className="text-[10px] text-[var(--muted)]">
                            {positionNames.join(" · ")}
                            {positionData && positionData.length ? ` · 截至 ${positionData[positionData.length - 1]?.date}` : ""}
                            <span className="ml-1 opacity-70">（缺值按前值填补）</span>
                        </span>
                    }>
                    <div className="h-[240px] sm:h-[280px]">
                        <ReactECharts option={getPositionOption()} style={{ height: "100%", width: "100%" }}
                            opts={{ renderer: "svg" }} notMerge={true} />
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}
