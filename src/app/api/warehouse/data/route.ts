import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/mssql';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const filtersParam = searchParams.get('filters');
    const searchQuery = searchParams.get('search'); // 全局搜索

    if (!tableName) {
        return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    try {
        const pool = await getDbPool();
        const safeTableName = tableName.replace(/[\[\]']/g, '');

        // 解析筛选条件
        let filters: Record<string, string> = {};
        if (filtersParam) {
            try {
                filters = JSON.parse(filtersParam);
            } catch {
                // 忽略无效的 JSON
            }
        }

        // 构建 WHERE 子句
        const conditions: string[] = [];
        const activeFilters = Object.entries(filters).filter(([_, value]) => value && value.trim() !== '');

        activeFilters.forEach(([column, value]) => {
            const safeColumn = column.replace(/[\[\]']/g, '');
            const safeValue = value.replace(/'/g, "''").trim();
            conditions.push(`CAST([${safeColumn}] AS NVARCHAR(MAX)) LIKE N'%${safeValue}%'`);
        });

        // 全局搜索 - 先获取列信息
        let globalSearchCondition = '';
        if (searchQuery && searchQuery.trim()) {
            const safeSearch = searchQuery.replace(/'/g, "''").trim();
            // 先获取列名
            const columnsResult = await pool.request().query(`
                SELECT TOP 1 * FROM [${safeTableName}]
            `);
            if (columnsResult.recordset.length > 0) {
                const columnNames = Object.keys(columnsResult.recordset[0]);
                const searchConditions = columnNames.map(col => {
                    const safeCol = col.replace(/[\[\]']/g, '');
                    return `CAST([${safeCol}] AS NVARCHAR(MAX)) LIKE N'%${safeSearch}%'`;
                });
                if (searchConditions.length > 0) {
                    globalSearchCondition = `(${searchConditions.join(' OR ')})`;
                }
            }
        }

        // 合并所有条件
        if (globalSearchCondition) {
            conditions.push(globalSearchCondition);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const hasActiveSearch = activeFilters.length > 0 || (searchQuery && searchQuery.trim());

        // 有搜索/筛选条件时返回更多数据（限制1000条）
        const limit = hasActiveSearch ? 'TOP 1000' : 'TOP 100';

        const query = `SELECT ${limit} * FROM [${safeTableName}] ${whereClause}`;
        const result = await pool.request().query(query);

        // 获取总匹配数
        let totalCount = result.recordset.length;
        if (hasActiveSearch) {
            const countQuery = `SELECT COUNT(*) as total FROM [${safeTableName}] ${whereClause}`;
            const countResult = await pool.request().query(countQuery);
            totalCount = countResult.recordset[0]?.total || 0;
        }

        return NextResponse.json({
            data: result.recordset,
            columns: result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [],
            totalCount,
            hasFilters: hasActiveSearch,
            isLimited: result.recordset.length >= (hasActiveSearch ? 1000 : 100)
        });
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
