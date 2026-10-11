"""Split the AR4 MK4/MK5 visual meshes into bodies, simplify them, and pack them.

Output (to argv[2]):
  parts.bin   all bodies: int16 positions (quantised to each body's box) then uint16/uint32 indices
  parts.json  index: one entry per body {f, i, link, tris, min, max, vOff, vCount, iOff, iCount, idx32, hull}
Units: metres, in the mesh's own (link visual) frame.
"""
import sys, os, json, struct
import numpy as np, trimesh, fast_simplification

SRC = sys.argv[1]          # meshes/ar4_mk5
OUT = sys.argv[2]
GRIP = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(OUT, exist_ok=True)

FILES = [
    ('Link_Base_Enclosure', 'base'), ('Link_Base_Aluminum', 'base'), ('Link_Base_Motor', 'base'),
    ('Link_1_Aluminum', 'l1'), ('Link_1_Motor', 'l1'),
    ('Link_2_Aluminum', 'l2'), ('Link_2_Motor', 'l2'), ('Link_2_Cover', 'l2'), ('Link_2_Logo', 'l2'),
    ('Link_3_Aluminum', 'l3'), ('Link_3_Motor', 'l3'),
    ('Link_4_Aluminum', 'l4'), ('Link_4_Motor', 'l4'), ('Link_4_Cover', 'l4'), ('Link_4_Logo', 'l4'),
    ('Link_5_Aluminum', 'l5'), ('Link_5_Motor', 'l5'),
    ('Link_6_Aluminum', 'l6'),
]

def decimate(p, target):
    if len(p.faces) <= target:
        return p
    v, f = fast_simplification.simplify(p.vertices.astype(np.float32), p.faces.astype(np.int32), target_count=target)
    return trimesh.Trimesh(v, f, process=True)

def simplify(p):
    n = len(p.faces)
    ext = p.extents
    # threaded fasteners and knurled knobs: tens of thousands of facets on a part a few mm long.
    # Their hull is the part as it reads at manual scale (a stud, a nut); keep about 200 facets.
    if n > 2500 and ext.max() < 0.03:
        return p, True
    cap = 400 if ext.max() < 0.03 else (1600 if ext.max() < 0.06 else 2400)
    return decimate(p, cap), False

blob = bytearray()
index = []
total = 0
def add(name, link, parts):
    global total
    for i, p in enumerate(parts):
        if len(p.faces) < 4 or p.extents.max() < 0.0006:
            continue   # stray slivers (CAD export leftovers, a few are single triangles)
        q, hull = simplify(p)
        if hull:
            ext = p.extents; o = np.argsort(ext)          # fasteners: one clean cylinder along the long axis
            a, b, c = ext[o[0]], ext[o[1]], ext[o[2]]
            ax = None
            if abs(b - c) / max(b, c) < 0.16: ax = int(o[0])   # flat: washer, nut (axis = thin dimension)
            elif abs(a - b) / max(a, b) < 0.16: ax = int(o[2]) # long: pin, standoff, screw
            if ax is not None:
                mn = p.bounds[0]; mx = p.bounds[1]
                rr = [ext[k] for k in range(3) if k != ax]
                index.append(dict(f=name, i=i, link=link, tris=0, src=int(len(p.faces)), hull=True,
                                  min=[round(x, 6) for x in mn], max=[round(x, 6) for x in mx],
                                  cyl=dict(axis=ax, r=round(float(sum(rr)) / 4, 6), h=round(float(ext[ax]), 6))))
                continue
            q = decimate(p.convex_hull, 600)
        v = np.asarray(q.vertices, dtype=np.float64); f = np.asarray(q.faces, dtype=np.int64)
        mn = v.min(0); mx = v.max(0); span = np.maximum(mx - mn, 1e-9)
        qv = np.round((v - mn) / span * 65535 - 32768).astype(np.int16)
        while len(blob) % 4: blob.append(0)
        vOff = len(blob); blob.extend(qv.tobytes())
        idx32 = len(v) > 65535
        while len(blob) % 4: blob.append(0)
        iOff = len(blob); blob.extend(f.astype(np.uint32 if idx32 else np.uint16).tobytes())
        total += len(f)
        index.append(dict(f=name, i=i, link=link, tris=int(len(f)), src=int(len(p.faces)), hull=hull,
                          min=[round(x, 6) for x in mn], max=[round(x, 6) for x in mx],
                          vOff=vOff, vCount=int(len(v)), iOff=iOff, iCount=int(f.size), idx32=idx32))

for name, link in FILES:
    m = trimesh.load(os.path.join(SRC, name + '.STL'), force='mesh')
    m.merge_vertices(digits_vertex=6)
    parts = m.split(only_watertight=False)
    parts = sorted(parts, key=lambda p: -p.area)
    add(name, link, parts)

if GRIP:
    for name in ['gripper_base_link', 'gripper_jaw1_link', 'gripper_jaw2_link']:
        m = trimesh.load(os.path.join(GRIP, name + '.stl'), force='mesh')
        m.merge_vertices(digits_vertex=6)
        parts = sorted(m.split(only_watertight=False), key=lambda p: -p.area)
        add(name, 'grip', parts)

open(os.path.join(OUT, 'parts.bin'), 'wb').write(bytes(blob))
json.dump(index, open(os.path.join(OUT, 'parts.json'), 'w'), indent=0)
print('bodies', len(index), 'tris', total, 'bytes', len(blob))
