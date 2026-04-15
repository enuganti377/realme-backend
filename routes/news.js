const express = require("express");
const router = express.Router();

const News = require("../models/News");

router.post("/manual", async (req, res) => {
  try {
    const body = req.body || {};

    let { title, description, imageUrl, location, mandal, category } = body;

   
    if (!title || !description || !imageUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }


    location = location ? location.trim() : "general";
    mandal = mandal ? mandal.trim() : null;

    const news = await News.create({
      title,
      description,
      imageUrl,
      location,
      mandal,
      category: category || "general",
      isManual: true,
      publishedAt: new Date()
    });

    res.json(news);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/feed", async (req, res) => {
  try {
    let { location, mandal } = req.query;

    location = location ? location.trim() : null;
    mandal = mandal ? mandal.trim() : null;

    // 🔹 LOCAL NEWS (manual)
    let localQuery = {
      isManual: true,
      videoUrl: { $eq: null }
    };

    // If location selected → filter
    if (location) {
      localQuery.location = new RegExp(`^${location}$`, "i");
    }

    // Mandal filter (only if provided)
    if (mandal) {
      localQuery.$or = [
        { mandal: mandal },
        { mandal: null }
      ];
    }

    const localNews = await News.find(localQuery)
      .sort({ publishedAt: -1 })
      .limit(50);

    // 🔹 RSS NEWS
    const rssNews = await News.find({
      location: "general",
      isManual: false
    })
      .sort({ publishedAt: -1 })
      .limit(50);

    // 🔹 MIXING (always 3 + 5)
    let mixed = [];
    let i = 0, j = 0;

    const localCount = 3;
    const rssCount = 5;

    while ((i < localNews.length || j < rssNews.length) && mixed.length < 50) {

      for (let k = 0; k < localCount && i < localNews.length; k++) {
        mixed.push(localNews[i++]);
      }

      for (let k = 0; k < rssCount && j < rssNews.length; k++) {
        mixed.push(rssNews[j++]);
      }
    }

    res.json(mixed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({ error: "News not found" });
    }

    res.json(news);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
