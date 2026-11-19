/** 豆油主力合约 01/05/09 分析数据类型（与 scripts/update-soybean-oil.mjs 输出一致） */

export interface ContractSeries {
  symbol: string;
  deliver_year: number;
  win_start: string;
  win_end: string;
  nodes: number;
  first_idx: number;
  norm: (number | null)[];
  abs: (number | null)[];
  dates: (string | null)[];
  win_pct: number;
  /** 起始交易日收盘 → 窗口最后交易日收盘 涨跌幅（逐日口径，图③） */
  win_daily_pct: number;
  peak_pct: number;
  start_date: string;
  start_price: number;
  end_date: string;
  end_price: number;
  start_label: string;
  peak_date: string;
  peak_price: number;
  peak_label: string;
  bars: number;
}

export interface DailySeries {
  symbol: string;
  deliver_year: number;
  norm: (number | null)[];
  abs: (number | null)[];
  dates: (string | null)[];
  n_days: number;
  is_partial: boolean;
}

export interface ContractType {
  name: string;
  labels: string[];
  axis_md: string[];
  series: ContractSeries[];
  avg_norm: (number | null)[];
  daily: { axis: string[]; series: DailySeries[] };
  /** 逐日等权平均路径(图②): 各合约按窗口进度插值到统一轴后等权平均 */
  daily_avg_norm: (number | null)[];
}

export interface SoybeanOilData {
  source: string;
  fetch_date: string;
  updated_at: string;
  window_rule: string;
  align_note: string;
  types: { "01": ContractType; "05": ContractType; "09": ContractType };
}

/** 涨红跌绿（中国期货惯例） */
export const RED = "#ff4d4f";
export const GREEN = "#52c41a";
export const COLORS = ["#8fa8c8", "#c9a86a", "#7fae8f", "#c47f7f", "#7f9fc4", "#b08fc4", "#c4a24f", "#d64541"];
