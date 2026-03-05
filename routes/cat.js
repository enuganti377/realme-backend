const express = require("express");
const router = express.Router();
const News = require("../models/News");

router.get("/", async (req, res) => {
  try {

    const category = req.query.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    // If category exists → filter
    const filter = category ? { category } : {};

    const news = await News.find(filter)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(news);

  } catch (err) {
    console.log("Pagination error:", err);
    res.status(500).json({ message: "server error" });
  }
});

module.exports = router;

