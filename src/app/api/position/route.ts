import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// 持仓数据接口
interface PositionAPIResponse {
    code: number;
    data?: {
        category: string[];
        neatPosition: number[];
    };
}

// 合约配置
const CONTRACTS = ['Y2505', 'Y2509', 'Y2601', 'Y2605', 'Y2609'];

async function fetchPositionFromAPI(contract: string): Promise<{ dates: string[], positions: number[] } | null> {
    const timestamp = Date.now();
    const url = `https://www.jiaoyifamen.com/tools/api//position/interest-process?t=${timestamp}&type=Y&instrument=${contract.toLowerCase()}&seat=%E4%B8%AD%E7%B2%AE%E6%9C%9F%E8%B4%A7`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.jiaoyifamen.com/'
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            console.error(`Position API error for ${contract}: ${response.status}`);
            return null;
        }

        const data: PositionAPIResponse = await response.json();

        if (data.code !== 200 || !data.data) {
            return null;
        }

        return {
            dates: data.data.category || [],
            positions: data.data.neatPosition || []
        };
    } catch (error) {
        console.error(`Error fetching position for ${contract}:`, error);
        return null;
    }
}

export async function GET() {
    try {
        console.log("Fetching COFCO position data...");

        // Fetch all contracts in parallel
        const results = await Promise.all(
            CONTRACTS.map(async (contract) => {
                const data = await fetchPositionFromAPI(contract);
                return { contract, data };
            })
        );

        // Collect all unique dates
        const allDatesSet = new Set<string>();
        const contractDataMap = new Map<string, Map<string, number>>();

        for (const { contract, data } of results) {
            if (data && data.dates.length > 0) {
                const posMap = new Map<string, number>();
                for (let i = 0; i < data.dates.length; i++) {
                    const date = data.dates[i];
                    const pos = Math.abs(data.positions[i] || 0); // Take absolute value
                    allDatesSet.add(date);
                    posMap.set(date, pos);
                }
                contractDataMap.set(contract, posMap);
            }
        }

        // Sort dates
        const sortedDates = Array.from(allDatesSet).sort();

        // Build result array
        const positionData = sortedDates.map(date => {
            const row: Record<string, string | number | undefined> = { date };
            for (const contract of CONTRACTS) {
                const posMap = contractDataMap.get(contract);
                if (posMap && posMap.has(date)) {
                    row[contract] = posMap.get(date);
                }
            }
            return row;
        });

        console.log(`Fetched position data: ${positionData.length} records`);

        return NextResponse.json({
            success: true,
            data: positionData,
            meta: {
                count: positionData.length,
                contracts: CONTRACTS,
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
