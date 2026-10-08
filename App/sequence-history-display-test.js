const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'sequence-history-display.js'), 'utf8');
function renderAt(pathname) {
  const children = [];
  const makeNode = () => ({
    isConnected: true, dataset: {}, classList: {add() {}, remove() {}},
    setAttribute() {}, appendChild(node) {this.children ??= []; this.children.push(node);},
    append(...nodes) {this.children ??= []; this.children.push(...nodes);}
  });
  const shell = {appendChild(node) {children.push(node);}};
  const document = {
    head: {appendChild() {}}, querySelector() {return null;},
    createElement: makeNode, createElementNS: makeNode,
    getElementById(id) {return id === 'route-map-shell' ? shell : null;}
  };
  const window = {location: {pathname}, addEventListener() {}};
  vm.runInNewContext(source, {document, window});
  return children;
}
for (const route of ['/mobile', '/mobile/full', '/']) {
  const badges = renderAt(route);
  assert.equal(badges.length, 1, `${route} renders the sequence housing`);
  assert.equal(badges[0].className, 'sequence-mileage-badge map-hardware-module');
}
console.log('Sequence housing appears on the full family route and home display.');
