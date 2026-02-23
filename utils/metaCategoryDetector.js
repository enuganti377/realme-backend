const axios = require("axios");
const cheerio = require("cheerio");

async function detectFromMetaAndBreadcrumb(link) {
  try {
    const response = await axios.get(link, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    const metaSection =
      $('meta[property="article:section"]').attr("content") ||
      $('meta[name="section"]').attr("content");

    if (metaSection) {
      const section = metaSection.toLowerCase();

      if (section.includes("polit")) return "politics";
      if (section.includes("sport")) return "sports";
      if (section.includes("entertain")) return "cinema";
    }

    const breadcrumb = $("a")
      .map((i, el) => $(el).text().toLowerCase())
      .get();

    for (const text of breadcrumb) {
      if (text.includes("polit")) return "politics";
      if (text.includes("sport")) return "sports";
      if (text.includes("entertain")) return "cinema";
    }

    return "general";
  } catch {
    return "general";
  }
}

module.exports = { detectFromMetaAndBreadcrumb };