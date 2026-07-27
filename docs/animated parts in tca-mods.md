# Animated Parts Naming Structure in Tiny Combat Arena

In **Tiny Combat Arena**, there is no hardcoded, universal list for every animated part. The engine directly links your JSON configuration to the node hierarchy in your 3D model (FBX). 

Part names fall into three categories: **Mandatory Names** (for built-in animation controllers), **Custom Names** (for procedural control surfaces), and **Special Function Meshes**.

---

## 1. Mandatory Names (Landing Gear)
If you are using the standard landing gear animation controller provided in the SDK (the `F-4E` example), the Unity Animator strictly requires these exact names for your empty objects/nodes:

| Node Name | Function |
| :--- | :--- |
| `gear nose base` | Rotation/attachment point for the front landing gear. |
| `gear main base L` | Rotation/attachment point for the left landing gear. |
| `gear main base R` | Rotation/attachment point for the right landing gear. |

---

## 2. Custom Names (Control Surfaces)
For aerodynamic control surfaces, **you create the names** in your 3D software and reference them directly in your `Aircraft2` JSON file under the `Animated Parts` array. 

While you can use any name (e.g., `My_Left_Flap`), common conventions include:

*   **Ailerons:** `Aileron_L`, `Aileron_R` (Driven by `Angle By Roll`)
*   **Elevators:** `Elevator_L`, `Elevator_R` (Driven by `Angle By Pitch`)
*   **Rudders:** `Rudder` (Driven by `Angle By Yaw`)
*   **Flaps:** `Flap_L`, `Flap_R` (Driven by flap deployment state)

### JSON Implementation Example
If you name your left aileron node `Aileron_L` in Blender, you map it in the JSON like this:

```json
"AnimatedParts": [
  {
    "Part": "Aileron_L",
    "Axis": [1, 0, 0],
    "Input": "Angle By Roll"
  }
]