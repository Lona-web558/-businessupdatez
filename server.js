const express = require("express");
const path = require("path");
const apiRoutes = require("./api");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use("/api", apiRoutes);

// Fallback to homepage for any non-API route (simple SPA-style routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname,  "index.html"));
});

app.listen(PORT, () => {
  console.log(`Business News Hub running on port ${PORT}`);
});
