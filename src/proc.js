/* ---------- parts the manual installs that the ROS visual CAD leaves out, drawn to their catalogue sizes ----------
   Bearings (32009, 30206, 30204, 30203, B1616, AXK3552, NTA1625 stacks), XL and L timing pulleys, XL/L belts, the J5 lead-screw
   carrier. Each is placed from the CAD bodies around it (bores, shafts, joint axes) and checked against the manual's belt sizes. */
var XL = 5.08, LP = 9.525;                       /* belt pitches, mm (XL = 1/5 in, L = 3/8 in) */
function pitchD(teeth, p){ return teeth * p / Math.PI; }
function beltLen(code){ var m = /^(\d+)(XL|L)/.exec(code); return +m[1] / 10 * 25.4; }   /* 180XL = 18.0 in pitch length */
function solidOf(geo, o){ o = o || {}; var m = new T.Mesh(geo, mat(WHITE)); m.castShadow = !o.noShadow; m.receiveShadow = true;
  m.add(new T.LineSegments(new T.EdgesGeometry(geo, o.crease || 30), new T.LineBasicMaterial({color: INK, transparent: true, opacity: o.ink || 0.6}))); return m; }
function ringGeo(rIn, rOut, h, y0, seg){ return new T.LatheGeometry([[rIn, y0], [rOut, y0], [rOut, y0 + h], [rIn, y0 + h], [rIn, y0]].map(function(p){ return new T.Vector2(p[0] * MM, p[1] * MM); }), seg || 48); }
function lathe(prof, seg){ return new T.LatheGeometry(prof.map(function(p){ return new T.Vector2(p[0] * MM, p[1] * MM); }), seg || 48); }
/* place a part built along +Y (mm, origin at its start face) on an axis: from point c (world), direction a, offset s mm along a */
function onAxis(obj, c, a, s){ obj.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), a.clone().normalize()); obj.position.copy(c).addScaledVector(a.clone().normalize(), s * MM); return obj; }

function taperBearing(d, D, B){ /* cup + cone + rollers, built along +Y from its wide face; orient it with onAxis */
  var g = new T.Group(), t = (D - d) / 2, cupIn0 = D / 2 - t * 0.22, cupIn1 = D / 2 - t * 0.36, coneOut0 = d / 2 + t * 0.42, coneOut1 = d / 2 + t * 0.28;
  var cup = lathe([[cupIn0, 0], [D / 2, 0], [D / 2, B * 0.94], [cupIn1, B * 0.94], [cupIn0, 0]]);
  var cone = lathe([[d / 2, 0], [coneOut0 + 1.2, 0], [coneOut0 + 1.2, B * 0.12], [coneOut0, B * 0.14], [coneOut1, B * 0.9], [coneOut1 + 0.8, B * 0.9], [coneOut1 + 0.8, B], [d / 2, B], [d / 2, 0]]);
  g.add(solidOf(cup), solidOf(cone));
  var n = Math.max(12, Math.round((D + d) * 0.32)), rr = (cupIn0 - coneOut0) * 0.5, rm = (cupIn0 + coneOut0) / 2, roller = new T.CylinderGeometry(rr * 0.82 * MM, rr * MM, B * 0.62 * MM, 10);
  var rollers = new T.InstancedMesh(roller, mat(WHITE), n), o = new T.Object3D(), tilt = -(cupIn0 - cupIn1) / (B * 0.9);   /* one draw call for the whole roller set */
  for (var i = 0; i < n; i++){ var a = i / n * Math.PI * 2; o.position.set(Math.cos(a) * rm * MM, 0, Math.sin(a) * rm * MM); o.rotation.set(0, -a, 0); o.rotateZ(tilt); o.updateMatrix(); rollers.setMatrixAt(i, o.matrix); }
  rollers.instanceMatrix.needsUpdate = true; rollers.position.y = B * 0.5 * MM; g.add(rollers);
  return g; }
