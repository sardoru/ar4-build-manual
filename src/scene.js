/* ---------- the AR4 model: every number this manual shows comes from here ---------- */
/* AR4 Robot Manual v1.5 (BOM, DIP-switch table p249, Teensy pin map ch. 3, specs ch. 6), Annin's ar4_ros_driver
   (urdf/ar_macro.xacro geometry, config/mk4.yaml limits for these MK4/MK5 meshes, AR4_teensy.ino reductions and calibration).
   World units are feet; the model is in metres. */
var FT = 3.28084, MM = 1 / 304.8;
var AR4 = {
  limMin: [-170, -42, -89, -180, -105, -180], limMax: [170, 90, 52, 180, 105, 180],      /* mk4.yaml (MK5 narrows J1 to ±160) */
  microstep: [2, 2, 2, 2, 4, 2], fullSteps: 200,                                        /* manual p249: 1/2 step, J5 1/4 step, 200-step motors */
  stepsPerDeg: [44.44444444, 55.55555556, 55.55555556, 49.77777777, 21.86024888, 22.22222222],   /* firmware MOTOR_STEPS_PER_DEG_MK3: the same half-step setting */
  encPerRev: 4000,                                                                       /* encoder counts per motor turn (firmware) */
  calDir: [-1, -1, 1, -1, -1, 1], calSpeed: 1000, calSpeedMult: [1, 1, 1, 1, 0.5, 1],    /* calibration toward the switch, motor steps/s (firmware) */
  limitPins: [26, 27, 28, 29, 30, 31], maxSpeed: 60,                                     /* manual p241 / firmware LIMIT_PINS; JOINT_MAX_SPEED deg/s */
  jaw: 0.014,                                                                            /* servo gripper jaw travel, m (ar_gripper_macro.xacro) */
  sku: ['17HS15-1684D-HG10', '23HS22-2804D-HG50', '17HS15-1684D-HG50', '11HS20-0674D-PG14', '17LS19-1684E-200G', '14HS11-1004D-PG19'],   /* manual BOM p44-46 */
  amps: [1.46, 2.37, 1.46, 0.5, 1.0, 1.0],                                               /* manual p249 driver current */
  specs: {reach: 629, payload: 1.9, repeat: 0.2, mass: 12.25, watts: 198}                /* manual chapter 6 */
};
AR4.encMult = AR4.microstep.map(function(m){ return AR4.encPerRev / (AR4.fullSteps * m); });   /* 10, 10, 10, 10, 5, 10 */
AR4.motorStepsPerRev = AR4.microstep.map(function(m){ return AR4.fullSteps * m; });
AR4.ratio = AR4.stepsPerDeg.map(function(s, i){ return s * 360 / AR4.motorStepsPerRev[i]; });

var KIN = (function(){ var PI = Math.PI;
  var VIS = {base: [[0, 0, 0], [0, 0, -1.5708]], l1: [[0, 0, 0], [0, 0, 0]], l2: [[0, 0, -0.00887], [3.14, 0, 0]], l3: [[0, 0, -0.03671], [0, 0, 0]],
    l4: [[0, 0, -0.07594], [0, 0, -1.5708]], l5: [[0, 0, -0.0275], [0, 0, 0]], l6: [[0, 0, -0.016], [0, 0, 0]], grip: [[0, 0, 0], [0, 0, 0]], jaw1: [[0, 0, 0], [0, 0, 0]], jaw2: [[0, 0, 0], [0, 0, 0]]};
  var JOINTS = [ /* parent, child, xyz, rpy, axis, type */
    ['base', 'l1', [0, 0, 0.092], [PI, 0, 0], [0, 0, 1], 'r'],
    ['l1', 'l2', [0, 0.06415, -0.07778], [1.5708, 0, -1.5708], [0, 0, -1], 'r'],
    ['l2', 'l3', [0, -0.305, 0], [0, 0, 3.1416], [0, 0, -1], 'r'],
    ['l3', 'l4', [0, 0, 0], [1.5708, 0, -1.5708], [0, 0, -1], 'r'],
    ['l4', 'l5', [0, 0, -0.22294], [PI, 0, -1.5708], [1, 0, 0], 'r'],
    ['l5', 'l6', [0, 0, 0.041], [0, 0, 0], [0, 0, 1], 'r'],
    ['l6', 'grip', [0, 0, 0], [-1.5708, 0, 0], null, 'f'],
    ['grip', 'jaw1', [0, -0.036, 0], [0, 0, 0], [-1, 0, 0], 'p'],
    ['grip', 'jaw2', [0, -0.036, 0], [0, -PI, 0], [-1, 0, 0], 'p']];
  var root = new T.Group(); root.rotation.x = -PI / 2; root.scale.setScalar(FT);   /* ROS z-up metres -> y-up feet */
  var frames = {base: new T.Group()}; root.add(frames.base); var joints = [];
  JOINTS.forEach(function(j){ var o = new T.Group(); o.position.fromArray(j[2]); o.rotation.set(j[3][0], j[3][1], j[3][2], 'ZYX');
    var q = new T.Group(); o.add(q); frames[j[0]].add(o); frames[j[1]] = q; if (j[4]) joints.push({g: q, axis: new T.Vector3().fromArray(j[4]), type: j[5]}); });
  var vis = {}; Object.keys(VIS).forEach(function(k){ var g = new T.Group(); g.position.fromArray(VIS[k][0]); g.rotation.set(VIS[k][1][0], VIS[k][1][1], VIS[k][1][2], 'ZYX'); frames[k].add(g); vis[k] = g; });
  function setPose(qDeg, jaw){ joints.forEach(function(j, i){ if (j.type === 'r') j.g.quaternion.setFromAxisAngle(j.axis, (qDeg[i] || 0) * PI / 180); else j.g.position.copy(j.axis).multiplyScalar(jaw || 0); }); root.updateMatrixWorld(true); }
  setPose([0, 0, 0, 0, 0, 0], 0);
  return {root: root, frames: frames, vis: vis, setPose: setPose};
})();

