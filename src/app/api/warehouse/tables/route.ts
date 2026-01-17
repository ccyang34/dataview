import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/mssql';

export async function GET() {
    try {
        const pool = await getDbPool();

        // Query both tables and views
        const result = await pool.request().query(`
            SELECT 
                TABLE_NAME as name, 
                TABLE_TYPE as type,
                TABLE_SCHEMA as schema
            FROM INFORMATION_SCHEMA.TABLES
            ORDER BY TABLE_TYPE, TABLE_NAME
        `);

        return NextResponse.json(result.recordset);
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
