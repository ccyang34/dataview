"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    Database, Table, Eye, Search, Lock, ChevronRight,
    AlertCircle, Loader2, Home, Settings, Filter,
    ArrowLeft, Download, RefreshCcw, GripVertical,
    Columns, X, Check, ChevronDown, ListFilter
} from "lucide-react";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    ColumnDef,
    ColumnOrderState,
} from "@tanstack/react-table";
import {
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    type DragEndEvent,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DbItem {
    name: string;
    type: string;
    db_schema: string;
}

interface TableData {
    columns: string[];
    data: any[];
}

// Draggable Column Header Component
function DraggableHeader({ header, table }: { header: any; table: any }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: header.column.id,
    });

    const style = {
        filter: isDragging ? 'opacity(0.5)' : undefined,
        transform: CSS.Translate.toString(transform),
        transition,
        whiteSpace: 'nowrap',
    } as React.CSSProperties;

    return (
        <th
            ref={setNodeRef}
            style={style}
            className="px-4 py-3 font-semibold text-[var(--muted)] text-left bg-[var(--card)] border-b border-[var(--border)] relative group"
        >
            <div className="flex items-center gap-2">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-[var(--card-hover)] rounded"
                >
                    <GripVertical className="w-3 h-3" />
                </button>
                <div
                    className="flex-1 cursor-pointer select-none flex items-center gap-1"
                    onClick={header.column.getToggleSortingHandler()}
                >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                    }[header.column.getIsSorted() as string] ?? null}
                </div>
            </div>
        </th>
    );
}

