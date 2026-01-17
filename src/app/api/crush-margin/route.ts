import { NextResponse } from "next/server";
import { CrushMarginData } from "@/lib/crush-margin";

export const dynamic = 'force-dynamic';

// Config from Python script
const OIL_OUTPUT_RATE = 0.185;
const MEAL_OUTPUT_RATE = 0.785;
const CRUSH_COST = 150.0;

// Sina API - 获取期货价格 (与 Python akshare 逻辑一致)
async function fetchSinaFuturesPrice(symbol: string): Promise<{ date: string, price: number }[]> {
    const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_${symbol}=/InnerFuturesNewService.getDailyKLine?symbol=${symbol}&_=${Date.now()}`;

    try {
        console.log(`Fetching ${symbol} price from Sina...`);
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

        // Parse JSONP: var _Y0=([...])
        const jsonMatch = text.match(/=\s*\((\[[\s\S]*?\])\)/);
        const jsonStr = jsonMatch?.[1];

        if (!jsonStr) {
            console.error(`Sina ${symbol} data format mismatch`);
            return [];
        }

        const data = JSON.parse(jsonStr);

        if (!Array.isArray(data)) {
            return [];
        }

        console.log(`Sina: fetched ${data.length} price records for ${symbol}`);

        return data.map((item: any) => ({
            date: item.d,
            price: parseFloat(item.c)
        }));
    } catch (error) {
        console.error(`Error fetching Sina price for ${symbol}:`, error);
        return [];
    }
}

// 交易法门 API - 只获取基差数据 (与 Python 逻辑一致)
async function fetchJiaoyifamenBasis(type: string): Promise<{ date: string, basis: number }[]> {
    const url = `https://www.jiaoyifamen.com/tools/api/future-basis/query?type=${type}&t=${Date.now()}`;

    try {
        console.log(`Fetching ${type} basis from Jiaoyifamen...`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.jiaoyifamen.com/variety/varieties-varieties'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Jiaoyifamen API error for ${type}: ${response.status}`);
            return [];
        }

        const json = await response.json();
        if (!json.data) return [];

        const data = json.data;

        // 使用正确的字段名: 'category' 是完整日期 YYYY-MM-DD
        // 'dataCategory' 是 MM-DD 格式 (不使用)
        const dates = data['category'] as string[];  // 完整日期格式
        const bases = data['basisValue'] as number[];

        if (!dates || !bases) {
            console.error(`Missing fields in Jiaoyifamen data for ${type}`);
            return [];
        }

        const result: { date: string, basis: number }[] = [];
        const minLen = Math.min(dates.length, bases.length);

        for (let i = 0; i < minLen; i++) {
            const dateStr = dates[i];
            // category 字段已经是 YYYY-MM-DD 格式，直接使用
            if (!dateStr || dateStr.length < 10) continue;

            result.push({
                date: dateStr,
                basis: Number(bases[i]) || 0
            });
        }

        console.log(`Jiaoyifamen: fetched ${result.length} basis records for ${type}, date range: ${result[0]?.date} to ${result[result.length - 1]?.date}`);
        return result;
    } catch (error) {
        console.error(`Error fetching Jiaoyifamen basis for ${type}:`, error);
        return [];
    }
}

export async function GET() {
    try {
        console.log("Fetching real-time crush margin data (Python-style)...");

        // 按照 Python 脚本逻辑：
        // 1. 期货价格从 Sina 获取 (Y0, M0, B0)
        // 2. 基差从交易法门获取 (Y, M)
        const [oilPrice, mealPrice, beanPrice, oilBasis, mealBasis] = await Promise.all([
            fetchSinaFuturesPrice('Y0'),   // 豆油期货价格
            fetchSinaFuturesPrice('M0'),   // 豆粕期货价格
            fetchSinaFuturesPrice('B0'),   // 豆二期货价格
            fetchJiaoyifamenBasis('Y'),    // 豆油基差
            fetchJiaoyifamenBasis('M'),    // 豆粕基差
        ]);

        console.log(`Raw data: OilPrice=${oilPrice.length}, MealPrice=${mealPrice.length}, BeanPrice=${beanPrice.length}, OilBasis=${oilBasis.length}, MealBasis=${mealBasis.length}`);

        if (oilPrice.length === 0 || mealPrice.length === 0 || beanPrice.length === 0) {
            return NextResponse.json({
                success: false,
                error: "Failed to fetch price data from Sina API",
                data: []
            }, { status: 500 });
        }

        // Build maps for quick lookup
        const oilPriceMap = new Map(oilPrice.map((d: { date: string, price: number }) => [d.date, d.price]));
        const mealPriceMap = new Map(mealPrice.map((d: { date: string, price: number }) => [d.date, d.price]));
        const beanPriceMap = new Map(beanPrice.map((d: { date: string, price: number }) => [d.date, d.price]));
        const oilBasisMap = new Map(oilBasis.map((d: { date: string, basis: number }) => [d.date, d.basis]));
        const mealBasisMap = new Map(mealBasis.map((d: { date: string, basis: number }) => [d.date, d.basis]));

        // Find common dates (all three price sources must have data)
        // Use beanPrice as base since it usually has the most complete history
        const commonDates = beanPrice
            .map((d: { date: string, price: number }) => d.date)
            .filter((date: string) => oilPriceMap.has(date) && mealPriceMap.has(date))
            .sort();

        console.log(`Common dates: ${commonDates.length}`);

        // Calculate crush margins
        const marginData: CrushMarginData[] = commonDates.map((date: string) => {
            const oilP = oilPriceMap.get(date)!;
            const mealP = mealPriceMap.get(date)!;
            const beanP = beanPriceMap.get(date)!;
            // 基差可能不存在，默认为 0
            const oilB = oilBasisMap.get(date) || 0;
            const mealB = mealBasisMap.get(date) || 0;

            // 现货榨利(含基差) - Python: 合并['榨利']
            const grossMargin =
                (oilP + oilB) * OIL_OUTPUT_RATE +
                (mealP + mealB) * MEAL_OUTPUT_RATE -
                beanP -
                CRUSH_COST;

            // 盘面榨利(不含基差) - Python: 合并['盘面榨利']
            const futuresMargin =
                oilP * OIL_OUTPUT_RATE +
                mealP * MEAL_OUTPUT_RATE -
                beanP -
                CRUSH_COST;

            // 现货油粕比 - Python: 合并['现货油粕比']
            const spotOilMealRatio =
                (oilP + oilB) / (mealP + mealB);

            // 豆油基差率(%) - Python: 合并['豆油基差率']
            const oilBasisRate = (oilB / oilP) * 100;

            return {
                date,
                soybeanOilPrice: oilP,
                soybeanMealPrice: mealP,
                soybeanNo2Price: beanP,
                soybeanOilBasis: oilB,
                soybeanMealBasis: mealB,
                grossMargin,
                futuresMargin,
                spotOilMealRatio,
                oilBasisRate
            };
        });

        const latest = marginData[marginData.length - 1];
        console.log(`Calculated ${marginData.length} margin records. Latest: ${latest?.date}, OilPrice: ${latest?.soybeanOilPrice}, OilBasis: ${latest?.soybeanOilBasis}`);

        return NextResponse.json({
            success: true,
            data: marginData,
            meta: {
                count: marginData.length,
                latest: latest,
                updatedAt: new Date().toISOString(),
                source: 'real-time (Sina + Jiaoyifamen)'
            }
        });

    } catch (error) {
        console.error("Crush Margin API Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error", data: [] },
            { status: 500 }
        );
    }
}

