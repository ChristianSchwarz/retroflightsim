import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { PlayerEntity } from '../../scene/entities/player';
import { ExteriorViewHeading } from './exteriorFrontBehindCameraUpdater';
import { AiExteriorCameraUpdater, ChaseTarget } from './aiExteriorCameraUpdater';
import { duelMidpoint } from './duelCameraUtils';

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
    return Math.abs((px - ax) * dz - (pz - az) * dx) / len;
}

function cameraForward(camera: THREE.PerspectiveCamera): THREE.Vector3 {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
}

function isInFrontOfCamera(camera: THREE.PerspectiveCamera, worldPoint: THREE.Vector3): boolean {
    const forward = cameraForward(camera);
    const toPoint = worldPoint.clone().sub(camera.position).normalize();
    return forward.dot(toPoint) > 0;
}

function isLookingAt(camera: THREE.PerspectiveCamera, target: THREE.Vector3, tolerance = 0.999): boolean {
    const forward = cameraForward(camera);
    const toTarget = target.clone().sub(camera.position).normalize();
    return forward.dot(toTarget) > tolerance;
}

describe('AiExteriorCameraUpdater', () => {
    it('keeps the camera on the axis joining player and target even when the target is not facing the player', () => {
        const playerPos = new THREE.Vector3(0, 0, 0);
        const targetPos = new THREE.Vector3(0, 0, -500);
        const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

        const player = actorAt(playerPos);
        const target = chaseTargetAt(targetPos, targetQuat);
        const camera = new THREE.PerspectiveCamera();
        const updater = new AiExteriorCameraUpdater(player, camera, target, ExteriorViewHeading.BACK);

        updater.update(0);

        const distance = horizontalDistanceToLine(camera.position, playerPos, targetPos);
        assert.ok(distance < 1e-6, `expected camera on axis, but it is ${distance}m off`);
    });

    it('places BACK and FRONT on opposite sides outside the player-target segment', () => {
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

        assert.ok((backZ - playerPos.z) * (backZ - targetPos.z) > 0, 'BACK should sit outside the segment');
        assert.ok((frontZ - playerPos.z) * (frontZ - targetPos.z) > 0, 'FRONT should sit outside the segment');
        assert.ok((backZ - playerPos.z) * (frontZ - playerPos.z) < 0, 'BACK and FRONT should be on opposite sides');
    });

    it('aims at the duel midpoint and keeps both aircraft in front of the camera', () => {
        const playerPos = new THREE.Vector3(120, 30, -80);
        const targetPos = new THREE.Vector3(-40, 60, 300);
        const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.3);
        const midpoint = duelMidpoint(playerPos, targetPos, new THREE.Vector3());

        for (const heading of [ExteriorViewHeading.BACK, ExteriorViewHeading.FRONT]) {
            const player = actorAt(playerPos);
            const target = chaseTargetAt(targetPos, targetQuat);
            const camera = new THREE.PerspectiveCamera();
            const updater = new AiExteriorCameraUpdater(player, camera, target, heading);

            updater.update(0);

            assert.ok(isLookingAt(camera, midpoint), `expected ${heading} view to look at midpoint`);
            assert.ok(isInFrontOfCamera(camera, playerPos), `player not visible in ${heading} view`);
            assert.ok(isInFrontOfCamera(camera, targetPos), `target not visible in ${heading} view`);
        }
    });
});
