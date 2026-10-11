/* ---------- procedural parts, placed on the CAD (mm along joint axes; spans measured from the CAD bodies) ---------- */
var PROC = {}, PLINK = {};
function defp(name, link, fn){ PROC[name] = fn; PLINK[name] = link; }
var X_ = new T.Vector3(1, 0, 0), UPV = new T.Vector3(0, 1, 0);
function JP(n){ return jointPos(n); } function JA(n){ return jointAxis(n); }
function onShaft(code, n){ var c = bodyC(code), a = JA(n), j = JP(n); return c.sub(a.clone().multiplyScalar(c.clone().sub(j).dot(a))); }   /* the shaft's axis point level with joint n's origin */
/* J1: two 32009 bearings, opposed, in the turret housing; the 60T hub and XL15 pulley under the base plate; the 180XL037 belt */
defp('j1BrgUp', 'base', function(){ return onAxis(taperBearing(45, 75, 20), JP(1), JA(1), 5.6); });
defp('j1BrgLo', 'base', function(){ return onAxis(taperBearing(45, 75, 20), JP(1), JA(1).negate(), -61); });
defp('j1Hub60', 'l1', function(){ return onAxis(pulley(60, XL, 10, 30, true).g, JP(1), JA(1), 77); });
defp('j1Pul15', 'base', function(){ return onAxis(pulley(15, XL, 10, 8, true).g, onShaft('BA6', 1), JA(1), 77); });
defp('j1Belt', 'base', function(){ var b = beltLoop(JP(1).addScaledVector(JA(1), 82 * MM), pitchD(60, XL) / 2, onShaft('BA6', 1).addScaledVector(JA(1), 82 * MM), pitchD(15, XL) / 2, UPV, 9.5, 2.3);
  CHECK.push(['180XL037', b.userData.pitchLen, beltLen('180XL')]); return b; });
/* J2: two 30206 bearings, one at each face of the J2 turret housing (span 8.8..50.5 mm on the J2 axis) */
defp('j2BrgA', 'l1', function(){ return onAxis(taperBearing(30, 62, 17.25), JP(2), JA(2), 8.8); });
defp('j2BrgB', 'l1', function(){ return onAxis(taperBearing(30, 62, 17.25), JP(2), JA(2).negate(), -50.5); });
/* J3: 30204 in the bearing cup, AXK3552 thrust between spindle flange and cup, the spindle retainer, two L10 pulleys and the 214L belt */
defp('j3Brg', 'l2', function(){ return onAxis(taperBearing(20, 47, 15.25), JP(3), JA(3), 36.2); });
defp('j3Thrust', 'l2', function(){ return onAxis(thrustStack(35, 52, 4), JP(3), JA(3), 32.2); });
defp('j3Ret', 'l3', function(){ var g = group(solidOf(ringGeo(4, 15, 4, 0))); [0, 1, 2, 3].forEach(function(i){ var h = solidOf(new T.CylinderGeometry(1.7 * MM, 1.7 * MM, 0.3 * MM, 10)); h.position.set(Math.cos(i * Math.PI / 2 + 0.785) * 9 * MM, 4 * MM, Math.sin(i * Math.PI / 2 + 0.785) * 9 * MM); g.add(h); });
  return onAxis(g, JP(3), JA(3), 52.7); });
defp('j3PulShaft', 'l3', function(){ return onAxis(pulley(10, LP, 12.7, 8, true).g, JP(3), JA(3), 65.5); });
defp('j3PulMotor', 'l2', function(){ return onAxis(pulley(10, LP, 12.7, 8, true).g, onShaft('2A9', 3), JA(3), 65.5); });
defp('j3Belt', 'l2', function(){ var b = beltLoop(JP(3).addScaledVector(JA(3), 71.85 * MM), pitchD(10, LP) / 2, onShaft('2A9', 3).addScaledVector(JA(3), 71.85 * MM), pitchD(10, LP) / 2, JA(3), 12.7, 3.6);
  CHECK.push(['214L', b.userData.pitchLen, beltLen('214L')]); return b; });
