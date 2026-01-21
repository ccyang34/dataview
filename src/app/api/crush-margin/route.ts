import { NextResponse } from "next/server";
import { CrushMarginData } from "@/lib/crush-margin";
import { supabase } from "@/lib/supabase";

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

// 从 Supabase 获取缓存数据
async function fetchFromSupabase(): Promise<{
    oilPrice: { date: string, price: number }[],
    mealPrice: { date: string, price: number }[],
    beanPrice: { date: string, price: number }[],
    oilBasis: { date: string, basis: number }[],
    mealBasis: { date: string, basis: number }[]
} | null> {
    try {
        console.log("Trying to fetch from Supabase cache...");

        // 并行获取所有数据
        const [oilRes, mealRes, beanRes, oilBasisRes, mealBasisRes] = await Promise.all([
            supabase.from('futures_price').select('trade_date, close_price').eq('symbol', 'Y0').order('trade_date', { ascending: true }),
            supabase.from('futures_price').select('trade_date, close_price').eq('symbol', 'M0').order('trade_date', { ascending: true }),
            supabase.from('futures_price').select('trade_date, close_price').eq('symbol', 'B0').order('trade_date', { ascending: true }),
            supabase.from('basis_data').select('trade_date, basis').eq('variety', 'Y').order('trade_date', { ascending: true }),
            supabase.from('basis_data').select('trade_date, basis').eq('variety', 'M').order('trade_date', { ascending: true })
        ]);

        // 检查是否有数据
        if (!oilRes.data?.length || !mealRes.data?.length || !beanRes.data?.length) {
            console.log("Supabase cache is empty or incomplete");
            return null;
        }

        console.log(`Supabase cache: OilPrice=${oilRes.data.length}, MealPrice=${mealRes.data.length}, BeanPrice=${beanRes.data.length}`);

        return {
            oilPrice: oilRes.data.map(d => ({ date: d.trade_date, price: d.close_price })),
            mealPrice: mealRes.data.map(d => ({ date: d.trade_date, price: d.close_price })),
            beanPrice: beanRes.data.map(d => ({ date: d.trade_date, price: d.close_price })),
            oilBasis: oilBasisRes.data?.map(d => ({ date: d.trade_date, basis: d.basis })) || [],
            mealBasis: mealBasisRes.data?.map(d => ({ date: d.trade_date, basis: d.basis })) || []
        };
    } catch (error) {
        console.error("Error fetching from Supabase:", error);
        return null;
    }
}

// 从原始API获取数据（备选方案）
async function fetchFromOriginalAPIs(): Promise<{
    oilPrice: { date: string, price: number }[],
    mealPrice: { date: string, price: number }[],
    beanPrice: { date: string, price: number }[],
    oilBasis: { date: string, basis: number }[],
    mealBasis: { date: string, basis: number }[]
}> {
    console.log("Fetching from original APIs (Sina + Jiaoyifamen)...");

    const [oilPrice, mealPrice, beanPrice, oilBasis, mealBasis] = await Promise.all([
        fetchSinaFuturesPrice('Y0'),
        fetchSinaFuturesPrice('M0'),
        fetchSinaFuturesPrice('B0'),
        fetchJiaoyifamenBasis('Y'),
        fetchJiaoyifamenBasis('M'),
    ]);

    return { oilPrice, mealPrice, beanPrice, oilBasis, mealBasis };
}

// 计算榨利数据
function calculateCrushMargins(
    oilPrice: { date: string, price: number }[],
    mealPrice: { date: string, price: number }[],
    beanPrice: { date: string, price: number }[],
    oilBasis: { date: string, basis: number }[],
    mealBasis: { date: string, basis: number }[]
): CrushMarginData[] {
    const oilPriceMap = new Map(oilPrice.map(d => [d.date, d.price]));
    const mealPriceMap = new Map(mealPrice.map(d => [d.date, d.price]));
    const beanPriceMap = new Map(beanPrice.map(d => [d.date, d.price]));
    const oilBasisMap = new Map(oilBasis.map(d => [d.date, d.basis]));
    const mealBasisMap = new Map(mealBasis.map(d => [d.date, d.basis]));

    const commonDates = beanPrice
        .map(d => d.date)
        .filter(date => oilPriceMap.has(date) && mealPriceMap.has(date))
        .sort();

    return commonDates.map(date => {
        const oilP = oilPriceMap.get(date)!;
        const mealP = mealPriceMap.get(date)!;
        const beanP = beanPriceMap.get(date)!;
        const oilB = oilBasisMap.get(date) || 0;
        const mealB = mealBasisMap.get(date) || 0;

        const grossMargin = (oilP + oilB) * OIL_OUTPUT_RATE + (mealP + mealB) * MEAL_OUTPUT_RATE - beanP - CRUSH_COST;
        const futuresMargin = oilP * OIL_OUTPUT_RATE + mealP * MEAL_OUTPUT_RATE - beanP - CRUSH_COST;
        const spotOilMealRatio = (oilP + oilB) / (mealP + mealB);
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
}

export async function GET() {
    try {
        console.log("Fetching crush margin data...");

        // 1. 优先从 Supabase 获取缓存数据
        let data = await fetchFromSupabase();
        let source = 'supabase-cache';

        // 2. 如果缓存不可用，回退到原始API
        if (!data) {
            data = await fetchFromOriginalAPIs();
            source = 'real-time (Sina + Jiaoyifamen)';
        }

        const { oilPrice, mealPrice, beanPrice, oilBasis, mealBasis } = data;

        console.log(`Data source: ${source}, OilPrice=${oilPrice.length}, MealPrice=${mealPrice.length}, BeanPrice=${beanPrice.length}`);

        if (oilPrice.length === 0 || mealPrice.length === 0 || beanPrice.length === 0) {
            return NextResponse.json({
                success: false,
                error: "Failed to fetch price data",
                data: []
            }, { status: 500 });
        }

        // 3. 计算榨利数据
        const marginData = calculateCrushMargins(oilPrice, mealPrice, beanPrice, oilBasis, mealBasis);

        const latest = marginData[marginData.length - 1];
        console.log(`Calculated ${marginData.length} margin records. Latest: ${latest?.date}`);

        return NextResponse.json({
            success: true,
            data: marginData,
            meta: {
                count: marginData.length,
                latest: latest,
                updatedAt: new Date().toISOString(),
                source
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

