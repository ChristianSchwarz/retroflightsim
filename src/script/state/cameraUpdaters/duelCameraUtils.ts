import * as THREE from 'three';
import { UP } from '../../utils/math';

/** Exterior chase offset from the anchor aircraft (m). */
export const DUEL_CAMERA_OFFSET_M = 40;
export const DUEL_CAMERA_HEIGHT_M = 5;

/** Horizontal unit vector from `from` toward `to`. */
export function horizontalAxisFromTo(from: THREE.Vector3, to: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    out.copy(to).sub(from).setY(0);
    if (out.lengthSq() < 1e-6) {
        out.set(0, 0, 1);
    } else {
        out.normalize();
    }
    return out;
}

export function duelMidpoint(a: THREE.Vector3, b: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    return out.copy(a).add(b).multiplyScalar(0.5);
}

/**
 * Place the camera on the line joining two aircraft, outside the segment between
 * them, and aim at their midpoint so both stay in frame.
 *
 * @param anchor  Aircraft the offset is measured from (player side or target side).
 * @param other   The other aircraft (used only to compute axis and midpoint).
 * @param offsetSign  +1 continues past `anchor` away from `other`; -1 sits on the
 *                    far side of `anchor` from `other`.
 */
export function placeDuelAxisCamera(
    camera: THREE.PerspectiveCamera,
    anchor: THREE.Vector3,
    other: THREE.Vector3,
    offsetSign: number,
    axis: THREE.Vector3,
    lookAt: THREE.Vector3,
): void {
    horizontalAxisFromTo(anchor, other, axis);
    duelMidpoint(anchor, other, lookAt);
    camera.position
        .copy(anchor)
        .addScaledVector(UP, DUEL_CAMERA_HEIGHT_M)
        .addScaledVector(axis, DUEL_CAMERA_OFFSET_M * offsetSign);
    camera.lookAt(lookAt);
}
