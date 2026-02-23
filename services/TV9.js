const axios = require("axios");
const xml2js = require("xml2js");
const News = require("../models/News");

const {  detectFromURL } = require("../utils/categoryDetector");
const {detectFromMetaAndBreadcrumb  } = require("../utils/metaCategoryDetector");

const DEFAULT_IMAGE =
  "https://via.placeholder.com/300x200?text=News";

const rssFeeds = [
  
  {
    url: "https://tv9telugu.com/politics/feed",
    defaultCategory: "politics",
  },
  {
    url: "https://tv9telugu.com/sports/feed",
    defaultCategory: "sports",
  },
  {
    url: "https://tv9telugu.com/entertainment/feed",
    defaultCategory: "cinema",
  },
  {
    url: "https://tv9telugu.com/feed",
    defaultCategory: "general",
  },
];

function createSnippet(description = "", maxWords = 25) {
  const text = description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = text.split(" ");
  return words.length > maxWords
    ? words.slice(0, maxWords).join(" ") + "..."
    : text;
}

function extractImage(item) {
  if (item["media:content"]?.$?.url)
    return item["media:content"].$.url;

  if (item.enclosure?.$?.url)
    return item.enclosure.$.url;

  if (item["content:encoded"]) {
    const match = item["content:encoded"].match(
      /<img[^>]+src="([^">]+)"/
    );
    if (match) return match[1];
  }

  if (item.description) {
    const match = item.description.match(
      /<img[^>]+src="([^">]+)"/
    );
    if (match) return match[1];
  }

  return DEFAULT_IMAGE;
}

async function fetchTV9() {
  console.log(" Fetching TV9 (100% Detection Mode)");

  let totalInserted = 0;

  try {
    for (const feed of rssFeeds) {
      const response = await axios.get(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 10000,
      });

      const parser = new xml2js.Parser({
        explicitArray: false,
      });

      const data = await parser.parseStringPromise(response.data);
      let items = data?.rss?.channel?.item || [];

      if (!Array.isArray(items)) items = [items];

      for (const item of items.slice(0, 20)) {
        if (!item?.link) continue;

        const snippet = createSnippet(item.description || "");


        let finalCategory = detectFromURL(item.link);

       
        if (finalCategory === "general") {
          finalCategory =
            await detectFromMetaAndBreadcrumb(item.link);
        }

        
        if (finalCategory === "general") {
          finalCategory = feed.defaultCategory;
        }

        const result = await News.updateOne(
          {
            externalId: item.link,
            source: "TV9 Telugu",
          },
          {
            $set: {
              title: item.title || "No Title",
              description: snippet,
              imageUrl: extractImage(item),
              link: item.link,
              category: finalCategory,
              language: "te",
              source: "TV9 Telugu",
              publishedAt: item.pubDate
                ? new Date(item.pubDate)
                : new Date(),
            },
            $setOnInsert: {
              externalId: item.link,
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          totalInserted++;
        }
      }
    }

    console.log(" TV9 Inserted:", totalInserted);
    return totalInserted;

  } catch (error) {
    console.error(" TV9 RSS ERROR:", error.message);
    return 0;
  }
}

module.exports = { fetchTV9 };