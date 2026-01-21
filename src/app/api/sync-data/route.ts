import { NextResponse } from "next/server";
import { getSupabaseAdmin, FuturesPrice, BasisData } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

// 验证同步密钥
const SYNC_SECRET = process.env.SYNC_SECRET || "your-sync-secret";

// Sina API - 获取期货价格
async function fetchSinaFuturesPrice(symbol: string): Promise<{ date: string, price: number }[]> {
    const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_${symbol}=/InnerFuturesNewService.getDailyKLine?symbol=${symbol}&_=${Date.now()}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://finance.sina.com.cn/',
            },
            cache: 'no-store'
        });

        if (!response.ok) return [];

        const text = await response.text();
        const jsonMatch = text.match(/=\s*\((\[[\s\S]*?\])\)/);
        const jsonStr = jsonMatch?.[1];
        if (!jsonStr) return [];

        const data = JSON.parse(jsonStr);
        if (!Array.isArray(data)) return [];

        return data.map((item: any) => ({
            date: item.d,
            price: parseFloat(item.c)
        }));
    } catch (error) {
        console.error(`Error fetching Sina price for ${symbol}:`, error);
        return [];
    }
}

// 交易法门 API - 获取基差数据
async function fetchJiaoyifamenBasis(type: string): Promise<{ date: string, basis: number }[]> {
    const url = `https://www.jiaoyifamen.com/tools/api/future-basis/query?type=${type}&t=${Date.now()}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.jiaoyifamen.com/'
            },
            cache: 'no-store'
        });

        if (!response.ok) return [];

        const json = await response.json();
        if (!json.data) return [];

        const dates = json.data['category'] as string[];
        const bases = json.data['basisValue'] as number[];

        if (!dates || !bases) return [];

        const result: { date: string, basis: number }[] = [];
        const minLen = Math.min(dates.length, bases.length);

        for (let i = 0; i < minLen; i++) {
            const dateStr = dates[i];
            if (!dateStr || dateStr.length < 10) continue;
            result.push({
                date: dateStr,
                basis: Number(bases[i]) || 0
            });
        }

        return result;
    } catch (error) {
        console.error(`Error fetching basis for ${type}:`, error);
        return [];
    }
}

// POST /api/sync-data - 同步数据到 Supabase
export async function POST(request: Request) {
    // 验证密钥
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${SYNC_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const results: Record<string, any> = {};

    try {
        // 1. 同步期货价格
        const symbols = ['Y0', 'M0', 'B0', 'P0', 'OI0'];
        for (const symbol of symbols) {
            const priceData = await fetchSinaFuturesPrice(symbol);
            if (priceData.length > 0) {
                const records: FuturesPrice[] = priceData.map(p => ({
                    symbol,
                    trade_date: p.date,
                    close_price: p.price
                }));

                const { error } = await supabaseAdmin
                    .from('futures_price')
                    .upsert(records, { onConflict: 'symbol,trade_date' });

                results[`futures_${symbol}`] = error ? `Error: ${error.message}` : `${records.length} records`;
            }
        }

        // 2. 同步基差数据
        const basisTypes = [
            { type: 'Y', variety: 'Y' },
            { type: 'M', variety: 'M' }
        ];
        for (const { type, variety } of basisTypes) {
            const basisData = await fetchJiaoyifamenBasis(type);
            if (basisData.length > 0) {
                const records: BasisData[] = basisData.map(b => ({
                    variety,
                    trade_date: b.date,
                    basis: b.basis
                }));

                const { error } = await supabaseAdmin
                    .from('basis_data')
                    .upsert(records, { onConflict: 'variety,trade_date' });

                results[`basis_${variety}`] = error ? `Error: ${error.message}` : `${records.length} records`;
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET /api/sync-data - 获取同步状态
export async function GET() {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    try {
        // 获取各表最新记录日期
        const { data: latestPrice } = await supabaseAdmin
            .from('futures_price')
            .select('symbol, trade_date')
            .order('trade_date', { ascending: false })
            .limit(5);

        const { data: latestBasis } = await supabaseAdmin
            .from('basis_data')
            .select('variety, trade_date')
            .order('trade_date', { ascending: false })
            .limit(2);

        return NextResponse.json({
            status: 'ok',
            latest: {
                futures_price: latestPrice,
                basis_data: latestBasis
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
