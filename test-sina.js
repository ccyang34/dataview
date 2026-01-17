
const https = require('https');

const urls = [
    // Pattern 1: Global style (Sometimes used for continuous)
    `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_B0=/GlobalFuturesService.getGlobalFuturesDailyKLine?symbol=B0&_=${Date.now()}&source=web&page=1&num=1000`,
    // Pattern 2: Inner Futures Historical (Common for stocks, maybe futures?)
    `https://finance.sina.com.cn/realstock/company/B0/hisdata/year/1.js`,
    // Pattern 3: Another common one
    `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_B0=/InnerFuturesNewService.getDailyKLine?symbol=B0&_=${Date.now()}`,
];

urls.forEach((url, index) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`\n--- URL ${index + 1} ---`);
            console.log('Status:', res.statusCode);
            const sample = data.substring(0, 200).replace(/\s+/g, ' ');
            console.log('Sample:', sample);
            if (data.includes('B0') || data.includes('date')) {
                console.log('>>> MIGHT BE VALID');
            }
        });
    }).on('error', e => console.log(`URL ${index + 1} Error:`, e.message));
});