/* J4: two B-1616 needle bearings in the turret housing (span -23.5..35.3), NTA1625 stacks in the hub and the J5 motor-mount recesses */
defp('j4NeedleA', 'l3', function(){ return onAxis(needleBearing(25.4, 31.75, 25.4), JP(4), JA(4), -23.5); });
defp('j4NeedleB', 'l3', function(){ return onAxis(needleBearing(25.4, 31.75, 25.4), JP(4), JA(4), 9.9); });
defp('j4StackF', 'l4', function(){ return onAxis(thrustStack(25.4, 39.7, 6), JP(4), JA(4), 35.6); });
defp('j4StackB', 'l4', function(){ return onAxis(thrustStack(25.4, 39.7, 3.6), JP(4), JA(4), -27); });   /* TRA + NTA + TRA */
/* J5: lead screw from the motor through the J4 tube, 688Z at the housing end, carrier on two 3 mm rods, idler on its post, 150XL belt to the XL15 on the J6 housing post */
var J5 = {screwFrom: -41.4, screwLen: 196, carrier0: 112, idler: 69, beltX: -31.5, pulR: pitchD(15, XL) / 2, idlerR: 11.5};
function carrierTravel(q5){ return -q5 * Math.PI / 180 * J5.pulR; }   /* the lower run moves -J4 for +J5 (rotation about +x); clamped to it, the carrier is forward (toward the wrist) at J5 = -105, the switch end */
defp('j5Screw', 'l4', function(){ return onAxis(leadScrew(J5.screwLen, 8, 8), JP(4), JA(4), J5.screwFrom); });
defp('j5End', 'l4', function(){ return onAxis(group(solidOf(ringGeo(4, 8, 5, 0))), JP(4), JA(4), 152); });
function rodLocal(code){ /* rod axis from its set screw in the housing wall, in the carrier's local frame (x = world x, z = world down) */
  var c = bodyC(code), j = JP(4); return [(c.x - j.x) / MM, -(c.y - j.y) / MM * 0.72]; }
defp('j5Carrier', 'l4', function(){ var g = new T.Group(), A = rodLocal('4A7'), B = rodLocal('4A8');
  var body = solidOf(new T.CylinderGeometry(12 * MM, 12 * MM, 18 * MM, 28)); g.add(body);                     /* round carrier body on the lead screw */
  var nut = solidOf(ringGeo(4, 11, 4, 9)); g.add(nut);                                                          /* POM nut flange on the front face */
  [0, 1, 2].forEach(function(i){ var a = i / 3 * Math.PI * 2 + 0.5, d = solidOf(new T.CylinderGeometry(1.4 * MM, 1.4 * MM, 0.4 * MM, 8)); d.position.set(Math.cos(a) * 8 * MM, 13.1 * MM, Math.sin(a) * 8 * MM); g.add(d); });
  [A, B].forEach(function(r){ var ear = solidOf(new T.CylinderGeometry(4.2 * MM, 4.2 * MM, 14 * MM, 16)); ear.position.set(r[0] * MM, 0, r[1] * MM); g.add(ear);   /* LM3UU bores at diagonal corners */
    var web = solidOf(new T.BoxGeometry(6 * MM, 12 * MM, 6 * MM)); web.position.set(r[0] * 0.55 * MM, 0, r[1] * 0.55 * MM); web.lookAt(new T.Vector3(r[0] * MM, 0, r[1] * MM)); g.add(web); });
  var arm = solidOf(new T.BoxGeometry(18 * MM, 8 * MM, 3 * MM)); arm.position.set(-20 * MM, 0, J5.pulR * MM); g.add(arm);   /* clamp tab out through the housing slot to the lower belt run */
  var clamp = solidOf(new T.BoxGeometry(4 * MM, 10 * MM, 6 * MM)); clamp.position.set(J5.beltX * MM, 0, (J5.pulR + 1.5) * MM); g.add(clamp);
  return onAxis(g, JP(4), JA(4), J5.carrier0); });
defp('j5RodA', 'l4', function(){ var r = rodLocal('4A7'), m = solidOf(new T.CylinderGeometry(1.5 * MM, 1.5 * MM, 85 * MM, 10)); m.position.set(r[0] * MM, 42.5 * MM, r[1] * MM); return onAxis(group(m), JP(4), JA(4), 68); });
defp('j5RodB', 'l4', function(){ var r = rodLocal('4A8'), m = solidOf(new T.CylinderGeometry(1.5 * MM, 1.5 * MM, 85 * MM, 10)); m.position.set(r[0] * MM, 42.5 * MM, r[1] * MM); return onAxis(group(m), JP(4), JA(4), 68); });
defp('j5Idler', 'l4', function(){ var g = new T.Group(), post = solidOf(new T.CylinderGeometry(8 * MM, 8 * MM, 20 * MM, 20)); post.rotation.z = Math.PI / 2; post.position.x = -30 * MM;
  var brg = solidOf(ringGeo(8, 11, 12, -6)); brg.rotation.z = Math.PI / 2; brg.position.x = J5.beltX * MM;
  var blk = solidOf(new T.BoxGeometry(6 * MM, 26 * MM, 30 * MM)); blk.position.set(-17 * MM, 0, 0); g.add(post, brg, blk); return onAxis(g, JP(4), JA(4), J5.idler); });
