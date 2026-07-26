/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/script/physics/jsbsim/jsbsimCoordinateFrame.ts"
/*!************************************************************!*\
  !*** ./src/script/physics/jsbsim/jsbsimCoordinateFrame.ts ***!
  \************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FT_TO_M: () => (/* binding */ FT_TO_M),
/* harmony export */   M_TO_FT: () => (/* binding */ M_TO_FT),
/* harmony export */   jsbsimAttitudeToQuaternion: () => (/* binding */ jsbsimAttitudeToQuaternion),
/* harmony export */   jsbsimBodyVelocityToWorld: () => (/* binding */ jsbsimBodyVelocityToWorld),
/* harmony export */   jsbsimRatesToWorld: () => (/* binding */ jsbsimRatesToWorld),
/* harmony export */   worldQuaternionToJsbsimAttitude: () => (/* binding */ worldQuaternionToJsbsimAttitude),
/* harmony export */   worldVelocityToJsbsimBody: () => (/* binding */ worldVelocityToJsbsimBody)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "./node_modules/three/build/three.core.js");

const FT_TO_M = 0.3048;
const M_TO_FT = 1 / FT_TO_M;
const _mBasis = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4().makeBasis(new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, -1), new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, 0, 0), new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -1, 0));
const AXIS_REMAP = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion().setFromRotationMatrix(_mBasis);
const AXIS_REMAP_INV = AXIS_REMAP.clone().invert();
const AERO_X = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, 0, 0);
const AERO_Y = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 1, 0);
const AERO_Z = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, 1);
const _qx = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
const _qy = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
const _qz = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
const _qBody = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
function bodyToNedQuaternion(phiRad, thetaRad, psiRad, target) {
    _qx.setFromAxisAngle(AERO_X, phiRad);
    _qy.setFromAxisAngle(AERO_Y, -thetaRad);
    _qz.setFromAxisAngle(AERO_Z, psiRad);
    return target.copy(_qz).multiply(_qy).multiply(_qx);
}
function jsbsimAttitudeToQuaternion(phiRad, thetaRad, psiRad, target = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion()) {
    bodyToNedQuaternion(phiRad, thetaRad, psiRad, _qBody);
    target.copy(AXIS_REMAP).multiply(_qBody).multiply(AXIS_REMAP_INV);
    return target;
}
const _mRot = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
function worldQuaternionToJsbsimAttitude(q) {
    _qBody.copy(AXIS_REMAP_INV).multiply(q).multiply(AXIS_REMAP);
    _mRot.makeRotationFromQuaternion(_qBody);
    const e = _mRot.elements;
    const r00 = e[0], r10 = e[1], r20 = e[2];
    const r21 = e[6], r22 = e[10];
    const thetaRad = -Math.asin(three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(-r20, -1, 1));
    const phiRad = Math.atan2(r21, r22);
    const psiRad = Math.atan2(r10, r00);
    return { phiRad, thetaRad, psiRad };
}
const _vBody = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
function jsbsimBodyVelocityToWorld(uMps, vMps, wMps, qSim, target = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3()) {
    _vBody.set(-uMps, vMps, wMps).applyQuaternion(AXIS_REMAP);
    return target.copy(_vBody).applyQuaternion(qSim);
}
function worldVelocityToJsbsimBody(worldVelocity, qSim) {
    const simBody = worldVelocity.clone().applyQuaternion(qSim.clone().invert());
    const aero = simBody.applyQuaternion(AXIS_REMAP_INV);
    return { uMps: -aero.x, vMps: aero.y, wMps: aero.z };
}
function jsbsimRatesToWorld(pRadS, qRadS, rRadS, target = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3()) {
    target.set(pRadS, -qRadS, rRadS).applyQuaternion(AXIS_REMAP);
    return target;
}


/***/ },

/***/ "./src/script/physics/model/jsbsimFlightModel.ts"
/*!*******************************************************!*\
  !*** ./src/script/physics/model/jsbsimFlightModel.ts ***!
  \*******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   JsbsimFlightModel: () => (/* binding */ JsbsimFlightModel)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "./node_modules/three/build/three.core.js");
/* harmony import */ var _0x62_jsbsim_wasm__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @0x62/jsbsim-wasm */ "./node_modules/@0x62/jsbsim-wasm/dist/index.js");
/* harmony import */ var _0x62_jsbsim_wasm_wasm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @0x62/jsbsim-wasm/wasm */ "./node_modules/@0x62/jsbsim-wasm/dist/wasm.js");
/* harmony import */ var _defs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../defs */ "./src/script/defs.ts");
/* harmony import */ var _utils_math__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../utils/math */ "./src/script/utils/math.ts");
/* harmony import */ var _f16Profile__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../f16Profile */ "./src/script/physics/f16Profile.ts");
/* harmony import */ var _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../jsbsim/jsbsimCoordinateFrame */ "./src/script/physics/jsbsim/jsbsimCoordinateFrame.ts");
/* harmony import */ var _flightModel__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./flightModel */ "./src/script/physics/model/flightModel.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};








const DEG = Math.PI / 180;
const LBF_TO_N = 4.4482216153;
const JSBSIM_DATA_FILES = [
    ['aircraft/f16/f16.xml', '/assets/jsbsim/aircraft/f16/f16.xml'],
    ['engine/F100-PW-229.xml', '/assets/jsbsim/engine/F100-PW-229.xml'],
    ['engine/direct.xml', '/assets/jsbsim/engine/direct.xml'],
];
const MAX_ELEVATOR_RAD = 0.436;
const MAX_AILERON_RAD = 0.375;
const MAX_RUDDER_RAD = 0.524;
class JsbsimFlightModel extends _flightModel__WEBPACK_IMPORTED_MODULE_7__.FlightModel {
    constructor(sdk) {
        super();
        this.sdk = sdk;
        this.stall = -1;
        this.airspeedMps = 0;
        this.lastVelocityForAccel = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
        this.scratchQuat = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
    }
    static create() {
        return __awaiter(this, void 0, void 0, function* () {
            const sdk = yield _0x62_jsbsim_wasm__WEBPACK_IMPORTED_MODULE_1__.JSBSimSdk.create({ moduleUrl: _0x62_jsbsim_wasm_wasm__WEBPACK_IMPORTED_MODULE_2__.wasmModuleUrl, wasmUrl: _0x62_jsbsim_wasm_wasm__WEBPACK_IMPORTED_MODULE_2__.wasmBinaryUrl });
            for (const [runtimePath, url] of JSBSIM_DATA_FILES) {
                const res = yield fetch(url);
                if (!res.ok) {
                    throw new Error(`Failed to fetch JSBSim data file ${url}: HTTP ${res.status}`);
                }
                sdk.writeDataFile(runtimePath, yield res.text());
            }
            if (!sdk.loadModel('f16')) {
                throw new Error('JSBSim failed to load the aircraft/f16/f16.xml model');
            }
            sdk.setPropertyValue('propulsion/engine[0]/set-running', 1);
            const model = new JsbsimFlightModel(sdk);
            model.applyInitialConditions(new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, _defs__WEBPACK_IMPORTED_MODULE_3__.PLANE_DISTANCE_TO_GROUND, 0), new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion(), new three__WEBPACK_IMPORTED_MODULE_0__.Vector3());
            return model;
        });
    }
    applyInitialConditions(position, quaternion, velocity) {
        const { phiRad, thetaRad, psiRad } = (0,_jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.worldQuaternionToJsbsimAttitude)(quaternion);
        const { uMps, vMps, wMps } = (0,_jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.worldVelocityToJsbsimBody)(velocity, quaternion);
        this.sdk.setPropertyValue('ic/terrain-elevation-ft', 0);
        this.sdk.setPropertyValue('ic/h-sl-ft', position.y * _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.M_TO_FT);
        this.sdk.setPropertyValue('ic/phi-rad', phiRad);
        this.sdk.setPropertyValue('ic/theta-rad', thetaRad);
        this.sdk.setPropertyValue('ic/psi-true-rad', psiRad);
        this.sdk.setPropertyValue('ic/u-fps', uMps * _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.M_TO_FT);
        this.sdk.setPropertyValue('ic/v-fps', vMps * _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.M_TO_FT);
        this.sdk.setPropertyValue('ic/w-fps', wMps * _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.M_TO_FT);
        this.sdk.setPropertyValue('ic/p-rad_sec', 0);
        this.sdk.setPropertyValue('ic/q-rad_sec', 0);
        this.sdk.setPropertyValue('ic/r-rad_sec', 0);
        this.sdk.runIc();
        this.obj.position.copy(position);
        this.obj.quaternion.copy(quaternion);
        this.velocity.copy(velocity);
        this.lastVelocityForAccel.copy(velocity);
    }
    reset() {
        super.reset();
        this.applyInitialConditions(this.obj.position, this.obj.quaternion, this.velocity);
    }
    step(delta) {
        this.sdk.setPropertyValue('fcs/elevator-cmd-norm', -this.pitch);
        this.sdk.setPropertyValue('fcs/aileron-cmd-norm', -this.roll);
        this.sdk.setPropertyValue('fcs/rudder-cmd-norm', -this.yaw);
        this.sdk.setPropertyValue('fcs/steer-cmd-norm', -this.yaw);
        this.sdk.setPropertyValue('fcs/throttle-cmd-norm', this.throttle);
        this.sdk.setPropertyValue('gear/gear-cmd-norm', this.landingGearDeployed ? 1 : 0);
        const brake = this.wheelBrakesApplied ? 1 : 0;
        this.sdk.setPropertyValue('fcs/left-brake-cmd-norm', brake);
        this.sdk.setPropertyValue('fcs/right-brake-cmd-norm', brake);
        this.sdk.setPropertyValue('fcs/center-brake-cmd-norm', brake);
        this.effectiveThrottle = this.throttle;
        this.sdk.setDt(delta);
        this.sdk.run();
        const phi = this.sdk.getPropertyValue('attitude/phi-rad');
        const theta = this.sdk.getPropertyValue('attitude/theta-rad');
        let psi = this.sdk.getPropertyValue('attitude/psi-rad');
        const u = this.sdk.getPropertyValue('velocities/u-fps') * _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.FT_TO_M;
        const v = this.sdk.getPropertyValue('velocities/v-fps') * _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.FT_TO_M;
        const w = this.sdk.getPropertyValue('velocities/w-fps') * _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.FT_TO_M;
        (0,_jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.jsbsimAttitudeToQuaternion)(phi, theta, psi, this.scratchQuat);
        (0,_jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.jsbsimBodyVelocityToWorld)(u, v, w, this.scratchQuat, this.velocity);
        const horizSpd = Math.hypot(this.velocity.x, this.velocity.z);
        if (horizSpd > 8) {
            psi = Math.atan2(this.velocity.x, -this.velocity.z) - Math.PI;
        }
        (0,_jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.jsbsimAttitudeToQuaternion)(phi, theta, psi, this.obj.quaternion);
        this.obj.position.x += this.velocity.x * delta;
        this.obj.position.z += this.velocity.z * delta;
        this.obj.position.y = this.sdk.getPropertyValue('position/h-sl-ft') * _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.FT_TO_M;
        if (delta > 0) {
            this.accelWorld.copy(this.velocity).sub(this.lastVelocityForAccel).divideScalar(delta);
        }
        else {
            this.accelWorld.set(0, 0, 0);
        }
        this.lastVelocityForAccel.copy(this.velocity);
        this.airspeedMps = this.sdk.getPropertyValue('velocities/vt-fps') * _jsbsim_jsbsimCoordinateFrame__WEBPACK_IMPORTED_MODULE_6__.FT_TO_M;
        this.angleOfAttackRad = this.sdk.getPropertyValue('aero/alpha-rad');
        this.loadFactorG = -this.sdk.getPropertyValue('accelerations/n-pilot-z-norm');
        this.engineThrustN = this.sdk.getPropertyValue('propulsion/engine[0]/thrust-lbs') * LBF_TO_N;
        const elevatorPosRad = this.sdk.getPropertyValue('fcs/elevator-pos-rad');
        const aileronPosRad = this.sdk.getPropertyValue('fcs/aileron-pos-rad');
        const rudderPosRad = this.sdk.getPropertyValue('fcs/rudder-pos-rad');
        this.commandedElevator = (0,_utils_math__WEBPACK_IMPORTED_MODULE_4__.clamp)(-elevatorPosRad / MAX_ELEVATOR_RAD, -1, 1);
        this.commandedAileron = (0,_utils_math__WEBPACK_IMPORTED_MODULE_4__.clamp)(-aileronPosRad / MAX_AILERON_RAD, -1, 1);
        this.commandedRudder = (0,_utils_math__WEBPACK_IMPORTED_MODULE_4__.clamp)(-rudderPosRad / MAX_RUDDER_RAD, -1, 1);
        this.handleGroundState(phi, theta);
        this.updateStallState();
    }
    handleGroundState(phiRad, thetaRad) {
        const restY = _defs__WEBPACK_IMPORTED_MODULE_3__.PLANE_DISTANCE_TO_GROUND;
        const onGround = this.obj.position.y <= restY + 0.25;
        if (this.obj.position.y > restY + 0.3) {
            this.landed = false;
        }
        const minY = restY - 0.6;
        if (this.obj.position.y < minY) {
            this.obj.position.y = minY;
            if (this.velocity.y < 0)
                this.velocity.y = 0;
        }
        if (!onGround)
            return;
        const speed = this.velocity.length();
        const landingMaxRollRad = _f16Profile__WEBPACK_IMPORTED_MODULE_5__.F16_PROFILE.landingMaxRollDeg * DEG;
        const landingMinPitchRad = _f16Profile__WEBPACK_IMPORTED_MODULE_5__.F16_PROFILE.landingMinPitchDeg * DEG;
        const hardContact = this.velocity.y < -_f16Profile__WEBPACK_IMPORTED_MODULE_5__.F16_PROFILE.landingMaxVerticalSpeedMps;
        const badAttitude = Math.abs(phiRad) > landingMaxRollRad || thetaRad < landingMinPitchRad;
        if (!this.landed && (hardContact || speed > _f16Profile__WEBPACK_IMPORTED_MODULE_5__.F16_PROFILE.landingMaxSpeedMps)) {
            if (!this.landingGearDeployed || hardContact || badAttitude) {
                this.crashed = true;
                return;
            }
        }
        if (!this.landingGearDeployed && this.velocity.y < -1.0) {
            this.crashed = true;
            return;
        }
        if (speed < _f16Profile__WEBPACK_IMPORTED_MODULE_5__.F16_PROFILE.landingMaxSpeedMps && Math.abs(phiRad) < landingMaxRollRad) {
            this.landed = true;
        }
    }
    updateStallState() {
        if (this.landed) {
            this.stall = -1;
            return;
        }
        const stallAoaRad = _f16Profile__WEBPACK_IMPORTED_MODULE_5__.F16_PROFILE.stallAoaDeg * DEG;
        const aoa = Math.abs(this.angleOfAttackRad);
        const aoaStall = this.airspeedMps > 5 ? (0,_utils_math__WEBPACK_IMPORTED_MODULE_4__.clamp)((aoa - stallAoaRad * 0.85) / (stallAoaRad * 0.3), 0, 1) : 0;
        const speedStall = this.obj.position.y > _defs__WEBPACK_IMPORTED_MODULE_3__.PLANE_DISTANCE_TO_GROUND + 5
            ? (0,_utils_math__WEBPACK_IMPORTED_MODULE_4__.clamp)((_f16Profile__WEBPACK_IMPORTED_MODULE_5__.F16_PROFILE.minFlyingSpeedMps - this.airspeedMps) / _f16Profile__WEBPACK_IMPORTED_MODULE_5__.F16_PROFILE.minFlyingSpeedMps, 0, 1) : 0;
        const level = Math.max(aoaStall, speedStall);
        this.stall = level > 0 ? level : -1;
    }
    getStallStatus() {
        return this.stall;
    }
    set position(p) {
        this.applyInitialConditions(p, this.obj.quaternion, this.velocity);
    }
    get position() {
        return this.obj.position;
    }
    set quaternion(q) {
        this.applyInitialConditions(this.obj.position, q, this.velocity);
    }
    get quaternion() {
        return this.obj.quaternion;
    }
    set velocityVector(v) {
        this.applyInitialConditions(this.obj.position, this.obj.quaternion, v);
    }
    get velocityVector() {
        return this.velocity;
    }
}


