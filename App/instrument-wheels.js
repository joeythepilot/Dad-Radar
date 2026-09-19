/* Visual adapter only: the existing instrument values remain authoritative. */
(function (root) {
  "use strict";
  const ns = "http://www.w3.org/2000/svg";
  const specs = [
    {id:"airspeed-value", label:"speed-label", name:"Ground speed", unit:"knots", x:318, y:116, width:592, centers:[135,265,395]},
    {id:"heading-value", name:"Heading", unit:"degrees", x:318, y:502, width:592, centers:[135,265,395]},
    {id:"altitude-value", name:"Altitude", unit:"feet", x:114, y:886, width:996, centers:[163,319,473,628,784]}
  ];
  function svg(tag, attributes) {
    const node = document.createElementNS(ns, tag);
    Object.keys(attributes || {}).forEach(key => node.setAttribute(key, attributes[key]));
    return node;
  }
  function format(value, count) {
    const clean = String(value).trim().replace(/,/g, "");
    if (!/^-?\d+$/.test(clean) || clean.length > count) return "-".repeat(count);
    return clean.charAt(0) === "-" ? "-" + clean.slice(1).padStart(count - 1, "0") : clean.padStart(count, "0");
  }
  function mount(spec) {
    const source = document.getElementById(spec.id);
    if (!source) return;
    const host = source.parentElement;
    host.classList.add("instrument-wheel-readout");
    const face = svg("svg", {viewBox:`0 0 ${spec.width} 300`, class:"instrument-wheel-face", role:"img"});
    const art = svg("image", {x:-spec.x, y:-spec.y, width:1222, height:1287});
    art.setAttributeNS("http://www.w3.org/1999/xlink", "href", "./assets/hardware/instrument-wheel-inserts.png");
    face.appendChild(art);
    const defs = svg("defs");
    face.appendChild(defs);
    const wheels = spec.centers.map((x, index) => {
      const clipId = `wheel-${spec.id}-${index}`;
      const clip = svg("clipPath", {id:clipId});
      clip.appendChild(svg("rect", {x:x-53, y:65, width:106, height:178}));
      defs.appendChild(clip);
      const slot = svg("g", {"clip-path":`url(#${clipId})`});
      const drum = svg("g", {class:"instrument-wheel-digits"});
      slot.appendChild(drum); face.appendChild(slot);
      return {x, drum, timer:null, frame:null};
    });
    Array.from(host.children).forEach(node => node.setAttribute("aria-hidden", "true"));
    host.appendChild(face);
    let previous = null;
    function paint(wheel, character, offset) {
      const print=root.dadRadarPrintedInk.svg(document,character,{
        height:79,cellWidth:80,ink:"#e2cda7",material:"wheel",seed:`${spec.id}-${wheel.x}-${character}`
      });
      print.element.setAttribute("transform",`translate(${wheel.x-print.width/2} ${108+offset})`);
      wheel.drum.appendChild(print.element);
    }
    function update() {
      const next = format(source.textContent, wheels.length);
      const label = spec.label && document.getElementById(spec.label);
      face.setAttribute("aria-label", `${label ? label.textContent.trim() : spec.name}: ${source.textContent.trim()} ${spec.unit}`);
      face.setAttribute("data-reading", next);
      if (next === previous) return;
      const reduced = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
      wheels.forEach((wheel, i) => {
        if (previous && previous[i] === next[i]) return;
        clearTimeout(wheel.timer); root.cancelAnimationFrame(wheel.frame);
        wheel.drum.style.transition = "none";
        wheel.drum.style.transform = "translateY(0px)";
        while (wheel.drum.firstChild) wheel.drum.removeChild(wheel.drum.firstChild);
        if (previous && !reduced && !document.hidden && /\d/.test(previous[i]) && /\d/.test(next[i])) {
          paint(wheel, previous[i], 0); paint(wheel, next[i], 178);
          // Commit the old position before rolling directly to the newest reading.
          wheel.drum.getBoundingClientRect();
          wheel.frame = root.requestAnimationFrame(() => {
            wheel.drum.style.transition = "transform 360ms cubic-bezier(.2,.7,.25,1)";
            wheel.drum.style.transform = "translateY(-178px)";
          });
          wheel.timer = setTimeout(() => {
            wheel.drum.style.transition = "none";
            wheel.drum.style.transform = "translateY(0px)";
            while (wheel.drum.firstChild) wheel.drum.removeChild(wheel.drum.firstChild);
            paint(wheel, next[i], 0);
          }, 400);
        } else paint(wheel, next[i], 0);
      });
      previous = next;
    }
    const observer = new MutationObserver(update);
    observer.observe(source, {childList:true, characterData:true, subtree:true});
    const label = spec.label && document.getElementById(spec.label);
    if (label) observer.observe(label, {childList:true, characterData:true, subtree:true});
    update();
  }
  specs.forEach(mount);
})(window);
