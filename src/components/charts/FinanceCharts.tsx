"use client";

import { useEffect, useRef, useState } from "react";
import {
    createChart,
    IChartApi,
    CandlestickSeries,
    HistogramSeries,
    AreaSeries,
    LineSeries,
    Time,
} from "lightweight-charts";

interface KLineData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

interface KLineChartProps {
    data: KLineData[];
    height?: number;
    showVolume?: boolean;
}

// 格式化日期辅助函数
const formatDate = (time: string | number | Date) => {
    // 如果是字符串 'yyyy-MM-dd'，直接截取年月
    if (typeof time === 'string') {
        const parts = time.split('-');
        if (parts.length >= 2) {
            return `${parts[0]}-${parts[1]}`;
        }
    }

    // 处理时间戳或Date对象
    const date = new Date(typeof time === 'number' ? time * 1000 : time);
    if (isNaN(date.getTime())) return String(time);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

export function KLineChart({ data, height = 400, showVolume = true }: KLineChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !chartContainerRef.current) return;

        // 获取 CSS 变量
        const computedStyle = getComputedStyle(document.documentElement);
        const upColor = computedStyle.getPropertyValue("--chart-up").trim() || "#10B981";
        const downColor = computedStyle.getPropertyValue("--chart-down").trim() || "#EF4444";
        const bgColor = computedStyle.getPropertyValue("--card").trim() || "#FFFFFF";
        const textColor = computedStyle.getPropertyValue("--muted").trim() || "#64748B";
        const borderColor = computedStyle.getPropertyValue("--border").trim() || "#E2E8F0";

        // 创建图表
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: height,
            layout: {
                background: { color: bgColor },
                textColor: textColor,
            },
            localization: {
                locale: 'zh-CN',
                dateFormat: 'yyyy-MM-dd',
            },
            grid: {
                vertLines: { color: borderColor, visible: false },
                horzLines: { color: borderColor, visible: false },
            },
            crosshair: {
                mode: 1,
            },
            rightPriceScale: {
                borderColor: borderColor,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.25,
                },
            },
            timeScale: {
                borderColor: borderColor,
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                tickMarkFormatter: formatDate,
                ticksVisible: true, // 显示刻度
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        chartRef.current = chart;

        // 添加 K 线
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: upColor,
            downColor: downColor,
            borderDownColor: downColor,
            borderUpColor: upColor,
            wickDownColor: downColor,
            wickUpColor: upColor,
        });

        // 均线辅助函数
        const calculateSMA = (data: any[], count: number) => {
            const avg = [];
            for (let i = 0; i < data.length; i++) {
                if (i < count - 1) {
                    avg.push({ time: data[i].time, value: undefined });
                    continue;
                }
                let sum = 0;
                for (let j = 0; j < count; j++) {
                    sum += data[i - j].close;
                }
                avg.push({ time: data[i].time, value: sum / count });
            }
            return avg.filter(d => d.value !== undefined);
        };

        // 转换数据格式
        const chartData = data.map((item) => ({
            time: item.time as Time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        candlestickSeries.setData(chartData);

        // 添加均线 SMA5, SMA10, SMA20
        const sma5Data = calculateSMA(chartData, 5);
        if (sma5Data.length > 0) {
            const sma5Series = chart.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MA5' });
            sma5Series.setData(sma5Data as any);
        }
        const sma20Data = calculateSMA(chartData, 20);
        if (sma20Data.length > 0) {
            const sma20Series = chart.addSeries(LineSeries, { color: '#E91E63', lineWidth: 1, title: 'MA20' });
            sma20Series.setData(sma20Data as any);
        }

        // 添加成交量
        if (showVolume) {
            const volumeSeries = chart.addSeries(HistogramSeries, {
                color: upColor,
                priceFormat: { type: "volume" },
                priceScaleId: "",
            });

            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });

            const volumeData = data.map((item) => ({
                time: item.time as Time,
                value: item.volume || 0,
                color: item.close >= item.open ? `${upColor}88` : `${downColor}88`,
            }));

            volumeSeries.setData(volumeData);
        }

        // 自适应布局
        chart.timeScale().fitContent();

        // 响应式调整
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [data, height, showVolume, isClient]);

    if (!isClient) {
        return (
            <div
                className="w-full flex items-center justify-center bg-[var(--card-hover)]"
                style={{ height: `${height}px` }}
            >
                <span className="text-[var(--muted)]">加载图表中...</span>
            </div>
        );
    }

    return (
        <div
            ref={chartContainerRef}
            className="w-full"
            style={{ height: `${height}px` }}
        />
    );
}

// 分时图
interface TimelineData {
    time: string;
    price: number;
    avg?: number;
}

