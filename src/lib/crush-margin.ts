
import { DailyData } from "./external-api";
import { parseISO, format } from "date-fns";

export interface CrushMarginData {
    date: string;
    // Prices
    soybeanOilPrice: number;
    soybeanMealPrice: number;
    soybeanNo2Price: number;
    // Basis
    soybeanOilBasis: number;
    soybeanMealBasis: number;
    // Calculated
    grossMargin: number; // Contains basis
    futuresMargin: number; // No basis
    spotOilMealRatio: number;
    oilBasisRate: number; // Percentage
}

// Config from Python script
const OIL_OUTPUT_RATE = 0.185;
const MEAL_OUTPUT_RATE = 0.785;
const CRUSH_COST = 150.0;

export function calculateCrushMargins(
    oilData: DailyData[],
    mealData: DailyData[],
    beanData: DailyData[]
): CrushMarginData[] {
    // 1. Create maps for O(1) lookup by date
    const oilMap = new Map(oilData.map((d) => [d.date, d]));
    const mealMap = new Map(mealData.map((d) => [d.date, d]));
    const beanMap = new Map(beanData.map((d) => [d.date, d]));

    // 2. Find common dates (Intersection)
    // To be safe, we iterate through one list and check others.
    // Using beanData as base since it's the raw material
    const commonDates = beanData
        .map((d) => d.date)
        .filter((date) => oilMap.has(date) && mealMap.has(date))
        .sort(); // Ensure chronological order

    const result: CrushMarginData[] = [];

    for (const date of commonDates) {
        const oil = oilMap.get(date)!;
        const meal = mealMap.get(date)!;
        const bean = beanMap.get(date)!;

        const oilPrice = oil.close;
        const oilBasis = oil.basis || 0;
        const mealPrice = meal.close;
        const mealBasis = meal.basis || 0;
        const beanPrice = bean.close;

        // Formulas from Python script:

        // 合并['榨利'] = ((合并['豆油价格'] + 合并['豆油基差']) * self.豆油产出率 + (合并['豆粕价格'] + 合并['豆粕基差']) * self.豆粕产出率 - 合并['豆二价格'] - self.压榨成本)
        const grossMargin =
            (oilPrice + oilBasis) * OIL_OUTPUT_RATE +
            (mealPrice + mealBasis) * MEAL_OUTPUT_RATE -
            beanPrice -
            CRUSH_COST;

        // 合并['盘面榨利'] = (合并['豆油价格'] * self.豆油产出率 + 合并['豆粕价格'] * self.豆粕产出率 - 合并['豆二价格'] - self.压榨成本)
        const futuresMargin =
            oilPrice * OIL_OUTPUT_RATE +
            mealPrice * MEAL_OUTPUT_RATE -
            beanPrice -
            CRUSH_COST;

        // 合并['现货油粕比'] = (合并['豆油价格'] + 合并['豆油基差']) / (合并['豆粕价格'] + 合并['豆粕基差'])
        const spotOilMealRatio =
            (oilPrice + oilBasis) / (mealPrice + mealBasis);

        // 合并['豆油基差率'] = 合并['豆油基差'] / 合并['豆油价格'] * 100
        const oilBasisRate = (oilBasis / oilPrice) * 100;

        result.push({
            date,
            soybeanOilPrice: oilPrice,
            soybeanMealPrice: mealPrice,
            soybeanNo2Price: beanPrice,
            soybeanOilBasis: oilBasis,
            soybeanMealBasis: mealBasis,
            grossMargin,
            futuresMargin,
            spotOilMealRatio,
            oilBasisRate,
        });
    }

    return result;
}
