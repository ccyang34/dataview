
const https = require('https');

const endpoints = [
    // Standard Inner Futures (JSONP) - Current one
    "https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_B0=/InnerFuturesNewService.getDailyKLine?symbol=B0",
    // Pure JSON version?
    "https://stock2.finance.sina.com.cn/futures/api/json.php/InnerFuturesNewService.getDailyKLine?symbol=B0",
    // Mobile API?
    "https://gu.sina.cn/ft/api/json.php/GlobalService.getGlobalFuturesDailyKLine?symbol=B0",
    // Another variant
    "https://finance.sina.com.cn/futures/api/json.php/InnerFuturesNewService.getDailyKLine?symbol=B0"
];

async function testUrl(url) {
    return new Promise(resolve => {
        console.log(`Testing: ${url}`);
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const isJson = data.trim().startsWith('[') || data.trim().startsWith('{');
                const isJsonP = data.includes('var _B0=');
                console.log(`Status: ${res.statusCode}, Length: ${data.length}, IsJSON: ${isJson}, IsJSONP: ${isJsonP}`);
                if (data.length < 200) console.log(`Content: ${data}`);
                resolve();
            });
        }).on('error', e => {
            console.log(`Error: ${e.message}`);
            resolve();
        });
    });
}

(async () => {
    for (const url of endpoints) {
        await testUrl(url);
    }
})();
