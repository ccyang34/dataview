/** 油脂形态研究数据类型（与 scripts/update-oil-shape-research.mjs 输出一致） */

export interface ResearchOverview {
  title: string;
  subtitle: string;
  windowRule: string;
}

export interface ShapeValidation {
  total: number;
  peakBeforeEnd: number;
  aboveStart: number;
  pullback: number;
  endAboveStart: number;
  byOil: Record<string, { total: number; endAboveStart: number }>;
}

export interface ShapeGroup {
  count: number;
  share: number;
  avgPos: number;
  avgPeak: number;
  avgEnd: number;
  avgFall: number;
  endAbove: number;
  endBelow: number;
}

export interface EarlyFeatures {
  auc: Record<string, number>;
  groupMeans: Record<string, { early: number; late: number }>;
  bestInvalidFeature: string;
  loo: { hits: number; total: number };
  baseline: { hits: number; total: number };
  lure: { sym: string; r10: number; end: number }[];
}

export interface QuantileBand {
  label: string;
  n: number;
  late: number;
  early: number;
  lateRate: number;
  avgEnd: number;
}

export interface QuantileSignal {
  earlyAvgQ: number;
  lateAvgQ: number;
  permutation: { diffPp: number; pValue: number; significant: boolean; permutations: number };
  bands: QuantileBand[];
  byOil: Record<string, { lowN: number; lowLate: number; lowLateRate: number; highN: number; highLate: number; highLateRate: number }>;
  exceptions: { sym: string; q: number; tag: string; peak: number; end: number }[];
  rule: string;
}

export interface MonthJump {
  years: number[];
  soy: number[];
  palm: number[];
  avgSoy: number;
  avgPalm: number;
  allPositive: boolean;
}

export interface ForecastContract {
  price: number;
  high: number;
  low: number;
  asof: string;
  quantile: number;
  offHigh: number;
  proxies: Record<string, number>;
  verdict: string;
}

export interface Forecast {
  calibration: { soyRho: number; palmRho: number };
  isProxy: boolean;
  contracts: { Y2705: ForecastContract; P2705: ForecastContract };
  structural: {
    years: number[];
    soy: { tag: string; pos: number; end: number }[];
    palm: { tag: string; pos: number; end: number }[];
    lateYears: number[];
    noLateSince: number;
  };
  verdict: string;
  caveat: string;
}

export interface DataRow {
  oil: string;
  ct: string;
  sym: string;
  year: number;
  pos: number;
  tag: string;
  peak: number;
  end: number;
  fall: number;
  startPct: number | null;
}

export interface OilShapeResearchData {
  source: string;
  fetch_date: string;
  updated_at: string;
  overview: ResearchOverview;
  shapeValidation: ShapeValidation;
  shapeGroups: { early: ShapeGroup; late: ShapeGroup; mid: ShapeGroup };
  earlyFeatures: EarlyFeatures;
  quantileSignal: QuantileSignal;
  monthJump: MonthJump;
  forecast: Forecast;
  paths: Record<string, { oil: string; norm: number[] }>;
  allRows: DataRow[];
}

export const RED = "#E24B4A";
export const GREEN = "#1D9E75";
