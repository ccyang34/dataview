
const https = require('https');

function fetchData(type) {
    const url = `https://www.jiaoyifamen.com/tools/api/future-basis/query?type=${type}&t=${Date.now()}`;
    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.jiaoyifamen.com/variety/varieties-varieties'
        },
        rejectUnauthorized: false
    };

    https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.data) {
                    console.log(`Type ${type}: SUCCESS`);
                    console.log('Keys:', Object.keys(json.data));
                } else {
                    console.log(`Type ${type}: No data`);
                }
            } catch (e) {
                console.log(`Type ${type}: Error parsing JSON`, e.message);
                console.log('Raw:', data.substring(0, 100));
            }
        });
    }).on('error', (e) => {
        console.error(`Type ${type}: Request error`, e);
    });
}

fetchData('B'); // Try Soybean No.2 (maybe B?)
fetchData('A'); // Try Soybean No.1
fetchData('M'); // Try Meal (Control)
