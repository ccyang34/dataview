import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Sina futures API for oil comparison
async function fetchSinaFutures(symbol: string): Promise<{ date: string, close: number }[]> {
    const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_${symbol}=/InnerFuturesNewService.getDailyKLine?symbol=${symbol}&_=${Date.now()}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://finance.sina.com.cn/',
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Sina API error for ${symbol}: ${response.status}`);
            return [];
        }

        const text = await response.text();

        // Parse JSONP response
        // Format: var _Y0=([{...}]) - note the extra parentheses around the array
        // Also handle the script comment at the beginning: /*<script>...</script>*/
        const jsonMatch = text.match(/=\s*\((\[[\s\S]*?\])\)/);
        const jsonStr = jsonMatch?.[1];

        if (!jsonStr) {
            console.error(`Sina data format mismatch for ${symbol}. Content preview: ${text.substring(0, 200)}`);
            return [];
        }

        const data = JSON.parse(jsonStr);

        if (!Array.isArray(data)) {
            console.error(`Sina data is not array for ${symbol}`);
            return [];
        }

        console.log(`Sina fetched ${data.length} records for ${symbol}`);

        return data.map((item: any) => ({
            date: item.d,
            close: parseFloat(item.c)
        }));

    } catch (error) {
        console.error(`Error fetching Sina data for ${symbol}:`, error);
        return [];
    }
}

export async function GET() {
    try {
        console.log("Fetching oil comparison data (Y0, P0, OI0)...");

        // Fetch all three oils in parallel
        const [soybeanOil, palmOil, rapeseedOil] = await Promise.all([
            fetchSinaFutures('Y0'),   // 豆油
            fetchSinaFutures('P0'),   // 棕榈油
            fetchSinaFutures('OI0'),  // 菜油
        ]);

        console.log(`Fetched: Y0=${soybeanOil.length}, P0=${palmOil.length}, OI0=${rapeseedOil.length}`);

        // Build maps for quick lookup
        const palmMap = new Map(palmOil.map(d => [d.date, d.close]));
        const rapeseedMap = new Map(rapeseedOil.map(d => [d.date, d.close]));

        // Merge data using soybeanOil as base (it should have all dates we care about)
        const oilData = soybeanOil
            .filter(item => palmMap.has(item.date) && rapeseedMap.has(item.date))
            .map(item => ({
                date: item.date,
                soybeanOil: item.close,
                palmOil: palmMap.get(item.date)!,
                rapeseedOil: rapeseedMap.get(item.date)!
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        console.log(`Oil comparison data: ${oilData.length} records`);

        return NextResponse.json({
            success: true,
            data: oilData,
            meta: {
                count: oilData.length,
                updatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Oil comparison API Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch oil comparison data", data: [] },
            { status: 500 }
        );
    }
}
