import * as THREE from 'three';
import { computeTacticalGeometry } from '../shaw/shawGeometry';
import { AircraftSnapshot, TacticalGeometry } from '../shaw/shawTypes';
import { AggressiveFlightCommand, AggressiveManeuverType, AggressiveState } from './aggressiveTypes';

/**
 * "Berserker" tactical FSM: a maximally aggressive fighter doctrine, reusing
 * the same geometry (`computeTacticalGeometry`) and flight-control pipeline
 * as {@link FighterTacticalFSM} (Shaw) but with a very different philosophy.
 *
 * Unlike the balanced BFM `AiPilot` (which disengages via `EXTEND` to rebuild
 * energy and breaks defensively off a tracking threat) or Shaw's fair
 * doctrinal Offensive/Neutral/Defensive matrix, this model:
 * - Never disengages/extends to rebuild energy — it always presses the attack
 *   regardless of energy state.
 * - Never breaks defensively away from a threat — a bandit tracking us from
 *   the rear is answered with a scissors counter-attack turned *into* the
 *   threat, not a break turn or defensive spiral away from it.
 * - Commits to head-on gunfights on a neutral merge instead of a cautious
 *   lead turn / energy climb.
 * - Fires with a wider tracking-angle cone and out to a longer range than
 *   Shaw/Classic, trading accuracy for constant pressure (snap-shooting).
 */
export class AggressiveTacticalFSM {
    private currentState: AggressiveState = 'MERGE';
    private latchedManeuver: AggressiveManeuverType = 'HEAD_ON_PRESS';

    private readonly gunMaxRange: number;
    /** Snap-shoot beyond the "clean" gun range: trades accuracy for pressure. */
    private readonly snapShotRange: number;
    private readonly overshootVc: number;
    private readonly combatSpeed: number;
    private readonly maxSpeed: number;

    private readonly _dir = new THREE.Vector3();
    private readonly _lead = new THREE.Vector3();
    private readonly _tmp = new THREE.Vector3();

    constructor(options: {
        gunRange?: number;
        overshootVc?: number;
        combatSpeed?: number;
        maxSpeed?: number;
    } = {}) {
        this.gunMaxRange = options.gunRange ?? 900;
        this.snapShotRange = this.gunMaxRange * 1.2;
        // Looser than Shaw's default (80): tolerates more closure before
        // yo-yo-ing away, staying nose-on/close far longer.
        this.overshootVc = options.overshootVc ?? 110;
        this.combatSpeed = options.combatSpeed ?? 210;
        this.maxSpeed = options.maxSpeed ?? 240;
    }

    getState(): AggressiveState {
        return this.currentState;
    }

    getManeuverLabel(): string {
        return this.latchedManeuver;
    }

    update(self: AircraftSnapshot, target: AircraftSnapshot, _delta: number): AggressiveFlightCommand {
        const geom = computeTacticalGeometry(self, target);
        this.currentState = this.evaluateState(geom);

        switch (this.currentState) {
            case 'COUNTER': return this.executeCounter(self, target, geom);
            case 'ATTACK': return this.executeAttack(self, target, geom);
            case 'MERGE':
            default: return this.executeMerge(self, target, geom);
        }
    }

    /**
     * Threat detection mirrors the doctrinal models' geometry (bandit
     * tracking us from our rear hemisphere, in range) but the *response*
     * never disengages — see {@link executeCounter}. Offense is judged more
     * generously (wider cone, longer range) than Shaw/Classic, matching the
     * doctrine of always pressing rather than holding out for a clean shot.
     */
    private evaluateState(geom: TacticalGeometry): AggressiveState {
        if (geom.taa < 60 * Math.PI / 180 && geom.ata > 120 * Math.PI / 180 && geom.range < 2500) {
            return 'COUNTER';
        }
        if (geom.aot < 75 * Math.PI / 180 && geom.range < 5000) {
            return 'ATTACK';
        }
        return 'MERGE';
    }