defp('j5Switch', 'l4', function(){ /* SV-166 roller switch in the J6 main bearing arm's slot (arm spans x 20..34), roller reaching the carrier's front face at J5 = -105 */
  var g = new T.Group(), b = solidOf(new T.BoxGeometry(10 * MM, 28 * MM, 16 * MM)); b.position.set(27 * MM, 14 * MM, 0); g.add(b);
  [-5, 0, 5].forEach(function(z){ var t = solidOf(new T.BoxGeometry(3 * MM, 4 * MM, 0.6 * MM)); t.position.set(27 * MM, 30 * MM, z * MM); g.add(t); });   /* NO, COM, NC tabs */
  var lever = solidOf(new T.BoxGeometry(14 * MM, 1 * MM, 4 * MM)); lever.position.set(17 * MM, 0.5 * MM, 0); lever.rotation.z = -0.25; g.add(lever);
  var roller = solidOf(new T.CylinderGeometry(2.5 * MM, 2.5 * MM, 4 * MM, 14)); roller.rotation.x = Math.PI / 2; roller.position.set(11 * MM, -1.5 * MM, 0); g.add(roller);
  return onAxis(g, JP(4), JA(4), 147); });
defp('j5Belt', 'l4', function(){ var c1 = JP(5).addScaledVector(X_, J5.beltX * MM), c2 = JP(4).addScaledVector(JA(4), J5.idler * MM).addScaledVector(X_, J5.beltX * MM);
  var b = beltLoop(c1, J5.pulR, c2, J5.idlerR, X_, 9.5, 2.3); CHECK.push(['150XL037', b.userData.pitchLen, beltLen('150XL')]); return b; });
/* J6: 30203 in the main bearing arm (span 20..34 on the J5 axis), needle thrust stack in the bearing cap */
defp('j6Brg', 'l4', function(){ return onAxis(taperBearing(17, 40, 13.25), JP(5), JA(5), 20.4); });
defp('j6Stack', 'l5', function(){ return onAxis(thrustStack(25.4, 39.7, 6), JP(5), JA(5), 36); });
var CHECK = [];   /* belt pitch lengths from the CAD centre distances vs the manual's belts */

/* ---------- kits: what arrives together, named as the AR4 Robot Manual v1.5 names it ----------
   [key, name, bodies (or sets for an 'each' kit), BOM group, from]. Bodies: CAD codes (file + index) or P.<procedural part>.
   from: {up: mm} | {down: mm} | {ax: joint, ref: kit, d: mm} (along that joint's axis, away from ref) | {v: [x,y,z] mm} */
