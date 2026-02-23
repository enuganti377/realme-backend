
/** 
const axios = require("axios");
const xml2js = require("xml2js");
const https = require("https");
const News = require("../models/News");


const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});


const jobRssMap = {
  govt: "https://www.freejobalert.com/feed/",
};


const DEFAULT_JOB_IMAGE =
  "https://yourcdn.com/images/jobs-default.jpg"; 


function getJobImage(description = "") {
  const match = description.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : DEFAULT_JOB_IMAGE;
}


function cleanHTML(text = "") {
  return text.replace(/<[^>]*>?/gm, "").trim();
}


async function fetchJobs(category) {
  const rssurl = jobRssMap[category];
  if (!rssurl) {
    console.log(" Invalid job category:", category);
    return 0;
  }

  console.log(" Fetching JOBS:", category);

  let response;
  try {
    response = await axios.get(rssurl, {
      timeout: 15000,
      httpsAgent,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/rss+xml,application/xml,text/xml",
      },
    });
  } catch (err) {
    console.error(" Job RSS fetch failed:", err.message);
    return 0;
  }

  const parser = new xml2js.Parser({ explicitArray: false });
  const data = await parser.parseStringPromise(response.data);

  const items =
    data?.rss?.channel?.item ||
    data?.feed?.entry ||
    [];

  let count = 0;

  for (const item of items.slice(0, 5)) {
    try {
      const link =
        typeof item.link === "string"
          ? item.link
          : item.link?.href;

      if (!link) continue;

  
      const exists = await News.findOne({
        externalId: link,
        category: "jobs",
      });
      if (exists) continue;

      const descriptionHTML =
        item.description || item.summary || "";

      const description = cleanHTML(descriptionHTML);
      const imageUrl = getJobImage(descriptionHTML);

      await News.create({
        title: item.title,
        description,
        imageUrl, 
        link,
        category: "jobs",
        jobType: category, 
        language: "en",
        source: "FreeJobAlert",
        externalId: link,
        publishedAt: new Date(item.pubDate || Date.now()),
      });

      count++;
    } catch (err) {
      console.error(" Job item error:", err.message);
    }
  }

  console.log(` Jobs saved (${category}): ${count}`);
  return count;
}


module.exports = { fetchJobs };

*/
