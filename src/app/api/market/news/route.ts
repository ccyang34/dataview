import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 新浪财经 7x24滚动新闻接口
        // lid=2509: 7x24小时全球实时财经新闻
        const url = "https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2509&k=&num=20&page=1";
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();

        if (!data || !data.result || !data.result.data) {
            throw new Error("Invalid response from Sina News");
        }

        const news = data.result.data.map((item: any) => {
            // 时间处理: Unix timestamp to HH:mm
            const date = new Date(parseInt(item.ctime) * 1000);
            const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

            return {
                id: item.docid,
                title: item.title,
                url: item.url,
                time: timeStr,
                //简单判断是否重要: 包含"突发"、"重磅"、"急讯" 或 type 为 1
                isImportant: item.title.includes("突发") || item.title.includes("重磅") || item.importance === '1'
            };
        });

        return NextResponse.json({
            success: true,
            data: news
        });
    } catch (error) {
        console.error("News API Error:", error);
        return NextResponse.json({ success: false, error: String(error) });
    }
}
