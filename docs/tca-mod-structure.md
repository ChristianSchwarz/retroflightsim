# Mod Structure and Compilation Process for Tiny Combat Arena

Creating a mod for **Tiny Combat Arena** using the **Tiny Combat Tools** involves preparing your 3D models with strict hierarchy and orientation rules, configuring materials within a specific Unity environment, and bundling those assets alongside structured JSON data files. 

Here is a detailed guide on how a mod is structured, animated, and compiled for successful import by the game engine.

---

## 1. Environment & Project Setup
To ensure compatibility with the game’s core rendering and physics systems, the mod must be compiled using the exact same environment the game is built on.
*   **Engine:** You must use **Unity 2020.3.30f1**. 
*   **The SDK:** Download or clone the `TinyCombatTools` repository from GitHub and open it as a project in Unity Hub. This project contains the required shaders (like `TinyDiffuse`), shared materials (like `Canopy`), and the TCA Mod Builder tool used to compile the assets.

---

## 2. Model & Mesh Specifications (Blender to Unity)
Before compiling, the 3D model (typically an FBX) must be properly rigged and formatted. 
*   **World Origin:** The world origin `(0,0,0)` of your 3D workspace acts as the aircraft/vehicle's **Center of Mass**.
*   **Axis Orientation:** This is critical. All parts and dummy points must rest at: **X = Right, Y = Up, Z = Forward**. If you want a camera to look forward or an engine to thrust backward, the Z-axis of that specific point dictates its forward facing direction.
*   **Shadows:** Create a low-poly silhouette mesh of your vehicle for shadows. Its origin must perfectly match the world origin. 
*   **Hitboxes (Colliders):** Create basic geometry boxes encompassing your plane for damage calculation, assigned a generic "collider" material. 
*   **Read/Write Enabled:** In Unity’s import settings for your FBX model, you **must** check "Read/Write Enabled." Without this, the game cannot shuffle mesh data at runtime, resulting in errors.

---

## 3. Implementing Features: Colors, Materials, and Special Meshes
Colors and textures are handled entirely by Tiny Combat Tools' custom shaders inside Unity.
*   **Standard Colors:** Assign the `TinyDiffuse` shader. Keep the base color White and the Emission Black. The game relies on **Palette Textures** for coloring, so you will map a palette image as the primary texture.
*   **Canopy (Glass):** Apply the pre-configured `TinyCanopy` shader or use the shared `Canopy` material provided in the SDK. This uses smooth shading to create the game's distinct cockpit glare.
*   **Shadows:** Assign the shared `ShadowDepthOffset` material to your custom shadow mesh (or `ShadowHeightOffset` for ground vehicles). 
*   **Afterburners/Nozzles:** The glowing nozzle interior must be its own separated mesh with exactly one material. By default, it is black, but the game engine automatically shifts it to white (emissive) when the afterburner engages.

---

## 4. Rigging Movable Parts & Animations
There are two ways parts move in the game: programmatic rotation (Control Surfaces) and baked animations (Landing Gear).

*   **Attachment Points (Hardpoints, Cameras, Pilots):** Use Empty objects (Dummies) with the Z-axis pointing in the desired direction. You need designated points for the Pilot Seat, Cockpit Camera, Engine Effects, Wing Trails, and Weapon Pylons.
*   **Control Surfaces (Ailerons, Elevators, Flaps):** 
    *   You don't traditionally animate these. Instead, in your 3D software, place two Empty points at the ends of the control surface's rotation axis, pointing their Z-axes at one another.
    *   Parent the physical mesh of the flap to the main rotation point.
    *   In the final JSON, you will define this part under `Animated Parts` and tell the game whether it responds to Pitch, Roll, or Yaw, and the engine will procedurally rotate it.
*   **Complex Animations (Landing Gear):**
    *   Gear requires an attachment base, a strut model, and a wheel. 
    *   In Unity, you create an **Animator Controller** and an **Animation Clip** (it's highly recommended to duplicate the example `F-4E` animator in the SDK and modify it).
    *   Use the Unity animation timeline to keyframe the rotation and translation of your gear meshes from "Deployed" to "Retracted." 

---

## 5. Compilation Process (Asset Bundling)
The game does not read raw FBX or Material files; they must be packed into an Asset Bundle.
1. Drag your fully textured, animated, and configured model into the Unity Demo Scene.
2. In the top toolbar, go to **Tiny Combat Arena -> Open Mod Builder**.
3. Fill out the mod details (Name, Output Path, Mod Profile). Set the export path to your actual game directory (e.g., `.../TinyCombatArena/Mods/YourModName`).
4. Click **Export Mod**. 
5. The tool packages the materials, meshes, textures, and animators into a compressed asset bundle and generates an `assetlist.json` and a base `mod.json`. 

---

## 6. Mod Directory Structure & Data Integration
The Asset Bundle contains the visuals, but the game needs data to know how it flies and functions. Your mod folder requires a specific nested structure:

*   **`mod.json`**: The core manifest generated by the Mod Builder.
*   **`Data/` Folder**: Contains three subfolders:
    *   **`Aircraft2/`**: The JSON that dictates flight physics (drag, weight, top speed, G-limits, engine thrust, radar). **Crucially**, you must paste the exact path strings found in your `assetlist.json` into the `ModelPath` and `AnimatorPath` fields here. (e.g., `"ModelPath": "assets/yourmod/aircraft/plane.fbx"`).
    *   **`Database/`**: Defines the vehicle's display name, faction, and UI presence. 
    *   **`Loadouts/`**: Dictates what weapons can attach to the pylon points you defined in your 3D model.

By matching the internal names in the JSON to the names of the nodes in your compiled Asset Bundle (like mapping the `gear main base L` object to the landing gear script, or a hit-box to a damageable part list), the game successfully imports and simulates the custom aircraft.