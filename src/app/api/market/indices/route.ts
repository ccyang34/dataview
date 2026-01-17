import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

interface ParsedData {
    symbol: string;
    name: string;
    current: number;
    change: number;
    changePct: number;
    time: string;
}

function parseSinaData(symbol: string, dataStr: string): ParsedData | null {
    const parts = dataStr.split(',');
    if (parts.length < 3) return null;

    let name = "";
    let current = 0;
    let changePct = 0;
    let change = 0;
    let time = new Date().toLocaleString();

    // 1. A-Share Indices (e.g. sh000001, sz399001)
    // Format: name, open, pre_close, current, high, low, ...
    if (symbol.startsWith('sh') || symbol.startsWith('sz')) {
        name = parts[0];
        current = parseFloat(parts[3]);
        const preClose = parseFloat(parts[2]);
        if (preClose > 0) {
            change = current - preClose;
            changePct = (change / preClose) * 100;
        }
        time = `${parts[30]} ${parts[31]}`;
    }
    // 2. HK Stocks/Indices (e.g. rt_hkHSI)
    // Format: eng_name, name, open, last_close, high, low, current, change, change_pct, ...
    else if (symbol.startsWith('rt_hk')) {
        name = parts[1];
        current = parseFloat(parts[6]);
        const preClose = parseFloat(parts[3]);
        change = parseFloat(parts[7]);
        changePct = parseFloat(parts[8]);
        time = `${parts[17]} ${parts[18]}`;
    }
    // 3. US Stocks/Indices (e.g. gb_$ixic, gb_$dji, gb_$inx)
    // Format: name, current, change_pct, time, change, open, high, low, pre_close, ...
    else if (symbol.startsWith('gb_')) {
        name = parts[0];
        current = parseFloat(parts[1]);
        changePct = parseFloat(parts[2]);
        change = parseFloat(parts[4]);
        time = parts[3];
    }
    // 4. Global Commodities / Foreign Exchange (e.g. hf_CL, hf_XAU)
    // Format: current, ???, buy, sell, high, low, time, pre_close, open, ???, ???, ???, date, name, ...
    else if (symbol.startsWith('hf_')) {
        current = parseFloat(parts[0]);
        const preClose = parseFloat(parts[7]);
        name = parts[13];
        if (preClose > 0) {
            change = current - preClose;
            changePct = (change / preClose) * 100;
        }
        time = `${parts[12]} ${parts[6]}`;
    }
    // 5. Special "Simple" A-Share (e.g. s_sh000001) - Less Accurate, prefer standard
    else if (symbol.startsWith('s_')) {
        name = parts[0];
        current = parseFloat(parts[1]);
        change = parseFloat(parts[2]);
        changePct = parseFloat(parts[3]);
    }

    if (!name || isNaN(current)) return null;

    return {
        symbol,
        name,
        current,
        change,
        changePct,
        time
    };
}

async function fetchFromSina(symbols: string[]) {
    // Note: for hf_ symbols, Sina requires a different endpoint or specific handling.
    // Standard list API works for most.
    const url = `https://hq.sinajs.cn/list=${symbols.join(',')}`;

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
        return lines.map(line => {
            const match = line.match(/hq_str_(.*?)=\"(.*?)\"/);
            if (!match) return null;
            return parseSinaData(match[1], match[2]);
        }).filter(Boolean);
    } catch (error) {
        console.error("Sina API Error:", error);
        return [];
    }
}

export async function GET() {
    // Preferred full symbols for accuracy
    const marketSymbols = [
        'sh000001', // 上证指数
        'sz399001', // 深证成指
        'sz399006', // 创业板指
        'rt_hkHSI',  // 恒生指数
        'gb_$ixic', // 纳斯达克
        'gb_$dji',  // 道琼斯
        'gb_$inx',  // 标普500
        'hf_CL',    // WTI原油
        'hf_XAU',   // 现货黄金
    ];

    const data = await fetchFromSina(marketSymbols);

    return NextResponse.json({
        success: true,
        data,
        updatedAt: new Date().toISOString(),
        source: 'Sina Finance Real-time (Standard)'
    });
}
