import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { PlayerEntity } from '../../scene/entities/player';
import { ExteriorViewHeading } from './exteriorFrontBehindCameraUpdater';
import { AiExteriorCameraUpdater, ChaseTarget } from './aiExteriorCameraUpdater';

function actorAt(position: THREE.Vector3): PlayerEntity {
    return {
        getDisplayPosition: () => position,
    } as unknown as PlayerEntity;
}

function chaseTargetAt(position: THREE.Vector3, quaternion: THREE.Quaternion): ChaseTarget {
    return {
        getDisplayPosition: () => position,
        getDisplayQuaternion: () => quaternion,
    };
}

// Distance (in the XZ plane) from `point` to the infinite line through `a` and `b`.
function horizontalDistanceToLine(point: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
    const ax = a.x, az = a.z;
    const bx = b.x, bz = b.z;
    const px = point.x, pz = point.z;
    const dx = bx - ax, dz = bz - az;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 1e-9) {
        return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2);
    }
    // 2D cross product magnitude / line length.
    return Math.abs((px - ax) * dz - (pz - az) * dx) / len;
}

describe('AiExteriorCameraUpdater', () => {
    it('keeps the camera on the axis joining player and target even when the target is not facing the player', () => {
        const playerPos = new THREE.Vector3(0, 0, 0);
        const targetPos = new THREE.Vector3(0, 0, -500);
        // Target facing perpendicular to the line-of-sight (yawed 90deg), so a
        // heading-based offset would push the camera off to the side.
        const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

        const player = actorAt(playerPos);
        const target = chaseTargetAt(targetPos, targetQuat);
        const camera = new THREE.PerspectiveCamera();
        const updater = new AiExteriorCameraUpdater(player, camera, target, ExteriorViewHeading.BACK);

        updater.update(0);

        const distance = horizontalDistanceToLine(camera.position, playerPos, targetPos);
        assert.ok(distance < 1e-6, `expected camera on axis, but it is ${distance}m off`);
    });

    it('flips to the other side of the target when the heading toggles', () => {
        const playerPos = new THREE.Vector3(0, 0, 0);
        const targetPos = new THREE.Vector3(0, 0, -500);
        const targetQuat = new THREE.Quaternion();

        const player = actorAt(playerPos);
        const target = chaseTargetAt(targetPos, targetQuat);
        const camera = new THREE.PerspectiveCamera();
        const updater = new AiExteriorCameraUpdater(player, camera, target, ExteriorViewHeading.BACK);

        updater.update(0);
        const backZ = camera.position.z;

        updater.setHeading(ExteriorViewHeading.FRONT);
        updater.update(0);
        const frontZ = camera.position.z;

        // BACK continues past the target away from the player; FRONT sits between
        // the player and the target. They should land on opposite sides of the target.
        assert.ok((backZ - targetPos.z) * (frontZ - targetPos.z) < 0);
    });

    it('always looks at the player', () => {
        const playerPos = new THREE.Vector3(120, 30, -80);
        const targetPos = new THREE.Vector3(-40, 60, 300);
        const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.3);

        const player = actorAt(playerPos);
        const target = chaseTargetAt(targetPos, targetQuat);
        const camera = new THREE.PerspectiveCamera();
        const updater = new AiExteriorCameraUpdater(player, camera, target, ExteriorViewHeading.BACK);

        updater.update(0);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
        const toPlayer = playerPos.clone().sub(camera.position).normalize();
        assert.ok(forward.dot(toPlayer) > 0.999, `camera is not looking at the player (dot=${forward.dot(toPlayer)})`);
    });
});
