import { NextResponse } from "next/server";

// 模拟数据
const mockData = [
    { name: "1月", value: 4000 },
    { name: "2月", value: 3000 },
    { name: "3月", value: 5000 },
    { name: "4月", value: 2780 },
    { name: "5月", value: 1890 },
    { name: "6月", value: 2390 },
    { name: "7月", value: 3490 },
];

export async function GET() {
    // TODO: 从数据库获取实际数据
    return NextResponse.json({
        success: true,
        data: mockData,
        updatedAt: new Date().toISOString(),
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // TODO: 验证用户权限
        // TODO: 保存数据到数据库

        return NextResponse.json({
            success: true,
            message: "数据已保存",
            data: body,
        });
    } catch {
        return NextResponse.json(
            { success: false, error: "请求无效" },
            { status: 400 }
        );
    }
}
