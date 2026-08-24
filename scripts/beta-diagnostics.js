"use strict";

const http = require("http");

const port = Number(process.env.PORT) || 4173;

http.get({
  hostname: "127.0.0.1",
  port,
  path: "/api/diagnostics/recent?limit=40",
  timeout: 3000
}, (response) => {
  let body = "";
  response.setEncoding("utf8");
  response.on("data", (chunk) => { body += chunk; });
  response.on("end", () => {
    try {
      const payload = JSON.parse(body);
      console.log("DAD RADAR RECENT DIAGNOSTICS");
      if (!payload.entries?.length) {
        console.log("No provider or weather events have been recorded since the server started.");
        return;
      }
      for (const entry of payload.entries) {
        const details = Object.entries(entry)
          .filter(([key]) => !["at", "type"].includes(key))
          .map(([key, value]) => `${key}=${value}`)
          .join(" ");
        console.log(`${entry.at} ${entry.type}${details ? ` ${details}` : ""}`);
      }
    } catch (_error) {
      console.error("Dad Radar returned an unreadable diagnostics response.");
      process.exitCode = 1;
    }
  });
}).on("error", () => {
  console.error("Dad Radar is not responding on this PC.");
  process.exitCode = 1;
});