var G_ST = 'Structural (aluminum kit)', G_PR = 'Printed parts', G_MO = 'Motors', G_HW = 'Bearings, belts and pulleys', G_EL = 'Electrical', G_FA = 'Fasteners', G_GR = 'Servo gripper (Annin CAD)';
var KITS = [
  ['encl1', 'J1 base enclosure, parts 1 and 2', ['BE0'], G_PR, {up: 140}],
  ['basePlate', 'J1 base plate', ['BA0'], G_ST, {up: 200}],
  ['j1Housing', 'J1 turret housing', ['BA1'], G_ST, {down: 160}],
  ['j1Bearings', '32009 taper roller bearing', [['P.j1BrgUp'], ['P.j1BrgLo']], G_HW, {up: 150}],
  ['j1Spindle', 'J1 spindle', ['1A4', '1A7'], G_ST, {up: 230}],
  ['j2Housing', 'J2 turret housing', ['1A0', '1A6'], G_ST, {up: 220}],
  ['j1Platform', 'J1 platform', ['1A2', '1A19'], G_ST, {up: 240}],
  ['platformScrews', 'M6×14 socket head', [['1A8'], ['1A9'], ['1A10'], ['1A11'], ['1A12']], G_FA, {up: 120}],
  ['j1Mount', 'J1 motor mount', ['BA3'], G_ST, {up: 190}],
  ['j1Motor', 'J1 gear motor, 10:1', ['BM0', 'BA2', 'BA4', 'BA5', 'BA6', 'BA11'], G_MO, {up: 240}],
  ['j1Pulley15', 'XL 15-tooth pulley, 8 mm bore', ['P.j1Pul15'], G_HW, {up: 200}],
  ['j1Tension', 'M3×10 set screw', [['BA12'], ['BA13']], G_FA, {v: [0, 0, -110]}],
  ['j1Washers', 'M4 washer', [['BA14'], ['BA15'], ['BA16'], ['BA17']], G_FA, {up: 110}],
  ['j1Screws', 'M4×20 socket head', [['BA7'], ['BA8'], ['BA9'], ['BA10']], G_FA, {up: 150}],
  ['j1Pulley60', '60T XL timing hub pulley', ['P.j1Hub60'], G_HW, {down: 130}],
  ['j1Belt', '180XL037 timing belt', ['P.j1Belt'], G_HW, {down: 110}],
  ['glands', 'PG-21 gland nut', [['BM1', 'BM3', 'BM6'], ['BM2', 'BM4', 'BM7']], G_EL, {up: 150}],
  ['j1Switch', 'J1 limit switch, SV-166-1C25', ['BM8', 'BM5'], G_EL, {up: 130}],
  ['j2Spindle', 'J2 drive spindle', ['2A1'], G_ST, {ax: 2, ref: 'j2Housing', d: 200}],
  ['j2Bearings', '30206 taper roller bearing', [['P.j2BrgA'], ['P.j2BrgB']], G_HW, {up: 140}],
  ['j2Arm', 'J2 arm', ['2A0', '2A7'], G_ST, {ax: 2, ref: 'j2Housing', d: 250}],
  ['j2Ring', 'J2 tension ring', ['2A2'], G_ST, {ax: 2, ref: 'j2Housing', d: 180}],
  ['j2Stop', 'J2 stop', ['1M2'], G_PR, {up: 150}],
  ['j2Switch', 'J2 limit switch, SV-166-1C25', ['1M4', '1M3'], G_EL, {up: 130}],
  ['j2Spacer', 'J2 spacer', ['1M1'], G_PR, {ax: 2, ref: 'j2Housing', d: 200}],
  ['j2Support', 'J2 motor support', ['1A3'], G_ST, {ax: 2, ref: 'j2Housing', d: 220}],
  ['j2Motor', 'J2 gear motor, NEMA 23 50:1', ['1M0', '1A1', '1A5', '1A20'], G_MO, {ax: 2, ref: 'j2Housing', d: 280}],
  ['j2Screws', 'M6×18 flat head', [['1A13', '1A16'], ['1A14', '1A17'], ['1A15', '1A18']], G_FA, {up: 110}],
  ['j3Cup', 'J3 bearing cup', ['2A4'], G_ST, {ax: 3, ref: 'j2Arm', d: 170}],
  ['j3Bearing', '30204 taper roller bearing', ['P.j3Brg'], G_HW, {ax: 3, ref: 'j2Arm', d: 140}],
  ['j3Shaft', '8 mm keyed shaft, 50 mm', ['3A5'], G_HW, {ax: 3, ref: 'j2Arm', d: 160}],
  ['j3Thrust', 'AXK3552 thrust bearing and washers', ['P.j3Thrust'], G_HW, {ax: 3, ref: 'j2Arm', d: 150}],
  ['j3Spindle', 'J3 spindle', ['3A1'], G_ST, {ax: 3, ref: 'j2Arm', d: 200}],
  ['j3Retainer', 'J3 spindle retainer', ['P.j3Ret'], G_ST, {ax: 3, ref: 'j3Spindle', d: 120}],
  ['j3Mount', 'J3 motor mount', ['2A5', '2A14'], G_ST, {ax: 3, ref: 'j2Arm', d: 170}],
  ['j3Motor', 'J3 gear motor, 50:1', ['2M0', '2A3', '2A6', '2A8', '2A9', '2A15'], G_MO, {ax: 3, ref: 'j2Arm', d: 250}],
  ['j3Washers', 'M4 washer', [['2A16'], ['2A17'], ['2A18'], ['2A19']], G_FA, {ax: 3, ref: 'j2Arm', d: 110}],
  ['j3Screws', 'M4×20 socket head', [['2A10'], ['2A11'], ['2A12'], ['2A13']], G_FA, {ax: 3, ref: 'j2Arm', d: 140}],
  ['j3PulleyShaft', 'L10 pulley, J3 shaft', ['P.j3PulShaft'], G_HW, {ax: 3, ref: 'j2Arm', d: 120}],
  ['j3PulleyMotor', 'L10 pulley, J3 motor', ['P.j3PulMotor'], G_HW, {ax: 3, ref: 'j2Arm', d: 120}],
  ['j3Belt', '214L timing belt', ['P.j3Belt'], G_HW, {ax: 3, ref: 'j2Arm', d: 150}],
  ['j3Switch', 'J3 limit switch, SV-166-1C25, in the J3 stop', ['2M2', '2M1'], G_EL, {ax: 3, ref: 'j2Arm', d: 130}],
  ['j2CoverSpacer', 'J2 side cover spacers', ['2C0'], G_PR, {ax: 3, ref: 'j2Arm', d: 150}],
  ['j2Covers', 'J2 upper and lower side covers', ['2C1'], G_PR, {ax: 3, ref: 'j2Arm', d: 190}],
  ['logo2', 'AR4 logo, J2 cover', ['2G0', '2G1'], G_PR, {ax: 3, ref: 'j2Arm', d: 120}],
  ['j4Needles', 'B-1616 needle roller bearing', [['P.j4NeedleA'], ['P.j4NeedleB']], G_HW, {ax: 4, ref: 'j4Housing', d: 120}],
  ['j4Housing', 'J4 turret housing', ['3A0'], G_ST, {ax: 3, ref: 'j2Arm', d: 220}],
  ['j4Hub', 'J4 timing hub', ['4M1', '4A5'], G_PR, {ax: 4, ref: 'j4Housing', d: 180}],
  ['j4ThrustF', 'NTA1625 thrust stack, hub', ['P.j4StackF'], G_HW, {ax: 4, ref: 'j4Housing', d: 130}],
  ['j4Shaft', 'J4 main shaft, 1 in tube', ['4A2'], G_ST, {ax: 4, ref: 'j4Housing', d: 240}],
  ['j5Mount', 'J5 motor mount', ['4A3', '4A4'], G_ST, {ax: 4, ref: 'j4Housing', d: 170}],
  ['j4ThrustB', 'NTA1625 thrust stack, motor mount', ['P.j4StackB'], G_HW, {ax: 4, ref: 'j4Housing', d: 130}],
  ['j5Motor', 'J5 lead-screw motor', ['4M0', 'P.j5Screw'], G_MO, {ax: 4, ref: 'j4Housing', d: 260}],
  ['j4MotorMount', 'J4 motor mount / switch contact block', ['3A2'], G_ST, {down: 160}],
  ['j4Bracket', 'NEMA 11 bracket and 4 mm spacer', ['3M2', '3M4'], G_MO, {down: 180}],
  ['j4Motor', 'J4 gear motor, NEMA 11 14:1', ['3M0', '3A3'], G_MO, {down: 230}],
  ['j4Pulley', 'XL 10-tooth pulley, 6 mm bore', ['3A4'], G_HW, {down: 160}],
  ['j4Belt', '84XL037 timing belt', ['3M1'], G_HW, {ax: 4, ref: 'j4Housing', d: 150}],
  ['j5Housing', 'J5 housing', ['4A0'], G_ST, {ax: 4, ref: 'j4Housing', d: 260}],
  ['j5Carrier', 'J5 belt carrier with POM nut and LM3UU', ['P.j5Carrier'], G_ST, {up: 150}],
  ['j5Rods', '3 mm linear rod, 85 mm', [['P.j5RodA'], ['P.j5RodB']], G_HW, {ax: 4, ref: 'j4Housing', d: 140}],
  ['j5Idler', 'J5 idler block, post and HK1612', ['P.j5Idler'], G_ST, {up: 130}],
  ['j5End', '688Z bearing', ['P.j5End'], G_HW, {ax: 4, ref: 'j4Housing', d: 110}],
  ['j5Set', 'M3×6 set screw', [['4A7'], ['4A8'], ['4A6'], ['4A9']], G_FA, {up: 90}],
  ['j6Arm', 'J6 main bearing arm', ['4A1'], G_ST, {v: [160, 0, 0]}],
  ['j6Bearing', '30203 taper roller bearing', ['P.j6Brg'], G_HW, {v: [130, 0, 0]}],
  ['j6Housing', 'J6 housing', ['5A0'], G_ST, {v: [-200, 0, 0]}],
  ['j6Cap', 'J6 bearing cap and thrust stack', ['5A2', 'P.j6Stack'], G_ST, {v: [160, 0, 0]}],
  ['j5Plate', 'J5 side plate', ['4C2'], G_PR, {v: [-150, 0, 0]}],
  ['j6Pulley', 'XL 15-tooth pulley, J6 post', ['5A3'], G_HW, {v: [-130, 0, 0]}],
  ['j5Switch', 'J5 limit switch, SV-166-1C25', ['P.j5Switch'], G_EL, {up: 120}],
  ['j5Belt', '150XL037 timing belt', ['P.j5Belt'], G_HW, {v: [-150, 0, 0]}],
  ['j5Spacer', 'J5 side spacer', ['4C1'], G_PR, {v: [-160, 0, 0]}],
  ['j5Cap', 'J5 side cap', ['4C0'], G_PR, {v: [-190, 0, 0]}],
  ['logo4', 'AR4 logo, J5 side cap', ['4G0', '4G1'], G_PR, {v: [-130, 0, 0]}],
  ['j6Motor', 'J6 gear motor, NEMA 14 19:1', ['5M0', '5A1', '5A4', '5A6'], G_MO, {ax: 6, ref: 'j6Housing', d: 220}],
  ['gripMount', 'J6 gripper mount', ['6A0'], G_ST, {ax: 6, ref: 'j6Housing', d: 170}],
  ['j6Switch', 'J6 limit switch XV-152-1C25, printed tip', ['5A5', '5M1', '5M2', '5M3', '5M4', '5M5'], G_EL, {up: 120}],
  ['j4Switch', 'J4 limit switch, SV-166-1C25', ['3M3', '3M5', '3M6', '3M7', '3M8', '3M9', '3M10'], G_EL, {up: 130}],
  ['j5Bracket', 'J5 motor bracket', ['4M2'], G_PR, {up: 130}],
  ['gHolder', 'Gripper servo holder', ['GB1'], G_GR, {ax: 6, ref: 'j6Housing', d: 200}],
  ['gBody', 'Gripper body and guide rod', ['GB0', 'GB4'], G_GR, {ax: 6, ref: 'j6Housing', d: 220}],
  ['gServo', 'DS3225MG servo', ['GB2', 'GB3', 'GB5', 'GB7'], G_GR, {ax: 6, ref: 'j6Housing', d: 200}],
  ['gPinion', 'Servo pinion', ['GB6'], G_GR, {ax: 6, ref: 'j6Housing', d: 130}],
  ['gJaws', 'Gripper jaw', [['GJ0'], ['GK0']], G_GR, {ax: 6, ref: 'j6Housing', d: 150}],
  ['panel', 'Rear panel module (newer CAD)', ['BE3'], G_PR, {v: [0, 0, -170]}],
  ['panelSwitch', 'Panel switch (newer CAD)', ['BE4'], G_EL, {v: [0, 0, -150]}],
  ['gx16', 'Panel socket (newer CAD)', ['BE5'], G_EL, {v: [0, 0, -150]}],
  ['encl2', 'Enclosure upper frame (CAD)', ['BE1'], G_PR, {up: 190}],
  ['bayLid', 'J1 base enclosure lid', ['BE2'], G_PR, {up: 230}]
];
/* the manual's own fastener table (BOM p28): quantities for the whole robot */
var HW_BOM = [['#6 tf', 6], ['M3x10 fh', 13], ['M3x10 set', 4], ['M3x14 pan', 10], ['M3x14 shcs', 6], ['M3x18 shcs', 4], ['M3x20 fh', 6], ['M3x20 pan', 6], ['M3x25 pan', 24],
  ['M3x3 set', 4], ['M3x4 set', 10], ['M3x5 shcs', 1], ['M3x6 set', 7], ['M3x8 shcs', 9], ['M4 nut', 4], ['M4 washer', 12], ['M4x10 fh', 16], ['M4x10 set', 12], ['M4x10 shcs', 16],
  ['M4x14 fh', 2], ['M4x14 shcs', 1], ['M4x18 fh', 3], ['M4x20 pan', 2], ['M4x20 shcs', 8], ['M4x35 pan', 4], ['M4x5 set', 20], ['M6x14 shcs', 13], ['M6x18 fh', 9], ['M6x20 shcs', 3], ['M8x14 shcs', 1]];
