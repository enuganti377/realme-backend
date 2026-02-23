const axios = require("axios");
const xml2js = require("xml2js");
const News = require("../models/News");

const { detectFromURL } = require("../utils/categoryDetector");
const { detectFromMetaAndBreadcrumb } = require("../utils/metaCategoryDetector");

const DEFAULT_IMAGE =
  "https://via.placeholder.com/300x200?text=News";

const rssFeeds = [
  { url: "https://telugu.abplive.com/home/feed", defaultCategory: "general" },
  { url: "https://telugu.abplive.com/politics/feed", defaultCategory: "politics" },
  { url: "https://telugu.abplive.com/sports/feed", defaultCategory: "sports" },
  { url: "https://telugu.abplive.com/entertainment/feed", defaultCategory: "cinema" },
];


function createSnippet(html = "", maxWords = 25) {

 
  html = html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

 
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = text.split(" ");

  return words.length > maxWords
    ? words.slice(0, maxWords).join(" ") + "..."
    : text;
}


function extractImage(item) {

  if (item?.content?.$?.url) return item.content.$.url;
  if (item?.["media:content"]?.$?.url) return item["media:content"].$.url;
  if (item?.thumbnail?.$?.url) return item.thumbnail.$.url;
  if (item?.["media:thumbnail"]?.$?.url)
    return item["media:thumbnail"].$.url;
  if (item?.enclosure?.$?.url) return item.enclosure.$.url;

  if (item?.description) {
    const match = item.description.match(
      /<img[^>]+src=['"]([^'"]+)['"]/i
    );
    if (match) return match[1];
  }

  return DEFAULT_IMAGE;
}


async function fetchTeluguNews() {

  console.log(" Fetching ABP Telugu (Clean Version)");

  let totalInserted = 0;

  for (const feed of rssFeeds) {
    try {

     const response = await axios.get(feed.url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
  },
  timeout: 10000,
});

    
      const fixedXML = response.data.replace(
        /&(?!amp;|lt;|gt;|quot;|apos;)/g,
        "&amp;"
      );

      const parser = new xml2js.Parser({
        explicitArray: false,
        tagNameProcessors: [xml2js.processors.stripPrefix],
      });

      const data = await parser.parseStringPromise(fixedXML);

      let items = data?.rss?.channel?.item || [];
      if (!Array.isArray(items)) items = [items];

      for (const item of items.slice(0, 20)) {

        if (!item?.link) continue;

    
        let finalCategory = detectFromURL(item.link);

        if (finalCategory === "general") {
          finalCategory =
            await detectFromMetaAndBreadcrumb(item.link);
        }

        if (finalCategory === "general") {
          finalCategory = feed.defaultCategory;
        }

        await News.updateOne(
          {
            externalId: item.link,
            source: "ABP Telugu",
          },
          {
            $set: {
              title: item.title || "No Title",
              description: createSnippet(item.description || ""),
              imageUrl: extractImage(item),
              link: item.link,
              category: finalCategory,
              language: "te",
              source: "ABP Telugu",
              publishedAt: item.pubDate
                ? new Date(item.pubDate)
                : new Date(),
            },
          },
          { upsert: true }
        );

        totalInserted++;
      }

    } catch (err) {
      console.log(" ABP feed error:", err.message);
    }
  }

  console.log(" ABP Processed:", totalInserted);
  return totalInserted;
}

module.exports = { fetchTeluguNews };