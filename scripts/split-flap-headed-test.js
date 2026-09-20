"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {observeBrowserErrors} = require("./browser-error-proof");
const {chromium, webkit} = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts", "map-hardware");
fs.mkdirSync(output, {recursive: true});

const stamp = new Date().toISOString();
const payload = {
  ok: true,
  revision: 1,
  publishedAt: stamp,
  calendarOk: true,
  liveOk: true,
  calendarAt: stamp,
  liveAt: stamp,
  resolved: {
    mode: "HOME",
    state: {
      status: "HOME",
      message: "DADDY IS HOME",
      locationAirport: "AVL",
      flight: null
    },
    event: null
  }
};
const schedule = {ok: true, events: []};
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json"
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/weather")) {
      response.writeHead(204);
      response.end();
      return;
    }

    response.setHeader("Content-Type", "application/json");

    if (url.pathname === "/api/calendar/upcoming") {
      response.end(JSON.stringify(schedule));
      return;
    }

    response.end(
      JSON.stringify(
        url.pathname.includes("/surface")
          ? {pending: true, retryAfterMs: 3600000}
          : payload
      )
    );
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = path.resolve(root, "." + requested);

  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    response.writeHead(404);
    response.end();
    return;
  }

  response.setHeader(
    "Content-Type",
    types[path.extname(file)] || "application/octet-stream"
  );
  fs.createReadStream(file).pipe(response);
});

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    for (const [engine, type] of [["chromium", chromium], ["webkit", webkit]]) {
      if(process.env.DADRADAR_BROWSER_ENGINE && process.env.DADRADAR_BROWSER_ENGINE!==engine)continue;
      const browser = await type.launch({headless: true,
        ...(engine==="chromium" && process.env.DADRADAR_BROWSER_EXECUTABLE
          ? {executablePath:process.env.DADRADAR_BROWSER_EXECUTABLE,args:["--no-sandbox","--disable-dev-shm-usage"]} : {})});

      try {
        const page = await browser.newPage({
          viewport: {width: 1920, height: 1080},
          serviceWorkers: "block"
        });
        const assertBrowserSettled = observeBrowserErrors(page);
        await page.route("**/*", route => {
          const requestUrl = route.request().url();
          return requestUrl.startsWith(origin) || requestUrl.startsWith("blob:")
            ? route.continue()
            : route.abort();
        });

        await page.goto(origin + "/", {waitUntil: "load"});
        await page.waitForSelector("#dashboard:not([hidden])", {timeout: 12000});
        await page.waitForSelector(".flap-character", {timeout: 5000});

        const evidence = await page.evaluate(() => {
          const flap = document.querySelector(".flap-character");
          const board = document.querySelector(".flight-board");
          const style = getComputedStyle(flap);
          const seam = getComputedStyle(flap, "::before");
          const sheen = getComputedStyle(flap, "::after");
          const boardLight = getComputedStyle(board, "::after");

          return {
            backgroundImage: style.backgroundImage,
            color: style.color,
            textShadow: style.textShadow,
            seamHeight: seam.height,
            seamBackground: seam.backgroundColor,
            sheenBackgroundImage: sheen.backgroundImage,
            boardBackgroundImage: boardLight.backgroundImage,
            boardBorderColor: boardLight.borderColor,
            boardBoxShadow: boardLight.boxShadow,
            individualLights:[...document.querySelectorAll('.flap-character')].map(n=>getComputedStyle(n,'::after').backgroundImage)
          };
        });

        assert.match(
          evidence.backgroundImage,
          /split-flap-tile\.png/,
          `${engine}: original photoreal split-flap asset should be active`
        );
        const imageSize=await page.evaluate(async()=>{
          const image=new Image();image.src='/assets/split-flap/split-flap-tile.png';await image.decode();
          return [image.naturalWidth,image.naturalHeight];
        });
        assert.deepEqual(imageSize,[637,640],`${engine}: original PNG decodes at its full resolution`);
        // Exercise the real flip; moving halves must not revert to the drawn substitute.
        await page.waitForFunction(()=>!document.querySelector('.flap-character')._animationRunning);
        assert.equal(await page.locator('.flap-character[data-value=" "]').first().evaluate(n=>getComputedStyle(n,'::after').opacity),'0',
          `${engine}: a settled blank flap has its light off`);
        await page.evaluate(()=>flipFlapOnce(document.querySelector('.flap-character'),'A'));
        assert.equal(await page.locator('.flap-character').first().evaluate(n=>getComputedStyle(n,'::after').opacity),'1',
          `${engine}: a flap displaying a character has its light on`);
        assert.equal(await page.locator('.flap-character').first().locator('.flap-glyph svg [data-printed-ink="A"]').count(),2,
          `${engine}: both stationary halves use outlined ink rather than browser font text`);
        await page.evaluate(()=>{
          const cell=document.querySelector('.flap-character');
          window.splitFlapArtworkProof=flipFlapOnce(cell,'Z');
        });
        const moving=await page.locator('.flap-flip-top,.flap-flip-bottom').evaluateAll(nodes=>nodes.map(n=>{
          const s=getComputedStyle(n);return {image:s.backgroundImage,size:s.backgroundSize,animation:s.animationName};
        }));
        assert.equal(moving.length,2,`${engine}: both moving halves exist during a flip`);
        assert(moving.every(s=>/split-flap-tile\.png/.test(s.image)&&s.size==='100% 200%'&&s.animation!=='none'),
          `${engine}: animated halves use matching halves of the original photograph`);
        const printMotion=await page.locator('.flap-character').first().evaluate(cell=>{
          const texture=selector=>[...cell.querySelectorAll(selector+' mask ellipse')].map(n=>n.outerHTML).join('');
          return {
            outgoing:cell.querySelector('.flap-flip-top [data-printed-ink]')?.getAttribute('data-printed-ink'),
            incoming:cell.querySelector('.flap-flip-bottom [data-printed-ink]')?.getAttribute('data-printed-ink'),
            topMatches:texture('.flap-static-top')===texture('.flap-flip-top'),
            bottomMatches:texture('.flap-static-bottom')===texture('.flap-flip-bottom')
          };
        });
        assert.deepEqual(printMotion,{outgoing:'A',incoming:'Z',topMatches:true,bottomMatches:true},
          `${engine}: fixed ink wear moves with both matching halves`);
        await page.evaluate(()=>window.splitFlapArtworkProof);
        assert.equal(await page.locator('.flap-character').first().getAttribute('data-value'),'Z',`${engine}: flip settles on the new character`);
        const settled=await page.locator('.flap-character').first().evaluate(cell=>{
          const prints=[...cell.querySelectorAll('[data-printed-ink]')];
          const ids=[...document.querySelectorAll('mask[id],linearGradient[id]')].map(n=>n.id);
          const texture=n=>[...n.querySelectorAll('mask ellipse')].map(e=>e.outerHTML).join('');
          return {characters:prints.map(n=>n.getAttribute('data-printed-ink')),
            matching:prints.length===2&&texture(prints[0])===texture(prints[1]),
            unique:ids.length===new Set(ids).size,
            browserText:[...cell.querySelectorAll('.flap-glyph')].some(n=>n.textContent.trim())};
        });
        assert.deepEqual(settled,{characters:['Z','Z'],matching:true,unique:true,browserText:false},
          `${engine}: settled halves join one printed character without duplicate SVG IDs or font text`);
        await page.evaluate(()=>flipFlapOnce(document.querySelector('.flap-character'),' '));
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('.flap-character'),'::after').opacity==='0',null,{timeout:1500});
        assert.equal(await page.locator('.flap-character').first().getAttribute('data-value'),' ',
          `${engine}: returning to blank switches its lamp off`);
        await page.evaluate(()=>flipFlapOnce(document.querySelector('.flap-character'),'Z'));
        assert.equal(
          evidence.seamHeight,
          "1px",
          `${engine}: split joint should be a one-pixel mechanical break`
        );
        assert.match(
          evidence.textShadow,
          /rgba?\(0, 0, 0, 0\.46\)/,
          `${engine}: lettering should use the restrained contact shadow`
        );
        assert.doesNotMatch(
          evidence.textShadow,
          /0\.18/,
          `${engine}: the old warm glyph glow should not be present`
        );
        assert.match(
          evidence.sheenBackgroundImage,
          /radial-gradient/,
          `${engine}: each flap has its own localized incandescent light`
        );
        assert.equal(
          evidence.boardBackgroundImage,
          'none',
          `${engine}: no panel-wide light wash`
        );
        assert(evidence.individualLights.length>10&&evidence.individualLights.every(light=>/radial-gradient/.test(light)),
          `${engine}: every flap, including blank flaps, has its own light source`);
        assert.ok(
          evidence.boardBorderColor === "rgba(205, 177, 121, 0.09)" ||
            evidence.boardBorderColor === "rgba(205, 177, 121, 0.09)",
          `${engine}: board edge light should remain at the restrained calibrated value`
        );
        await assertBrowserSettled(engine);

        await page.locator(".flight-strip-module").screenshot({
          path: path.join(output, `split-flap-matte-${engine}.png`)
        });
        fs.writeFileSync(
          path.join(output, `split-flap-matte-${engine}.json`),
          JSON.stringify(evidence, null, 2)
        );

        console.log(`${engine}: split-flap matte material passed`);
        await page.close();
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
