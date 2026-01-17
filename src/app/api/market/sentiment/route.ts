import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. 获取北向资金 (来自东财公开 API)
        const kamtUrl = "https://push2.eastmoney.com/api/qt/kamt/get?fields1=f1,f3&fields2=f51,f52,f53,f54,f55,f56";
        const kamtRes = await fetch(kamtUrl, { cache: 'no-store' });
        const kamtData = await kamtRes.json();

        // f52: 当日净流入, f54: 沪股通, f56: 深股通
        const northbound = {
            total: parseFloat(kamtData?.data?.f52 || 0) / 10000, // 亿元
            sh: parseFloat(kamtData?.data?.f54 || 0) / 10000,
            sz: parseFloat(kamtData?.data?.f56 || 0) / 10000,
        };

        // 2. 获取行业板块排行 (新浪数据)
        // 简单起见，从一个可靠的 JSONP 接口抓取或爬取核心数据
        const sectorUrl = "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=10&sort=changepercent&asc=0&node=hangye_zl";
        const sectorRes = await fetch(sectorUrl, { cache: 'no-store' });
        const sectorsRaw = await sectorRes.json();

        const sectors = sectorsRaw.map((s: any) => ({
            name: s.name,
            change: parseFloat(s.changepercent),
            leadStock: s.symbolName,
            leadChange: parseFloat(s.pricechange)
        }));

        // 3. 市场涨跌分布 (这里使用模拟数据或从指数接口估算，暂以模拟为主，后续完善真实抓取)
        const marketSentiment = {
            up: 2845,
            down: 1432,
            neutral: 312,
            totalVolume: "8542亿"
        };

        return NextResponse.json({
            success: true,
            data: {
                northbound,
                sectors,
                sentiment: marketSentiment
            }
        });
    } catch (error) {
        console.error("Sentiment API Error:", error);
        return NextResponse.json({ success: false, error: String(error) });
    }
}
