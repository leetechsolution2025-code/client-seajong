const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

function extractPrice(html) {
  if (!html) return 0;
  const rePrice = /<span class="woocommerce-Price-amount amount">[\s\S]*?<bdi>([\s\S]*?)<\/bdi>/i;
  const match = html.match(rePrice);
  if (match) {
    console.log('Match found:', match[1]);
    const priceStr = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .replace(/[^\d]/g, "");
    return parseInt(priceStr) || 0;
  }
  console.log('No match found');
  return 0;
}

async function test() {
  const url = 'https://seajong.com/sen-cay-am-tuong-dang-tron-cao-cap-sj-sa0103/';
  console.log('Fetching:', url);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    }
  });
  const html = await res.text();
  // console.log(html.substring(0, 1000));
  const price = extractPrice(html);
  console.log('Extracted Price:', price);
}

test();
