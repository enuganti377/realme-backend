const express = require("express");
const router = express.Router();
const News = require("../models/News");


router.get("/", async (req, res) => {
  try {
    const { category, page = 1, limit = 5 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let filter = {};


    if (category && category !== "general") {
      filter.category = {
        $regex: `^${category}$`,
        $options: "i", 
      };
    }

    const news = await News.find(filter)
      .sort({ publishedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json(news);

  } catch (err) {
    console.log("Pagination error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/news/:id", async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    res.json(news);

  } catch (err) {
    console.log("Single news error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
