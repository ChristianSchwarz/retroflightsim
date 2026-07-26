import json, math
import numpy as np
from collections import defaultdict
from import_mod import (Bundle, world_matrix, mesh_geometry, _FLIP_X,
                        _should_include, sample_hex, rgba01_to_hex)

INCLUDE = {"F-16A Sabers"}
SWATCH_MAX = 64
GRAY_LO, GRAY_HI = 95, 205
bundle = Bundle("mods/Cold_War_Planes.zip")
world_cache = {}

def grayify(h):
    r, g, b = int(h[1:3],16), int(h[3:5],16), int(h[5:7],16)
    lum = 0.299*r + 0.587*g + 0.114*b
    v = int(round(GRAY_LO + (GRAY_HI-GRAY_LO)*(lum/255.0)))
    v = max(0, min(255, v))
    return f'#{v:02x}{v:02x}{v:02x}'

def pal_of(mat):
    tex = bundle.textures.get(mat.get('main_tex')) if mat else None
    if tex is None or tex.get('array') is None: return None
    if tex['w'] <= SWATCH_MAX and tex['h'] <= SWATCH_MAX: return tex['array']
    return None

surfaces = {"ElevatorL","ElevatorR","AileronL","AileronR","Rudder","SlatsL","SlatsR"}
gearset = {"GearNoseWheel","GearMainWheelL","GearMainWheelR","GearNoseStrut",
        "GearMainStrutL","GearMainStrutR","GearNoseBase","GearMainBaseL",
        "GearMainBaseR","GearDoorFront","GearDoorL","GearDoorR","GearNoseDoor",
        "GearLSupport1","GearLSupport2","GearRSupport1","GearRSupport2",
        "GearNoseSupport","GearNoseSupporter1","GearNoseSupporter2"}

part_colors = {}       # part -> {colorkey: facecount}
color_parts = defaultdict(lambda: defaultdict(int))  # colorkey -> {part: faces}
seen = set()
for o in bundle.env.objects:
    if o.type.name != 'GameObject': continue
    go = o.read(); name = go.m_Name
    if name in seen: continue
    if name in surfaces or name in gearset: continue  # body only
    tp=None; mf=None; mp=[]
    for comp in go.m_Component:
        co = bundle.by_path.get(comp.component.path_id)
        if co is None: continue
        t=co.type.name
        if t=='Transform': tp=comp.component.path_id
        elif t=='MeshFilter': mf=bundle.mesh_filters.get(comp.component.path_id)
        elif t=='MeshRenderer':
            mp=[m['m_PathID'] for m in co.read_typetree().get('m_Materials',[])]
    if tp is None or mf is None or not mp: continue
    if not any(bundle.materials.get(p,{}).get('name','') in INCLUDE for p in mp): continue
    seen.add(name)
    mesh = bundle.meshes.get(mf.m_Mesh.path_id)
    if mesh is None: continue
    verts, uvs, sub_faces, sub_face_t = mesh_geometry(mesh, mp)
    if len(verts)==0 or not sub_faces: continue
    hist = defaultdict(int)
    for si, fv in enumerate(sub_faces):
        mat = bundle.materials.get(mp[si if si<len(mp) else 0], {})
        pal = pal_of(mat)
        ft = sub_face_t[si]
        if pal is not None and uvs is not None:
            keys = sample_hex(pal, uvs[ft].mean(axis=1))
        elif mat.get('color'):
            keys = np.full(len(ft), rgba01_to_hex(mat['color']))
        else:
            keys = np.full(len(ft), '#909094')
        for k in keys:
            gk = grayify(str(k)) if str(k).startswith('#') and len(str(k))==7 else str(k)
            hist[gk]+=1
            color_parts[gk][name]+=1
    part_colors[name]=dict(hist)

print("=== PER-PART -> grayscale colour buckets ===")
for name in ["Fuselage","Nose","WingL","WingR","Tail","Cockpit","CanopyEject"]:
    if name in part_colors:
        items = sorted(part_colors[name].items(), key=lambda x:-x[1])
        print(f"{name:12}: " + ", ".join(f"{c}:{n}" for c,n in items))

print("\n=== Are Fuselage/Nose/WingL/WingR colours SHARED with rendered parts? ===")
missing = ["Fuselage","Nose","WingL","WingR"]
for name in missing:
    for c in part_colors.get(name, {}):
        others = {p:n for p,n in color_parts[c].items() if p not in missing}
        shared = "SHARED with "+",".join(others) if others else "UNIQUE to missing-parts"
        print(f"  {name} bucket {c}: {shared}")

print("\n=== f16_body.gltf mesh geometry sanity ===")
g = json.load(open('assets/f16_body.gltf', encoding='utf-8'))
mats = [m['name'] for m in g['materials']]
for mi, mesh in enumerate(g['meshes']):
    prim = mesh['primitives'][0]
    acc = g['accessors'][prim['attributes']['POSITION']]
    mn, mx = acc.get('min'), acc.get('max')
    bad = any(v is None or (isinstance(v,float) and math.isnan(v)) for v in (mn or [])+(mx or []))
    degen = mn==mx
    span = [round(mx[i]-mn[i],3) for i in range(3)] if mn and mx else None
    flag = ""
    if bad: flag=" <-- NaN/None!"
    elif degen: flag=" <-- DEGENERATE (min==max)!"
    print(f"  mesh[{mi}] mat={mats[prim['material']]:9} verts={acc['count']:6} span={span}{flag}")