/* ---------- the CAD bodies (split from the MK4/MK5 visual meshes; fasteners as clean cylinders) ---------- */
var MESH = (function(){ var s = atob(document.getElementById('ar4-mesh').textContent.replace(/\s+/g, '')); var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b.buffer; })();
var FILE = {BE: 'Link_Base_Enclosure', BA: 'Link_Base_Aluminum', BM: 'Link_Base_Motor', '1A': 'Link_1_Aluminum', '1M': 'Link_1_Motor', '2A': 'Link_2_Aluminum', '2M': 'Link_2_Motor',
  '2C': 'Link_2_Cover', '2G': 'Link_2_Logo', '3A': 'Link_3_Aluminum', '3M': 'Link_3_Motor', '4A': 'Link_4_Aluminum', '4M': 'Link_4_Motor', '4C': 'Link_4_Cover', '4G': 'Link_4_Logo',
  '5A': 'Link_5_Aluminum', '5M': 'Link_5_Motor', '6A': 'Link_6_Aluminum', GB: 'gripper_base_link', GJ: 'gripper_jaw1_link', GK: 'gripper_jaw2_link'};
var BODY = {}; AR4_INDEX.forEach(function(e){ var code = Object.keys(FILE).filter(function(k){ return FILE[k] === e.f; })[0]; e.code = code + e.i;
  if (e.f === 'gripper_jaw1_link') e.link = 'jaw1'; if (e.f === 'gripper_jaw2_link') e.link = 'jaw2'; BODY[e.code] = e; });
var GEO = {}, EDGE = {};
function geoOf(e){ if (GEO[e.code]) return GEO[e.code]; var g;
  if (e.cyl){ var c = e.cyl; g = new T.CylinderGeometry(c.r, c.r, c.h, c.h > 2.5 * c.r ? 20 : 28, 1); if (c.axis === 0) g.rotateZ(Math.PI / 2); if (c.axis === 2) g.rotateX(Math.PI / 2);
    g.translate((e.min[0] + e.max[0]) / 2, (e.min[1] + e.max[1]) / 2, (e.min[2] + e.max[2]) / 2); }
  else { var qv = new Int16Array(MESH, e.vOff, e.vCount * 3), pos = new Float32Array(e.vCount * 3);
    for (var i = 0; i < e.vCount; i++) for (var k = 0; k < 3; k++) pos[i * 3 + k] = e.min[k] + (qv[i * 3 + k] + 32768) / 65535 * (e.max[k] - e.min[k]);
    var ix = e.idx32 ? new Uint32Array(MESH, e.iOff, e.iCount) : new Uint16Array(MESH, e.iOff, e.iCount);
    g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(new T.BufferAttribute(ix.slice(), 1)); g.computeVertexNormals(); }
  GEO[e.code] = g; EDGE[e.code] = new T.EdgesGeometry(g, 32); return g; }
function bodyMesh(code){ if (code.slice(0, 2) === 'P.'){ var po = PROC[code.slice(2)](); po.updateMatrixWorld(true); return po; }
  var e = BODY[code]; if (!e) throw new Error('no CAD body ' + code); var g = geoOf(e);
  var big = Math.max(e.max[0] - e.min[0], e.max[1] - e.min[1], e.max[2] - e.min[2]) > 0.03;
  var m = new T.Mesh(g, mat(WHITE)); m.castShadow = big; m.receiveShadow = true;
  m.add(new T.LineSegments(EDGE[e.code], new T.LineBasicMaterial({color: INK, transparent: true, opacity: big ? 0.62 : 0.5})));
  m.applyMatrix4(KIN.vis[e.link].matrixWorld); return m; }

