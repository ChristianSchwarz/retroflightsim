import numpy as np
from import_mod import (Bundle, world_matrix, mesh_geometry, _FLIP_X,
                        _should_include, DEFAULT_SWATCH_MAX)

INCLUDE = {"F-16A Sabers"}
SWATCH_MAX = 64
bundle = Bundle("mods/Cold_War_Planes.zip")

focus = {"Fuselage", "Nose", "WingL", "WingR",   # reported NOT drawn
         "Cockpit", "Tail", "CanopyEject", "SpeedbrakeLL"}  # drawn (control)

seen = set()
for o in bundle.env.objects:
    if o.type.name != 'GameObject':
        continue
    go = o.read()
    name = go.m_Name
    if name not in focus or name in seen:
        continue
    mesh_filter = None; mat_pids = []
    for comp in go.m_Component:
        co = bundle.by_path.get(comp.component.path_id)
        if co is None: continue
        tn = co.type.name
        if tn == 'MeshFilter': mesh_filter = bundle.mesh_filters.get(comp.component.path_id)
        elif tn == 'MeshRenderer':
            tt = co.read_typetree()
            mat_pids = [m['m_PathID'] for m in tt.get('m_Materials', [])]
    if mesh_filter is None or not mat_pids:
        continue
    if not any(bundle.materials.get(pid, {}).get('name','') in INCLUDE for pid in mat_pids):
        continue
    seen.add(name)
    mesh = bundle.meshes.get(mesh_filter.m_Mesh.path_id)
    verts, uvs, sub_faces, sub_face_t = mesh_geometry(mesh, mat_pids) if mesh else (np.array([]),None,[],[])
    print(f"\n=== {name}  submeshes={len(sub_faces)}  mat_pids={len(mat_pids)} ===")
    for si in range(len(sub_faces)):
        pid = mat_pids[si if si < len(mat_pids) else 0]
        mat = bundle.materials.get(pid, {})
        mn = mat.get('name','?')
        tex_pid = mat.get('main_tex')
        tex = bundle.textures.get(tex_pid) if tex_pid else None
        tsize = f"{tex['w']}x{tex['h']}" if tex else "none"
        is_swatch = bool(tex and tex.get('array') is not None and tex['w']<=SWATCH_MAX and tex['h']<=SWATCH_MAX)
        col = mat.get('color')
        alpha = mat.get('alpha')
        nf = len(sub_faces[si])
        colourable = is_swatch or bool(col)
        flag = "" if colourable else "  <-- DROPPED (not colourable)"
        print(f"  sub[{si}] faces={nf:6} mat='{mn}' tex={tsize} swatch={is_swatch} "
              f"color={col} alpha={alpha}{flag}")