function needleBearing(d, D, B){ /* drawn cup: thin shell with a lip at each end */ return group(solidOf(lathe([[D / 2 - 0.9, 0], [D / 2, 0], [D / 2, B], [D / 2 - 0.9, B], [D / 2 - 0.9, B - 0.6], [d / 2 + 0.8, B - 0.6], [d / 2 + 0.8, B - 1.4], [D / 2 - 0.9, B - 1.4], [D / 2 - 0.9, 1.4], [d / 2 + 0.8, 1.4], [d / 2 + 0.8, 0.6], [D / 2 - 0.9, 0.6], [D / 2 - 0.9, 0]]))); }
function thrustStack(d, D, h){ /* washer, needle cage, washer */ var w = h * 0.25; return group(solidOf(ringGeo(d / 2, D / 2, w, 0)), solidOf(ringGeo(d / 2 + 1.5, D / 2 - 1.5, h - 2 * w, w)), solidOf(ringGeo(d / 2, D / 2, w, h - w))); }
function toothed(teeth, pitch, width, depth){ /* timing pulley body: real tooth count on the pitch circle */
  var rp = pitchD(teeth, pitch) / 2, ro = rp - (pitch === XL ? 0.254 : 0.381), rr = ro - depth, s = new T.Shape(), n = teeth, k;
  for (k = 0; k < n; k++){ var a0 = k / n * Math.PI * 2, step = Math.PI * 2 / n, pts = [[rr, 0.08], [ro, 0.3], [ro, 0.7], [rr, 0.92]];
    pts.forEach(function(p, j){ var a = a0 + p[1] * step, x = Math.cos(a) * p[0] * MM, y = Math.sin(a) * p[0] * MM; if (k === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y); }); }
  var geo = new T.ExtrudeGeometry(s, {depth: width * MM, bevelEnabled: false, curveSegments: 4}); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 0); return {geo: geo, ro: ro, rp: rp}; }
function pulley(teeth, pitch, width, bore, flange, hubD, hubL){ var t = toothed(teeth, pitch, width, pitch === XL ? 1.3 : 1.9), g = new T.Group();
  var body = solidOf(t.geo, {crease: 40, ink: 0.42}); g.add(body);   /* after rotateX(-PI/2) the extrusion already spans y 0..width, between the flanges */
  if (flange){ g.add(solidOf(ringGeo(bore / 2, t.ro + 1.6, 1.0, -1.0)), solidOf(ringGeo(bore / 2, t.ro + 1.6, 1.0, width))); }
  else g.add(solidOf(ringGeo(bore / 2, t.ro - 0.2, 0.01, width)));
  if (hubL) g.add(solidOf(ringGeo(bore / 2, hubD / 2, hubL, flange ? width + 1 : width)));
  return {g: g, rp: t.rp}; }
function beltLoop(c1, r1, c2, r2, a, width, th){ /* open belt around two coplanar pulleys (world centres, pitch radii mm), plane normal a */
  var u = c2.clone().sub(c1), dmm = u.length() / MM; u.normalize(); a = a.clone().normalize(); var v = new T.Vector3().crossVectors(a, u);
  var beta = Math.acos((r1 - r2) / dmm);
  function loop(o1, o2){ var pts = [], i, N = 40; for (i = 0; i <= N; i++){ var t = beta + (2 * Math.PI - 2 * beta) * i / N; pts.push(new T.Vector2(Math.cos(t) * (r1 + o1), Math.sin(t) * (r1 + o1))); }
    for (i = 0; i <= N; i++){ var t2 = -beta + 2 * beta * i / N; pts.push(new T.Vector2(dmm + Math.cos(t2) * (r2 + o2), Math.sin(t2) * (r2 + o2))); } return pts.map(function(p){ return p.multiplyScalar(MM); }); }
  var shape = new T.Shape(loop(th * 0.62, th * 0.62)), hole = new T.Path(loop(-th * 0.38, -th * 0.38).reverse()); shape.holes.push(hole);
  var geo = new T.ExtrudeGeometry(shape, {depth: width * MM, bevelEnabled: false, curveSegments: 2, steps: 1});
  var m = solidOf(geo, {crease: 50, ink: 0.55}); var basis = new T.Matrix4().makeBasis(u, v, a); m.quaternion.setFromRotationMatrix(basis); m.position.copy(c1).addScaledVector(a, -width / 2 * MM);
  var straight = Math.sqrt(dmm * dmm - (r1 - r2) * (r1 - r2)); m.userData.pitchLen = 2 * straight + r1 * (2 * Math.PI - 2 * beta) + r2 * 2 * beta; return m; }
function leadScrew(len, dia, lead){ var g = new T.Group(); g.add(solidOf(new T.CylinderGeometry(dia / 2 * MM, dia / 2 * MM, len * MM, 16), {crease: 60}));
  g.children[0].position.y = len / 2 * MM; var pts = [], turns = len / lead * 2, k;            /* two-start thread drawn as an ink helix */
  for (k = 0; k <= turns * 24; k++){ var a = k / 24 * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * dia / 2 * 1.02 * MM, k / 24 * lead / 2 * MM, Math.sin(a) * dia / 2 * 1.02 * MM)); }
  g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({color: INK, transparent: true, opacity: 0.35}))); return g; }

