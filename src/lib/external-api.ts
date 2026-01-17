
import { startOfDay, format, parse, subDays } from "date-fns";

export interface DailyData {
    date: string;
    close: number;
    basis?: number;
}

// 交易法门 API (Y: 豆油, M: 豆粕, A: 豆一, B: 豆二(Maybe? We tested B and it failed, will rely on Sina for B0))
const JIAOYIFAMEN_API_BASE = "https://www.jiaoyifamen.com/tools/api/future-basis/query";

// Akshare/Sina API for Global/Inner Futures
// Based on test-sina.js research, we look for a valid endpoint.
// For Soybean No.2 (B0), Akshare uses: 
// https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_B0=/GlobalFuturesService.getGlobalFuturesDailyKLine?symbol=B0...
// However, 'B0' usually refers to "Yellow Soybeans No.2" on Dalian, which might be "b0" or similar.
// Let's use the pattern that Akshare uses for "B0" (Dalian Soybean No.2).
// Note: In Sina, "B0" often corresponds to the continuous contract.

export async function fetchJiaoyifamenData(type: string): Promise<DailyData[]> {
    const url = `${JIAOYIFAMEN_API_BASE}?type=${type}&t=${Date.now()}`;
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Referer: "https://www.jiaoyifamen.com/variety/varieties-varieties",
            },
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
            console.error(`Jiaoyifamen API error for ${type}: ${response.status}`);
            return [];
        }

        const json = await response.json();
        if (!json.data) return [];

        const data = json.data;
        // Try to find the correct keys. They change sometimes.
        // Based on test-api.js output:
        // Type A keys: [ 'ratioData', 'basisValue', 'dataCategory', 'priceValue', 'ca... ]
        // We need 'category' (dates), 'priceValue' (prices), 'basisValue' (basis)

        // Helper to find key by partial name
        const findKey = (partial: string) => Object.keys(data).find(k => k.toLowerCase().includes(partial.toLowerCase()));

        const categoryKey = findKey('category'); // e.g., 'category' or 'dataCategory'
        const priceKey = findKey('priceValue');
        const basisKey = findKey('basisValue');

        if (!categoryKey || !priceKey || !basisKey) {
            console.error(`Missing keys in Jiaoyifamen data for ${type}`);
            return [];
        }

        const dates = data[categoryKey] as string[];
        const prices = data[priceKey] as number[];
        const bases = data[basisKey] as number[];

        const result: DailyData[] = [];
        const minLen = Math.min(dates.length, prices.length, bases.length);

        const currentYear = new Date().getFullYear();

        for (let i = 0; i < minLen; i++) {
            let dateStr = dates[i];
            // Handle "MM-DD" format by prepending year
            if (dateStr.length <= 5 && dateStr.includes('-')) {
                // Simple logic: if month is > current month, it might be last year? 
                // Python script logic: try current year, if fail try last year.
                // Since it's usually historical ordered, we can infer year.
                // For simplicity/robustness, let's assume the API returns sorted data.
                // Let's use the python script's simple heuristic:
                // If date is "12-31" and today is "01-01", it's last year.
                // But actually, usually these APIs return full dates or relative to context.
                // Let's assume currentYear first.
                dateStr = `${currentYear}-${dateStr}`;
            }

            // Attempt to parse
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) continue;

            result.push({
                date: format(date, "yyyy-MM-dd"),
                close: Number(prices[i]),
                basis: Number(bases[i]),
            });
        }

        return result;
    } catch (err) {
        console.error(`Error fetching Jiaoyifamen data (${type}):`, err);
        return [];
    }
}

// B0 (DCE Soybean No.2) fetcher implementation using Sina
export async function fetchSinaFuturesData(symbol: string): Promise<DailyData[]> {
    // URL pattern from Akshare: https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_B0=/GlobalFuturesService.getGlobalFuturesDailyKLine?symbol=B0&_=${Date.now()}&source=web&page=1&num=1000
    // Actually for internal futures (DCE B0), it might be InnerFuturesNewService.
    // Let's try the URL that Akshare uses for "futures_zh_daily_sina":
    // It seems to fetch from `https://finance.sina.com.cn/futures/quotes/${symbol}.shtml` (parsing HTML?) 
    // OR `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/.../InnerFuturesNewService.getDailyKLine?symbol=${symbol}`

    // We will use the common Sina Futures endpoint for daily K-line.
    const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_${symbol}=/InnerFuturesNewService.getDailyKLine?symbol=${symbol}&_=${Date.now()}`;

    try {
        console.log(`Fetching Sina data for ${symbol}...`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://finance.sina.com.cn/',
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            },
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            console.error(`Sina API error for ${symbol}: ${response.status} ${response.statusText}`);
            return [];
        }

        const text = await response.text();

        // Log the first few characters to trace what we got (debug only)
        // console.log(`Sina response preview: ${text.substring(0, 100)}...`);

        // The response is JSONP: var _B0=([...])
        // It might be split across lines or formatted differently
        const jsonMatch = text.match(/=\s*(\[.*\])/s); // Use 's' flag for dot matches newline
        const jsonStr = jsonMatch?.[1];

        if (!jsonStr) {
            console.error(`Sina data format mismatch. content: ${text.substring(0, 100)}...`);
            return [];
        }

        const data = JSON.parse(jsonStr);
        // Data format: { d: "2023-01-01", o: "...", h: "...", l: "...", c: "...", v: "..." }

        if (!Array.isArray(data)) {
            console.error("Sina data is not an array");
            return [];
        }

        console.log(`Sina fetched ${data.length} records for ${symbol}`);

        return data.map((item: any) => ({
            date: item.d,
            close: parseFloat(item.c),
            // No basis for Sina futures usually, unless calculated elsewhere
        }));

    } catch (err) {
        console.error(`Error fetching Sina data (${symbol}):`, err);
        return [];
    }
}
