import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { CrushMarginData } from "@/lib/crush-margin";

export const dynamic = 'force-dynamic'; // Disable static optimization for this route

export async function GET() {
    try {
        console.log("Fetching crush margin data from Supabase...");

        const { data, error } = await supabase
            .from('crush_margins')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error("Supabase error:", error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn("No data found in Supabase 'crush_margins' table.");
            return NextResponse.json({
                success: true,
                data: [],
                meta: { count: 0, latest: null, updatedAt: new Date().toISOString() }
            });
        }

        console.log(`Fetched ${data.length} records from Supabase.`);

        // Map DB snake_case to Frontend camelCase
        const marginData: CrushMarginData[] = data.map((row: any) => ({
            date: row.date,
            soybeanOilPrice: row.soybean_oil_price,
            soybeanMealPrice: row.soybean_meal_price,
            soybeanNo2Price: row.soybean_no2_price,
            soybeanOilBasis: row.oil_basis,
            soybeanMealBasis: row.meal_basis,
            grossMargin: row.gross_margin,
            futuresMargin: row.futures_margin,
            spotOilMealRatio: row.oil_meal_ratio,
            oilBasisRate: row.soybean_oil_price ? (row.oil_basis / row.soybean_oil_price) * 100 : 0
        }));

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
