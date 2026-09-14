"use strict";

const http = require("http");

const port = Number(process.env.PORT) || 4173;

const request = http.request({
  hostname: "127.0.0.1",
  port,
  path: "/api/diagnostics/shutters-test",
  method: "POST",
  headers: {"Content-Type": "application/json"}
}, response => {
  let body = "";
  response.setEncoding("utf8");
  response.on("data", chunk => { body += chunk; });
  response.on("end", () => {
    if (response.statusCode !== 200) {
      console.error(`Dad Radar shutter test failed (${response.statusCode}).`);
      if (body) console.error(body);
      process.exitCode = 1;
      return;
    }
    console.log("Map shutter test sent to the home display.");
    console.log("Watch the map panel: the shutters should close, pause briefly, then reopen.");
  });
});

request.on("error", error => {
  console.error("Could not reach the running Dad Radar service:", error.message);
  console.error("Make sure Dad Radar is running, then try again.");
  process.exitCode = 1;
});
request.end("{}");
