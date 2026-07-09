const fs = require("fs");
let content = fs.readFileSync("src/app/api/seajong/sync/route.ts", "utf8");

if (!content.includes("cheerio")) {
  content = content.replace("import { prisma } from \"@/lib/prisma\";", "import { prisma } from \"@/lib/prisma\";\nimport * as cheerio from \"cheerio\";");
}

const scrapingCode = `
          // --- Web Scraping for Promotions, Policies & Variations ---
          let scrapedPromotions: string[] = [];
          let scrapedPolicies: string[] = [];
          let scrapedPriceHtml: string | null = null;
          let scrapedVariations: any[] = [];
          let scrapedVariationData: string | null = null;
          try {
            const htmlRes = await fetch(p.link, { cache: "no-store" });
            const htmlText = await htmlRes.text();
            const $ = cheerio.load(htmlText);
            
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
                const options: string[] = [];
                $(select).find("option").each((_, opt) => {
                  const val = $(opt).text().trim();
                  if (val && val !== "Choose an option" && val !== "Chọn một tùy chọn") options.push(val);
                });
                if (options.length > 0) {
                  const name = nameAttr.replace("attribute_", "").replace("pa_", "");
                  let label = varForm.find(\`label[for='\${name}']\`).text().trim();
                  if (!label) label = name;
                  scrapedVariations.push({ name: label, key: nameAttr, options });
                }
              });
              const varDataAttr = varForm.attr("data-product_variations");
              if (varDataAttr) scrapedVariationData = varDataAttr;
            }
          } catch (e) {
            console.error("Scrape error for", p.link, e);
          }
`;

content = content.replace(
  "          const productData = {",
  scrapingCode + "\n          const productData = {"
);

content = content.replace(
  "            specs:       JSON.stringify(specs),",
  "            specs:       JSON.stringify(specs),\n            promotions:  JSON.stringify(scrapedPromotions),\n            policies:    JSON.stringify(scrapedPolicies),\n            priceHtml:   scrapedPriceHtml,\n            variations:  JSON.stringify(scrapedVariations),\n            variationData: scrapedVariationData,"
);

fs.writeFileSync("src/app/api/seajong/sync/route.ts", content);
console.log("Patched successfully!");
