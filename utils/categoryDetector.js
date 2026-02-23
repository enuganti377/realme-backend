function detectFromURL(link = "") {
  const url = link.toLowerCase();

  if (url.includes("/politics")) return "politics";
  if (url.includes("/sports")) return "sports";
  if (url.includes("/entertainment")) return "cinema";
  if (url.includes("/cinema")) return "cinema";
  if (url.includes("/movie")) return "cinema";

  return "general";
}

module.exports = { detectFromURL };