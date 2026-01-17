import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '300'; // 默认300根K线

    // 核心指数 Symbol 映射 (新浪代码)
    const symbols = [
        { name: "沪深300", code: "sh000300" },
        { name: "中证1000", code: "sh000852" },
        { name: "中证2000", code: "sh932000" }, // 假设新浪已收录，如无则需寻找替代源
        // 万得全A等权在新浪无直接公开 API，这里用 "国证A指" (sz399317) 或 "平均股价" (sh880003 - 需确认) 代替模拟
        // 鉴于 sh880003 (平均股价) 是通达信/东财特有，我们用 "国证2000" (sz399303) 或暂用 sh000002 (A股指数) 近似替代全A表现
        // 修正：万得全A等权极难获取，我们暂用 "中证500" (sh000905) 作为对比基准，或者 "上证指数" 
        // 再次修正：用户明确要求 "万得全A等权"，这通常需要专业付费终端。
        // 为了演示效果，我们使用 "国证A指 (sz399317)" 作为近似替代 "万得全A"。
        { name: "国证A指 (近似万得全A)", code: "sz399317" }
    ];

    try {
        const results = await Promise.all(symbols.map(async (s) => {
            // 获取日 K 线
            const res = await fetch(`https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${s.code}&scale=240&ma=no&datalen=${range}`, { cache: 'no-store' });
            const data = await res.json();

            if (!Array.isArray(data) || data.length === 0) return null;

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
