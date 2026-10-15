const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'layout.js'), 'utf8');

function load(pathname, width, height) {
  const created = [];
  const redirects = [];
  const listeners = {};
  const style = {setProperty() {}};
  const module = {style};
  const board = {clientWidth: width, clientHeight: 100, style};
  const dashboard = {
    style: {setProperty(name,value) { this[name]=value; }},
    appendChild() {},
    querySelector(selector) {
      return selector === '.flight-strip-module' ? module : selector === '.flight-board' ? board : null;
    }
  };
  const viewer = {clientWidth: width, clientHeight: height, insertBefore() {}};
  dashboard.parentElement=viewer;
  const document = {
    readyState: 'loading',
    documentElement: {classList: {toggle() {}}},
    body: {firstChild: null, insertBefore() {}, appendChild() {}},
    addEventListener(name, fn) { listeners[name] = fn; },
    querySelector(selector) { return selector === '.display-viewer' ? viewer : selector === '.flight-board' ? board : null; },
    querySelectorAll() { return []; },
    getElementById(id) { return id === 'dashboard' ? dashboard : null; },
    createElement(tag) {
      created.push(tag);
      return {className: '', style: {}, setAttribute() {}, appendChild(child) { child.parentElement=this; }, addEventListener() {}};
    }
  };
  const context = {
    document, window: {innerWidth: width, innerHeight: height, addEventListener() {}},
    location: {pathname, search: '', replace(url) { redirects.push(url); }},
    screen: {width, height},
    navigator: {},
    localStorage: {getItem() { return 'compact'; }},
    URLSearchParams, getComputedStyle() { return {paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0'}; }
  };
  vm.runInNewContext(source, context);
  listeners.DOMContentLoaded?.();
  return {created, redirects, dashboard};
}

for (const [name, width, height] of [['phone portrait', 390, 844], ['phone landscape', 844, 390], ['tablet', 1024, 768]]) {
  const result = load('/mobile', width, height);
  assert.deepEqual(result.redirects, [], `${name}: /mobile stays on the full view`);
  assert(!result.created.includes('select'), `${name}: no layout selector is mounted`);
  const expectedWidth = width < height ? width : Math.min(width, height * 16 / 9);
  const nativeWidth=width<height?390:1024;
  assert.equal(result.dashboard.style.width, `${nativeWidth}px`, `${name}: panel keeps its photographic proportions`);
  assert.equal(result.dashboard.parentElement.style.width, `${expectedWidth}px`, `${name}: full dashboard uses the available viewport`);
  assert.equal(result.dashboard.style['--family-panel-scale'],expectedWidth/nativeWidth,`${name}: one uniform scale applies to wood and modules`);
}
const legacy = load('/mobile/full', 390, 844);
assert.deepEqual(legacy.redirects, [], 'Old Full bookmarks stay usable');
assert(!legacy.created.includes('select'), 'Old Full bookmarks do not restore the selector');
console.log('Single full family layout route and control tests passed.');
