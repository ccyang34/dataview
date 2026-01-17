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
            grid: {
                vertLines: { color: borderColor },
                horzLines: { color: borderColor },
            },
            crosshair: {
                mode: 1,
            },
            rightPriceScale: {
                borderColor: borderColor,
            },
            timeScale: {
                borderColor: borderColor,
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        // 添加 K 线 - v5 API
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: upColor,
            downColor: downColor,
            borderDownColor: downColor,
            borderUpColor: upColor,
            wickDownColor: downColor,
            wickUpColor: upColor,
        });

        // 转换数据格式
        const chartData = data.map((item) => ({
            time: item.time as Time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        candlestickSeries.setData(chartData);

        // 添加成交量
        if (showVolume) {
            const volumeSeries = chart.addSeries(HistogramSeries, {
                color: upColor,
                priceFormat: {
                    type: "volume",
                },
                priceScaleId: "",
            });

            volumeSeries.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });

            const volumeData = data.map((item) => ({
                time: item.time as Time,
                value: item.volume || 0,
                color: item.close >= item.open ? upColor : downColor,
            }));

            volumeSeries.setData(volumeData);
        }

        // 自适应
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