/*__KITS__*/

/* joint origins and axes, world units, at the assembly pose */
function jointPos(n){ return new T.Vector3().setFromMatrixPosition(KIN.frames['l' + n].matrixWorld); }
function jointAxis(n){ var ax = [[0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [1, 0, 0], [0, 0, 1]][n - 1]; var q = new T.Quaternion(); KIN.frames['l' + n].getWorldQuaternion(q); return new T.Vector3().fromArray(ax).applyQuaternion(q).normalize(); }
function boxOf(o){ o.updateMatrixWorld(true); var bb = new T.Box3(); o.traverse(function(n){ if (n.isMesh){ n.geometry.computeBoundingBox(); bb.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld)); } }); return bb; }
var KITBOX = {}; Object.keys(KIT).forEach(function(k){ KITBOX[k] = boxOf(buildKit(k)); });
function fromVec(K){ var f = K.from, d;
  if (f.up) return new T.Vector3(0, f.up * MM, 0);
  if (f.down) return new T.Vector3(0, -f.down * MM, 0);
  if (f.v) return new T.Vector3().fromArray(f.v).multiplyScalar(MM);
  var ax = jointAxis(f.ax), c = KITBOX[K.key].getCenter(new T.Vector3()), r = KITBOX[f.ref].getCenter(new T.Vector3());
  d = ax.dot(c.clone().sub(r)) < 0 ? -1 : 1; return ax.multiplyScalar(d * f.d * MM); }

/* ---------- context: a bench under the base (painted white with the rest) ---------- */
var site = new T.Group(); world.add(site);
(function(){ var bb = KITBOX.encl1.clone().union(KITBOX.basePlate); var c = bb.getCenter(new T.Vector3());
  site.add(at(box(1100 * MM, 24 * MM, 620 * MM, WHITE, {edge: 0.35, noShadow: true}), c.x, -12 * MM, c.z));
  var pts = []; for (var x = -500; x <= 500; x += 100) pts.push(new T.Vector3(c.x + x * MM, 0.002, c.z - 300 * MM), new T.Vector3(c.x + x * MM, 0.002, c.z + 300 * MM));
  for (var z = -300; z <= 300; z += 100) pts.push(new T.Vector3(c.x - 550 * MM, 0.002, c.z + z * MM), new T.Vector3(c.x + 550 * MM, 0.002, c.z + z * MM)); site.add(lines(pts, INK, 0.07)); })();

/* ---------- register every kit on the step whose parts list names it, in that order; 'hw:<size kind>:<qty>' entries are callout-only hardware ---------- */
var STEP_OF = {};
STEPS.forEach(function(s, i){ var j = 0; (s.parts || []).forEach(function(k){ if (/^hw:/.test(k)) return; if (!KIT[k]) throw new Error('step ' + i + ': no kit ' + k); STEP_OF[k] = i;
  reg(k, buildKit(k), {add: i, from: fromVec(KIT[k]), lag: (j++) * 0.42, each: !!KIT[k].sets, span: KIT[k].sets ? 0.5 + 0.1 * KIT[k].sets.length : 0.9, part: k}); }); });
Object.keys(KIT).forEach(function(k){ if (STEP_OF[k] == null) throw new Error('kit ' + k + ' is in no step'); });
STEPS.forEach(function(s){ if (s.parts) s.parts = s.parts.map(function(k){ var m = /^hw:(.+):(\d+)$/.exec(k); return m ? [hwKey(m[1]), m[2]] : [k, String(KIT[k].qty)]; }); });
(function(){ var groups = [G_ST, G_PR, G_MO, G_HW, G_EL, G_GR].map(function(n){ return [n, []]; });
  KITS.forEach(function(k){ if (k[3] === G_FA) return; groups.filter(function(x){ return x[0] === k[3]; })[0][1].push([k[0], String(KIT[k[0]].qty)]); });
  groups.push([G_FA + ' (BOM table, whole robot)', HW_BOM.map(function(h){ return [hwKey(h[0]), String(h[1])]; })]);
  groups.forEach(function(g){ INVENTORY.push(g); }); })();

