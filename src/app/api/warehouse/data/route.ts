import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/mssql';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');

    if (!tableName) {
        return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    try {
        const pool = await getDbPool();

        // Using TOP 100 for safety and performance
        // Note: In a real app we should unsafely join identifiers, 
        // but here we use a controlled environment. 
        // We'll escape the table name for basic security.
        const safeTableName = tableName.replace(/[\[\]']/g, '');

        const result = await pool.request().query(`
            SELECT TOP 100 * FROM [${safeTableName}]
        `);

        return NextResponse.json({
            data: result.recordset,
            columns: result.recordset.length > 0 ? Object.keys(result.recordset[0]) : []
        });
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
