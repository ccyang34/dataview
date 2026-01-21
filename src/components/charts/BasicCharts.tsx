"use client";

import { useState, useEffect } from "react";
import {
    LineChart as RechartsLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Area,
    AreaChart,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from "recharts";

// 颜色配置
const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

// 移动端检测 hook
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
}

interface DataPoint {
    name: string;
    value: number;
    [key: string]: string | number;
}

interface ChartProps {
    data: DataPoint[];
    dataKey?: string;
    xAxisKey?: string;
    height?: number;
    showGrid?: boolean;
    showLegend?: boolean;
}

// 折线图
export function LineChart({
    data,
    dataKey = "value",
    xAxisKey = "name",
    height = 300,
    showGrid = true,
    showLegend = false,
}: ChartProps) {
    const isMobile = useIsMobile();
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
                <XAxis
                    dataKey={xAxisKey}
                    stroke="var(--muted)"
                    fontSize={12}
                    tickLine={false}
                />
                <YAxis
                    stroke="var(--muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    trigger={isMobile ? 'click' : 'hover'}
                    contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                />
                {showLegend && <Legend />}
                <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ fill: "var(--primary)", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: "var(--primary)" }}
                />
            </RechartsLineChart>
        </ResponsiveContainer>
    );
}

// 面积图
export function AreaChartComponent({
    data,
    dataKey = "value",
    xAxisKey = "name",
    height = 300,
    showGrid = true,
}: ChartProps) {
    const isMobile = useIsMobile();
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
                <XAxis
                    dataKey={xAxisKey}
                    stroke="var(--muted)"
                    fontSize={12}
                    tickLine={false}
                />
                <YAxis
                    stroke="var(--muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    trigger={isMobile ? 'click' : 'hover'}
                    contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                    }}
                />
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// 柱状图
export function BarChartComponent({
    data,
    dataKey = "value",
    xAxisKey = "name",
    height = 300,
    showGrid = true,
}: ChartProps) {
    const isMobile = useIsMobile();
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
                <XAxis
                    dataKey={xAxisKey}
                    stroke="var(--muted)"
                    fontSize={12}
                    tickLine={false}
                />
                <YAxis
                    stroke="var(--muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    trigger={isMobile ? 'click' : 'hover'}
                    contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                    }}
                />
                <Bar
                    dataKey={dataKey}
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

// 饼图
interface PieChartProps {
    data: DataPoint[];
    height?: number;
    innerRadius?: number;
    showLabel?: boolean;
}

export function PieChartComponent({
    data,
    height = 300,
    innerRadius = 0,
    showLabel = true,
}: PieChartProps) {
    const isMobile = useIsMobile();
    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={showLabel ? ({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
                    labelLine={showLabel}
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    trigger={isMobile ? 'click' : 'hover'}
                    contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

// 环形图
export function DonutChart(props: PieChartProps) {
    return <PieChartComponent {...props} innerRadius={50} />;
}

