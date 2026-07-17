const cheerio = require('cheerio');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
fetch('https://www.gdt.gov.vn/wps/portal/home/vbpq?1dmy&page=Z6_CQKCVKV0009520IMEVDLA60O10&urile=wcm%3Apath%3A%2Fgdt%2Bcontent%2Fsa_gdt%2Fsa_vanban%2Fvbhd%2Fvbhd_tct%2F07-2026%2Fa89852c8-0e19-4c15-a51e-5c66e20886d4', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => r.text()).then(t => {
  const $ = cheerio.load(t);
  let found = false;
  $('a').each((i, el) => {
    const text = $(el).text().trim();
    if(text.includes('Tải file đính kèm') || text.includes('Tải')) {
       console.log('Found link via text:', $(el).attr('href'));
       found = true;
    }
  });
  if (!found) {
    console.log("No download link found with text 'Tải file đính kèm'. Printing all links:");
    $('a').each((i, el) => {
      console.log($(el).attr('href'));
    });
  }
}).catch(console.error);
