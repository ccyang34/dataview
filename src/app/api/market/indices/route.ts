import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

async function fetchSinaMarketData(symbols: string[]) {
    const symbolsStr = symbols.join(',');
    const url = `https://hq.sinajs.cn/list=${symbolsStr}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Referer': 'https://finance.sina.com.cn/',
            },
            cache: 'no-store'
        });

        if (!response.ok) return [];

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('gbk');
        const text = decoder.decode(buffer);

        const lines = text.split('\n');
        return lines.filter(line => line.includes('=')).map(line => {
            const match = line.match(/hq_str_(.*?)=\"(.*?)\"/);
            if (!match) return null;

            const [_, symbol, dataStr] = match;
            const parts = dataStr.split(',');

            // Format varies by asset type, but generally:
            // Stocks: name, open, pre_close, last, high, low, ...
            const name = parts[0];
            const current = parseFloat(parts[3]);
            const preClose = parseFloat(parts[2]);
            const change = current - preClose;
            const changePct = (change / preClose) * 100;

            return {
                symbol,
                name,
                current: current || 0,
                change: change || 0,
                changePct: changePct || 0,
                high: parseFloat(parts[4]) || 0,
                low: parseFloat(parts[5]) || 0,
                time: parts[31] ? `${parts[30]} ${parts[31]}` : new Date().toLocaleString()
            };
        }).filter(Boolean);
    } catch (error) {
        console.error("Sina Market API Error:", error);
        return [];
    }
}

export async function GET() {
    // A-Share: s_sh000001 (SSE), s_sz399001 (SZE), s_sz399006 (GEM)
    // HK: rt_hkHSI (Hang Seng)
    // US: gb_$dji (Dow), gb_ixic (Nasdaq), gb_$inx (S&P 500)
    // Crypto/Other: btc_usdt (if available, using stock proxies for now)
    const marketSymbols = [
        's_sh000001', // 上证指数
        's_sz399001', // 深证成指
        's_sz399006', // 创业板指
        'rt_hkHSI',    // 恒生指数
        'gb_$ixic',   // 纳斯达克
        'gb_$dji',    // 道琼斯
        'gb_$inx',    // 标普500
    ];

    const data = await fetchSinaMarketData(marketSymbols);

    return NextResponse.json({
        success: true,
        data,
        updatedAt: new Date().toISOString()
    });
}
