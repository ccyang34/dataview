import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '1000'; // 默认1000根K线，确保覆盖到2024年6月

    // 核心指数 Symbol 映射 (新浪代码)
    const symbols = [
        { name: "沪深300", code: "sh000300" },
        { name: "中证500", code: "sh000905" },
        { name: "中证1000", code: "sh000852" },
        { name: "中证2000 (ETF)", code: "sh563300" }, // 使用华泰柏瑞中证2000ETF作为近似替代
        { name: "国证A指", code: "sz399317" }
    ];

    try {
        const results = await Promise.all(symbols.map(async (s) => {
            // 获取日 K 线
            const res = await fetch(`https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${s.code}&scale=240&ma=no&datalen=${range}`, { cache: 'no-store' });
            const rawData = await res.json();

            if (!Array.isArray(rawData) || rawData.length === 0) return null;

            // 过滤起始时间：2024年6月1日
            const startDate = "2024-06-01";
            const data = rawData.filter((item: any) => item.day >= startDate);

            if (data.length === 0) return null;

            // 计算累计收益率 (归一化)
            // 以第一天为基准 (0%)
            const basePrice = parseFloat(data[0].close);

            const normalizedData = data.map((item: any) => {
                const close = parseFloat(item.close);
                const pct = ((close - basePrice) / basePrice) * 100;
                return {
                    time: item.day,
                    value: pct
                };
            });

            return {
                name: s.name,
                data: normalizedData,
                currentPct: normalizedData[normalizedData.length - 1].value
            };
        }));

        const validResults = results.filter(r => r !== null);

        return NextResponse.json({
            success: true,
            data: validResults
        });

    } catch (error) {
        console.error("Index Comparison API Error:", error);
        return NextResponse.json({ success: false, error: String(error) });
    }
}
