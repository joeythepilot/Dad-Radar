const path = require("path");
const express = require("express");

require("dotenv").config();

const app = express();
const port = Number(process.env.PORT) || 4173;

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "Dad Radar"
  });
});

app.use(
  express.static(
    path.join(__dirname, ".."),
    { extensions: ["html"] }
  )
);

app.listen(port, "127.0.0.1", () => {
  console.log(
    `Dad Radar service running at http://127.0.0.1:${port}`
  );
});
