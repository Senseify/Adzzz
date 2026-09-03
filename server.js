const app = require("./api/index.js");
const path = require("path");
const express = require("express");

const PORT = process.env.PORT || 8080;

// Serve Admin Dashboard HTML locally
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Serve main website and static assets locally
app.use(express.static(__dirname));

// Fallback to index.html for root locally
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✨ Birthday Website & Secret Admin Backend running on http://localhost:${PORT}`);
    console.log(`🔐 Secret Admin Dashboard available at http://localhost:${PORT}/admin`);
  });
}

module.exports = app;