/***/ },

/***/ "./src/script/physics/worker/jsbsimWorker.ts"
/*!***************************************************!*\
  !*** ./src/script/physics/worker/jsbsimWorker.ts ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "./node_modules/three/build/three.core.js");
/* harmony import */ var _model_jsbsimFlightModel__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../model/jsbsimFlightModel */ "./src/script/physics/model/jsbsimFlightModel.ts");


let flightModel;
let initStarted = false;
const pendingMessages = [];
self.onmessage = (event) => {
    try {
        handleMessage(event.data);
    }
    catch (err) {
        const e = err;
        self.postMessage({ type: 'error', message: `${e === null || e === void 0 ? void 0 : e.name}: ${e === null || e === void 0 ? void 0 : e.message}`, stack: e === null || e === void 0 ? void 0 : e.stack });
    }
};
function handleMessage(data) {
    if (data.type === 'init') {
        if (initStarted)
            return;
        initStarted = true;
        _model_jsbsimFlightModel__WEBPACK_IMPORTED_MODULE_1__.JsbsimFlightModel.create().then(model => {
            flightModel = model;
            sendState();
            const queued = pendingMessages.splice(0);
            for (const queuedMessage of queued)
                handleMessage(queuedMessage);
        }).catch(err => {
            self.postMessage({ type: 'error', message: `${err === null || err === void 0 ? void 0 : err.name}: ${err === null || err === void 0 ? void 0 : err.message}`, stack: err === null || err === void 0 ? void 0 : err.stack });
        });
        return;
    }
    if (!flightModel) {
        pendingMessages.push(data);
        return;
    }
    switch (data.type) {
        case 'update':
            flightModel.setPitch(data.inputs.pitch);
            flightModel.setRoll(data.inputs.roll);
            flightModel.setYaw(data.inputs.yaw);
            flightModel.setThrottle(data.inputs.throttle);
            flightModel.setLandingGearDeployed(data.inputs.landingGearDeployed);
            flightModel.setFlapsExtended(data.inputs.flapsExtended);
            flightModel.setWheelBrakes(data.inputs.wheelBrakesApplied);
            flightModel.setForceVectorsRequested(!!data.inputs.wantForceVectors);
            flightModel.update(data.delta);
            sendState();
            break;
        case 'reset':
            flightModel.reset();
            flightModel.position = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(data.position[0], data.position[1], data.position[2]);
            flightModel.quaternion = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion(data.quaternion[0], data.quaternion[1], data.quaternion[2], data.quaternion[3]);
            flightModel.velocityVector = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(data.velocity[0], data.velocity[1], data.velocity[2]);
            flightModel.setLanded(data.landed);
            flightModel.setThrottle(data.throttle);
            sendState();
            break;
        case 'syncEffectiveThrottle':
            flightModel.setThrottle(data.throttle);
            flightModel.syncEffectiveThrottle();
            sendState();
            break;
        case 'setPosition':
            flightModel.position = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(data.position[0], data.position[1], data.position[2]);
            sendState();
            break;
        case 'setQuaternion':
            flightModel.quaternion = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion(data.quaternion[0], data.quaternion[1], data.quaternion[2], data.quaternion[3]);
            sendState();
            break;
        case 'setVelocity':
            flightModel.velocityVector = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(data.velocity[0], data.velocity[1], data.velocity[2]);
            sendState();
            break;
        case 'snapPhysicsState':
            flightModel.snapPhysicsState();
            sendState();
            break;
    }
}
function sendState() {
    if (!flightModel)
        return;
    const state = {
        position: flightModel.position.toArray(),
        quaternion: flightModel.quaternion.toArray(),
        velocity: flightModel.velocityVector.toArray(),
        prevPosition: flightModel.prevPosition.toArray(),
        prevQuaternion: flightModel.prevQuaternion.toArray(),
        prevVelocity: flightModel.prevVelocity.toArray(),
        crashed: flightModel.isCrashed(),
        landed: flightModel.isLanded(),
        angleOfAttackRad: flightModel.getAngleOfAttack(),
        loadFactorG: flightModel.getLoadFactorG(),
        commandedElevator: flightModel.getCommandedElevator(),
        commandedAileron: flightModel.getCommandedAileron(),
        commandedRudder: flightModel.getCommandedRudder(),
        accelWorld: flightModel.getAccelerationWorld().toArray(),
        engineThrustN: flightModel.getEngineThrustKn() * 1000,
        effectiveThrottle: flightModel.getEffectiveThrottle(),
        deltaRemainder: flightModel.deltaRemainder,
        stall: flightModel.getStallStatus(),
        forceVectors: flightModel.getForceVectorSnapshot(),
    };
    self.postMessage({ type: 'state', state });
}


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			const e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		let __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_three_build_three_core_js","vendors-node_modules_0x62_jsbsim-wasm_dist_index_js-node_modules_0x62_jsbsim-wasm_dist_wasm_js","src_script_defs_ts-src_script_physics_f16Profile_ts-src_script_physics_model_flightModel_ts"], () => (__webpack_require__("./src/script/physics/worker/jsbsimWorker.ts")))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		const deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			let notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				let [chunkIds, fn, priority] = deferred[i];
/******/ 				let fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					const r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter/value functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			if(Array.isArray(definition)) {
/******/ 				var i = 0;
/******/ 				while(i < definition.length) {
/******/ 					var key = definition[i++];
/******/ 					var binding = definition[i++];
/******/ 					if(!__webpack_require__.o(exports, key)) {
/******/ 						if(binding === 0) {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 						} else {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 						}
/******/ 					} else if(binding === 0) { i++; }
/******/ 				}
/******/ 			} else {
/******/ 				for(var key in definition) {
/******/ 					if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and chunks that the entrypoint depends on
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".bundle.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		let scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		const document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript?.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				const scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					let i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = self.location + "";
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = {
/******/ 			"src_script_physics_worker_jsbsimWorker_ts": 1
/******/ 		};
/******/ 		
/******/ 		// importScripts chunk loading
/******/ 		var installChunk = (data) => {
/******/ 			let [chunkIds, moreModules, runtime] = data;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			while(chunkIds.length)
/******/ 				installedChunks[chunkIds.pop()] = 1;
/******/ 			parentChunkLoadingFunction(data);
/******/ 		};
/******/ 		__webpack_require__.f.i = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					importScripts(__webpack_require__.p + __webpack_require__.u(chunkId));
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkretroflightsim"] = self["webpackChunkretroflightsim"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = installChunk;
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		const next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			return Promise.all(["vendors-node_modules_three_build_three_core_js","vendors-node_modules_0x62_jsbsim-wasm_dist_index_js-node_modules_0x62_jsbsim-wasm_dist_wasm_js","src_script_defs_ts-src_script_physics_f16Profile_ts-src_script_physics_model_flightModel_ts"].map(__webpack_require__.e, __webpack_require__)).then(next);
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3JjX3NjcmlwdF9waHlzaWNzX3dvcmtlcl9qc2JzaW1Xb3JrZXJfdHMuYnVuZGxlLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTRCK0I7QUFFeEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDO0FBQ3ZCLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUM7QUFFbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSwwQ0FBYSxFQUFFLENBQUMsU0FBUyxDQUN6QyxJQUFJLDBDQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUMzQixJQUFJLDBDQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDMUIsSUFBSSwwQ0FBYSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDOUIsQ0FBQztBQUVGLE1BQU0sVUFBVSxHQUFxQixJQUFJLDZDQUFnQixFQUFFLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDM0YsTUFBTSxjQUFjLEdBQXFCLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVyRSxNQUFNLE1BQU0sR0FBRyxJQUFJLDBDQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLDBDQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLDBDQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUUxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLDZDQUFnQixFQUFFLENBQUM7QUFDbkMsTUFBTSxHQUFHLEdBQUcsSUFBSSw2Q0FBZ0IsRUFBRSxDQUFDO0FBQ25DLE1BQU0sR0FBRyxHQUFHLElBQUksNkNBQWdCLEVBQUUsQ0FBQztBQUNuQyxNQUFNLE1B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QUNBLDJDQUEyQywwQ0FBMEM7V0FDckYsTUFBTTtXQUNOLDJDQUEyQyxnQ0FBZ0M7V0FDM0U7V0FDQSxLQUFLLHlCQUF5QjtXQUM5QjtXQUNBLEdBQUc7V0FDSDtXQUNBO1dBQ0EsMENBQTBDLHdDQUF3QztXQUNsRjtXQUNBO1dBQ0E7V0FDQSxFOzs7OztXQ3RCQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLEVBQUU7V0FDRixFOzs7OztXQ1JBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EsRTs7Ozs7V0NKQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLEdBQUc7V0FDSDtXQUNBO1dBQ0EsQ0FBQyxJOzs7OztXQ1BELHdGOzs7OztXQ0FBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RCxFOzs7OztXQ05BO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLGtDOzs7OztXQ2xCQTs7V0FFQTtXQUNBO1dBQ0E7V0FDQTtXQUNBOztXQUVBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EsYUFBYTtXQUNiO1dBQ0E7V0FDQTtXQUNBOztXQUVBO1dBQ0E7V0FDQTs7V0FFQTs7V0FFQSxrQjs7Ozs7V0NwQ0E7V0FDQTtXQUNBO1dBQ0EsRTs7Ozs7VUVIQTtVQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcmV0cm9mbGlnaHRzaW0vLi9zcmMvc2NyaXB0L3BoeXNpY3MvanNic2ltL2pzYnNpbUNvb3JkaW5hdGVGcmFtZS50cyIsIndlYnBhY2s6Ly9yZXRyb2ZsaWdodHNpbS8uL3NyYy9zY3JpcHQvcGh5c2ljcy9tb2RlbC9qc2JzaW1GbGlnaHRNb2RlbC50cyIsIndlYnBhY2s6Ly9yZXRyb2ZsaWdodHNpbS8uL3NyYy9zY3JpcHQvcGh5c2ljcy93b3JrZXIvanNic2ltV29ya2VyLnRzIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltL3dlYnBhY2svcnVudGltZS9jaHVuayBsb2FkZWQiLCJ3ZWJwYWNrOi8vcmV0cm9mbGlnaHRzaW0vd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltL3dlYnBhY2svcnVudGltZS9lbnN1cmUgY2h1bmsiLCJ3ZWJwYWNrOi8vcmV0cm9mbGlnaHRzaW0vd2VicGFjay9ydW50aW1lL2dldCBqYXZhc2NyaXB0IGNodW5rIGZpbGVuYW1lIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltL3dlYnBhY2svcnVudGltZS9nbG9iYWwiLCJ3ZWJwYWNrOi8vcmV0cm9mbGlnaHRzaW0vd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9yZXRyb2ZsaWdodHNpbS93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltL3dlYnBhY2svcnVudGltZS9wdWJsaWNQYXRoIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltL3dlYnBhY2svcnVudGltZS9pbXBvcnRTY3JpcHRzIGNodW5rIGxvYWRpbmciLCJ3ZWJwYWNrOi8vcmV0cm9mbGlnaHRzaW0vd2VicGFjay9ydW50aW1lL3N0YXJ0dXAgY2h1bmsgZGVwZW5kZW5jaWVzIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltL3dlYnBhY2svYmVmb3JlLXN0YXJ0dXAiLCJ3ZWJwYWNrOi8vcmV0cm9mbGlnaHRzaW0vd2VicGFjay9zdGFydHVwIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltL3dlYnBhY2svYWZ0ZXItc3RhcnR1cCJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ29vcmRpbmF0ZS1mcmFtZSBjb252ZXJzaW9uIGJldHdlZW4gSlNCU2ltJ3MgYWVyb3NwYWNlIGNvbnZlbnRpb24gYW5kIHRoZVxyXG4gKiBzaW0ncyBUSFJFRS5qcyBib2R5L3dvcmxkIGNvbnZlbnRpb24gKHNlZSB1dGlscy9tYXRoLnRzKTpcclxuICogICArWCA9IFJJR0hULCArWSA9IFVQLCArWiA9IEZPUldBUkQgKHJpZ2h0LWhhbmRlZDogUklHSFQgw5cgVVAgPSBGT1JXQVJEKS5cclxuICpcclxuICogSlNCU2ltIHVzZXMgdGhlIHN0YW5kYXJkIGFlcm9zcGFjZSBib2R5IGZyYW1lIChYID0gZm9yd2FyZC9ub3NlLCBZID0gcmlnaHQsXHJcbiAqIFogPSBkb3duOyByaWdodC1oYW5kZWQ6IEZPUldBUkQgw5cgUklHSFQgPSBET1dOKSBhbmQgcmVwb3J0cyBhdHRpdHVkZSBhc1xyXG4gKiBFdWxlciBhbmdsZXMgKHBoaSA9IHJvbGwsIHRoZXRhID0gcGl0Y2gsIHBzaSA9IHlhdy9oZWFkaW5nKSByZWxhdGl2ZSB0byBhXHJcbiAqIGxvY2FsIE5FRCAoTm9ydGgsIEVhc3QsIERvd24pIGxldmVsIGZyYW1lLCB1c2luZyB0aGUgc3RhbmRhcmQgMy0yLTFcclxuICogKHlhdy1waXRjaC1yb2xsKSBzZXF1ZW5jZS4gQm9keSByYXRlcyBwL3EvciBhbmQgYm9keSB2ZWxvY2l0eSB1L3YvdyBzaGFyZVxyXG4gKiB0aGF0IHNhbWUgYXhpcyBzaGFwZSAoeCA9IGZvcndhcmQtbGlrZSwgeSA9IHJpZ2h0LWxpa2UsIHogPSBkb3duLWxpa2UpLCBzb1xyXG4gKiBvbmUgZml4ZWQgY2hhbmdlIG9mIGJhc2lzLCB7QGxpbmsgQVhJU19SRU1BUH0sIGlzIHVzZWQgdG8gY29udmVydCBhbGwgb2ZcclxuICogdGhlbS5cclxuICpcclxuICogSXQgaXMgYSBtYXRoZW1hdGljYWwgZmFjdCAocHJvdmFibGUgYnkgcmVxdWlyaW5nIHRoZSByZW1hcCB0byBiZSBhIHByb3BlcixcclxuICogb3JpZW50YXRpb24tcHJlc2VydmluZyByb3RhdGlvbikgdGhhdCBubyBheGlzIGNvcnJlc3BvbmRlbmNlIGNhbiBrZWVwIEFMTFxyXG4gKiBUSFJFRSBvZiBcImZvcndhcmQgbWFwcyB0byBmb3J3YXJkXCIsIFwicmlnaHQgbWFwcyB0byByaWdodFwiIGFuZCBcImRvd24gbWFwc1xyXG4gKiB0byAtdXBcIiBhdCBvbmNlIOKAlCBleGFjdGx5IG9uZSBvZiB0aGUgZmlyc3QgdHdvIG11c3QgZmxpcC4gVGhpcyBtb2R1bGVcclxuICoga2VlcHMgUklHSFQgdW5taXJyb3JlZCAoc28gbGF0ZXJhbC9yb2xsIGJlaGF2aW91ciBhbmQgYWlsZXJvbiBmZWVsIGFyZSBub3RcclxuICogbWlycm9yZWQpIGFuZCBpbnN0ZWFkIG1pcnJvcnMgRk9SV0FSRC4gVGhlIGZvcndhcmQgYXhpcyBpcyB0aGVyZWZvcmVcclxuICogbmVnYXRlZCB3aGVyZXZlciBhIHF1YW50aXR5IGlzIGZ1bmRhbWVudGFsbHkgXCJmb3J3YXJkLXJlbGF0aXZlXCI6IHBpdGNoXHJcbiAqIGFuZ2xlICh0aGV0YSksIHBpdGNoIHJhdGUgKHEpIGFuZCBmb3J3YXJkIGJvZHkgdmVsb2NpdHkgKHUpLlxyXG4gKiBSb2xsL3lhdy1yZWxhdGVkIHF1YW50aXRpZXMgKHBoaSwgcCwgciwgdiwgdykgbmVlZCBubyBzdWNoIGNvcnJlY3Rpb24uXHJcbiAqIFRoaXMgY29tYmluYXRpb24gd2FzIGRlcml2ZWQgZnJvbSwgYW5kIGlzIGNoZWNrZWQgYWdhaW5zdCwgY29uY3JldGVcclxuICogcGh5c2ljYWwgcmVxdWlyZW1lbnRzIChyb2xsIHJpZ2h0IC0+IHJpZ2h0IHdpbmcgZG93biwgcGl0Y2ggbm9zZS11cCAtPlxyXG4gKiBub3NlIHVwLCBmb3J3YXJkIGFpcnNwZWVkIC0+IHZlbG9jaXR5IGFsb25nIHRoZSBub3NlLCBjbGltYmluZyAtPiBwb3NpdGl2ZVxyXG4gKiB3b3JsZCBZKSBpbiBqc2JzaW1Db29yZGluYXRlRnJhbWUudGVzdC50cy5cclxuICovXHJcbmltcG9ydCAqIGFzIFRIUkVFIGZyb20gJ3RocmVlJztcclxuXHJcbmV4cG9ydCBjb25zdCBGVF9UT19NID0gMC4zMDQ4O1xyXG5leHBvcnQgY29uc3QgTV9UT19GVCA9IDEgLyBGVF9UT19NO1xyXG5cclxuY29uc3QgX21CYXNpcyA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZUJhc2lzKFxyXG4gICAgbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgLTEpLCAvLyBpbWFnZSBvZiBhZXJvICtYIChmb3J3YXJkKVxyXG4gICAgbmV3IFRIUkVFLlZlY3RvcjMoMSwgMCwgMCksICAvLyBpbWFnZSBvZiBhZXJvICtZIChyaWdodClcclxuICAgIG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xLCAwKSwgLy8gaW1hZ2Ugb2YgYWVybyArWiAoZG93bilcclxuKTtcclxuLyoqIEZpeGVkIGNoYW5nZS1vZi1iYXNpcyByb3RhdGlvbiBmcm9tIEpTQlNpbSdzIGFic3RyYWN0IGFlcm8gYXhlcyB0byB0aGUgc2ltJ3MgKFJpZ2h0LCBVcCwgRm9yd2FyZCkgYXhlcy4gKi9cclxuY29uc3QgQVhJU19SRU1BUDogVEhSRUUuUXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCkuc2V0RnJvbVJvdGF0aW9uTWF0cml4KF9tQmFzaXMpO1xyXG5jb25zdCBBWElTX1JFTUFQX0lOVjogVEhSRUUuUXVhdGVybmlvbiA9IEFYSVNfUkVNQVAuY2xvbmUoKS5pbnZlcnQoKTtcclxuXHJcbmNvbnN0IEFFUk9fWCA9IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDAsIDApO1xyXG5jb25zdCBBRVJPX1kgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKTtcclxuY29uc3QgQUVST19aID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSk7XHJcblxyXG5jb25zdCBfcXggPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xyXG5jb25zdCBfcXkgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xyXG5jb25zdCBfcXogPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xyXG5jb25zdCBfcUJvZHkgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xyXG5cclxuLyoqXHJcbiAqIEJvZHktdG8tTkVEIGF0dGl0dWRlIHF1YXRlcm5pb24gKGluIHRoZSBhYnN0cmFjdCBhZXJvIGF4ZXMpIGZyb20gRXVsZXJcclxuICogYW5nbGVzLCB1c2luZyB0aGUgc3RhbmRhcmQgYWVyb3NwYWNlIDMtMi0xICh5YXctcGl0Y2gtcm9sbCkgc2VxdWVuY2U6XHJcbiAqIGludHJpbnNpY2FsbHkgcm9sbCBhYm91dCBib2R5IFggZmlyc3QsIHRoZW4gcGl0Y2ggYWJvdXQgdGhlIG5ldyBZLCB0aGVuXHJcbiAqIHlhdyBhYm91dCB0aGUgbmV3ZXN0IFouIGB0aGV0YWAgaXMgbmVnYXRlZCBoZXJlIHRvIGNvbXBvc2UgY29ycmVjdGx5IHdpdGhcclxuICoge0BsaW5rIEFYSVNfUkVNQVB9IChzZWUgbW9kdWxlIGRvYyBjb21tZW50KS5cclxuICovXHJcbmZ1bmN0aW9uIGJvZHlUb05lZFF1YXRlcm5pb24ocGhpUmFkOiBudW1iZXIsIHRoZXRhUmFkOiBudW1iZXIsIHBzaVJhZDogbnVtYmVyLCB0YXJnZXQ6IFRIUkVFLlF1YXRlcm5pb24pOiBUSFJFRS5RdWF0ZXJuaW9uIHtcclxuICAgIF9xeC5zZXRGcm9tQXhpc0FuZ2xlKEFFUk9fWCwgcGhpUmFkKTtcclxuICAgIF9xeS5zZXRGcm9tQXhpc0FuZ2xlKEFFUk9fWSwgLXRoZXRhUmFkKTtcclxuICAgIF9xei5zZXRGcm9tQXhpc0FuZ2xlKEFFUk9fWiwgcHNpUmFkKTtcclxuICAgIHJldHVybiB0YXJnZXQuY29weShfcXopLm11bHRpcGx5KF9xeSkubXVsdGlwbHkoX3F4KTtcclxufVxyXG5cclxuLyoqIENvbnZlcnRzIEpTQlNpbSBFdWxlciBhdHRpdHVkZSAocmFkaWFucykgaW50byB0aGUgZXF1aXZhbGVudCBzaW0gb3JpZW50YXRpb24gcXVhdGVybmlvbi4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGpzYnNpbUF0dGl0dWRlVG9RdWF0ZXJuaW9uKFxyXG4gICAgcGhpUmFkOiBudW1iZXIsIHRoZXRhUmFkOiBudW1iZXIsIHBzaVJhZDogbnVtYmVyLCB0YXJnZXQ6IFRIUkVFLlF1YXRlcm5pb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpLFxyXG4pOiBUSFJFRS5RdWF0ZXJuaW9uIHtcclxuICAgIGJvZHlUb05lZFF1YXRlcm5pb24ocGhpUmFkLCB0aGV0YVJhZCwgcHNpUmFkLCBfcUJvZHkpO1xyXG4gICAgLy8gcV9zaW0gPSBBWElTX1JFTUFQICogcV9ib2R5ICogQVhJU19SRU1BUF4tMVxyXG4gICAgdGFyZ2V0LmNvcHkoQVhJU19SRU1BUCkubXVsdGlwbHkoX3FCb2R5KS5tdWx0aXBseShBWElTX1JFTUFQX0lOVik7XHJcbiAgICByZXR1cm4gdGFyZ2V0O1xyXG59XHJcblxyXG5jb25zdCBfbVJvdCA9IG5ldyBUSFJFRS5NYXRyaXg0KCk7XHJcblxyXG4vKipcclxuICogSW52ZXJzZSBvZiB7QGxpbmsganNic2ltQXR0aXR1ZGVUb1F1YXRlcm5pb259OiBnaXZlbiBhIHNpbSBvcmllbnRhdGlvblxyXG4gKiBxdWF0ZXJuaW9uLCByZXR1cm5zIHRoZSBlcXVpdmFsZW50IEpTQlNpbSBwaGkvdGhldGEvcHNpIChyYWRpYW5zKS4gVXNlZCB0b1xyXG4gKiB0cmFuc2xhdGUgYW4gZXh0ZXJuYWxseSByZXF1ZXN0ZWQgc3Bhd24vdGVsZXBvcnQgb3JpZW50YXRpb24gaW50byBKU0JTaW1cclxuICogaW5pdGlhbC1jb25kaXRpb24gcHJvcGVydGllcy5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB3b3JsZFF1YXRlcm5pb25Ub0pzYnNpbUF0dGl0dWRlKHE6IFRIUkVFLlF1YXRlcm5pb24pOiB7IHBoaVJhZDogbnVtYmVyOyB0aGV0YVJhZDogbnVtYmVyOyBwc2lSYWQ6IG51bWJlciB9IHtcclxuICAgIC8vIHFfYm9keSA9IEFYSVNfUkVNQVBeLTEgKiBxX3NpbSAqIEFYSVNfUkVNQVBcclxuICAgIF9xQm9keS5jb3B5KEFYSVNfUkVNQVBfSU5WKS5tdWx0aXBseShxKS5tdWx0aXBseShBWElTX1JFTUFQKTtcclxuICAgIF9tUm90Lm1ha2VSb3RhdGlvbkZyb21RdWF0ZXJuaW9uKF9xQm9keSk7XHJcbiAgICBjb25zdCBlID0gX21Sb3QuZWxlbWVudHM7IC8vIGNvbHVtbi1tYWpvcjogZVtjb2wqNCtyb3ddXHJcbiAgICBjb25zdCByMDAgPSBlWzBdLCByMTAgPSBlWzFdLCByMjAgPSBlWzJdO1xyXG4gICAgY29uc3QgcjIxID0gZVs2XSwgcjIyID0gZVsxMF07XHJcbiAgICBjb25zdCB0aGV0YVJhZCA9IC1NYXRoLmFzaW4oVEhSRUUuTWF0aFV0aWxzLmNsYW1wKC1yMjAsIC0xLCAxKSk7XHJcbiAgICBjb25zdCBwaGlSYWQgPSBNYXRoLmF0YW4yKHIyMSwgcjIyKTtcclxuICAgIGNvbnN0IHBzaVJhZCA9IE1hdGguYXRhbjIocjEwLCByMDApO1xyXG4gICAgcmV0dXJuIHsgcGhpUmFkLCB0aGV0YVJhZCwgcHNpUmFkIH07XHJcbn1cclxuXHJcbmNvbnN0IF92Qm9keSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XHJcblxyXG4vKipcclxuICogQ29udmVydHMgSlNCU2ltJ3MgYm9keS1mcmFtZSB2ZWxvY2l0eSAodSwgdiwgdyDigJQgYWxsIG0vcywgYWVybyBib2R5IGF4ZXMpXHJcbiAqIGludG8gYSB3b3JsZC1mcmFtZSB2ZWxvY2l0eSAobS9zKSwgZ2l2ZW4gdGhlIGFpcmNyYWZ0J3MgY3VycmVudCBzaW1cclxuICogb3JpZW50YXRpb24gcXVhdGVybmlvbiAoYXMgcHJvZHVjZWQgYnkge0BsaW5rIGpzYnNpbUF0dGl0dWRlVG9RdWF0ZXJuaW9ufSkuXHJcbiAqIGB1YCBpcyBuZWdhdGVkIGZvciB0aGUgc2FtZSByZWFzb24gYHRoZXRhYC9gcWAgYXJlIChzZWUgbW9kdWxlIGRvY1xyXG4gKiBjb21tZW50KS4gR29pbmcgdGhyb3VnaCB0aGUgYm9keSBmcmFtZSBhbmQgdGhlIGFjdHVhbCBvcmllbnRhdGlvblxyXG4gKiBxdWF0ZXJuaW9uIChyYXRoZXIgdGhhbiBhbiBpbmRlcGVuZGVudCBORUQtdmVsb2NpdHkgZm9ybXVsYSkgZ3VhcmFudGVlc1xyXG4gKiB0aGUgcmVzdWx0IGlzIHNlbGYtY29uc2lzdGVudCB3aXRoIGF0dGl0dWRlIGJ5IGNvbnN0cnVjdGlvbjogc3RyYWlnaHQsXHJcbiAqIHVuYWNjZWxlcmF0ZWQgZmxpZ2h0ICh2X2JvZHkgPSAoYWlyc3BlZWQsIDAsIDApKSBhbHdheXMgeWllbGRzIGEgd29ybGRcclxuICogdmVsb2NpdHkgcG9pbnRpbmcgZXhhY3RseSBhbG9uZyB0aGUgY3VycmVudCBub3NlIGRpcmVjdGlvbi5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBqc2JzaW1Cb2R5VmVsb2NpdHlUb1dvcmxkKFxyXG4gICAgdU1wczogbnVtYmVyLCB2TXBzOiBudW1iZXIsIHdNcHM6IG51bWJlciwgcVNpbTogVEhSRUUuUXVhdGVybmlvbiwgdGFyZ2V0OiBUSFJFRS5WZWN0b3IzID0gbmV3IFRIUkVFLlZlY3RvcjMoKSxcclxuKTogVEhSRUUuVmVjdG9yMyB7XHJcbiAgICBfdkJvZHkuc2V0KC11TXBzLCB2TXBzLCB3TXBzKS5hcHBseVF1YXRlcm5pb24oQVhJU19SRU1BUCk7XHJcbiAgICByZXR1cm4gdGFyZ2V0LmNvcHkoX3ZCb2R5KS5hcHBseVF1YXRlcm5pb24ocVNpbSk7XHJcbn1cclxuXHJcbi8qKiBJbnZlcnNlIG9mIHtAbGluayBqc2JzaW1Cb2R5VmVsb2NpdHlUb1dvcmxkfTogd29ybGQgdmVsb2NpdHkgLT4gSlNCU2ltIGJvZHktZnJhbWUgKHUsIHYsIHcpIGluIG0vcy4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHdvcmxkVmVsb2NpdHlUb0pzYnNpbUJvZHkoXHJcbiAgICB3b3JsZFZlbG9jaXR5OiBUSFJFRS5WZWN0b3IzLCBxU2ltOiBUSFJFRS5RdWF0ZXJuaW9uLFxyXG4pOiB7IHVNcHM6IG51bWJlcjsgdk1wczogbnVtYmVyOyB3TXBzOiBudW1iZXIgfSB7XHJcbiAgICBjb25zdCBzaW1Cb2R5ID0gd29ybGRWZWxvY2l0eS5jbG9uZSgpLmFwcGx5UXVhdGVybmlvbihxU2ltLmNsb25lKCkuaW52ZXJ0KCkpO1xyXG4gICAgY29uc3QgYWVybyA9IHNpbUJvZHkuYXBwbHlRdWF0ZXJuaW9uKEFYSVNfUkVNQVBfSU5WKTtcclxuICAgIHJldHVybiB7IHVNcHM6IC1hZXJvLngsIHZNcHM6IGFlcm8ueSwgd01wczogYWVyby56IH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyBKU0JTaW0gYm9keSBhbmd1bGFyIHJhdGVzIHAgKHJvbGwsIGFib3V0IGJvZHkgK1gpLCBxIChwaXRjaCxcclxuICogYWJvdXQgYm9keSArWSkgYW5kIHIgKHlhdywgYWJvdXQgYm9keSArWiksIGFsbCByYWQvcywgaW50byB0aGUgc2ltJ3MgYm9keVxyXG4gKiBhbmd1bGFyIHZlbG9jaXR5IGNvbnZlbnRpb24gKHggPSBwaXRjaCBhYm91dCBSSUdIVCwgeSA9IHlhdyBhYm91dCBVUCxcclxuICogeiA9IHJvbGwgYWJvdXQgRk9SV0FSRCDigJQgbWF0Y2hpbmcgRm0yRmxpZ2h0TW9kZWwncyByaWdpZCBib2R5KS4gYHFgIGlzXHJcbiAqIG5lZ2F0ZWQgZm9yIHRoZSBzYW1lIHJlYXNvbiBgdGhldGFgIGlzIChzZWUgbW9kdWxlIGRvYyBjb21tZW50KS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBqc2JzaW1SYXRlc1RvV29ybGQoXHJcbiAgICBwUmFkUzogbnVtYmVyLCBxUmFkUzogbnVtYmVyLCByUmFkUzogbnVtYmVyLCB0YXJnZXQ6IFRIUkVFLlZlY3RvcjMgPSBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG4pOiBUSFJFRS5WZWN0b3IzIHtcclxuICAgIHRhcmdldC5zZXQocFJhZFMsIC1xUmFkUywgclJhZFMpLmFwcGx5UXVhdGVybmlvbihBWElTX1JFTUFQKTtcclxuICAgIHJldHVybiB0YXJnZXQ7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEZsaWdodE1vZGVsIGJhY2tlZCBieSB0aGUgb2ZmaWNpYWwgSlNCU2ltIGZsaWdodCBkeW5hbWljcyBtb2RlbCwgcnVuIHZpYSB0aGVcclxuICogYEAweDYyL2pzYnNpbS13YXNtYCBXZWJBc3NlbWJseSBidWlsZCwgZmx5aW5nIEpTQlNpbSdzIG93biBzdG9jayBGLTE2QSBtb2RlbFxyXG4gKiAoYGFpcmNyYWZ0L2YxNi9mMTYueG1sYCDigJQgc2VlIGFzc2V0cy9qc2JzaW0vKS4gVW5saWtlIEZNMiwgdGhlIGFlcm9keW5hbWljcyxcclxuICogZW5naW5lLCBGQ1MgYW5kIGdyb3VuZCByZWFjdGlvbnMgYXJlIEFMTCBjb21wdXRlZCBieSBKU0JTaW0gaXRzZWxmOyB0aGlzXHJcbiAqIGNsYXNzIGlzIGEgdGhpbiBhZGFwdGVyIHRoYXQgZmVlZHMgcGlsb3QgaW5wdXRzIGluLCBzdGVwcyB0aGUgRkRNLCBhbmRcclxuICogY29udmVydHMgaXRzIGFlcm9zcGFjZS1jb252ZW50aW9uIHN0YXRlIG91dCBpbnRvIHRoZSBzaW0ncyB3b3JsZCBmcmFtZSAoc2VlXHJcbiAqIHBoeXNpY3MvanNic2ltL2pzYnNpbUNvb3JkaW5hdGVGcmFtZS50cyBmb3IgdGhlIGF4aXMvdW5pdHMgY29udmVyc2lvbikuXHJcbiAqXHJcbiAqIFdvcmxkIHBvc2l0aW9uOiBYL1ogKGhvcml6b250YWwpIGFyZSBpbnRlZ3JhdGVkIGhlcmUgZnJvbSB0aGUgY29udmVydGVkXHJcbiAqIHdvcmxkLWZyYW1lIHZlbG9jaXR5LCBzaW5jZSBKU0JTaW0ncyBvd24gbGF0L2xvbmcgYXJlIGdlb2RldGljIGFuZCB0aGUgZ2FtZVxyXG4gKiB3b3JsZCBpcyBhIGZsYXQsIG5vbi1nZW9kZXRpYyBwbGFuZS4gWSAoYWx0aXR1ZGUpIGlzIGluc3RlYWQgcmVhZCBkaXJlY3RseVxyXG4gKiBmcm9tIEpTQlNpbSdzIG93biBgcG9zaXRpb24vaC1zbC1mdGAsIHNpbmNlIGV2ZXJ5IElDIGFwcGxpY2F0aW9uIGJlbG93IHNldHNcclxuICogYGljL2gtc2wtZnRgIHRvIG1hdGNoIHRoZSBjdXJyZW50IHdvcmxkIFkgd2l0aCBgaWMvdGVycmFpbi1lbGV2YXRpb24tZnRgID0gMFxyXG4gKiDigJQgc28gSlNCU2ltJ3Mgb3duIGFsdGl0dWRlIHN0YXRlIChhbmQgZXZlcnl0aGluZyB0aGF0IGRlcGVuZHMgb24gaXQ6XHJcbiAqIGF0bW9zcGhlcmUsIGdlYXIgY29tcHJlc3Npb24sIGdyb3VuZCBjb250YWN0KSBzdGF5cyBhdXRob3JpdGF0aXZlIGFuZFxyXG4gKiBzZWxmLWNvbnNpc3RlbnQsIGFuZCBvdXIgd29ybGQgWSBhbHdheXMgYWdyZWVzIHdpdGggaXQgZXhhY3RseS5cclxuICpcclxuICogQWx3YXlzIGZsaWVzIHRoZSBidW5kbGVkIEYtMTYgcmVnYXJkbGVzcyBvZiB0aGUgaW4tZ2FtZSBhaXJjcmFmdCBzZWxlY3Rpb25cclxuICogKGBzZXRBaXJjcmFmdGAgaXMgaW5oZXJpdGVkIGFzIGEgbm8tb3ApIOKAlCB0aGUgc2FtZSBzaW1wbGlmaWNhdGlvbiB0aGUgREVCVUdcclxuICogbW9kZWwgYWxyZWFkeSBtYWtlcy5cclxuICovXHJcbmltcG9ydCAqIGFzIFRIUkVFIGZyb20gJ3RocmVlJztcclxuaW1wb3J0IHsgSlNCU2ltU2RrIH0gZnJvbSAnQDB4NjIvanNic2ltLXdhc20nO1xyXG5pbXBvcnQgeyB3YXNtQmluYXJ5VXJsLCB3YXNtTW9kdWxlVXJsIH0gZnJvbSAnQDB4NjIvanNic2ltLXdhc20vd2FzbSc7XHJcbmltcG9ydCB7IFBMQU5FX0RJU1RBTkNFX1RPX0dST1VORCB9IGZyb20gJy4uLy4uL2RlZnMnO1xyXG5pbXBvcnQgeyBjbGFtcCB9IGZyb20gJy4uLy4uL3V0aWxzL21hdGgnO1xyXG5pbXBvcnQgeyBGMTZfUFJPRklMRSB9IGZyb20gJy4uL2YxNlByb2ZpbGUnO1xyXG5pbXBvcnQge1xyXG4gICAgRlRfVE9fTSwgTV9UT19GVCxcclxuICAgIGpzYnNpbUF0dGl0dWRlVG9RdWF0ZXJuaW9uLCBqc2JzaW1Cb2R5VmVsb2NpdHlUb1dvcmxkLFxyXG4gICAgd29ybGRRdWF0ZXJuaW9uVG9Kc2JzaW1BdHRpdHVkZSwgd29ybGRWZWxvY2l0eVRvSnNic2ltQm9keSxcclxufSBmcm9tICcuLi9qc2JzaW0vanNic2ltQ29vcmRpbmF0ZUZyYW1lJztcclxuaW1wb3J0IHsgRmxpZ2h0TW9kZWwgfSBmcm9tICcuL2ZsaWdodE1vZGVsJztcclxuXHJcbmNvbnN0IERFRyA9IE1hdGguUEkgLyAxODA7XHJcbmNvbnN0IExCRl9UT19OID0gNC40NDgyMjE2MTUzO1xyXG5cclxuLyoqXHJcbiAqIFJ1bnRpbWUtcmVsYXRpdmUgTUVNRlMgcGF0aHMgdGhpcyBpbnRlZ3JhdGlvbiBmZXRjaGVzIGFuZCB3cml0ZXMgYmVmb3JlXHJcbiAqIGxvYWRpbmcgdGhlIG1vZGVsLiBEZWxpYmVyYXRlbHkgZXhjbHVkZXMgdGhlIHN0b2NrIGFpcmNyYWZ0L2YxNi9TeXN0ZW1zL1xyXG4gKiB7aG9vayxwdXNoYmFja30ueG1sIHN5c3RlbXMg4oCUIHNlZSB0aGUgY29tbWVudCBvbiBmMTYueG1sJ3Mgbm93LXJlbW92ZWRcclxuICogPHN5c3RlbSBmaWxlPVwicHVzaGJhY2tcIi9ob29rXCI+IHJlZmVyZW5jZXMgZm9yIHdoeS5cclxuICovXHJcbmNvbnN0IEpTQlNJTV9EQVRBX0ZJTEVTOiBSZWFkb25seUFycmF5PHJlYWRvbmx5IFtzdHJpbmcsIHN0cmluZ10+ID0gW1xyXG4gICAgWydhaXJjcmFmdC9mMTYvZjE2LnhtbCcsICcvYXNzZXRzL2pzYnNpbS9haXJjcmFmdC9mMTYvZjE2LnhtbCddLFxyXG4gICAgWydlbmdpbmUvRjEwMC1QVy0yMjkueG1sJywgJy9hc3NldHMvanNic2ltL2VuZ2luZS9GMTAwLVBXLTIyOS54bWwnXSxcclxuICAgIFsnZW5naW5lL2RpcmVjdC54bWwnLCAnL2Fzc2V0cy9qc2JzaW0vZW5naW5lL2RpcmVjdC54bWwnXSxcclxuXTtcclxuXHJcbi8vIGYxNi54bWwncyBvd24gYWVyb3N1cmZhY2Vfc2NhbGUgcmFuZ2VzIGZvciBmY3Mve2VsZXZhdG9yLGFpbGVyb24scnVkZGVyfS1jb250cm9sIChzZWVcclxuLy8gYXNzZXRzL2pzYnNpbS9haXJjcmFmdC9mMTYvZjE2LnhtbCksIHVzZWQgdG8gbm9ybWFsaXplIHRoZSBhY3R1YWwgcG9zdCBhY3R1YXRvci1sYWcvRkJXXHJcbi8vIHN1cmZhY2UgcG9zaXRpb25zIGJhY2sgaW50byBbLTEsIDFdIGZvciB0aGUgdmlzaWJsZSBjb250cm9sLXN1cmZhY2UgYW5pbWF0aW9uLlxyXG5jb25zdCBNQVhfRUxFVkFUT1JfUkFEID0gMC40MzY7XHJcbmNvbnN0IE1BWF9BSUxFUk9OX1JBRCA9IDAuMzc1O1xyXG5jb25zdCBNQVhfUlVEREVSX1JBRCA9IDAuNTI0O1xyXG5cclxuZXhwb3J0IGNsYXNzIEpzYnNpbUZsaWdodE1vZGVsIGV4dGVuZHMgRmxpZ2h0TW9kZWwge1xyXG4gICAgcHJpdmF0ZSBzdGFsbCA9IC0xO1xyXG4gICAgcHJpdmF0ZSBhaXJzcGVlZE1wcyA9IDA7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxhc3RWZWxvY2l0eUZvckFjY2VsID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2NyYXRjaFF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xyXG5cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBzZGs6IEpTQlNpbVNkaykge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIENyZWF0ZXMgdGhlIFdBU00gcnVudGltZSwgZmV0Y2hlcy93cml0ZXMgdGhlIGJ1bmRsZWQgRi0xNiBkYXRhIGFuZCBsb2FkcyBpdC4gKi9cclxuICAgIHN0YXRpYyBhc3luYyBjcmVhdGUoKTogUHJvbWlzZTxKc2JzaW1GbGlnaHRNb2RlbD4ge1xyXG4gICAgICAgIGNvbnN0IHNkayA9IGF3YWl0IEpTQlNpbVNkay5jcmVhdGUoeyBtb2R1bGVVcmw6IHdhc21Nb2R1bGVVcmwsIHdhc21Vcmw6IHdhc21CaW5hcnlVcmwgfSk7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW3J1bnRpbWVQYXRoLCB1cmxdIG9mIEpTQlNJTV9EQVRBX0ZJTEVTKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKHVybCk7XHJcbiAgICAgICAgICAgIGlmICghcmVzLm9rKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBKU0JTaW0gZGF0YSBmaWxlICR7dXJsfTogSFRUUCAke3Jlcy5zdGF0dXN9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2RrLndyaXRlRGF0YUZpbGUocnVudGltZVBhdGgsIGF3YWl0IHJlcy50ZXh0KCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFzZGsubG9hZE1vZGVsKCdmMTYnKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTQlNpbSBmYWlsZWQgdG8gbG9hZCB0aGUgYWlyY3JhZnQvZjE2L2YxNi54bWwgbW9kZWwnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEVuZ2luZXMgc3RhcnQgT0ZGIGJ5IGRlZmF1bHQgKHByb3B1bHNpb24vZW5naW5lWzBdL3NldC1ydW5uaW5nID09IDApIOKAlFxyXG4gICAgICAgIC8vIEpTQlNpbSBuZXZlciBzcGlucyB0aGVtIHVwIG9uIGl0cyBvd24ganVzdCBiZWNhdXNlIGZjcy90aHJvdHRsZS1jbWQtbm9ybVxyXG4gICAgICAgIC8vIGlzIG5vbnplcm8sIHNvIHdpdGhvdXQgdGhpcyB0aGUgYWlyY3JhZnQgd291bGQgc2l0IHRoZXJlIHByb2R1Y2luZyB6ZXJvXHJcbiAgICAgICAgLy8gdGhydXN0IG5vIG1hdHRlciBob3cgZmFyIGZvcndhcmQgdGhlIHRocm90dGxlIGlzIHB1c2hlZC5cclxuICAgICAgICBzZGsuc2V0UHJvcGVydHlWYWx1ZSgncHJvcHVsc2lvbi9lbmdpbmVbMF0vc2V0LXJ1bm5pbmcnLCAxKTtcclxuXHJcbiAgICAgICAgY29uc3QgbW9kZWwgPSBuZXcgSnNic2ltRmxpZ2h0TW9kZWwoc2RrKTtcclxuICAgICAgICBtb2RlbC5hcHBseUluaXRpYWxDb25kaXRpb25zKFxyXG4gICAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMygwLCBQTEFORV9ESVNUQU5DRV9UT19HUk9VTkQsIDApLCBuZXcgVEhSRUUuUXVhdGVybmlvbigpLCBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgcmV0dXJuIG1vZGVsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogV3JpdGVzIEpTQlNpbSBgaWMvKmAgcHJvcGVydGllcyBmcm9tIGEgZGVzaXJlZCB3b3JsZCBwb3NpdGlvbi9vcmllbnRhdGlvbi9cclxuICAgICAqIHZlbG9jaXR5IGFuZCByZS1ydW5zIHRoZSBtb2RlbCBhdCB0aGF0IHN0YXRlIChkdCA9IDApLiBVc2VkIGF0IGNvbnN0cnVjdGlvbixcclxuICAgICAqIG9uIHtAbGluayByZXNldH0sIGFuZCB3aGVuZXZlciB0aGUgZ2FtZSBleHRlcm5hbGx5IHRlbGVwb3J0cyB0aGUgYWlyY3JhZnRcclxuICAgICAqIChzcGF3biwgbW9kZWwgc3dhcCwgZGVidWcgdGVsZXBvcnQg4oCUIHNlZSB0aGUgcG9zaXRpb24vcXVhdGVybmlvbi92ZWxvY2l0eVZlY3RvclxyXG4gICAgICogc2V0dGVycyBiZWxvdykuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXBwbHlJbml0aWFsQ29uZGl0aW9ucyhwb3NpdGlvbjogVEhSRUUuVmVjdG9yMywgcXVhdGVybmlvbjogVEhSRUUuUXVhdGVybmlvbiwgdmVsb2NpdHk6IFRIUkVFLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCB7IHBoaVJhZCwgdGhldGFSYWQsIHBzaVJhZCB9ID0gd29ybGRRdWF0ZXJuaW9uVG9Kc2JzaW1BdHRpdHVkZShxdWF0ZXJuaW9uKTtcclxuICAgICAgICBjb25zdCB7IHVNcHMsIHZNcHMsIHdNcHMgfSA9IHdvcmxkVmVsb2NpdHlUb0pzYnNpbUJvZHkodmVsb2NpdHksIHF1YXRlcm5pb24pO1xyXG5cclxuICAgICAgICB0aGlzLnNkay5zZXRQcm9wZXJ0eVZhbHVlKCdpYy90ZXJyYWluLWVsZXZhdGlvbi1mdCcsIDApO1xyXG4gICAgICAgIHRoaXMuc2RrLnNldFByb3BlcnR5VmFsdWUoJ2ljL2gtc2wtZnQnLCBwb3NpdGlvbi55ICogTV9UT19GVCk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnaWMvcGhpLXJhZCcsIHBoaVJhZCk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnaWMvdGhldGEtcmFkJywgdGhldGFSYWQpO1xyXG4gICAgICAgIHRoaXMuc2RrLnNldFByb3BlcnR5VmFsdWUoJ2ljL3BzaS10cnVlLXJhZCcsIHBzaVJhZCk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnaWMvdS1mcHMnLCB1TXBzICogTV9UT19GVCk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnaWMvdi1mcHMnLCB2TXBzICogTV9UT19GVCk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnaWMvdy1mcHMnLCB3TXBzICogTV9UT19GVCk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnaWMvcC1yYWRfc2VjJywgMCk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnaWMvcS1yYWRfc2VjJywgMCk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnaWMvci1yYWRfc2VjJywgMCk7XHJcbiAgICAgICAgdGhpcy5zZGsucnVuSWMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5vYmoucG9zaXRpb24uY29weShwb3NpdGlvbik7XHJcbiAgICAgICAgdGhpcy5vYmoucXVhdGVybmlvbi5jb3B5KHF1YXRlcm5pb24pO1xyXG4gICAgICAgIHRoaXMudmVsb2NpdHkuY29weSh2ZWxvY2l0eSk7XHJcbiAgICAgICAgdGhpcy5sYXN0VmVsb2NpdHlGb3JBY2NlbC5jb3B5KHZlbG9jaXR5KTtcclxuICAgIH1cclxuXHJcbiAgICByZXNldCgpOiB2b2lkIHtcclxuICAgICAgICBzdXBlci5yZXNldCgpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlJbml0aWFsQ29uZGl0aW9ucyh0aGlzLm9iai5wb3NpdGlvbiwgdGhpcy5vYmoucXVhdGVybmlvbiwgdGhpcy52ZWxvY2l0eSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RlcChkZWx0YTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgLy8gR2FtZSBzdGljazogK3BpdGNoID0gYWZ0L25vc2UtdXAsICtyb2xsID0gcmlnaHQgKHNlZSBGTTIgZmNzLnRzKS5cclxuICAgICAgICAvLyBFbGV2YXRvciBjbWQgcG9sYXJpdHkgaXMgaW52ZXJ0ZWQgdnMgdGhlIGdhbWU7IGFpbGVyb24gaXMgdG9vLlxyXG4gICAgICAgIHRoaXMuc2RrLnNldFByb3BlcnR5VmFsdWUoJ2Zjcy9lbGV2YXRvci1jbWQtbm9ybScsIC10aGlzLnBpdGNoKTtcclxuICAgICAgICB0aGlzLnNkay5zZXRQcm9wZXJ0eVZhbHVlKCdmY3MvYWlsZXJvbi1jbWQtbm9ybScsIC10aGlzLnJvbGwpO1xyXG4gICAgICAgIHRoaXMuc2RrLnNldFByb3BlcnR5VmFsdWUoJ2Zjcy9ydWRkZXItY21kLW5vcm0nLCAtdGhpcy55YXcpO1xyXG4gICAgICAgIHRoaXMuc2RrLnNldFByb3BlcnR5VmFsdWUoJ2Zjcy9zdGVlci1jbWQtbm9ybScsIC10aGlzLnlhdyk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnZmNzL3Rocm90dGxlLWNtZC1ub3JtJywgdGhpcy50aHJvdHRsZSk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnZ2Vhci9nZWFyLWNtZC1ub3JtJywgdGhpcy5sYW5kaW5nR2VhckRlcGxveWVkID8gMSA6IDApO1xyXG4gICAgICAgIGNvbnN0IGJyYWtlID0gdGhpcy53aGVlbEJyYWtlc0FwcGxpZWQgPyAxIDogMDtcclxuICAgICAgICB0aGlzLnNkay5zZXRQcm9wZXJ0eVZhbHVlKCdmY3MvbGVmdC1icmFrZS1jbWQtbm9ybScsIGJyYWtlKTtcclxuICAgICAgICB0aGlzLnNkay5zZXRQcm9wZXJ0eVZhbHVlKCdmY3MvcmlnaHQtYnJha2UtY21kLW5vcm0nLCBicmFrZSk7XHJcbiAgICAgICAgdGhpcy5zZGsuc2V0UHJvcGVydHlWYWx1ZSgnZmNzL2NlbnRlci1icmFrZS1jbWQtbm9ybScsIGJyYWtlKTtcclxuICAgICAgICB0aGlzLmVmZmVjdGl2ZVRocm90dGxlID0gdGhpcy50aHJvdHRsZTtcclxuXHJcbiAgICAgICAgdGhpcy5zZGsuc2V0RHQoZGVsdGEpO1xyXG4gICAgICAgIHRoaXMuc2RrLnJ1bigpO1xyXG5cclxuICAgICAgICBjb25zdCBwaGkgPSB0aGlzLnNkay5nZXRQcm9wZXJ0eVZhbHVlKCdhdHRpdHVkZS9waGktcmFkJyk7XHJcbiAgICAgICAgY29uc3QgdGhldGEgPSB0aGlzLnNkay5nZXRQcm9wZXJ0eVZhbHVlKCdhdHRpdHVkZS90aGV0YS1yYWQnKTtcclxuICAgICAgICBsZXQgcHNpID0gdGhpcy5zZGsuZ2V0UHJvcGVydHlWYWx1ZSgnYXR0aXR1ZGUvcHNpLXJhZCcpO1xyXG5cclxuICAgICAgICBjb25zdCB1ID0gdGhpcy5zZGsuZ2V0UHJvcGVydHlWYWx1ZSgndmVsb2NpdGllcy91LWZwcycpICogRlRfVE9fTTtcclxuICAgICAgICBjb25zdCB2ID0gdGhpcy5zZGsuZ2V0UHJvcGVydHlWYWx1ZSgndmVsb2NpdGllcy92LWZwcycpICogRlRfVE9fTTtcclxuICAgICAgICBjb25zdCB3ID0gdGhpcy5zZGsuZ2V0UHJvcGVydHlWYWx1ZSgndmVsb2NpdGllcy93LWZwcycpICogRlRfVE9fTTtcclxuICAgICAgICBqc2JzaW1BdHRpdHVkZVRvUXVhdGVybmlvbihwaGksIHRoZXRhLCBwc2ksIHRoaXMuc2NyYXRjaFF1YXQpO1xyXG4gICAgICAgIGpzYnNpbUJvZHlWZWxvY2l0eVRvV29ybGQodSwgdiwgdywgdGhpcy5zY3JhdGNoUXVhdCwgdGhpcy52ZWxvY2l0eSk7XHJcblxyXG4gICAgICAgIC8vIEpTQlNpbSBpbnRlZ3JhdGVzIGl0cyBvd24gbGF0L2xvbmcgaW50ZXJuYWxseSwgYnV0IHRoaXMgYWRhcHRlciBpbnRlZ3JhdGVzXHJcbiAgICAgICAgLy8gZmxhdC13b3JsZCBYL1ogZnJvbSBjb252ZXJ0ZWQgdmVsb2NpdHkgaW5zdGVhZC4gYXR0aXR1ZGUvcHNpLXJhZCBjYW4gdGhlblxyXG4gICAgICAgIC8vIGRyaWZ0IGF3YXkgZnJvbSB0aGUgYWN0dWFsIGhvcml6b250YWwgdmVsb2NpdHkgKGJvZHkgeWF3cyBvbiB0aGUgSFVEIHdoaWxlXHJcbiAgICAgICAgLy8gZ3JvdW5kIHRyYWNrIHN0YXlzIHB1dCkuIFJlY29uY2lsZSB5YXcgd2l0aCBob3Jpem9udGFsIG1vdGlvbiB3aGVuIGZhc3RcclxuICAgICAgICAvLyBlbm91Z2g7IHZlY3RvckhlYWRpbmcgdXNlcyBhdGFuMih2eCwgLXZ6KSBhbmQgaGRnIOKJiCBwc2kgKyAxODDCsC5cclxuICAgICAgICBjb25zdCBob3JpelNwZCA9IE1hdGguaHlwb3QodGhpcy52ZWxvY2l0eS54LCB0aGlzLnZlbG9jaXR5LnopO1xyXG4gICAgICAgIGlmIChob3JpelNwZCA+IDgpIHtcclxuICAgICAgICAgICAgcHNpID0gTWF0aC5hdGFuMih0aGlzLnZlbG9jaXR5LngsIC10aGlzLnZlbG9jaXR5LnopIC0gTWF0aC5QSTtcclxuICAgICAgICB9XHJcbiAgICAgICAganNic2ltQXR0aXR1ZGVUb1F1YXRlcm5pb24ocGhpLCB0aGV0YSwgcHNpLCB0aGlzLm9iai5xdWF0ZXJuaW9uKTtcclxuXHJcbiAgICAgICAgdGhpcy5vYmoucG9zaXRpb24ueCArPSB0aGlzLnZlbG9jaXR5LnggKiBkZWx0YTtcclxuICAgICAgICB0aGlzLm9iai5wb3NpdGlvbi56ICs9IHRoaXMudmVsb2NpdHkueiAqIGRlbHRhO1xyXG4gICAgICAgIHRoaXMub2JqLnBvc2l0aW9uLnkgPSB0aGlzLnNkay5nZXRQcm9wZXJ0eVZhbHVlKCdwb3NpdGlvbi9oLXNsLWZ0JykgKiBGVF9UT19NO1xyXG5cclxuICAgICAgICBpZiAoZGVsdGEgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWNjZWxXb3JsZC5jb3B5KHRoaXMudmVsb2NpdHkpLnN1Yih0aGlzLmxhc3RWZWxvY2l0eUZvckFjY2VsKS5kaXZpZGVTY2FsYXIoZGVsdGEpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWNjZWxXb3JsZC5zZXQoMCwgMCwgMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubGFzdFZlbG9jaXR5Rm9yQWNjZWwuY29weSh0aGlzLnZlbG9jaXR5KTtcclxuXHJcbiAgICAgICAgdGhpcy5haXJzcGVlZE1wcyA9IHRoaXMuc2RrLmdldFByb3BlcnR5VmFsdWUoJ3ZlbG9jaXRpZXMvdnQtZnBzJykgKiBGVF9UT19NO1xyXG4gICAgICAgIHRoaXMuYW5nbGVPZkF0dGFja1JhZCA9IHRoaXMuc2RrLmdldFByb3BlcnR5VmFsdWUoJ2Flcm8vYWxwaGEtcmFkJyk7XHJcbiAgICAgICAgLy8gSlNCU2ltJ3Mgb3duIGNvbnZlbnRpb24gcmVhZHMgLTEgaW4gbGV2ZWwgMWcgZmxpZ2h0OyBmbGlwIHNvIHRoZSBIVURcclxuICAgICAgICAvLyByZWFkcyB0aGUgdXN1YWwgcGlsb3Qncy1leWUgKzFnIGNvbnZlbnRpb24gKHNlZSBhY2NlbGVyYXRpb25zL24tcGlsb3Qtei1ub3JtKS5cclxuICAgICAgICB0aGlzLmxvYWRGYWN0b3JHID0gLXRoaXMuc2RrLmdldFByb3BlcnR5VmFsdWUoJ2FjY2VsZXJhdGlvbnMvbi1waWxvdC16LW5vcm0nKTtcclxuICAgICAgICB0aGlzLmVuZ2luZVRocnVzdE4gPSB0aGlzLnNkay5nZXRQcm9wZXJ0eVZhbHVlKCdwcm9wdWxzaW9uL2VuZ2luZVswXS90aHJ1c3QtbGJzJykgKiBMQkZfVE9fTjtcclxuXHJcbiAgICAgICAgY29uc3QgZWxldmF0b3JQb3NSYWQgPSB0aGlzLnNkay5nZXRQcm9wZXJ0eVZhbHVlKCdmY3MvZWxldmF0b3ItcG9zLXJhZCcpO1xyXG4gICAgICAgIGNvbnN0IGFpbGVyb25Qb3NSYWQgPSB0aGlzLnNkay5nZXRQcm9wZXJ0eVZhbHVlKCdmY3MvYWlsZXJvbi1wb3MtcmFkJyk7XHJcbiAgICAgICAgY29uc3QgcnVkZGVyUG9zUmFkID0gdGhpcy5zZGsuZ2V0UHJvcGVydHlWYWx1ZSgnZmNzL3J1ZGRlci1wb3MtcmFkJyk7XHJcbiAgICAgICAgLy8gU3VyZmFjZSBwb3NpdGlvbnMgYXJlIGludmVydGVkIHZzIGdhbWUgc3RpY2sgZm9yIGVsZXZhdG9yOyBhaWxlcm9uIHRvby5cclxuICAgICAgICB0aGlzLmNvbW1hbmRlZEVsZXZhdG9yID0gY2xhbXAoLWVsZXZhdG9yUG9zUmFkIC8gTUFYX0VMRVZBVE9SX1JBRCwgLTEsIDEpO1xyXG4gICAgICAgIHRoaXMuY29tbWFuZGVkQWlsZXJvbiA9IGNsYW1wKC1haWxlcm9uUG9zUmFkIC8gTUFYX0FJTEVST05fUkFELCAtMSwgMSk7XHJcbiAgICAgICAgdGhpcy5jb21tYW5kZWRSdWRkZXIgPSBjbGFtcCgtcnVkZGVyUG9zUmFkIC8gTUFYX1JVRERFUl9SQUQsIC0xLCAxKTtcclxuXHJcbiAgICAgICAgdGhpcy5oYW5kbGVHcm91bmRTdGF0ZShwaGksIHRoZXRhKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YWxsU3RhdGUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdyb3VuZCBjb250YWN0IGJvb2trZWVwaW5nIG1pcnJvcmluZyBGbTJGbGlnaHRNb2RlbC5oYW5kbGVHcm91bmRTdGF0ZSxcclxuICAgICAqIHJldXNpbmcgSlNCU2ltJ3Mgb3duIGJhbmsgKHBoaSkgYW5kIHBpdGNoICh0aGV0YSkgYW5nbGVzIGRpcmVjdGx5IOKAlCBib3RoXHJcbiAgICAgKiBhbHJlYWR5IHNoYXJlIHRoaXMgbW9kZWwncyBub3NlLXVwLXBvc2l0aXZlIC8gYmFuay1tYWduaXR1ZGUgY29udmVudGlvbixcclxuICAgICAqIHNvIG5vIGZ1cnRoZXIgY29udmVyc2lvbiBpcyBuZWVkZWQgZm9yIHRoZSBlbnZlbG9wZSBjaGVja3MgYmVsb3cuIEpTQlNpbSdzXHJcbiAgICAgKiBvd24gZ2VhciBtb2RlbCBhbHJlYWR5IGhhbmRsZXMgdGhlIGFjdHVhbCBjb250YWN0IGZvcmNlczsgdGhpcyBsYXllciBvbmx5XHJcbiAgICAgKiBkZXJpdmVzIHRoZSBnYW1lJ3MgbGFuZGVkL2NyYXNoZWQgYm9va2tlZXBpbmcgb24gdG9wLCBzYW1lIGFzIEZNMi5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBoYW5kbGVHcm91bmRTdGF0ZShwaGlSYWQ6IG51bWJlciwgdGhldGFSYWQ6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHJlc3RZID0gUExBTkVfRElTVEFOQ0VfVE9fR1JPVU5EO1xyXG4gICAgICAgIGNvbnN0IG9uR3JvdW5kID0gdGhpcy5vYmoucG9zaXRpb24ueSA8PSByZXN0WSArIDAuMjU7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm9iai5wb3NpdGlvbi55ID4gcmVzdFkgKyAwLjMpIHtcclxuICAgICAgICAgICAgdGhpcy5sYW5kZWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEhhcmQgZmxvb3Igc28gYSBiYWQgSUMvdGVsZXBvcnQgY2FuIG5ldmVyIHR1bm5lbCB0aGUgYm9keSB0aHJvdWdoIHRoZSBncm91bmQuXHJcbiAgICAgICAgY29uc3QgbWluWSA9IHJlc3RZIC0gMC42O1xyXG4gICAgICAgIGlmICh0aGlzLm9iai5wb3NpdGlvbi55IDwgbWluWSkge1xyXG4gICAgICAgICAgICB0aGlzLm9iai5wb3NpdGlvbi55ID0gbWluWTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmVsb2NpdHkueSA8IDApIHRoaXMudmVsb2NpdHkueSA9IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIW9uR3JvdW5kKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbnN0IHNwZWVkID0gdGhpcy52ZWxvY2l0eS5sZW5ndGgoKTtcclxuICAgICAgICBjb25zdCBsYW5kaW5nTWF4Um9sbFJhZCA9IEYxNl9QUk9GSUxFLmxhbmRpbmdNYXhSb2xsRGVnICogREVHO1xyXG4gICAgICAgIGNvbnN0IGxhbmRpbmdNaW5QaXRjaFJhZCA9IEYxNl9QUk9GSUxFLmxhbmRpbmdNaW5QaXRjaERlZyAqIERFRztcclxuICAgICAgICBjb25zdCBoYXJkQ29udGFjdCA9IHRoaXMudmVsb2NpdHkueSA8IC1GMTZfUFJPRklMRS5sYW5kaW5nTWF4VmVydGljYWxTcGVlZE1wcztcclxuICAgICAgICBjb25zdCBiYWRBdHRpdHVkZSA9IE1hdGguYWJzKHBoaVJhZCkgPiBsYW5kaW5nTWF4Um9sbFJhZCB8fCB0aGV0YVJhZCA8IGxhbmRpbmdNaW5QaXRjaFJhZDtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmxhbmRlZCAmJiAoaGFyZENvbnRhY3QgfHwgc3BlZWQgPiBGMTZfUFJPRklMRS5sYW5kaW5nTWF4U3BlZWRNcHMpKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5sYW5kaW5nR2VhckRlcGxveWVkIHx8IGhhcmRDb250YWN0IHx8IGJhZEF0dGl0dWRlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNyYXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5sYW5kaW5nR2VhckRlcGxveWVkICYmIHRoaXMudmVsb2NpdHkueSA8IC0xLjApIHtcclxuICAgICAgICAgICAgdGhpcy5jcmFzaGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoc3BlZWQgPCBGMTZfUFJPRklMRS5sYW5kaW5nTWF4U3BlZWRNcHMgJiYgTWF0aC5hYnMocGhpUmFkKSA8IGxhbmRpbmdNYXhSb2xsUmFkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFuZGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVTdGFsbFN0YXRlKCk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLmxhbmRlZCkgeyB0aGlzLnN0YWxsID0gLTE7IHJldHVybjsgfVxyXG4gICAgICAgIGNvbnN0IHN0YWxsQW9hUmFkID0gRjE2X1BST0ZJTEUuc3RhbGxBb2FEZWcgKiBERUc7XHJcbiAgICAgICAgY29uc3QgYW9hID0gTWF0aC5hYnModGhpcy5hbmdsZU9mQXR0YWNrUmFkKTtcclxuICAgICAgICBjb25zdCBhb2FTdGFsbCA9IHRoaXMuYWlyc3BlZWRNcHMgPiA1ID8gY2xhbXAoKGFvYSAtIHN0YWxsQW9hUmFkICogMC44NSkgLyAoc3RhbGxBb2FSYWQgKiAwLjMpLCAwLCAxKSA6IDA7XHJcbiAgICAgICAgY29uc3Qgc3BlZWRTdGFsbCA9IHRoaXMub2JqLnBvc2l0aW9uLnkgPiBQTEFORV9ESVNUQU5DRV9UT19HUk9VTkQgKyA1XHJcbiAgICAgICAgICAgID8gY2xhbXAoKEYxNl9QUk9GSUxFLm1pbkZseWluZ1NwZWVkTXBzIC0gdGhpcy5haXJzcGVlZE1wcykgLyBGMTZfUFJPRklMRS5taW5GbHlpbmdTcGVlZE1wcywgMCwgMSkgOiAwO1xyXG4gICAgICAgIGNvbnN0IGxldmVsID0gTWF0aC5tYXgoYW9hU3RhbGwsIHNwZWVkU3RhbGwpO1xyXG4gICAgICAgIHRoaXMuc3RhbGwgPSBsZXZlbCA+IDAgPyBsZXZlbCA6IC0xO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFN0YWxsU3RhdHVzKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhbGw7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IHBvc2l0aW9uKHA6IFRIUkVFLlZlY3RvcjMpIHtcclxuICAgICAgICB0aGlzLmFwcGx5SW5pdGlhbENvbmRpdGlvbnMocCwgdGhpcy5vYmoucXVhdGVybmlvbiwgdGhpcy52ZWxvY2l0eSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHBvc2l0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm9iai5wb3NpdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgcXVhdGVybmlvbihxOiBUSFJFRS5RdWF0ZXJuaW9uKSB7XHJcbiAgICAgICAgdGhpcy5hcHBseUluaXRpYWxDb25kaXRpb25zKHRoaXMub2JqLnBvc2l0aW9uLCBxLCB0aGlzLnZlbG9jaXR5KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgcXVhdGVybmlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5vYmoucXVhdGVybmlvbjtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgdmVsb2NpdHlWZWN0b3IodjogVEhSRUUuVmVjdG9yMykge1xyXG4gICAgICAgIHRoaXMuYXBwbHlJbml0aWFsQ29uZGl0aW9ucyh0aGlzLm9iai5wb3NpdGlvbiwgdGhpcy5vYmoucXVhdGVybmlvbiwgdik7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHZlbG9jaXR5VmVjdG9yKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnZlbG9jaXR5O1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCAqIGFzIFRIUkVFIGZyb20gJ3RocmVlJztcclxuaW1wb3J0IHsgSnNic2ltRmxpZ2h0TW9kZWwgfSBmcm9tICcuLi9tb2RlbC9qc2JzaW1GbGlnaHRNb2RlbCc7XHJcblxyXG5sZXQgZmxpZ2h0TW9kZWw6IEpzYnNpbUZsaWdodE1vZGVsIHwgdW5kZWZpbmVkO1xyXG5sZXQgaW5pdFN0YXJ0ZWQgPSBmYWxzZTtcclxuY29uc3QgcGVuZGluZ01lc3NhZ2VzOiBhbnlbXSA9IFtdO1xyXG5cclxuc2VsZi5vbm1lc3NhZ2UgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBoYW5kbGVNZXNzYWdlKGV2ZW50LmRhdGEpO1xyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgY29uc3QgZSA9IGVyciBhcyBFcnJvcjtcclxuICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKHsgdHlwZTogJ2Vycm9yJywgbWVzc2FnZTogYCR7ZT8ubmFtZX06ICR7ZT8ubWVzc2FnZX1gLCBzdGFjazogZT8uc3RhY2sgfSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVNZXNzYWdlKGRhdGE6IGFueSkge1xyXG4gICAgaWYgKGRhdGEudHlwZSA9PT0gJ2luaXQnKSB7XHJcbiAgICAgICAgLy8gSlNCU2ltU2RrLmNyZWF0ZSgpIGFuZCB0aGUgRi0xNiBkYXRhIGZldGNoIGFyZSBhc3luYywgc28gdGhlIG1vZGVsXHJcbiAgICAgICAgLy8gaXNuJ3QgYXZhaWxhYmxlIHN5bmNocm9ub3VzbHkgbGlrZSBGbTJGbGlnaHRNb2RlbCdzLiBBbnkgbWVzc2FnZXNcclxuICAgICAgICAvLyB0aGF0IGFycml2ZSB3aGlsZSBpdCdzIGxvYWRpbmcgYXJlIHF1ZXVlZCBhbmQgcmVwbGF5ZWQgaW4gb3JkZXJcclxuICAgICAgICAvLyBvbmNlIGl0J3MgcmVhZHkgKHNlZSB0aGUgZmx1c2ggYmVsb3cpLlxyXG4gICAgICAgIGlmIChpbml0U3RhcnRlZCkgcmV0dXJuO1xyXG4gICAgICAgIGluaXRTdGFydGVkID0gdHJ1ZTtcclxuICAgICAgICBKc2JzaW1GbGlnaHRNb2RlbC5jcmVhdGUoKS50aGVuKG1vZGVsID0+IHtcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwgPSBtb2RlbDtcclxuICAgICAgICAgICAgc2VuZFN0YXRlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHF1ZXVlZCA9IHBlbmRpbmdNZXNzYWdlcy5zcGxpY2UoMCk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgcXVldWVkTWVzc2FnZSBvZiBxdWV1ZWQpIGhhbmRsZU1lc3NhZ2UocXVldWVkTWVzc2FnZSk7XHJcbiAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcclxuICAgICAgICAgICAgc2VsZi5wb3N0TWVzc2FnZSh7IHR5cGU6ICdlcnJvcicsIG1lc3NhZ2U6IGAke2Vycj8ubmFtZX06ICR7ZXJyPy5tZXNzYWdlfWAsIHN0YWNrOiBlcnI/LnN0YWNrIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWZsaWdodE1vZGVsKSB7XHJcbiAgICAgICAgcGVuZGluZ01lc3NhZ2VzLnB1c2goZGF0YSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaCAoZGF0YS50eXBlKSB7XHJcbiAgICAgICAgY2FzZSAndXBkYXRlJzpcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwuc2V0UGl0Y2goZGF0YS5pbnB1dHMucGl0Y2gpO1xyXG4gICAgICAgICAgICBmbGlnaHRNb2RlbC5zZXRSb2xsKGRhdGEuaW5wdXRzLnJvbGwpO1xyXG4gICAgICAgICAgICBmbGlnaHRNb2RlbC5zZXRZYXcoZGF0YS5pbnB1dHMueWF3KTtcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwuc2V0VGhyb3R0bGUoZGF0YS5pbnB1dHMudGhyb3R0bGUpO1xyXG4gICAgICAgICAgICBmbGlnaHRNb2RlbC5zZXRMYW5kaW5nR2VhckRlcGxveWVkKGRhdGEuaW5wdXRzLmxhbmRpbmdHZWFyRGVwbG95ZWQpO1xyXG4gICAgICAgICAgICBmbGlnaHRNb2RlbC5zZXRGbGFwc0V4dGVuZGVkKGRhdGEuaW5wdXRzLmZsYXBzRXh0ZW5kZWQpO1xyXG4gICAgICAgICAgICBmbGlnaHRNb2RlbC5zZXRXaGVlbEJyYWtlcyhkYXRhLmlucHV0cy53aGVlbEJyYWtlc0FwcGxpZWQpO1xyXG4gICAgICAgICAgICBmbGlnaHRNb2RlbC5zZXRGb3JjZVZlY3RvcnNSZXF1ZXN0ZWQoISFkYXRhLmlucHV0cy53YW50Rm9yY2VWZWN0b3JzKTtcclxuXHJcbiAgICAgICAgICAgIGZsaWdodE1vZGVsLnVwZGF0ZShkYXRhLmRlbHRhKTtcclxuXHJcbiAgICAgICAgICAgIHNlbmRTdGF0ZSgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSAncmVzZXQnOlxyXG4gICAgICAgICAgICBmbGlnaHRNb2RlbC5yZXNldCgpO1xyXG4gICAgICAgICAgICAvLyBBc3NpZ25tZW50IChub3QgYC5zZXQoKWAgb24gdGhlIGdldHRlcikgc28gdGhlIEpTQlNpbSBJQyBzeW5jIGluXHJcbiAgICAgICAgICAgIC8vIEpzYnNpbUZsaWdodE1vZGVsJ3MgcG9zaXRpb24vcXVhdGVybmlvbi92ZWxvY2l0eVZlY3RvciBzZXR0ZXJzIHJ1bnMuXHJcbiAgICAgICAgICAgIGZsaWdodE1vZGVsLnBvc2l0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoZGF0YS5wb3NpdGlvblswXSwgZGF0YS5wb3NpdGlvblsxXSwgZGF0YS5wb3NpdGlvblsyXSk7XHJcbiAgICAgICAgICAgIGZsaWdodE1vZGVsLnF1YXRlcm5pb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbihcclxuICAgICAgICAgICAgICAgIGRhdGEucXVhdGVybmlvblswXSwgZGF0YS5xdWF0ZXJuaW9uWzFdLCBkYXRhLnF1YXRlcm5pb25bMl0sIGRhdGEucXVhdGVybmlvblszXSxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwudmVsb2NpdHlWZWN0b3IgPSBuZXcgVEhSRUUuVmVjdG9yMyhkYXRhLnZlbG9jaXR5WzBdLCBkYXRhLnZlbG9jaXR5WzFdLCBkYXRhLnZlbG9jaXR5WzJdKTtcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwuc2V0TGFuZGVkKGRhdGEubGFuZGVkKTtcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwuc2V0VGhyb3R0bGUoZGF0YS50aHJvdHRsZSk7XHJcbiAgICAgICAgICAgIHNlbmRTdGF0ZSgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSAnc3luY0VmZmVjdGl2ZVRocm90dGxlJzpcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwuc2V0VGhyb3R0bGUoZGF0YS50aHJvdHRsZSk7XHJcbiAgICAgICAgICAgIGZsaWdodE1vZGVsLnN5bmNFZmZlY3RpdmVUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICBzZW5kU3RhdGUoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGNhc2UgJ3NldFBvc2l0aW9uJzpcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwucG9zaXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMyhkYXRhLnBvc2l0aW9uWzBdLCBkYXRhLnBvc2l0aW9uWzFdLCBkYXRhLnBvc2l0aW9uWzJdKTtcclxuICAgICAgICAgICAgc2VuZFN0YXRlKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBjYXNlICdzZXRRdWF0ZXJuaW9uJzpcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwucXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKFxyXG4gICAgICAgICAgICAgICAgZGF0YS5xdWF0ZXJuaW9uWzBdLCBkYXRhLnF1YXRlcm5pb25bMV0sIGRhdGEucXVhdGVybmlvblsyXSwgZGF0YS5xdWF0ZXJuaW9uWzNdLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBzZW5kU3RhdGUoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGNhc2UgJ3NldFZlbG9jaXR5JzpcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwudmVsb2NpdHlWZWN0b3IgPSBuZXcgVEhSRUUuVmVjdG9yMyhkYXRhLnZlbG9jaXR5WzBdLCBkYXRhLnZlbG9jaXR5WzFdLCBkYXRhLnZlbG9jaXR5WzJdKTtcclxuICAgICAgICAgICAgc2VuZFN0YXRlKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBjYXNlICdzbmFwUGh5c2ljc1N0YXRlJzpcclxuICAgICAgICAgICAgZmxpZ2h0TW9kZWwuc25hcFBoeXNpY3NTdGF0ZSgpO1xyXG4gICAgICAgICAgICBzZW5kU3RhdGUoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbmRTdGF0ZSgpIHtcclxuICAgIGlmICghZmxpZ2h0TW9kZWwpIHJldHVybjtcclxuICAgIGNvbnN0IHN0YXRlID0ge1xyXG4gICAgICAgIHBvc2l0aW9uOiBmbGlnaHRNb2RlbC5wb3NpdGlvbi50b0FycmF5KCksXHJcbiAgICAgICAgcXVhdGVybmlvbjogZmxpZ2h0TW9kZWwucXVhdGVybmlvbi50b0FycmF5KCksXHJcbiAgICAgICAgdmVsb2NpdHk6IGZsaWdodE1vZGVsLnZlbG9jaXR5VmVjdG9yLnRvQXJyYXkoKSxcclxuICAgICAgICAvLyBAdHMtaWdub3JlIC0gYWNjZXNzaW5nIHByb3RlY3RlZCBtZW1iZXJzIGZvciB0cmFuc2ZlclxyXG4gICAgICAgIHByZXZQb3NpdGlvbjogZmxpZ2h0TW9kZWwucHJldlBvc2l0aW9uLnRvQXJyYXkoKSxcclxuICAgICAgICAvLyBAdHMtaWdub3JlXHJcbiAgICAgICAgcHJldlF1YXRlcm5pb246IGZsaWdodE1vZGVsLnByZXZRdWF0ZXJuaW9uLnRvQXJyYXkoKSxcclxuICAgICAgICAvLyBAdHMtaWdub3JlXHJcbiAgICAgICAgcHJldlZlbG9jaXR5OiBmbGlnaHRNb2RlbC5wcmV2VmVsb2NpdHkudG9BcnJheSgpLFxyXG4gICAgICAgIGNyYXNoZWQ6IGZsaWdodE1vZGVsLmlzQ3Jhc2hlZCgpLFxyXG4gICAgICAgIGxhbmRlZDogZmxpZ2h0TW9kZWwuaXNMYW5kZWQoKSxcclxuICAgICAgICBhbmdsZU9mQXR0YWNrUmFkOiBmbGlnaHRNb2RlbC5nZXRBbmdsZU9mQXR0YWNrKCksXHJcbiAgICAgICAgbG9hZEZhY3Rvckc6IGZsaWdodE1vZGVsLmdldExvYWRGYWN0b3JHKCksXHJcbiAgICAgICAgY29tbWFuZGVkRWxldmF0b3I6IGZsaWdodE1vZGVsLmdldENvbW1hbmRlZEVsZXZhdG9yKCksXHJcbiAgICAgICAgY29tbWFuZGVkQWlsZXJvbjogZmxpZ2h0TW9kZWwuZ2V0Q29tbWFuZGVkQWlsZXJvbigpLFxyXG4gICAgICAgIGNvbW1hbmRlZFJ1ZGRlcjogZmxpZ2h0TW9kZWwuZ2V0Q29tbWFuZGVkUnVkZGVyKCksXHJcbiAgICAgICAgYWNjZWxXb3JsZDogZmxpZ2h0TW9kZWwuZ2V0QWNjZWxlcmF0aW9uV29ybGQoKS50b0FycmF5KCksXHJcbiAgICAgICAgZW5naW5lVGhydXN0TjogZmxpZ2h0TW9kZWwuZ2V0RW5naW5lVGhydXN0S24oKSAqIDEwMDAsXHJcbiAgICAgICAgZWZmZWN0aXZlVGhyb3R0bGU6IGZsaWdodE1vZGVsLmdldEVmZmVjdGl2ZVRocm90dGxlKCksXHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxyXG4gICAgICAgIGRlbHRhUmVtYWluZGVyOiBmbGlnaHRNb2RlbC5kZWx0YVJlbWFpbmRlcixcclxuICAgICAgICBzdGFsbDogZmxpZ2h0TW9kZWwuZ2V0U3RhbGxTdGF0dXMoKSxcclxuICAgICAgICBmb3JjZVZlY3RvcnM6IGZsaWdodE1vZGVsLmdldEZvcmNlVmVjdG9yU25hcHNob3QoKSxcclxuICAgIH07XHJcblxyXG4gICAgc2VsZi5wb3N0TWVzc2FnZSh7IHR5cGU6ICdzdGF0ZScsIHN0YXRlIH0pO1xyXG59XHJcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbmNvbnN0IF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0Y29uc3QgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdGNvbnN0IG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0aWYgKCEobW9kdWxlSWQgaW4gX193ZWJwYWNrX21vZHVsZXNfXykpIHtcblx0XHRkZWxldGUgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0XHRjb25zdCBlID0gbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIiArIG1vZHVsZUlkICsgXCInXCIpO1xuXHRcdGUuY29kZSA9ICdNT0RVTEVfTk9UX0ZPVU5EJztcblx0XHR0aHJvdyBlO1xuXHR9XG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuLy8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbl9fd2VicGFja19yZXF1aXJlX18ubSA9IF9fd2VicGFja19tb2R1bGVzX187XG5cbi8vIHRoZSBzdGFydHVwIGZ1bmN0aW9uXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnggPSAoKSA9PiB7XG5cdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuXHQvLyBUaGlzIGVudHJ5IG1vZHVsZSBkZXBlbmRzIG9uIG90aGVyIGxvYWRlZCBjaHVua3MgYW5kIGV4ZWN1dGlvbiBuZWVkIHRvIGJlIGRlbGF5ZWRcblx0bGV0IF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fLk8odW5kZWZpbmVkLCBbXCJ2ZW5kb3JzLW5vZGVfbW9kdWxlc190aHJlZV9idWlsZF90aHJlZV9jb3JlX2pzXCIsXCJ2ZW5kb3JzLW5vZGVfbW9kdWxlc18weDYyX2pzYnNpbS13YXNtX2Rpc3RfaW5kZXhfanMtbm9kZV9tb2R1bGVzXzB4NjJfanNic2ltLXdhc21fZGlzdF93YXNtX2pzXCIsXCJzcmNfc2NyaXB0X2RlZnNfdHMtc3JjX3NjcmlwdF9waHlzaWNzX2YxNlByb2ZpbGVfdHMtc3JjX3NjcmlwdF9waHlzaWNzX21vZGVsX2ZsaWdodE1vZGVsX3RzXCJdLCAoKSA9PiAoX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL3NjcmlwdC9waHlzaWNzL3dvcmtlci9qc2JzaW1Xb3JrZXIudHNcIikpKVxuXHRfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXy5PKF9fd2VicGFja19leHBvcnRzX18pO1xuXHRyZXR1cm4gX193ZWJwYWNrX2V4cG9ydHNfXztcbn07XG5cbiIsImNvbnN0IGRlZmVycmVkID0gW107XG5fX3dlYnBhY2tfcmVxdWlyZV9fLk8gPSAocmVzdWx0LCBjaHVua0lkcywgZm4sIHByaW9yaXR5KSA9PiB7XG5cdGlmKGNodW5rSWRzKSB7XG5cdFx0cHJpb3JpdHkgPSBwcmlvcml0eSB8fCAwO1xuXHRcdGZvcih2YXIgaSA9IGRlZmVycmVkLmxlbmd0aDsgaSA+IDAgJiYgZGVmZXJyZWRbaSAtIDFdWzJdID4gcHJpb3JpdHk7IGktLSkgZGVmZXJyZWRbaV0gPSBkZWZlcnJlZFtpIC0gMV07XG5cdFx0ZGVmZXJyZWRbaV0gPSBbY2h1bmtJZHMsIGZuLCBwcmlvcml0eV07XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGxldCBub3RGdWxmaWxsZWQgPSBJbmZpbml0eTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWZlcnJlZC5sZW5ndGg7IGkrKykge1xuXHRcdGxldCBbY2h1bmtJZHMsIGZuLCBwcmlvcml0eV0gPSBkZWZlcnJlZFtpXTtcblx0XHRsZXQgZnVsZmlsbGVkID0gdHJ1ZTtcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNodW5rSWRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRpZiAoKHByaW9yaXR5ICYgMSA9PT0gMCB8fCBub3RGdWxmaWxsZWQgPj0gcHJpb3JpdHkpICYmIE9iamVjdC5rZXlzKF9fd2VicGFja19yZXF1aXJlX18uTykuZXZlcnkoKGtleSkgPT4gKF9fd2VicGFja19yZXF1aXJlX18uT1trZXldKGNodW5rSWRzW2pdKSkpKSB7XG5cdFx0XHRcdGNodW5rSWRzLnNwbGljZShqLS0sIDEpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZnVsZmlsbGVkID0gZmFsc2U7XG5cdFx0XHRcdGlmKHByaW9yaXR5IDwgbm90RnVsZmlsbGVkKSBub3RGdWxmaWxsZWQgPSBwcmlvcml0eTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYoZnVsZmlsbGVkKSB7XG5cdFx0XHRkZWZlcnJlZC5zcGxpY2UoaS0tLCAxKVxuXHRcdFx0Y29uc3QgciA9IGZuKCk7XG5cdFx0XHRpZiAociAhPT0gdW5kZWZpbmVkKSByZXN1bHQgPSByO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufTsiLCIvLyBkZWZpbmUgZ2V0dGVyL3ZhbHVlIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRpZihBcnJheS5pc0FycmF5KGRlZmluaXRpb24pKSB7XG5cdFx0dmFyIGkgPSAwO1xuXHRcdHdoaWxlKGkgPCBkZWZpbml0aW9uLmxlbmd0aCkge1xuXHRcdFx0dmFyIGtleSA9IGRlZmluaXRpb25baSsrXTtcblx0XHRcdHZhciBiaW5kaW5nID0gZGVmaW5pdGlvbltpKytdO1xuXHRcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRcdGlmKGJpbmRpbmcgPT09IDApIHtcblx0XHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiBkZWZpbml0aW9uW2krK10gfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGJpbmRpbmcgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZihiaW5kaW5nID09PSAwKSB7IGkrKzsgfVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5mID0ge307XG4vLyBUaGlzIGZpbGUgY29udGFpbnMgb25seSB0aGUgZW50cnkgY2h1bmsuXG4vLyBUaGUgY2h1bmsgbG9hZGluZyBmdW5jdGlvbiBmb3IgYWRkaXRpb25hbCBjaHVua3Ncbl9fd2VicGFja19yZXF1aXJlX18uZSA9IChjaHVua0lkKSA9PiB7XG5cdHJldHVybiBQcm9taXNlLmFsbChPYmplY3Qua2V5cyhfX3dlYnBhY2tfcmVxdWlyZV9fLmYpLnJlZHVjZSgocHJvbWlzZXMsIGtleSkgPT4ge1xuXHRcdF9fd2VicGFja19yZXF1aXJlX18uZltrZXldKGNodW5rSWQsIHByb21pc2VzKTtcblx0XHRyZXR1cm4gcHJvbWlzZXM7XG5cdH0sIFtdKSk7XG59OyIsIi8vIFRoaXMgZnVuY3Rpb24gYWxsb3cgdG8gcmVmZXJlbmNlIGFzeW5jIGNodW5rcyBhbmQgY2h1bmtzIHRoYXQgdGhlIGVudHJ5cG9pbnQgZGVwZW5kcyBvblxuX193ZWJwYWNrX3JlcXVpcmVfXy51ID0gKGNodW5rSWQpID0+IHtcblx0Ly8gcmV0dXJuIHVybCBmb3IgZmlsZW5hbWVzIGJhc2VkIG9uIHRlbXBsYXRlXG5cdHJldHVybiBcIlwiICsgY2h1bmtJZCArIFwiLmJ1bmRsZS5qc1wiO1xufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLmcgPSAoZnVuY3Rpb24oKSB7XG5cdGlmICh0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcpIHJldHVybiBnbG9iYWxUaGlzO1xuXHR0cnkge1xuXHRcdHJldHVybiB0aGlzIHx8IG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0aWYgKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnKSByZXR1cm4gd2luZG93O1xuXHR9XG59KSgpOyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZihTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJsZXQgc2NyaXB0VXJsO1xuaWYgKF9fd2VicGFja19yZXF1aXJlX18uZy5pbXBvcnRTY3JpcHRzKSBzY3JpcHRVcmwgPSBfX3dlYnBhY2tfcmVxdWlyZV9fLmcubG9jYXRpb24gKyBcIlwiO1xuY29uc3QgZG9jdW1lbnQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fLmcuZG9jdW1lbnQ7XG5pZiAoIXNjcmlwdFVybCAmJiBkb2N1bWVudCkge1xuXHRpZiAoZG9jdW1lbnQuY3VycmVudFNjcmlwdD8udGFnTmFtZS50b1VwcGVyQ2FzZSgpID09PSAnU0NSSVBUJylcblx0XHRzY3JpcHRVcmwgPSBkb2N1bWVudC5jdXJyZW50U2NyaXB0LnNyYztcblx0aWYgKCFzY3JpcHRVcmwpIHtcblx0XHRjb25zdCBzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzY3JpcHRcIik7XG5cdFx0aWYoc2NyaXB0cy5sZW5ndGgpIHtcblx0XHRcdGxldCBpID0gc2NyaXB0cy5sZW5ndGggLSAxO1xuXHRcdFx0d2hpbGUgKGkgPiAtMSAmJiAoIXNjcmlwdFVybCB8fCAhL15odHRwKHM/KTovLnRlc3Qoc2NyaXB0VXJsKSkpIHNjcmlwdFVybCA9IHNjcmlwdHNbaS0tXS5zcmM7XG5cdFx0fVxuXHR9XG59XG4vLyBXaGVuIHN1cHBvcnRpbmcgYnJvd3NlcnMgd2hlcmUgYW4gYXV0b21hdGljIHB1YmxpY1BhdGggaXMgbm90IHN1cHBvcnRlZCB5b3UgbXVzdCBzcGVjaWZ5IGFuIG91dHB1dC5wdWJsaWNQYXRoIG1hbnVhbGx5IHZpYSBjb25maWd1cmF0aW9uXG4vLyBvciBwYXNzIGFuIGVtcHR5IHN0cmluZyAoXCJcIikgYW5kIHNldCB0aGUgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gdmFyaWFibGUgZnJvbSB5b3VyIGNvZGUgdG8gdXNlIHlvdXIgb3duIGxvZ2ljLlxuaWYgKCFzY3JpcHRVcmwpIHRocm93IG5ldyBFcnJvcihcIkF1dG9tYXRpYyBwdWJsaWNQYXRoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyXCIpO1xuc2NyaXB0VXJsID0gc2NyaXB0VXJsLnJlcGxhY2UoL15ibG9iOi8sIFwiXCIpLnJlcGxhY2UoLyMuKiQvLCBcIlwiKS5yZXBsYWNlKC9cXD8uKiQvLCBcIlwiKS5yZXBsYWNlKC9cXC9bXlxcL10rJC8sIFwiL1wiKTtcbl9fd2VicGFja19yZXF1aXJlX18ucCA9IHNjcmlwdFVybDsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLmIgPSBzZWxmLmxvY2F0aW9uICsgXCJcIjtcblxuLy8gb2JqZWN0IHRvIHN0b3JlIGxvYWRlZCBjaHVua3Ncbi8vIFwiMVwiIG1lYW5zIFwiYWxyZWFkeSBsb2FkZWRcIlxudmFyIGluc3RhbGxlZENodW5rcyA9IHtcblx0XCJzcmNfc2NyaXB0X3BoeXNpY3Nfd29ya2VyX2pzYnNpbVdvcmtlcl90c1wiOiAxXG59O1xuXG4vLyBpbXBvcnRTY3JpcHRzIGNodW5rIGxvYWRpbmdcbnZhciBpbnN0YWxsQ2h1bmsgPSAoZGF0YSkgPT4ge1xuXHRsZXQgW2NodW5rSWRzLCBtb3JlTW9kdWxlcywgcnVudGltZV0gPSBkYXRhO1xuXHRmb3IodmFyIG1vZHVsZUlkIGluIG1vcmVNb2R1bGVzKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKG1vcmVNb2R1bGVzLCBtb2R1bGVJZCkpIHtcblx0XHRcdF9fd2VicGFja19yZXF1aXJlX18ubVttb2R1bGVJZF0gPSBtb3JlTW9kdWxlc1ttb2R1bGVJZF07XG5cdFx0fVxuXHR9XG5cdGlmKHJ1bnRpbWUpIHJ1bnRpbWUoX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cdHdoaWxlKGNodW5rSWRzLmxlbmd0aClcblx0XHRpbnN0YWxsZWRDaHVua3NbY2h1bmtJZHMucG9wKCldID0gMTtcblx0cGFyZW50Q2h1bmtMb2FkaW5nRnVuY3Rpb24oZGF0YSk7XG59O1xuX193ZWJwYWNrX3JlcXVpcmVfXy5mLmkgPSAoY2h1bmtJZCwgcHJvbWlzZXMpID0+IHtcblx0Ly8gXCIxXCIgaXMgdGhlIHNpZ25hbCBmb3IgXCJhbHJlYWR5IGxvYWRlZFwiXG5cdGlmKCFpbnN0YWxsZWRDaHVua3NbY2h1bmtJZF0pIHtcblx0XHRpZih0cnVlKSB7IC8vIGFsbCBjaHVua3MgaGF2ZSBKU1xuXHRcdFx0aW1wb3J0U2NyaXB0cyhfX3dlYnBhY2tfcmVxdWlyZV9fLnAgKyBfX3dlYnBhY2tfcmVxdWlyZV9fLnUoY2h1bmtJZCkpO1xuXHRcdH1cblx0fVxufTtcblxudmFyIGNodW5rTG9hZGluZ0dsb2JhbCA9IHNlbGZbXCJ3ZWJwYWNrQ2h1bmtyZXRyb2ZsaWdodHNpbVwiXSA9IHNlbGZbXCJ3ZWJwYWNrQ2h1bmtyZXRyb2ZsaWdodHNpbVwiXSB8fCBbXTtcbnZhciBwYXJlbnRDaHVua0xvYWRpbmdGdW5jdGlvbiA9IGNodW5rTG9hZGluZ0dsb2JhbC5wdXNoLmJpbmQoY2h1bmtMb2FkaW5nR2xvYmFsKTtcbmNodW5rTG9hZGluZ0dsb2JhbC5wdXNoID0gaW5zdGFsbENodW5rO1xuXG4vLyBubyBITVJcblxuLy8gbm8gSE1SIG1hbmlmZXN0IiwiY29uc3QgbmV4dCA9IF9fd2VicGFja19yZXF1aXJlX18ueDtcbl9fd2VicGFja19yZXF1aXJlX18ueCA9ICgpID0+IHtcblx0cmV0dXJuIFByb21pc2UuYWxsKFtcInZlbmRvcnMtbm9kZV9tb2R1bGVzX3RocmVlX2J1aWxkX3RocmVlX2NvcmVfanNcIixcInZlbmRvcnMtbm9kZV9tb2R1bGVzXzB4NjJfanNic2ltLXdhc21fZGlzdF9pbmRleF9qcy1ub2RlX21vZHVsZXNfMHg2Ml9qc2JzaW0td2FzbV9kaXN0X3dhc21fanNcIixcInNyY19zY3JpcHRfZGVmc190cy1zcmNfc2NyaXB0X3BoeXNpY3NfZjE2UHJvZmlsZV90cy1zcmNfc2NyaXB0X3BoeXNpY3NfbW9kZWxfZmxpZ2h0TW9kZWxfdHNcIl0ubWFwKF9fd2VicGFja19yZXF1aXJlX18uZSwgX193ZWJwYWNrX3JlcXVpcmVfXykpLnRoZW4obmV4dCk7XG59OyIsIiIsIi8vIHJ1biBzdGFydHVwXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18ueCgpO1xuIiwiIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9