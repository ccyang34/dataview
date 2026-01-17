
const https = require('https');
const fs = require('fs');
const path = require('path');

const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_B0=/InnerFuturesNewService.getDailyKLine?symbol=B0&_=${Date.now()}`;
const outputPath = path.join(__dirname, 'src', 'lib', 'data', 'fallback-b0.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

console.log(`Fetching B0 data from: ${url}`);

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Robust parsing: Find the first '[' and last ']'
        const firstBracket = data.indexOf('[');
        const lastBracket = data.lastIndexOf(']');

        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            const potentialJson = data.substring(firstBracket, lastBracket + 1);
            try {
                const jsonData = JSON.parse(potentialJson);
                // Transform to match DailyData interface: { date: string, close: number, basis?: number }
                const transformed = jsonData.map(item => ({
                    date: item.d,
                    close: parseFloat(item.c)
                }));

                fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2));
                console.log(`Successfully saved ${transformed.length} records to ${outputPath}`);
            } catch (e) {
                console.error('JSON parse error:', e);
                console.log('Snippet:', potentialJson.substring(0, 100));
            }
        } else {
            console.error('Failed to parse JSONP response (brackets not found)');
            if (data.length > 500) {
                console.log(data.substring(0, 500) + '...');
            } else {
                console.log(data);
            }
        }
    });
}).on('error', e => console.error('Fetch error:', e));
