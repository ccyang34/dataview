
import { NextResponse } from "next/server";
import { fetchJiaoyifamenData, fetchSinaFuturesData } from "@/lib/external-api";
import { calculateCrushMargins } from "@/lib/crush-margin";

export const dynamic = 'force-dynamic'; // Disable static optimization for this route

export async function GET() {
    try {
        console.log("Fetching crush margin data...");
        // Fetch data in parallel
        const [oilData, mealData, beanData] = await Promise.all([
            fetchJiaoyifamenData("Y"), // Soybean Oil
            fetchJiaoyifamenData("M"), // Soybean Meal
            fetchSinaFuturesData("B0"), // Soybean No.2 (DCE) - B0 usually continuous
        ]);

        console.log(`Fetched: Oil(${oilData.length}), Meal(${mealData.length}), Bean(${beanData.length})`);

        if (oilData.length === 0 || mealData.length === 0 || beanData.length === 0) {
            const missing = [];
            if (oilData.length === 0) missing.push("Soybean Oil (Y)");
            if (mealData.length === 0) missing.push("Soybean Meal (M)");
            if (beanData.length === 0) missing.push("Soybean No.2 (B0)");

            console.error(`Data fetch failed. Missing: ${missing.join(", ")}`);

            return NextResponse.json(
                {
                    success: false,
                    error: `Failed to fetch external data. Missing: ${missing.join(", ")}`
                },
                { status: 503 }
            );
        }

        const marginData = calculateCrushMargins(oilData, mealData, beanData);

        // Sort by date just in case
        marginData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json({
            success: true,
            data: marginData,
            meta: {
                count: marginData.length,
                latest: marginData[marginData.length - 1],
                updatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
