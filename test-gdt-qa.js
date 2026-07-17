const cheerio = require('cheerio');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function test() {
  try {
    const res = await fetch('https://www.gdt.gov.vn/wps/portal/home/hoidap', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("Searching for Q&A table...");
    let qCount = 0;
    $('table tr').each((i, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length > 20) {
        console.log(`[${i}]`, text.substring(0, 80));
        qCount++;
      }
    });
    
    console.log(`Found ${qCount} potential rows.`);
  } catch(e) {
    console.error(e);
  }
}

test();
