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
  oiAtPeak: number | null;
  oiYoy: number | null;
}

/** 持仓量二次分析 */
export interface OiLifecycle {
  axis: number[];
  all: number[];
  early: number[];
  late: number[];
  earlyAuc: Record<string, number>;
  permutation: { diffPp: number; pValue: number; significant: boolean; permutations: number };
  loo: { hits: number; total: number };
  baseline: { hits: number; total: number };
  byOil: Record<string, { n: number; auc: number; earlyAvg: number; lateAvg: number }>;
  earlyAvg: number;
  lateAvg: number;
  yearRho: number;
  note: string;
}

export interface OiAtPeak {
  earlyAvg: number;
  lateAvg: number;
  auc: number;
  inc: { n: number; late: number };
  dec: { n: number; late: number };
  oiPeakProgEarly: number;
  oiPeakProgLate: number;
  note: string;
}

export interface OiMatrixCell {
  q: string;
  oi: string;
  n: number;
  late: number;
  early: number;
  lateRate: number | null;
  avgEnd: number | null;
  syms: string[];
}

export interface OiForecastContract {
  oi: number | null;
  prevOi: number | null;
  asof: string | null;
  prevDate: string | null;
  yoy: number | null;
}

export interface OiAnalysis {
  coverage: { total: number; withOi: number; core: number };
  lifecycle: OiLifecycle;
  atPeak: OiAtPeak;
  matrix: OiMatrixCell[];
  forecast: {
    Y2705: OiForecastContract;
    P2705: OiForecastContract;
    combined: {
      Y2705: { oiSignal: string; priceSignal: string };
      P2705: { oiSignal: string; priceSignal: string };
      note: string;
    };
  };
}

/** 持仓深度辨析：三个追问的严谨复算 */
export interface OiCaliberStat {
  n: number;
  avg: number;
  pos: number;
}
export interface OiCaliberRow {
  label: string;
  early: OiCaliberStat;
  late: OiCaliberStat;
  auc: number;          // AUC(早顶 > 晚顶)，>0.5 表示早顶持仓更高
  verdict: string;
}
export interface OiBucket {
  label: string;
  n: number;
  early: number;
  earlyRate: number | null;
}
export interface OiSameTimeStat {
  early: OiCaliberStat;
  late: OiCaliberStat;
  auc: number;
}
export interface OiAnomaly {
  sym: string;
  peakDate: string;
  oiNow: number;
  oiPrev: number;
  yoy: number;
  selfPeak: number;
}
export interface OiPeakGroup {
  n: number;
  oiProgAvg: number;
  oiProgMed: number;
  priceProgAvg: number;
  lagAvg: number;
  lagLater: number;
}
export interface OiDeepDive {
  caliber: {
    rows: OiCaliberRow[];
    posLabel: string[];
    buckets: OiBucket[];
    earlyDetail: string[];
    note: string;
  };
  sameTime: {
    n: number;
    earlyN: number;
    lateN: number;
    sameTimeYoy: OiSameTimeStat;
    startYoy: OiSameTimeStat;
    anomalies: OiAnomaly[];
    outlierCount: number;
    note: string;
  };
  peakPos: {
    early: OiPeakGroup;
    late: OiPeakGroup;
    aucOiProg: number;
    aucLag: number;
    note: string;
  };
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
  oiAnalysis: OiAnalysis;
  oiDeepDive: OiDeepDive;
  allRows: DataRow[];
}

export const RED = "#E24B4A";
export const GREEN = "#1D9E75";