/* ---------- copy: numbers resolved from the model ---------- */
function mm(v){ var a = Math.abs(v); return (a >= 100 || Math.abs(a - Math.round(a)) < 0.05 ? String(Math.round(a)) : a.toFixed(1)) + ' mm'; }
function deg(v){ return (v < 0 ? '−' : (v > 0 ? '+' : '')) + Math.abs(v) + '°'; }
function ratio(r){ return (Math.abs(r - Math.round(r)) < 0.01 ? String(Math.round(r)) : (r < 20 ? r.toFixed(2) : r.toFixed(1))) + ':1'; }
function extentsMm(key){ var e = BODY[KIT[key].codes[0]]; return [0, 1, 2].map(function(k){ return (e.max[k] - e.min[k]) * 1000; }); }
function motorOf(i){ var ex = extentsMm(['j1Motor', 'j2Motor', 'j3Motor', 'j4Motor', 'j5Motor', 'j6Motor'][i]).slice().sort(function(a, b){ return a - b; });
  var flat = Math.abs(ex[1] - ex[2]) < 2.5, sq = flat ? (ex[1] + ex[2]) / 2 : (ex[0] + ex[1]) / 2, len = flat ? ex[0] : ex[2];   /* the square face is the near-equal pair */
  var nema = sq > 50 ? 23 : sq > 39 ? 17 : sq > 32 ? 14 : 11; return 'NEMA ' + nema + ' motor, ' + Math.round(len) + ' mm body'; }
var J = {}; [1, 2, 3, 4, 5, 6].forEach(function(n){ J[n] = jointPos(n); });
var FLANGE = new T.Vector3().setFromMatrixPosition(KIN.frames.l6.matrixWorld);
var TOKENS = {
  L23: mm(J[2].distanceTo(J[3]) / MM), L35: mm(J[3].distanceTo(J[5]) / MM), L56: mm(J[5].distanceTo(FLANGE) / MM),
  j2h: mm(J[2].y / MM), j2f: mm(Math.hypot(J[2].x - J[1].x, J[2].z - J[1].z) / MM),
  enc: AR4.encPerRev.toLocaleString('en-US'), jaw: mm(AR4.jaw * 1000), vmax: AR4.maxSpeed + '°/s',
  calspeed: AR4.calSpeed.toLocaleString('en-US') + ' motor steps/s (J5 at half)'
};
TOKENS.specs = 'Reach ' + AR4.specs.reach + ' mm · payload ' + AR4.specs.payload + ' kg · repeatability ' + AR4.specs.repeat + ' mm · ' + AR4.specs.mass + ' kg in aluminum';
TOKENS.specs2 = 'Upper arm ' + TOKENS.L23 + ' · forearm ' + TOKENS.L35 + ' · reach ' + AR4.specs.reach + ' mm · payload ' + AR4.specs.payload + ' kg';
TOKENS.travel = (Math.PI / 180 * J5.pulR).toFixed(2) + ' mm';
TOKENS.amps = AR4.amps.map(function(x){ return x % 1 ? String(x) : x.toFixed(1); }).join(' · ');
function fill(str){ return typeof str !== 'string' ? str : str.replace(/\{(\w+)(?::(\w+))?(?::(\w+))?\}/g, function(all, k, a, b){
  if (k === 'motor') return motorOf(+a); if (k === 'ratio') return ratio(AR4.ratio[+a]); if (k === 'range') return deg(AR4.limMin[+a]) + ' to ' + deg(AR4.limMax[+a]);
  if (k === 'pin') return String(AR4.limitPins[+a]);
  if (k === 'sku') return AR4.sku[+a];
  if (k === 'belt') return /XL$/.test(a) ? a + '037, ' + beltLen(a).toFixed(1) + ' mm' : a;   /* XL belts carry the 037 width code; the 214L is named as the manual names it */
  if (k === 'len'){ var el = extentsMm(a).sort(function(x, y){ return y - x; }); return el[0].toFixed(1) + ' mm'; }
  if (k === 'caldir') return AR4.calDir[+a] < 0 ? 'negative, toward ' + deg(AR4.limMin[+a]) + ',' : 'positive, toward ' + deg(AR4.limMax[+a]) + ',';
  if (k === 'size'){ var ex = extentsMm(a).sort(function(x, y){ return y - x; }).slice(0, b ? +b : 3); return ex.map(function(v){ return mm(v).replace(' mm', ''); }).join(' × ') + ' mm'; }
  if (k === 'dia'){ var ed = extentsMm(a).sort(function(x, y){ return y - x; }); var dd = Math.abs(ed[0] - ed[1]) < 1 ? ed[0] : ed[1]; return 'Ø ' + mm(dd); }
  if (TOKENS[k] != null) return TOKENS[k]; throw new Error('no token ' + all); }); }

