const axios = require("axios");
const xml2js = require("xml2js");
const cheerio = require("cheerio");
const News = require("../models/News");

const DEFAULT_IMAGE =
  "https://via.placeholder.com/300x200?text=News";



function detectFromURL(link = "") {
  const url = link.toLowerCase();

  if (url.includes("/politics")) return "politics";
  if (url.includes("/sport")) return "sports";
  if (url.includes("/entertainment")) return "cinema";

  return "general";
}

async function detectFromMeta(link) {
  try {
    const { data } = await axios.get(link, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);
    const section =
      $('meta[property="article:section"]').attr("content");

    if (!section) return "general";

    const lower = section.toLowerCase();

    if (lower.includes("polit")) return "politics";
    if (lower.includes("sport")) return "sports";
    if (lower.includes("entertain")) return "cinema";

    return "general";
  } catch {
    return "general";
  }
}



function createSnippet(text = "", maxWords = 30) {
  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  const words = text.split(" ");
  return words.length > maxWords
    ? words.slice(0, maxWords).join(" ") + "..."
    : text;
}



function isBadImage(url) {
  if (!url) return true;
  const bad = ["logo", "icon", "sprite"];
  return bad.some(w => url.toLowerCase().includes(w));
}

function getBBCImageFromRSS(item) {
  if (item["media:thumbnail"]?.$?.url)
    return item["media:thumbnail"].$.url;

  if (item["media:content"]?.$?.url)
    return item["media:content"].$.url;

  return null;
}

async function extractBBCArticleImage(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);
    const ogImage =
      $('meta[property="og:image"]').attr("content");

    if (ogImage && !isBadImage(ogImage))
      return ogImage;

    return null;
  } catch {
    return null;
  }
}



const feeds = [
  {
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    defaultCategory: "general",
  },
  {
    url: "https://feeds.bbci.co.uk/news/politics/rss.xml",
    defaultCategory: "politics",
  },
  {
    url: "https://feeds.bbci.co.uk/sport/rss.xml",
    defaultCategory: "sports",
  },
  {
    url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    defaultCategory: "cinema",
  },
];



async function fetchEnglishNews() {

  console.log(" Fetching BBC (Image + Category Safe Mode)");

  let totalInserted = 0;

  try {
    for (const feed of feeds) {

      const response = await axios.get(feed.url);

      const parser = new xml2js.Parser({
        explicitArray: false,
        tagNameProcessors: [xml2js.processors.stripPrefix],
      });

      const data = await parser.parseStringPromise(response.data);

      let items = data?.rss?.channel?.item || [];
      if (!Array.isArray(items)) items = [items];

      for (const item of items.slice(0, 15)) {

        if (!item?.link) continue;

        const snippet = createSnippet(item.description || "");

        
        let finalCategory = detectFromURL(item.link);

        if (finalCategory === "general") {
          finalCategory = await detectFromMeta(item.link);
        }

        if (finalCategory === "general") {
          finalCategory = feed.defaultCategory;
        }

       
        let imageUrl = getBBCImageFromRSS(item);

        if (!imageUrl) {
          imageUrl = await extractBBCArticleImage(item.link);
        }

        if (!imageUrl) {
          imageUrl = DEFAULT_IMAGE;
        }

        const result = await News.updateOne(
          {
            externalId: item.link,
            source: "BBC",
          },
          {
            $set: {
              title: item.title || "No Title",
              description: snippet,
              imageUrl,
              link: item.link,
              category: finalCategory,
              language: "en",
              source: "BBC",
              publishedAt: item.pubDate
                ? new Date(item.pubDate)
                : new Date(),
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0)
          totalInserted++;
      }
    }

    console.log(" BBC Inserted:", totalInserted);
    return totalInserted;

  } catch (error) {
    console.error(" BBC RSS ERROR:", error.message);
    return 0;
  }
}

module.exports = { fetchEnglishNews };