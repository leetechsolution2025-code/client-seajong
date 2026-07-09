const cheerio = require("cheerio");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const products = await prisma.seajongProduct.findMany();
  // Filter products that don't have variations
  const toProcess = products.filter(p => !p.variations || p.variations === "[]");
  console.log(`Found ${toProcess.length} products to check for variations...`);
  
  let count = 0;
  // Process in chunks of 10
  for (let i = 0; i < toProcess.length; i += 10) {
    const chunk = toProcess.slice(i, i + 10);
    await Promise.all(chunk.map(async (p) => {
      try {
        const htmlRes = await fetch(p.url, { cache: "no-store" });
        const htmlText = await htmlRes.text();
        const $ = cheerio.load(htmlText);
        
        let scrapedPromotions = [];
        let scrapedPolicies = [];
        let scrapedPriceHtml = null;
        let scrapedVariations = [];
        let scrapedVariationData = null;

        $(".box-uu-dai-new ul li").each((_, el) => {
           const text = $(el).text().trim();
           if (text) scrapedPolicies.push(text);
        });
        if (scrapedPolicies.length === 0) {
          $("p:has(img[src*='hj.png'])").each((_, el) => {
            const text = $(el).text().trim();
            if (text) scrapedPolicies.push(text);
          });
        }

        const khuyenmaiEl = $("*:contains('Khuyến mãi')").last();
        if (khuyenmaiEl.length) {
          const ul = khuyenmaiEl.parent().nextAll("ul").first();
          if (ul.length > 0) {
             ul.find("li").each((_, el) => {
                const text = $(el).text().trim();
                if (text) scrapedPromotions.push(text);
             });
          } else {
             khuyenmaiEl.parent().parent().find("ul").first().find("li").each((_, el) => {
               const text = $(el).text().trim();
               if (text) scrapedPromotions.push(text);
             });
          }
        }

        scrapedPriceHtml = $("p.price").first().text().trim() || null;
        
        const varForm = $("form.variations_form").first();
        if (varForm.length > 0) {
          varForm.find("table.variations select").each((_, select) => {
            const nameAttr = $(select).attr("name") || "";
            const options = [];
            $(select).find("option").each((_, opt) => {
              const val = $(opt).text().trim();
              if (val && val !== "Choose an option" && val !== "Chọn một tùy chọn") options.push(val);
            });
            if (options.length > 0) {
              const name = nameAttr.replace("attribute_", "").replace("pa_", "");
              let label = varForm.find(`label[for='${name}']`).text().trim();
              if (!label) label = name;
              scrapedVariations.push({ name: label, key: nameAttr, options });
            }
          });
          const varDataAttr = varForm.attr("data-product_variations");
          if (varDataAttr) scrapedVariationData = varDataAttr;
        }

        if (scrapedVariations.length > 0 || scrapedPolicies.length > 0 || scrapedPromotions.length > 0) {
          await prisma.seajongProduct.update({
            where: { id: p.id },
            data: {
              promotions: JSON.stringify(scrapedPromotions),
              policies: JSON.stringify(scrapedPolicies),
              priceHtml: scrapedPriceHtml,
              variations: JSON.stringify(scrapedVariations),
              variationData: scrapedVariationData
            }
          });
          count++;
        }
      } catch (e) {
        console.log(`Failed to scrape ${p.url}: ${e.message}`);
      }
    }));
    console.log(`Processed ${i + chunk.length}/${toProcess.length}...`);
  }
  console.log(`Finished! Updated ${count} products with new variations/policies/promotions.`);
}
run();