interface TimelineChartProps {
    data: TimelineData[];
    prevClose?: number;
    height?: number;
}

export function TimelineChart({ data, prevClose, height = 300 }: TimelineChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !chartContainerRef.current) return;

        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor = computedStyle.getPropertyValue("--primary").trim() || "#3B82F6";
        const secondaryColor = computedStyle.getPropertyValue("--accent").trim() || "#F59E0B";
        const bgColor = computedStyle.getPropertyValue("--card").trim() || "#FFFFFF";
        const textColor = computedStyle.getPropertyValue("--muted").trim() || "#64748B";
        const borderColor = computedStyle.getPropertyValue("--border").trim() || "#E2E8F0";

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: height,
            layout: {
                background: { color: bgColor },
                textColor: textColor,
            },
            grid: {
                vertLines: { color: borderColor },
                horzLines: { color: borderColor },
            },
            rightPriceScale: {
                borderColor: borderColor,
            },
            timeScale: {
                borderColor: borderColor,
                timeVisible: true,
                secondsVisible: false,
                tickMarkFormatter: formatDate,
                ticksVisible: true,
            },
        });

        chartRef.current = chart;

        // 价格面积图 - v5 API
        const priceSeries = chart.addSeries(AreaSeries, {
            lineColor: primaryColor,
            topColor: `${primaryColor}33`,
            bottomColor: `${primaryColor}00`,
            lineWidth: 2,
        });

        const priceData = data.map((item) => ({
            time: item.time as Time,
            value: item.price,
        }));

        priceSeries.setData(priceData);

        // 均价线（如果有）
        if (data.some((d) => d.avg !== undefined)) {
            const avgSeries = chart.addSeries(LineSeries, {
                color: secondaryColor,
                lineWidth: 1,
                lineStyle: 2,
            });

            const avgData = data
                .filter((d) => d.avg !== undefined)
                .map((item) => ({
                    time: item.time as Time,
                    value: item.avg!,
                }));

            avgSeries.setData(avgData);
        }

        // 昨收线
        if (prevClose) {
            priceSeries.createPriceLine({
                price: prevClose,
                color: "#6B7280",
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: "昨收",
            });
        }

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [data, prevClose, height, isClient]);

    if (!isClient) {
        return (
            <div
                className="w-full flex items-center justify-center bg-[var(--card-hover)]"
                style={{ height: `${height}px` }}
            >
                <span className="text-[var(--muted)]">加载图表中...</span>
            </div>
        );
    }

    return (
        <div
            ref={chartContainerRef}
            className="w-full"
            style={{ height: `${height}px` }}
        />
    );
}

export interface ComparisonChartProps {
    data: {
        name: string;
        currentPct: number;
        data: { time: string; value: number }[];
    }[];
    height?: number;
}

export function ComparisonChart({ data, height = 300 }: ComparisonChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !chartContainerRef.current || data.length === 0) return;

        const computedStyle = getComputedStyle(document.documentElement);
        const bgColor = computedStyle.getPropertyValue("--card").trim() || "#FFFFFF";
        const textColor = computedStyle.getPropertyValue("--muted").trim() || "#64748B";
        const borderColor = computedStyle.getPropertyValue("--border").trim() || "#E2E8F0";

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: height,
            layout: {
                background: { color: bgColor },
                textColor: textColor,
            },
            localization: {
                locale: 'zh-CN',
                dateFormat: 'yyyy-MM-dd',
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: borderColor, style: 1 },
            },
            rightPriceScale: {
                borderColor: borderColor,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderColor: borderColor,
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 50,
                tickMarkFormatter: formatDate,
                ticksVisible: true, // 显示刻度
            },
            crosshair: {
                mode: 1, // CrosshairMode.Normal
            }
        });

        chartRef.current = chart;

        // Beautiful colors for lines
        const colors = ['#2962FF', '#8B5CF6', '#E91E63', '#F59E0B', '#10B981', '#06B6D4'];

        data.forEach((series, index) => {
            const lineSeries = chart.addSeries(LineSeries, {
                color: colors[index % colors.length],
                lineWidth: 2,
                title: series.name,
                priceFormat: {
                    type: 'percent',
                },
            });

            const chartData = series.data.map(d => ({
                time: d.time as Time,
                value: d.value,
            }));

            lineSeries.setData(chartData);
        });

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [data, height, isClient]);

    if (!isClient) {
        return (
            <div
                className="w-full flex items-center justify-center bg-[var(--card-hover)]"
                style={{ height: `${height}px` }}
            >
                <span className="text-[var(--muted)]">加载图表中...</span>
            </div>
        );
    }

    return (
        <div
            ref={chartContainerRef}
            className="w-full relative"
            style={{ height: `${height}px` }}
        />
    );
}