    private executeAttack(
        self: AircraftSnapshot,
        target: AircraftSnapshot,
        geom: TacticalGeometry,
    ): AggressiveFlightCommand {
        let maneuver: AggressiveManeuverType = 'LEAD_PURSUIT';
        let targetSpeed = Math.min(this.maxSpeed, this.combatSpeed * 1.05);
        let allowHardTurn = true;

        // High yo-yo only when an overshoot is truly imminent at knife-fight
        // range — no low-yo-yo/lag-pursuit caution otherwise, it just muscles
        // the lead-pursuit turn at max-G.
        if (geom.closureRate > this.overshootVc && geom.range < 700) {
            maneuver = 'HIGH_YO_YO';
            this._dir.copy(geom.losVector).addScaledVector(self.up, 0.55).normalize();
            targetSpeed = this.combatSpeed * 0.9;
            allowHardTurn = false;
        } else {
            const tof = geom.range / 800;
            this._lead.copy(target.position).addScaledVector(target.velocity, tof);
            this._dir.copy(this._lead).sub(self.position).normalize();
        }

        this.latchedManeuver = maneuver;
        const fireGuns = geom.range <= this.snapShotRange && geom.ata < 14 * Math.PI / 180;
        return {
            stateName: 'ATTACK',
            maneuverName: maneuver,
            targetDirection: this._dir.clone(),
            targetSpeed,
            targetGForce: self.maxG,
            useAirbrakes: false,
            fireGuns,
            allowHardTurn,
        };
    }

    private executeMerge(
        self: AircraftSnapshot,
        target: AircraftSnapshot,
        geom: TacticalGeometry,
    ): AggressiveFlightCommand {
        // No lead turn / energy climb finesse: drive nose-to-nose and take
        // the gunfight if it's in range, then commit to the tightest
        // possible reversal to regain an offensive angle right after the pass.
        let maneuver: AggressiveManeuverType = 'HEAD_ON_PRESS';
        this._dir.copy(geom.losVector);
        const targetSpeed = Math.min(this.maxSpeed, this.combatSpeed * 1.1);

        if (geom.range < 1500 && geom.closureRate > 0) {
            maneuver = 'POST_MERGE_REVERSAL';
            const side = self.right.dot(target.velocity) > 0 ? 1 : -1;
            this._dir.copy(self.forward).addScaledVector(self.right, side * 1.4).normalize();
        }

        this.latchedManeuver = maneuver;
        return {
            stateName: 'MERGE',
            maneuverName: maneuver,
            targetDirection: this._dir.clone(),
            targetSpeed,
            targetGForce: self.maxG,
            useAirbrakes: false,
            fireGuns: geom.range <= this.snapShotRange && geom.ata < 10 * Math.PI / 180,
            allowHardTurn: true,
        };
    }

    private executeCounter(
        self: AircraftSnapshot,
        target: AircraftSnapshot,
        geom: TacticalGeometry,
    ): AggressiveFlightCommand {
        // Never break away: roll and pull *into* the bandit's flight path,
        // cutting inside their turn radius to force an overshoot rather than
        // extending range to escape. This is the core "never flees" trait.
        const maneuver: AggressiveManeuverType = 'SCISSORS_COUNTER';
        const cut = self.right.dot(target.forward) > 0
            ? this._tmp.copy(self.right)
            : this._tmp.copy(self.right).negate();
        this._dir.copy(target.forward).addScaledVector(cut, 1.2).normalize();

        this.latchedManeuver = maneuver;
        return {
            stateName: 'COUNTER',
            maneuverName: maneuver,
            targetDirection: this._dir.clone(),
            targetSpeed: Math.min(this.maxSpeed, self.cornerVelocity * 1.05),
            targetGForce: self.maxG,
            useAirbrakes: false,
            fireGuns: geom.range <= this.snapShotRange && geom.ata < 14 * Math.PI / 180,
            allowHardTurn: true,
        };
    }
}
