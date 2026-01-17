import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Helper to fetch K-line from Sina
async function fetchSinaKLine(symbol: string, scale: string = '240', ma: string = '5,10,20', datalen: string = '30') {
    // scale: 5, 15, 30, 60, 240 (daily)
    const url = `https://quotes.sina.cn/cn/api/jsonp_v2.php/var%20_${symbol}_${scale}=/CN_MarketDataService.getKLineData?symbol=${symbol}&scale=${scale}&ma=${ma}&datalen=${datalen}`;

    try {
        const response = await fetch(url, {
            headers: { 'Referer': 'https://finance.sina.com.cn/' },
            cache: 'no-store'
        });
        const text = await response.text();
        const jsonMatch = text.match(/=\(\s*(\[[\s\S]*?\])\s*\)/);
        if (!jsonMatch) return [];

        const data = JSON.parse(jsonMatch[1]);
        return data.map((d: any) => ({
            time: d.day,
            open: parseFloat(d.open),
            high: parseFloat(d.high),
            low: parseFloat(d.low),
            close: parseFloat(d.close),
            volume: parseFloat(d.volume)
        }));
    } catch (error) {
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'sh000001';

    const data = await fetchSinaKLine(symbol);

    return NextResponse.json({
        success: true,
        data,
        symbol
    });
}
