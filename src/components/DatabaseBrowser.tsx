"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Database, Download, Play, Search, Table2, Terminal, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2, CheckCircle2, Info } from "lucide-react";

interface TableMeta { name: string; comment: string; columns: string[]; rows: number; }
interface DbMeta {
  database: string; title: string; description: string; generated_at: string;
  sources: { name: string; file: string; updated_at: string; source: string }[];
  window_rule: string; tables: TableMeta[];
}
type SqlValue = number | string | Uint8Array | null;
interface QueryResult { columns: string[]; values: SqlValue[][]; }

const EXAMPLES = [
  { label: "早晚顶表现", sql: "SELECT tag, COUNT(*) n, ROUND(AVG(end),1) avg_end, ROUND(AVG(peak),1) avg_peak FROM contracts GROUP BY tag ORDER BY avg_end DESC;" },
  { label: "持仓同比判别", sql: "SELECT name, auc, early_mean, late_mean FROM signal_auc WHERE category='持仓口径辨析' ORDER BY auc DESC;" },
  { label: "高价+增量组合", sql: "SELECT price_band, oi_band, n, late, early, late_rate, avg_end FROM oi_matrix;" },
  { label: "2705 预判", sql: "SELECT symbol, price, quantile, verdict, oi_yoy, oi_signal, price_signal FROM forecast_2705;" },
  { label: "7→8月跳涨", sql: "SELECT * FROM month_jump ORDER BY year;" },
  { label: "逐日行情样本", sql: "SELECT symbol, trade_date, close, oi FROM daily_quotes WHERE symbol='Y2001' ORDER BY progress_idx LIMIT 20;" },
];

const fmt = (v: SqlValue): string => {
  if (v == null) return "—";
  if (v instanceof Uint8Array) return `[blob ${v.length}B]`;
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
  return String(v);
};

