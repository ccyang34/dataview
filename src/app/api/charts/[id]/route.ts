import { NextResponse } from "next/server";

// 模拟图表数据
const charts = new Map([
    ["demo1", { id: "demo1", type: "area", title: "月度趋势", data: [] }],
    ["demo2", { id: "demo2", type: "bar", title: "数据对比", data: [] }],
    ["demo3", { id: "demo3", type: "kline", title: "股票走势", data: [] }],
]);

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const chart = charts.get(id);

    if (!chart) {
        return NextResponse.json(
            { success: false, error: "图表不存在" },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        chart,
    });
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // TODO: 验证用户权限
        // TODO: 更新数据库中的图表

        return NextResponse.json({
            success: true,
            message: "图表已更新",
            chart: { id, ...body },
        });
    } catch {
        return NextResponse.json(
            { success: false, error: "请求无效" },
            { status: 400 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // TODO: 验证用户权限
    // TODO: 从数据库删除图表

    return NextResponse.json({
        success: true,
        message: `图表 ${id} 已删除`,
    });
}