/* ---------- symbolic points, cameras and dims ---------- */
function pt(ref){ if (ref == null || Array.isArray(ref)) return ref; var m = /^([@#%~])(\w+?)([\^_]?)$/.exec(ref); if (!m) throw new Error('bad point ' + ref); var p;
  if (m[1] === '~'){ if (!POINTS[m[2]]) throw new Error('no point ' + m[2]); p = POINTS[m[2]](); }
  else if (m[1] === '%'){ var e = BODY[m[2]]; if (!e) throw new Error('no CAD body ' + m[2]); var bb = new T.Box3(new T.Vector3().fromArray(e.min), new T.Vector3().fromArray(e.max)).applyMatrix4(KIN.vis[e.link].matrixWorld);
    p = bb.getCenter(new T.Vector3()); if (m[3] === '^') p.y = bb.max.y; if (m[3] === '_') p.y = bb.min.y; }
  else if (m[1] === '#'){ if (m[2] === 'B') p = new T.Vector3(); else if (m[2] === 'F') p = FLANGE.clone(); else if (/^J\dg$/.test(m[2])){ p = J[+m[2][1]].clone(); p.y = 0; } else p = J[+m[2].slice(1)].clone(); }
  else { var bb = KITBOX[m[2]]; if (!bb) throw new Error('no kit ' + m[2]); p = bb.getCenter(new T.Vector3()); if (m[3] === '^') p.y = bb.max.y; if (m[3] === '_') p.y = bb.min.y; }
  return [p.x, p.y, p.z]; }
var UP = new T.Vector3(0, 1, 0);
function fitCam(spec, box){ var bb = box || new T.Box3(); if (!box) (spec.fit[0] === '*' ? Object.keys(KIT) : spec.fit).forEach(function(k){ bb.union(KITBOX[k]); });
  var vz = new T.Vector3().fromArray(spec.v || CONFIG.view).normalize(), vx = new T.Vector3().crossVectors(UP, vz).normalize(), vy = new T.Vector3().crossVectors(vz, vx);
  var c = bb.getCenter(new T.Vector3()), hw = 0, hh = 0; [0, 1].forEach(function(a){ [0, 1].forEach(function(b){ [0, 1].forEach(function(d){
    var p = new T.Vector3(a ? bb.max.x : bb.min.x, b ? bb.max.y : bb.min.y, d ? bb.max.z : bb.min.z).sub(c); hw = Math.max(hw, Math.abs(p.dot(vx))); hh = Math.max(hh, Math.abs(p.dot(vy))); }); }); });
  var r = Math.max(hw, hh) * (spec.pad || 1.1); if (spec.shift) c.addScaledVector(vx, spec.shift[0] * r).addScaledVector(vy, spec.shift[1] * r);
  spec.c = [c.x, c.y, c.z]; spec.r = r; }
STEPS.forEach(function(s){ ['text', 'meta', 'tip', 'title'].forEach(function(k){ if (s[k]) s[k] = fill(s[k]); });
  (s.acts || []).forEach(function(a){ a[0] = fill(a[0]); a[1] = pt(a[1]); });
  if (s.detail) s.detail.p = pt(s.detail.p);
  (s.dims || []).forEach(function(d){ var A = v(pt(d.a)), B = v(pt(d.b)); d.a = [A.x, A.y, A.z]; d.b = [B.x, B.y, B.z]; d.off = d.off.map(function(x){ return x * MM; }); if (!d.label) d.label = mm(A.distanceTo(B) / MM); }); });

/* ---------- live pose: the calibration and finished pages move the joints through the same kinematics ---------- */
var Q0 = [0, 0, 0, 0, 0, 0];
var M0I = {}; ['base', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'grip'].forEach(function(l){ M0I[l] = new T.Matrix4().copy(KIN.frames[l].matrixWorld).invert(); });
var JAWDIR = ['jaw1', 'jaw2'].map(function(l){ var q = new T.Quaternion(); KIN.frames[l].getWorldQuaternion(q); return new T.Vector3(-1, 0, 0).applyQuaternion(q).normalize(); });
var Dm = new T.Matrix4(), tmpQ = new T.Quaternion();
function setJaw(s){ var o = objs.gJaws; o.children.forEach(function(ch, i){ if (!ch.userData.dest) ch.userData.dest = ch.position.clone(); ch.position.copy(ch.userData.dest).addScaledVector(JAWDIR[i], s * FT); }); }
function pose(q, jaw){ KIN.setPose(q, 0);
  order.forEach(function(k){ var K = KIT[k], o = objs[k], L = K.link === 'jaw1' || K.link === 'jaw2' ? 'grip' : K.link; Dm.multiplyMatrices(KIN.frames[L].matrixWorld, M0I[L]);
    o.position.copy(o.userData.dest).applyMatrix4(Dm); o.quaternion.setFromRotationMatrix(tmpM.extractRotation(Dm)); });
  objs.j5Carrier.position.addScaledVector(JA(4), carrierTravel(q[4] || 0) * MM);   /* the carrier rides the lead screw: belt on the XL15 turns J5 */
  setJaw(jaw || 0); }
var tmpM = new T.Matrix4();
function rest(){ order.forEach(function(k){ objs[k].quaternion.identity(); }); KIN.setPose(Q0, 0); }
function tcpMm(){ var p = new T.Vector3().setFromMatrixPosition(KIN.frames.l6.matrixWorld).applyMatrix4(new T.Matrix4().copy(KIN.root.matrixWorld).invert()); return [p.x * 1000, p.y * 1000, p.z * 1000]; }

/* the readout card (anatomy: Fig at top left, hint at bottom left, live readout at bottom right) */
var roEl = document.getElementById('ro'), roJ = document.getElementById('roJ'), roF = document.getElementById('roF'), figEl = document.getElementById('fig'), hintEl = document.getElementById('hint');
var roBtns = [0, 1, 2, 3, 4, 5].map(function(i){ var li = document.createElement('li'); li.innerHTML = '<button type="button"><b></b><span></span></button>'; var b = li.firstChild; b.firstChild.textContent = 'J' + (i + 1);
  b.addEventListener('click', function(){ if (LIVE.sweep) LIVE.sweep(i); }); roJ.appendChild(li); return b; });
function sgn(x, d){ var s = Math.abs(x) < Math.pow(10, -d) / 2 ? 0 : x; return (s < 0 ? '−' : (s > 0 ? '+' : ' ')) + Math.abs(s).toFixed(d); }
function readout(q, on, foot){ roBtns.forEach(function(b, i){ b.lastChild.textContent = sgn(q[i], 1) + '°'; b.classList.toggle('on', on === i); }); roF.textContent = foot || '\u00a0'; }
/* the sheet fades at its foot while there is more to scroll */
var sheetEl = document.getElementById('sheet');
function sheetCue(){ sheetEl.classList.toggle('more', sheetEl.scrollHeight - sheetEl.clientHeight - sheetEl.scrollTop > 2); }
sheetEl.addEventListener('scroll', sheetCue, {passive: true}); addEventListener('resize', sheetCue); new MutationObserver(sheetCue).observe(sheetEl, {childList: true, subtree: true, characterData: true});
setTimeout(sheetCue, 400);
function overlay(kind){ var live = kind === 'cal' || kind === 'live'; roEl.hidden = !live; figEl.hidden = !live; hintEl.hidden = !live;
  if (kind === 'cal'){ document.getElementById('figN').textContent = 'Fig 1'; document.getElementById('figT').textContent = 'Calibration, 4× speed'; hintEl.textContent = 'Each joint runs to its switch, then back to rest'; }
  if (kind === 'live'){ document.getElementById('figN').textContent = 'Fig 2'; document.getElementById('figT').textContent = 'AR4, joints live'; hintEl.textContent = COARSE ? 'Drag to turn · tap a joint to sweep it' : 'Drag to turn · click a joint or press 1–6'; } }

/* motion profiles: real joint speeds from the firmware */
function moveDur(a, b, speed){ var m = 0; for (var i = 0; i < 6; i++) m = Math.max(m, Math.abs(b[i] - a[i])); return m / speed * 1000; }
function lerpQ(a, b, e){ return a.map(function(x, i){ return x + (b[i] - x) * e; }); }
function smooth(t){ return t * t * (3 - 2 * t); }
function track(seq, ms){ /* seq: [{q, jaw, dur, hold, on, foot}] looping */ var total = 0; seq.forEach(function(s){ total += s.dur + (s.hold || 0); }); var t = ms % total, prev = seq[seq.length - 1];
  for (var i = 0; i < seq.length; i++){ var s = seq[i]; if (t < s.dur){ var e = smooth(t / s.dur); return {q: lerpQ(prev.q, s.q, e), jaw: prev.jaw + (s.jaw - prev.jaw) * e, on: s.on, foot: s.foot, k: e}; }
    t -= s.dur; if (t < (s.hold || 0)) return {q: s.q.slice(), jaw: s.jaw, on: s.on, foot: s.foot, k: 1}; t -= s.hold || 0; prev = s; } return {q: prev.q.slice(), jaw: prev.jaw}; }
var TOUR = [[0, 0, 0, 0, 0, 0, 0], [40, 30, 22, 0, 38, 0, 0.012], [40, 38, 26, 0, 30, 0, 0.012], [40, 38, 26, 0, 30, 0, 0.002], [40, 15, 10, 0, 50, 0, 0.002],
  [-50, 10, -20, 70, -55, 90, 0.002], [-50, 22, -6, 70, -40, 90, 0.012], [-10, -15, 35, -40, 60, -60, 0.004], [0, 0, 0, 0, 0, 0, 0]];
function tourSeq(speed){ var seq = [], prev = TOUR[TOUR.length - 1]; TOUR.forEach(function(p){ var q = p.slice(0, 6); var jd = Math.abs(p[6] - prev[6]) > 0.001 ? 700 : 0;
  seq.push({q: q, jaw: p[6], dur: Math.max(500, moveDur(prev.slice(0, 6), q, speed), jd), hold: 650}); prev = p; }); return seq; }
function calSeq(scale){ var seq = [], home = Q0.slice(); for (var i = 0; i < 6; i++){ var tgt = home.slice(); tgt[i] = AR4.calDir[i] < 0 ? AR4.limMin[i] : AR4.limMax[i];
    var vCal = AR4.calSpeed * AR4.calSpeedMult[i] / AR4.stepsPerDeg[i];   /* deg/s */
    seq.push({q: tgt, jaw: 0, dur: Math.abs(tgt[i]) / vCal * 1000 / scale, hold: 500, on: i, cal: i});
    seq.push({q: home.slice(), jaw: 0, dur: Math.abs(tgt[i]) / AR4.maxSpeed * 1000 / scale, hold: 350, on: i, cal: -1}); }
  return seq; }
function calFoot(q, i){ if (i == null || i < 0) return ''; var a = q[i], st = Math.round(Math.abs(a) * AR4.stepsPerDeg[i]), ct = Math.round(st * AR4.encMult[i]);
  return 'J' + (i + 1) + ' ' + st.toLocaleString('en-US') + ' steps · ' + ct.toLocaleString('en-US') + ' counts'; }
function tcpFoot(){ var p = tcpMm(); return 'Flange x ' + sgn(p[0], 0) + ' · y ' + sgn(p[1], 0) + ' · z ' + sgn(p[2], 0) + ' mm'; }
var LIVE = {sweep: null}, CURRENT = -1;
var LINEAR = function(x){ return x; };
function last(tw){ var i = tweens.indexOf(tw); if (i > 0){ tweens.splice(i, 1); tweens.unshift(tw); } return tw; }   /* run after this page's landings each frame, so a still pose is not undone by them */
var stageEl = document.querySelector('.stage'), canvasEl = document.getElementById('c'), COARSE = matchMedia('(pointer: coarse)').matches;
function liveUI(on){ stageEl.classList.toggle('live', !roEl.hidden); roBtns.forEach(function(b){ b.disabled = !on; }); }   /* joints answer taps only on the finished page */
if (window.ResizeObserver) new ResizeObserver(function(){ stageEl.style.setProperty('--roH', roEl.offsetHeight + 'px'); }).observe(roEl);   /* the scale bar sits above the readout */

STEPS.forEach(function(s, i){ var kind = s.kind || (i === STEPS.length - 1 ? 'live' : '');
  s.onEnter = function(t){ CURRENT = i; LIVE.sweep = null; LIVE.q = null; LIVE.jaw = 0; rest(); overlay(kind); liveUI(kind === 'live'); var start = t.lastLand + 150;
    world.children.forEach(function(c){ var p = c.userData && c.userData.part; if (p && objs[p] !== c) c.quaternion.identity(); });   /* ghosts of a posed page land unposed */
    canvasEl.setAttribute('aria-label', '3D view: ' + s.title);
    if (kind === 'j5'){ /* the belt and carrier at work: J5 swings to its switch end and back, the carrier follows the screw */
      last(t.tween(3.6e6, function(e, k){ var ms = k * 3.6e6, q5 = t.still ? AR4.limMin[4] : AR4.limMin[4] * 0.5 * (1 - Math.cos(ms / 2600 * Math.PI)); pose([0, 0, 0, 0, q5, 0], 0); }, LINEAR, start));
      t.tween(1, function(){ setCut(['j5Plate']); }, null, t.lastLand); return; }   /* the side plate lands, then fades so the belt shows */
    if (kind === 'grip'){ last(t.tween(3.6e6, function(e, k){ var ms = k * 3.6e6; setJaw(t.still ? AR4.jaw * 0.7 : AR4.jaw * 0.5 * (1 - Math.cos(ms / 1600 * Math.PI))); }, LINEAR, start)); return; }
    if (kind === 'cal'){ var cs = calSeq(4); readout(Q0, null, 'Rest'); last(t.tween(3.6e6, function(e, k){ var st = t.still ? {q: [AR4.limMin[0], 0, 0, 0, 0, 0], jaw: 0, on: 0} : track(cs, k * 3.6e6);
        pose(st.q, st.jaw); var on = st.on; readout(st.q, on, on == null ? '' : calFoot(st.q, on)); }, LINEAR, start)); return; }
    if (kind === 'live'){ var seq = tourSeq(AR4.maxSpeed), clock0 = null, sweepAt = null, sweepSeq = null;
      LIVE.sweep = function(j){ var a = Q0.slice(), b = Q0.slice(), c = Q0.slice(); b[j] = AR4.limMin[j]; c[j] = AR4.limMax[j];
        sweepSeq = [{q: b, jaw: 0, dur: moveDur(Q0, b, AR4.maxSpeed), hold: 300, on: j}, {q: c, jaw: 0, dur: moveDur(b, c, AR4.maxSpeed), hold: 300, on: j}, {q: a, jaw: 0, dur: moveDur(c, a, AR4.maxSpeed), hold: 0, on: j}];
        sweepAt = null; LIVE.from = LIVE.q ? LIVE.q.slice() : Q0.slice(); };
      if (t.still) LIVE.sweep = function(j){ var q = Q0.slice(); q[j] = AR4.limMax[j] / 2; pose(q, 0); readout(q, j, tcpFoot()); };   /* reduced motion: a tap shows the joint turned halfway to its limit */
      readout(Q0, null, tcpFoot());
      if (t.still){ pose(TOUR[1].slice(0, 6), TOUR[1][6]); readout(TOUR[1].slice(0, 6), null, tcpFoot()); return; }
      last(t.tween(3.6e6, function(e, k){ var ms = k * 3.6e6, st;
        if (sweepSeq){ if (sweepAt == null){ sweepAt = ms; sweepSeq.unshift({q: LIVE.from, jaw: LIVE.jaw || 0, dur: 0, hold: 0}); sweepSeq[1].dur = moveDur(LIVE.from, sweepSeq[1].q, AR4.maxSpeed); }
          var tt = ms - sweepAt, tot = 0; sweepSeq.forEach(function(x){ tot += x.dur + (x.hold || 0); }); if (tt >= tot){ sweepSeq = null; clock0 = ms; st = {q: Q0.slice(), jaw: 0}; } else st = track(sweepSeq, tt); }
        else { if (clock0 == null) clock0 = ms; st = track(seq, ms - clock0); }
        LIVE.q = st.q; LIVE.jaw = st.jaw; pose(st.q, st.jaw); readout(st.q, st.on, tcpFoot()); }, LINEAR, start)); return; }
  };
});
document.addEventListener('keydown', function(e){ if (CURRENT === STEPS.length - 1 && /^[1-6]$/.test(e.key) && LIVE.sweep) LIVE.sweep(+e.key - 1); });

/* cameras: build presets frame their kits; the moving pages frame every pose they will reach; a step may carry its own {fit, pad, v} */
STEPS.forEach(function(s, i){ if (s.cam && typeof s.cam === 'object'){ CAM['step' + i] = s.cam; s.cam = 'step' + i; } });
function posesBox(qs){ var bb = new T.Box3(); qs.forEach(function(q){ pose(q, 0); world.updateMatrixWorld(true); order.forEach(function(k){ bb.union(boxOf(objs[k])); }); }); rest(); order.forEach(function(k){ objs[k].position.copy(objs[k].userData.dest); }); setJaw(0); world.updateMatrixWorld(true); return bb; }
var POSES = {cal: [0, 1, 2, 3, 4, 5].map(function(i){ var q = Q0.slice(); q[i] = AR4.calDir[i] < 0 ? AR4.limMin[i] : AR4.limMax[i]; return q; }),
  live: TOUR.map(function(p){ return p.slice(0, 6); })};   /* a sweep may run past this frame for a moment; the tour stays inside it */
Object.keys(CAM).forEach(function(k){ var c = CAM[k]; if (c.poses) fitCam(c, posesBox(POSES[c.poses])); else if (c.fit) fitCam(c); });

if (/[?&]debug\b/.test(location.search)) (function(){ var seen = {}; CHECK.forEach(function(c){ if (seen[c[0]]) return; seen[c[0]] = 1; console.info('belt ' + c[0] + ': CAD centres give ' + c[1].toFixed(1) + ' mm pitch length, manual belt ' + c[2].toFixed(1) + ' mm'); }); })();
if (/[?&]debug\b/.test(location.search)) window.__ar4 = {objs: objs, STEPS: STEPS, enter: enter, labels: function(){ return labels; }, pose: pose, rest: rest, KIN: KIN, JA: JA, J5: J5, carrierTravel: carrierTravel, KITBOX: KITBOX};
