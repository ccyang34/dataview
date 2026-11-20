import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 持仓数据接口
interface PositionAPIResponse {
    code: number;
    data?: {
        category: string[];
        neatPosition: number[];
    };
}

/** 生成候选合约：当前年 ±2 年的 01/03/05/07/09/11 月合约 */
function buildCandidates(): string[] {
    const now = new Date();
    const year = now.getFullYear();
    const months = ["01", "03", "05", "07", "09", "11"];
    const out: string[] = [];
    for (let y = year - 2; y <= year + 1; y++) {
        for (const m of months) out.push(`y${String(y).slice(2)}${m}`);
    }
    return out;
}

async function fetchPositionFromAPI(contract: string): Promise<{ contract: string; dates: string[]; positions: number[]; lastDate: string } | null> {
    const timestamp = Date.now();
    const url = `https://www.jiaoyifamen.com/tools/api//position/interest-process?t=${timestamp}&type=Y&instrument=${contract}&seat=%E4%B8%AD%E7%B2%AE%E6%9C%9F%E8%B4%A7`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.jiaoyifamen.com/'
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) return null;
        const data: PositionAPIResponse = await response.json();
        if (data.code !== 200 || !data.data) return null;
        const dates = data.data.category || [];
        const positions = data.data.neatPosition || [];
        if (dates.length < 30 || dates.length !== positions.length) return null;
        return { contract, dates, positions, lastDate: dates[dates.length - 1] || "" };
    } catch (error) {
        console.error(`Error fetching position for ${contract}:`, error);
        return null;
    }
}

export async function GET() {
    try {
        // 并发探测所有候选合约
        const results = (await Promise.all(buildCandidates().map(fetchPositionFromAPI))).filter(Boolean) as {
            contract: string; dates: string[]; positions: number[]; lastDate: string
        }[];

        // 按最后数据日期降序，取最新的 5 个（跟随主力滚动，不再写死合约）
        results.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
        const active = results.slice(0, 5);
        const contracts = active.map(r => r.contract.toUpperCase());
        if (contracts.length === 0) throw new Error("No active contracts found");

        const allDatesSet = new Set<string>();
        const contractDataMap = new Map<string, Map<string, number>>();
        for (const r of active) {
            const posMap = new Map<string, number>();
            for (let i = 0; i < r.dates.length; i++) {
                const pos = Math.abs(r.positions[i] || 0); // 取绝对值：净持仓方向不影响规模堆叠
                allDatesSet.add(r.dates[i]);
                posMap.set(r.dates[i], pos);
            }
            contractDataMap.set(r.contract.toUpperCase(), posMap);
        }

        const sortedDates = Array.from(allDatesSet).sort();
        const positionData = sortedDates.map(date => {
            const row: Record<string, string | number | undefined> = { date };
            for (const contract of contracts) {
                const posMap = contractDataMap.get(contract);
                if (posMap?.has(date)) row[contract] = posMap.get(date);
            }
            return row;
        });

        return NextResponse.json({
            success: true,
            data: positionData,
            meta: {
                count: positionData.length,
                contracts,
                latestDate: sortedDates[sortedDates.length - 1] || null,
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Position API Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch position data", data: [] },
            { status: 500 }
        );
    }
}