export default function WarehousePage() {
    // Auth States
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");

    // Data States
    const [items, setItems] = useState<DbItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<DbItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'BASE TABLE' | 'VIEW'>('ALL');
    const [activeItem, setActiveItem] = useState<DbItem | null>(null);
    const [rawData, setRawData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);

    // UI States
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [globalFilter, setGlobalFilter] = useState("");
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
    const [density, setDensity] = useState<'compact' | 'normal' | 'relaxed'>('normal');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // TanStack Table setup
    const tableColumns = useMemo<ColumnDef<any>[]>(() => {
        return columns.map(col => ({
            accessorKey: col,
            header: col,
            id: col,
            cell: info => {
                const val = info.getValue();
                if (val === null || val === undefined) return '-';
                if (typeof val === 'object') {
                    if (val instanceof Date) return val.toLocaleString();
                    return JSON.stringify(val);
                }
                return val;
            }
        }));
    }, [columns]);

    const table = useReactTable({
        data: rawData,
        columns: tableColumns,
        state: {
            globalFilter,
            columnOrder,
        },
        onColumnOrderChange: setColumnOrder,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setColumnOrder((order) => {
                const oldIndex = order.indexOf(active.id as string);
                const newIndex = order.indexOf(over.id as string);
                return arrayMove(order, oldIndex, newIndex);
            });
        }
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Since we are debugging locally, allow empty or 'c'
        if (password === "c" || !password) {
            setIsAuthenticated(true);
            setAuthError("");
            fetchItems();
        } else {
            setAuthError("密码错误");
        }
    };

    const fetchItems = async () => {
        setIsLoadingItems(true);
        try {
            const res = await fetch("/api/warehouse/tables");
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setItems(data);
            setFilteredItems(data);
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setIsLoadingItems(false);
        }
    };

    const fetchTableData = async (item: DbItem) => {
        setActiveItem(item);
        setIsLoadingData(true);
        try {
            const res = await fetch(`/api/warehouse/data?table=${item.name}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setRawData(data.data);
            setColumns(data.columns);
            setColumnOrder(data.columns);
            // On mobile, close sidebar after selecting a table
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            }
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        const filtered = items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
            return matchesSearch && matchesType;
        });
        setFilteredItems(filtered);
    }, [searchQuery, typeFilter, items]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-radial-gradient">
                <div className="w-full max-w-md p-8 glass-morphism animate-in fade-in zoom-in duration-300">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="p-4 bg-[var(--primary)]/10 rounded-2xl mb-4 text-[var(--primary)]">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">数据中心</h1>
                        <p className="text-[var(--muted)]">请输入访问密码调试浏览仓库</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                            placeholder="访问密码 (调试模式下回车即可)"
                            autoFocus
                        />
                        {authError && (
                            <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-500/10 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                {authError}
                            </div>
                        )}
                        <button type="submit" className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all">
                            验证进入
                        </button>
                        <Link href="/" className="flex items-center justify-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mt-4 transition-colors">
                            <Home className="w-4 h-4" /> 返回首页
                        </Link>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[var(--background)] overflow-hidden">
            {/* Header */}
            <header className="h-14 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-[var(--card-hover)] rounded-lg transition-colors" title="返回首页">
                        <Home className="w-5 h-5 text-[var(--primary)]" />
                    </Link>
                    <div className="h-4 w-[1px] bg-[var(--border)]" />
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-[var(--muted)]" />
                        <span className="font-bold text-sm">DB_K3SYNDB</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                        <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
                        <input
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="全局搜索数据..."
                            className="bg-transparent border-none outline-none text-xs w-48"
                        />
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg transition-colors ${showSettings ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "hover:bg-[var(--card-hover)]"}`}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed lg:static inset-y-0 left-0 z-30 w-[300px] lg:w-[320px] border-r border-[var(--border)] bg-[var(--card)] flex flex-col transition-transform duration-300 ease-in-out`}>
                    <div className="p-4 space-y-4 shrink-0 mt-14 lg:mt-0">
                        <div className="flex items-center justify-between lg:hidden mb-2">
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-[var(--primary)]" />
                                <span className="font-bold text-sm">表列表</span>
                            </div>
                            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-[var(--card-hover)] rounded-md">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                            <input
                                placeholder="过滤列表..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-1 bg-[var(--background)] p-1 rounded-xl border border-[var(--border)]">
                            {(['ALL', 'BASE TABLE', 'VIEW'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type)}
                                    className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${typeFilter === type ? "bg-[var(--primary)] text-white shadow-sm" : "hover:bg-[var(--card-hover)] text-[var(--muted)]"
                                        }`}
                                >
                                    {type === 'ALL' ? '全部' : type === 'BASE TABLE' ? '表' : '视图'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar">
                        {isLoadingItems ? (
                            Array(5).fill(0).map((_, i) => <div key={i} className="h-10 bg-[var(--card-hover)] animate-pulse rounded-lg mx-2" />)
                        ) : (
                            filteredItems.map(item => (
                                <button
                                    key={`${item.db_schema}.${item.name}`}
                                    onClick={() => fetchTableData(item)}
                                    className={`w-full group px-3 py-2.5 rounded-xl text-left text-sm transition-all flex items-center gap-3 ${activeItem?.name === item.name
                                        ? "bg-[var(--primary)] text-white translate-x-1"
                                        : "hover:bg-[var(--card-hover)] text-[var(--muted)] hover:text-[var(--foreground)]"
                                        }`}
                                >
                                    {item.type === 'BASE TABLE' ? <Table className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    <div className="flex-1 overflow-hidden">
                                        <p className="truncate font-medium leading-none">{item.name}</p>
                                        <p className={`text-[9px] mt-1 ${activeItem?.name === item.name ? "text-white/60" : "text-[var(--muted)]"}`}>
                                            {item.db_schema}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col bg-[var(--background)] overflow-hidden">
                    {activeItem ? (
                        <>
                            {/* Table Toolbar */}
                            <div className="h-14 border-b border-[var(--border)] px-6 flex items-center justify-between bg-[var(--card)]">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsSidebarOpen(true)}
                                        className="lg:hidden p-2 -ml-2 hover:bg-[var(--card-hover)] rounded-lg text-[var(--primary)]"
                                    >
                                        <ListFilter className="w-5 h-5" />
                                    </button>
                                    <div className={`p-2 rounded-lg hidden sm:block ${activeItem.type === 'VIEW' ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}>
                                        {activeItem.type === 'VIEW' ? <Eye className="w-4 h-4" /> : <Table className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-bold leading-none truncate">{activeItem.name}</h2>
                                        <p className="text-[10px] text-[var(--muted)] mt-1">前100行数据</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => fetchTableData(activeItem)}
                                        className="p-2 hover:bg-[var(--card-hover)] rounded-lg text-[var(--muted)]"
                                        title="重新加载数据"
                                    >
                                        <RefreshCcw className="w-4 h-4" />
                                    </button>
                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--card-hover)] transition-all">
                                        <Download className="w-3.5 h-3.5 text-[var(--muted)]" />
                                        导出 CSV
                                    </button>
                                </div>
                            </div>

                            {/* Settings Panel */}
                            {showSettings && (
                                <div className="m-4 p-4 border border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl animate-in slide-in-from-top-4 duration-200">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border)]">
                                        <div className="flex items-center gap-2 font-bold text-sm">
                                            <Settings className="w-4 h-4 text-[var(--primary)]" /> 显示设置
                                        </div>
                                        <X onClick={() => setShowSettings(false)} className="w-4 h-4 cursor-pointer text-[var(--muted)] hover:text-red-500" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-xs font-bold text-[var(--muted)] mb-3">显示密度</p>
                                            <div className="flex gap-2">
                                                {(['compact', 'normal', 'relaxed'] as const).map(d => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setDensity(d)}
                                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${density === d ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--card-hover)]"
                                                            }`}
                                                    >
                                                        {d === 'compact' ? '紧凑' : d === 'normal' ? '标准' : '宽松'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[var(--muted)] mb-3">每页行数</p>
                                            <div className="flex gap-2">
                                                {[10, 25, 50, 100].map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={() => table.setPageSize(size)}
                                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${table.getState().pagination.pageSize === size ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--card-hover)]"
                                                            }`}
                                                    >
                                                        {size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Data Table Container */}
                            <div className="flex-1 overflow-auto relative custom-scrollbar bg-[var(--card)]/20 shadow-inner">
                                {isLoadingData ? (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[var(--background)]/30">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
                                            <p className="text-sm font-medium animate-pulse">正在从仓库同步数据...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="min-w-full inline-block align-middle">
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <table className="w-full border-collapse border-separate border-spacing-0">
                                                <thead className="sticky top-0 z-20">
                                                    {table.getHeaderGroups().map(headerGroup => (
                                                        <tr key={headerGroup.id}>
                                                            <SortableContext
                                                                items={columnOrder}
                                                                strategy={horizontalListSortingStrategy}
                                                            >
                                                                {headerGroup.headers.map(header => (
                                                                    <DraggableHeader key={header.id} header={header} table={table} />
                                                                ))}
                                                            </SortableContext>
                                                        </tr>
                                                    ))}
                                                </thead>
                                                <tbody className="bg-[var(--card)]">
                                                    {table.getRowModel().rows.length > 0 ? (
                                                        table.getRowModel().rows.map(row => (
                                                            <tr key={row.id} className="group hover:bg-[var(--card-hover)] transition-colors">
                                                                {row.getVisibleCells().map(cell => (
                                                                    <td
                                                                        key={cell.id}
                                                                        className={`px-4 text-[var(--muted)] border-b border-[var(--border)] whitespace-nowrap transition-all ${density === 'compact' ? 'py-1 text-[11px]' :
                                                                            density === 'relaxed' ? 'py-4 text-sm' :
                                                                                'py-2.5 text-xs'
                                                                            }`}
                                                                    >
                                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={columns.length} className="py-20 text-center">
                                                                <div className="flex flex-col items-center gap-2 opacity-50">
                                                                    <Search className="w-8 h-8" />
                                                                    <p className="text-sm">未找到匹配的数据</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </DndContext>
                                    </div>
                                )}
                            </div>

                            {/* Pagination Footer */}
                            {!isLoadingData && table.getPageCount() > 1 && (
                                <div className="h-14 border-t border-[var(--border)] bg-[var(--card)] px-6 flex items-center justify-between text-xs sm:text-sm">
                                    <div className="text-[var(--muted)] flex items-center gap-4">
                                        <span>
                                            共 <strong>{table.getFilteredRowModel().rows.length}</strong> 条记录
                                        </span>
                                        <div className="hidden sm:flex items-center gap-1">
                                            <span>第</span>
                                            <input
                                                type="number"
                                                defaultValue={table.getState().pagination.pageIndex + 1}
                                                onChange={e => table.setPageIndex(e.target.value ? Number(e.target.value) - 1 : 0)}
                                                className="w-10 text-center bg-[var(--background)] border border-[var(--border)] rounded px-1"
                                            />
                                            <span>/ {table.getPageCount()} 页</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={!table.getCanPreviousPage()}
                                            onClick={() => table.previousPage()}
                                            className="p-2 border border-[var(--border)] rounded-lg bg-[var(--card)] hover:bg-[var(--card-hover)] disabled:opacity-30 transition-all shadow-sm"
                                        >
                                            上一页
                                        </button>
                                        <button
                                            disabled={!table.getCanNextPage()}
                                            onClick={() => table.nextPage()}
                                            className="p-2 border border-[var(--border)] rounded-lg bg-[var(--card)] hover:bg-[var(--card-hover)] disabled:opacity-30 transition-all shadow-sm"
                                        >
                                            下一页
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-70 animate-in fade-in duration-500">
                            <div className="mb-6 relative">
                                <div className="absolute inset-0 bg-[var(--primary)] blur-3xl opacity-10 animate-pulse" />
                                <div className="p-8 bg-[var(--primary)]/5 rounded-full relative">
                                    <Database className="w-16 h-16 text-[var(--primary)]" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold mb-3 tracking-tight">数据驱动决策</h2>
                            <p className="text-[var(--muted)] max-w-sm text-sm leading-relaxed">
                                请在左侧列表中快速搜索并选择目标数据表，即可开启多维度的在线数据分析与浏览。
                            </p>
                        </div>
                    )}
                </main>
            </div>

            <style jsx>{`
                .glass-morphism {
                    background: var(--card-glow);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid var(--border);
                    border-radius: 32px;
                    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.15);
                }

                .bg-radial-gradient {
                    background: radial-gradient(circle at 10% 10%, rgba(var(--primary-rgb), 0.05), transparent),
                                radial-gradient(circle at 90% 90%, rgba(var(--secondary-rgb), 0.05), transparent);
                    background-color: var(--background);
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 7px;
                    height: 7px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--primary);
                }
                
                tr:last-child td {
                   border-bottom: none;
                }
            `}</style>
        </div>
    );
}
