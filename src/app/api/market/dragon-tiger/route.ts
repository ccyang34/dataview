import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 东方财富龙虎榜个股上榜详情
        // 按净买入额排序 (NET_BUY_AMT)
        const url = "https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=NET_BUY_AMT&sortTypes=-1&pageSize=10&pageNumber=1&reportName=RPT_DAILY_LHB_DETAILS&columns=SECURITY_CODE,SECURITY_NAME_ABBR,CLOSE_PRICE,CHANGE_RATE,NET_BUY_AMT,TOTAL_BUY_AMT,TOTAL_SELL_AMT,EXPLANATION";

        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();

        if (!data || !data.result || !data.result.data) {
            throw new Error("Invalid response from LHB API");
        }

        const lhbList = data.result.data.map((item: any) => ({
            code: item.SECURITY_CODE,
            name: item.SECURITY_NAME_ABBR,
            close: item.CLOSE_PRICE,
            change: item.CHANGE_RATE,
            netBuy: item.NET_BUY_AMT, // 净买入额
            buy: item.TOTAL_BUY_AMT,
            sell: item.TOTAL_SELL_AMT,
            reason: item.EXPLANATION // 上榜理由
        }));

        return NextResponse.json({
            success: true,
            data: lhbList
        });
    } catch (error) {
        console.error("Dragon Tiger API Error:", error);
        return NextResponse.json({ success: false, error: String(error) });
    }
}
