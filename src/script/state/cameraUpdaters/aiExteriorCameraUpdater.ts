import * as THREE from 'three';
import { PlayerEntity } from '../../scene/entities/player';
import { CameraUpdater } from './cameraUpdater';
import { ExteriorViewHeading } from './exteriorFrontBehindCameraUpdater';
import { placeDuelAxisCamera } from './duelCameraUtils';


/** Anything that can be chased by an exterior camera. */
export interface ChaseTarget {
    getDisplayPosition(): THREE.Vector3;
    getDisplayQuaternion(): THREE.Quaternion;
}

/** Initial opponent standoff ahead of the player (m). */
export const AI_SPAWN_DISTANCE_M = 500;

/**
 * F6 exterior view — mirror of F2, but orbiting the AI opponent and looking at
 * the player. Press F6 again to toggle behind/front of the enemy.
 */
export class AiExteriorCameraUpdater extends CameraUpdater {

    private _axis = new THREE.Vector3();
    private _lookAt = new THREE.Vector3();

    constructor(
        actor: PlayerEntity,
        camera: THREE.PerspectiveCamera,
        private orbitSubject: ChaseTarget,
        private heading: ExteriorViewHeading = ExteriorViewHeading.BACK,
    ) {
        super(actor, camera);
    }

    setHeading(heading: ExteriorViewHeading): void {
        this.heading = heading;
    }

    update(delta: number): void {
        const subjectPos = this.orbitSubject.getDisplayPosition();
        const playerPos = this.actor.getDisplayPosition();

        if (this.heading === ExteriorViewHeading.BACK) {
            // Behind the opponent on the player-target axis.
            placeDuelAxisCamera(this.camera, subjectPos, playerPos, -1, this._axis, this._lookAt);
        } else {
            // Player-side anchor: same geometry as the F2 locked exterior view.
            placeDuelAxisCamera(this.camera, playerPos, subjectPos, -1, this._axis, this._lookAt);
        }
    }
}
