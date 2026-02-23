const axios = require("axios");
const xml2js = require("xml2js");
const News = require("../models/News");

const rssMap = {
  general: "https://ntvtelugu.com/feed",
  politics: "https://ntvtelugu.com/category/politics/feed",
  sports: "https://ntvtelugu.com/category/sports/feed",
  cinema: "https://ntvtelugu.com/category/entertainment/feed",
};

const DEFAULT_IMAGE = "https://ntvtelugu.com/wp-content/uploads/default-news.jpg";

function cleanText(text = "") {
  return text.toString().normalize("NFC").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}


function detectCategory(title = "") {
  const text = cleanText(title);

  const categories = {
    sports: ["క్రికెట్", "ipl", "match", "football", "t20", "score", "stadium", "bcci", "cricket"],
    cinema: ["సినిమా", "movie", "review", "హీరో", "actress", "trailer", "box office", "film", "tollywood", "heroine", "teaser", "remuneration", "hero"],
    politics: ["మంత్రి", "ఎన్నిక", "cm", "mla", "mp", "assembly", "ప్రభుత్వం", "party", "bjp", "congress", "ysrcp", "tdp", "janasena", "modi", "revanth"]
  };

  for (const [name, keywords] of Object.entries(categories)) {
    if (keywords.some(word => text.includes(word))) {
      return name;
    }
  }

  
  return "general";
}

function extractImage(item) {
  let imageUrl = null;
  const combined = (item.description || "") + (item["content:encoded"] || "");
  const match = combined.match(/<img[^>]+(?:src|data-src)=['"]([^'"]+)['"]/i);
  if (match) imageUrl = match[1];
  return imageUrl || DEFAULT_IMAGE;
}

async function fetchNTV(feedKey) {
  const rssurl = rssMap[feedKey];
  if (!rssurl) return 0;

  console.log(`--- Syncing NTV [${feedKey}] ---`);

  try {
    const response = await axios.get(rssurl, { timeout: 10000 });
    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(response.data);

    let items = data?.rss?.channel?.item || [];
    if (!Array.isArray(items)) items = [items];

    let count = 0;
    for (const item of items.slice(0, 15)) {
      if (!item?.link) continue;

      
      const finalCategory = detectCategory(item.title);

      await News.updateOne(
        { externalId: item.link, source: "NTV Telugu" },
        {
          $set: {
            title: item.title,
            description: cleanText(item.description).split(" ").slice(0, 25).join(" ") + "...",
            imageUrl: extractImage(item),
            link: item.link,
            category: finalCategory,
            language: "te",
            source: "NTV Telugu",
            publishedAt: new Date(item.pubDate),
          },
        },
        { upsert: true }
      );
      count++;
    }
    return count;
  } catch (error) {
    console.error(`Sync Error:`, error.message);
    return 0;
  }
}

module.exports = { fetchNTV };