export default function DatabasePage() {
  const [meta, setMeta] = useState<DbMeta | null>(null);
  const [db, setDb] = useState<any>(null);
  const [initErr, setInitErr] = useState("");
  const [loading, setLoading] = useState(true);

  // 表浏览状态
  const [selected, setSelected] = useState<string>("");
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [tableErr, setTableErr] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const PAGE = 50;

  // SQL 状态
  const [tab, setTab] = useState<"browse" | "sql">("browse");
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [sqlResult, setSqlResult] = useState<QueryResult | null>(null);
  const [sqlErr, setSqlErr] = useState("");
  const [sqlMs, setSqlMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mRes = await fetch("/api/oil-database", { cache: "no-store" });
        const mj = await mRes.json();
        if (!mRes.ok || !mj.success) throw new Error(mj.error || "meta 加载失败");
        const initSqlJs = (await import("sql.js")).default;
        const SQL = await initSqlJs({ locateFile: () => "/data/sql-wasm.wasm" } as any);
        const bufRes = await fetch("/data/oil-research.sqlite", { cache: "no-store" });
        if (!bufRes.ok) throw new Error(`数据库文件加载失败 HTTP ${bufRes.status}`);
        const buf = await bufRes.arrayBuffer();
        if (cancelled) return;
        const database = new SQL.Database(new Uint8Array(buf));
        setDb(database);
        setMeta(mj.meta);
        if (mj.meta.tables.length) setSelected(mj.meta.tables[1]?.name || mj.meta.tables[0].name); // 默认 contracts
      } catch (e) {
        if (!cancelled) setInitErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 选表时读取全部行（小表直接读；大表也读入内存，浏览器 SQLite 足够快）
  useEffect(() => {
    if (!db || !selected) return;
    setTableErr(""); setSearch(""); setSort(null); setPage(0); setTableData(null);
    try {
      const r = db.exec(`SELECT * FROM "${selected.replace(/"/g, '""')}"`);
      setTableData(r.length ? { columns: r[0].columns, values: r[0].values } : { columns: [], values: [] });
    } catch (e) {
      setTableErr(e instanceof Error ? e.message : String(e));
    }
  }, [db, selected]);

  const viewRows = useMemo(() => {
    if (!tableData) return [];
    let rows = tableData.values.map((v, i) => ({ v, i }));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.v.some((cell) => fmt(cell).toLowerCase().includes(q)));
    }
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const x = a.v[sort.col], y = b.v[sort.col];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        if (typeof x === "number" && typeof y === "number") return (x - y) * sort.dir;
        return String(x).localeCompare(String(y), "zh-CN") * sort.dir;
      });
    }
    return rows;
  }, [tableData, search, sort]);

  const pageRows = viewRows.slice(page * PAGE, (page + 1) * PAGE);
  const pageCount = Math.max(1, Math.ceil(viewRows.length / PAGE));

  const runSql = () => {
    if (!db || !sql.trim()) return;
    setSqlErr(""); setSqlResult(null); setSqlMs(null);
    const t0 = performance.now();
    try {
      const r = db.exec(sql);
      setSqlMs(Math.round(performance.now() - t0));
      // 取最后一个有结果集（SELECT）的语句
      const q = [...r].reverse().find((x) => x.values.length || x.columns.length);
      setSqlResult(q ? { columns: q.columns, values: q.values } : { columns: ["执行成功"], values: [["语句已执行（无返回集）"]] });
    } catch (e) {
      setSqlMs(Math.round(performance.now() - t0));
      setSqlErr(e instanceof Error ? e.message : String(e));
    }
  };

  const ResultTable = ({ result, maxRows }: { result: QueryResult; maxRows?: number }) => (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-xs">
        <thead><tr className="bg-[var(--card-hover)] text-[var(--muted)]">
          <th className="p-2 text-right font-medium border-b border-[var(--border)] sticky left-0 bg-[var(--card-hover)]">#</th>
          {result.columns.map((c) => <th key={c} className="p-2 text-left font-semibold whitespace-nowrap border-b border-[var(--border)]">{c}</th>)}
        </tr></thead>
        <tbody>
          {result.values.slice(0, maxRows).map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)]">
              <td className="p-2 text-right text-[var(--muted)] sticky left-0 bg-[var(--card)]">{i + 1}</td>
              {row.map((cell, j) => <td key={j} className={`p-2 whitespace-nowrap ${typeof cell === "number" ? "text-right tabular-nums" : "text-left"}`} style={{ color: cell == null ? "var(--muted)" : undefined }}>{fmt(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {maxRows && result.values.length > maxRows && <div className="p-2 text-[11px] text-[var(--muted)] text-center border-t border-[var(--border)]">仅显示前 {maxRows} 行，共 {result.values.length} 行</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />
      <main className="pt-20 pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 text-[var(--primary)]">
              <Database className="w-4 h-4" />
              <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">Oil Research Database</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight mt-1">油脂研究数据库</h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1 max-w-3xl">
              豆油 / 棕榈油主力合约历史行情、持仓与形态研究的全部数据，打包成单一 SQLite 文件，可浏览、可查询、可下载
            </p>
          </div>
          <a href="/data/oil-research.sqlite" download className="btn btn-primary cursor-pointer px-4 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5 self-start sm:self-auto">
            <Download className="w-4 h-4" /> 下载数据库 (.sqlite)
          </a>
        </div>

        {initErr && <div className="p-4 mb-6 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg">❌ 数据库加载失败：{initErr}</div>}
        {loading && <div className="flex flex-col items-center justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" /><p className="mt-4 text-[var(--muted)] text-sm">正在加载 SQLite 引擎与数据...</p></div>}

        {!loading && !initErr && meta && db && (
          <>
            <div className="card p-3 sm:p-4 mb-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <span><b className="text-[var(--muted)]">数据库文件：</b><code>{meta.database}</code></span>
                <span><b className="text-[var(--muted)]">表数量：</b>{meta.tables.length} 张</span>
                <span><b className="text-[var(--muted)]">总行数：</b>{meta.tables.reduce((s, t) => s + t.rows, 0).toLocaleString()}</span>
                <span><b className="text-[var(--muted)]">生成于：</b>{new Date(meta.generated_at).toLocaleString("zh-CN")}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted)] flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{meta.description} 窗口规则：{meta.window_rule}。SQL 查询在浏览器本地执行，不上传数据。</span>
              </div>
            </div>

            {/* 模式切换 */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
              <button onClick={() => setTab("browse")} className={`px-4 py-2 text-sm font-medium cursor-pointer inline-flex items-center gap-1.5 border-b-2 transition-colors ${tab === "browse" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                <Table2 className="w-4 h-4" /> 表浏览
              </button>
              <button onClick={() => setTab("sql")} className={`px-4 py-2 text-sm font-medium cursor-pointer inline-flex items-center gap-1.5 border-b-2 transition-colors ${tab === "sql" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                <Terminal className="w-4 h-4" /> SQL 查询
              </button>
            </div>

            {tab === "browse" ? (
              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
                {/* 表列表 */}
                <div className="card p-2 h-fit lg:sticky lg:top-20">
                  <div className="text-[11px] font-semibold text-[var(--muted)] px-2 py-1.5 uppercase tracking-wide">数据表 ({meta.tables.length})</div>
                  <div className="max-h-[70vh] overflow-y-auto">
                    {meta.tables.map((t) => (
                      <button key={t.name} onClick={() => setSelected(t.name)}
                        className={`w-full text-left px-2.5 py-2 rounded-md cursor-pointer transition-colors ${selected === t.name ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "hover:bg-[var(--card-hover)]"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs font-semibold truncate">{t.name}</code>
                          <span className="text-[10px] text-[var(--muted)] shrink-0 tabular-nums">{t.rows.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-snug">{t.comment}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 表格 */}
                <div className="card p-3 sm:p-4 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h2 className="text-base font-bold font-mono">{selected}</h2>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">{meta.tables.find((t) => t.name === selected)?.comment}</p>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                      <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="搜索全表..."
                        className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] w-44 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                    </div>
                  </div>
                  {tableErr && <div className="p-3 mb-3 bg-[var(--danger)]/10 text-[var(--danger)] rounded text-xs">读取失败：{tableErr}</div>}
                  {tableData && (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-[var(--border)] max-h-[68vh]">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-[var(--card-hover)] text-[var(--muted)] sticky top-0 z-10">
                            <th className="p-2 text-right font-medium border-b border-[var(--border)]">#</th>
                            {tableData.columns.map((c, j) => (
                              <th key={c} className="p-2 text-left font-semibold whitespace-nowrap border-b border-[var(--border)] cursor-pointer hover:text-[var(--primary)] select-none" onClick={() => setSort((s) => s?.col === j ? (s.dir === 1 ? { col: j, dir: -1 } : null) : { col: j, dir: 1 })}>
                                <span className="inline-flex items-center gap-1">{c}<ChevronsUpDown className="w-3 h-3 opacity-40" /></span>
                              </th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {pageRows.map(({ v, i }) => (
                              <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)]">
                                <td className="p-2 text-right text-[var(--muted)] tabular-nums">{page * PAGE + i + 1}</td>
                                {v.map((cell, j) => <td key={j} className={`p-2 whitespace-nowrap ${typeof cell === "number" ? "text-right tabular-nums" : "text-left"}`} style={{ color: cell == null ? "var(--muted)" : undefined }}>{fmt(cell)}</td>)}
                              </tr>
                            ))}
                            {!pageRows.length && <tr><td colSpan={tableData.columns.length + 1} className="p-6 text-center text-[var(--muted)]">无匹配行</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-[11px] text-[var(--muted)]">
                        <span>共 {viewRows.length.toLocaleString()} 行{search && `（已筛选，全表 ${tableData.values.length.toLocaleString()} 行）`} · 第 {page + 1}/{pageCount} 页</span>
                        <div className="flex items-center gap-1">
                          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-1 rounded border border-[var(--border)] cursor-pointer disabled:opacity-30 hover:bg-[var(--card-hover)]"><ChevronLeft className="w-4 h-4" /></button>
                          <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} className="p-1 rounded border border-[var(--border)] cursor-pointer disabled:opacity-30 hover:bg-[var(--card-hover)]"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="card p-3 sm:p-4 mb-3">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[11px] text-[var(--muted)] mr-1 self-center">示例：</span>
                    {EXAMPLES.map((ex) => <button key={ex.label} onClick={() => { setSql(ex.sql); runSqlWith(ex.sql); }}
                      className="px-2 py-1 text-[11px] rounded-md border border-[var(--border)] hover:bg-[var(--card-hover)] cursor-pointer">{ex.label}</button>)}
                  </div>
                  <textarea value={sql} onChange={(e) => setSql(e.target.value)} spellCheck={false}
                    className="w-full h-28 p-3 text-xs font-mono rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] resize-y focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={runSql} className="btn btn-primary cursor-pointer px-4 py-1.5 text-xs inline-flex items-center gap-1.5"><Play className="w-3.5 h-3.5" /> 执行查询</button>
                    <span className="text-[11px] text-[var(--muted)]">支持 SELECT / 聚合 / JOIN / 子查询，数据在浏览器本地执行</span>
                    {sqlMs != null && <span className="text-[11px] text-[var(--muted)] ml-auto inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {sqlMs} ms</span>}
                  </div>
                </div>
                {sqlErr && <div className="p-3 mb-3 bg-[var(--danger)]/10 text-[var(--danger)] rounded text-xs font-mono">❌ {sqlErr}</div>}
                {sqlResult && (
                  <div className="card p-3 sm:p-4">
                    <div className="text-xs text-[var(--muted)] mb-2">返回 {sqlResult.values.length.toLocaleString()} 行 × {sqlResult.columns.length} 列</div>
                    <ResultTable result={sqlResult} maxRows={200} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );

  function runSqlWith(s: string) {
    if (!db) return;
    setSqlErr(""); setSqlResult(null);
    const t0 = performance.now();
    try {
      const r = db.exec(s);
      setSqlMs(Math.round(performance.now() - t0));
      const q = [...r].reverse().find((x) => x.values.length || x.columns.length);
      setSqlResult(q ? { columns: q.columns, values: q.values } : { columns: ["执行成功"], values: [["语句已执行（无返回集）"]] });
    } catch (e) {
      setSqlMs(Math.round(performance.now() - t0));
      setSqlErr(e instanceof Error ? e.message : String(e));
    }
  }
}