/* world helpers over the CAD at the assembly pose */
var BWB = {}; function bodyBox(code){ if (!BWB[code]) BWB[code] = boxOf(group(bodyMesh(code))); return BWB[code]; }
function bodyC(code){ return bodyBox(code).getCenter(new T.Vector3()); }
function span(code, c, a){ var bb = bodyBox(code), lo = 1e9, hi = -1e9; [0, 1].forEach(function(i){ [0, 1].forEach(function(j){ [0, 1].forEach(function(k){
  var p = new T.Vector3(i ? bb.max.x : bb.min.x, j ? bb.max.y : bb.min.y, k ? bb.max.z : bb.min.z); var s = p.sub(c).dot(a) / MM; lo = Math.min(lo, s); hi = Math.max(hi, s); }); }); }); return [lo, hi]; }
function closest(c, a, p){ var s = p.clone().sub(c).dot(a); return c.clone().addScaledVector(a, s); }   /* p projected onto the axis through c */

/* ---------- hardware: drawn for the parts callout (sizes from the BOM's fastener table), not placed in the model ---------- */
var HW_NAMES = {shcs: 'socket head', fh: 'flat head', pan: 'pan head', set: 'set screw', nut: 'nut', washer: 'washer', tf: 'thread-forming'};
function hwModel(kind, d, L){ var g = new T.Group(), sh = function(len, y0){ var m = solidOf(new T.CylinderGeometry(d / 2 * 0.86 * MM, d / 2 * 0.86 * MM, len * MM, 14), {crease: 50}); m.position.y = (y0 + len / 2) * MM; return m; };
  if (kind === 'nut'){ var n = solidOf(new T.CylinderGeometry(d * 0.92 * MM, d * 0.92 * MM, d * 0.8 * MM, 6)); n.add(solidOf(new T.CylinderGeometry(d / 2 * MM, d / 2 * MM, d * 0.82 * MM, 14))); g.add(n); return g; }
  if (kind === 'washer'){ g.add(solidOf(ringGeo(d / 2 + 0.2, d * 1.05, d * 0.2, 0))); return g; }
  if (kind === 'set'){ g.add(sh(L, 0)); var hx = solidOf(new T.CylinderGeometry(d * 0.3 * MM, d * 0.3 * MM, 0.3 * MM, 6)); hx.position.y = L * MM; g.add(hx); return g; }
  var head = kind === 'shcs' ? new T.CylinderGeometry(d * 0.75 * MM, d * 0.75 * MM, d * MM, 18) :
             kind === 'fh' ? new T.CylinderGeometry(d * MM, d / 2 * MM, d * 0.55 * MM, 18) :
             new T.CylinderGeometry(d * 0.85 * MM, d * 0.95 * MM, d * 0.65 * MM, 18);
  var hm = solidOf(head, {crease: 40}); var hh = kind === 'shcs' ? d : kind === 'fh' ? d * 0.55 : d * 0.65; hm.position.y = (L + hh / 2) * MM; g.add(hm, sh(L, 0));
  if (kind === 'shcs'){ var sock = solidOf(new T.CylinderGeometry(d * 0.38 * MM, d * 0.38 * MM, 0.3 * MM, 6)); sock.position.y = (L + d) * MM; g.add(sock); }   /* hex socket */
  return g; }
function hwKey(spec){ /* 'M6x14 shcs' -> key, name */ var m = /^(#6|M\d)(?:x([\d.]+))?\s+(\w+)$/.exec(spec); var d = m[1] === '#6' ? 3.5 : +m[1].slice(1), L = m[2] ? +m[2] : 0;
  var key = 'hw_' + spec.replace(/[^\w]/g, '_'); if (!P[key]){ P[key] = function(){ return hwModel(m[3], d, m[1] === '#6' ? 9.5 : L); };
    NAMES[key] = m[1] === '#6' ? '#6 × 3/8 thread-forming screw' : (m[1] + (L ? '×' + L : '') + ' ' + HW_NAMES[m[3]]);
    (CONFIG.SHORT = CONFIG.SHORT || {})[key] = m[1] === '#6' ? '#6 TF' : m[1] + (L ? '×' + L : '') + ' ' + HW_SHORT[m[3]]; } return key; }
var HW_SHORT = {shcs: 'SHCS', fh: 'FH', pan: 'pan', set: 'set', nut: 'nut', washer: 'wsh', tf: 'TF'};