var QTY = {};   /* the manual's counts where the CAD draws one of several */
function linkOf(code){ return code.slice(0, 2) === 'P.' ? PLINK[code.slice(2)] : BODY[code].link; }
var KIT = {}; KITS.forEach(function(k){ var sets = typeof k[2][0] === 'string' ? null : k[2]; var codes = sets ? [].concat.apply([], sets) : k[2];
  var links = codes.map(linkOf).filter(function(l, i, a){ return a.indexOf(l) === i; });
  if (links.length > 1 && k[0] !== 'gJaws') throw new Error('kit ' + k[0] + ' spans links ' + links.join(','));
  KIT[k[0]] = {key: k[0], name: k[1], sets: sets, codes: codes, group: k[3], from: k[4], qty: QTY[k[0]] || (sets ? sets.length : 1), link: links[0]}; });
(function(){ var used = {}; KITS.forEach(function(k){ KIT[k[0]].codes.forEach(function(c){ if (used[c]) throw new Error(c + ' in two kits'); used[c] = 1; }); });
  var miss = Object.keys(BODY).filter(function(c){ return !used[c]; }); if (miss.length) console.warn('CAD bodies in no kit: ' + miss.join(' ')); })();
function buildKit(key){ var K = KIT[key]; if (!K.sets) return group.apply(null, K.codes.map(bodyMesh));
  return group.apply(null, K.sets.map(function(s){ return group.apply(null, s.map(bodyMesh)); })); }
Object.keys(KIT).forEach(function(k){ P[k] = function(){ return buildKit(k); }; NAMES[k] = KIT[k].name; });
var THUMB_ONLY = {};   /* a kit of several pieces thumbnails as one piece; the badge gives the count */
Object.keys(KIT).forEach(function(k){ if (KIT[k].sets) THUMB_ONLY[k] = function(){ return group.apply(null, KIT[k].sets[0].map(bodyMesh)); }; });
function SIDE(sg){ var v = new T.Vector3().fromArray(CONFIG.view); return new T.Vector3(v.z, 0, -v.x).normalize().multiplyScalar(sg); }   /* screen right (+1) or left (-1) in the default view */
/* named points for marks that must land on a visible spot rather than a kit's centre ('~name' in the copy) */
var POINTS = {
  encl1Rim: function(){ var c = KITBOX.encl1.getCenter(new T.Vector3()), j = JP(1); var f = new T.Vector3(j.x - c.x, 0, j.z - c.z).normalize(); return new T.Vector3(j.x, 16 * MM, j.z).addScaledVector(f, 78 * MM); },
  platformRim: function(){ var j = JP(1); return new T.Vector3(j.x, 100 * MM, j.z).addScaledVector(SIDE(1), 40 * MM); },   /* the rim beside the J2 housing, on the screen-right side */
  j1HousingSide: function(){ var j = JP(1); return new T.Vector3(j.x, 62 * MM, j.z).addScaledVector(SIDE(-1), 43 * MM); },
  j1BeltRun: function(){ var c1 = JP(1), c2 = onShaft('BA6', 1), m = c1.clone().add(c2).multiplyScalar(0.5); var d = c2.clone().sub(c1); var p = new T.Vector3(-d.z, 0, d.x).normalize(); if (p.x + p.z < 0) p.negate(); m.y = 10 * MM; return m.addScaledVector(p, 31 * MM); },
  j4TubeEnd: function(){ var c = KITBOX.j4Shaft.getCenter(new T.Vector3()), h = KITBOX.j4Housing.getCenter(new T.Vector3()), a = JA(4); return c.addScaledVector(a, (a.dot(c.clone().sub(h)) < 0 ? -1 : 1) * 50 * MM); },
  j4Bore: function(){ return JP(4).addScaledVector(JA(4), 35.3 * MM).addScaledVector(UPV, 13 * MM); },
  j5CarrierFront: function(){ return JP(4).addScaledVector(JA(4), (J5.carrier0 + 10) * MM); }
};
