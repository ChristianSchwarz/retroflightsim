"use strict";
(self["webpackChunkretroflightsim"] = self["webpackChunkretroflightsim"] || []).push([["src_script_defs_ts-src_script_physics_f16Profile_ts-src_script_physics_model_flightModel_ts"],{

/***/ "./src/script/defs.ts"
/*!****************************!*\
  !*** ./src/script/defs.ts ***!
  \****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AIRBASE_RUNWAY: () => (/* binding */ AIRBASE_RUNWAY),
/* harmony export */   APPROACH_ALTITUDE_M: () => (/* binding */ APPROACH_ALTITUDE_M),
/* harmony export */   APPROACH_FINAL_DISTANCE_M: () => (/* binding */ APPROACH_FINAL_DISTANCE_M),
/* harmony export */   APPROACH_SPEED_KMH: () => (/* binding */ APPROACH_SPEED_KMH),
/* harmony export */   APPROACH_SPEED_MPS: () => (/* binding */ APPROACH_SPEED_MPS),
/* harmony export */   COCKPIT_FAR: () => (/* binding */ COCKPIT_FAR),
/* harmony export */   COCKPIT_FOV: () => (/* binding */ COCKPIT_FOV),
/* harmony export */   DAMAGE_SMOKE_PARTICLE_COUNT: () => (/* binding */ DAMAGE_SMOKE_PARTICLE_COUNT),
/* harmony export */   DEBRIS_PARTICLE_COUNT: () => (/* binding */ DEBRIS_PARTICLE_COUNT),
/* harmony export */   FPS_CAP: () => (/* binding */ FPS_CAP),
/* harmony export */   HI_H_RES: () => (/* binding */ HI_H_RES),
/* harmony export */   HI_V_RES: () => (/* binding */ HI_V_RES),
/* harmony export */   H_RES: () => (/* binding */ H_RES),
/* harmony export */   H_RES_HALF: () => (/* binding */ H_RES_HALF),
/* harmony export */   LO_H_RES: () => (/* binding */ LO_H_RES),
/* harmony export */   LO_V_RES: () => (/* binding */ LO_V_RES),
/* harmony export */   MAX_ALTITUDE: () => (/* binding */ MAX_ALTITUDE),
/* harmony export */   MAX_SPEED: () => (/* binding */ MAX_SPEED),
/* harmony export */   PITCH_RATE: () => (/* binding */ PITCH_RATE),
/* harmony export */   PITCH_STICK_AFT_UNITS: () => (/* binding */ PITCH_STICK_AFT_UNITS),
/* harmony export */   PITCH_STICK_BASE_UNIT_RATE: () => (/* binding */ PITCH_STICK_BASE_UNIT_RATE),
/* harmony export */   PITCH_STICK_FWD_UNITS: () => (/* binding */ PITCH_STICK_FWD_UNITS),
/* harmony export */   PITCH_STICK_MAX_UNIT_RATE: () => (/* binding */ PITCH_STICK_MAX_UNIT_RATE),
/* harmony export */   PITCH_STICK_UNIT_ACCEL: () => (/* binding */ PITCH_STICK_UNIT_ACCEL),
/* harmony export */   PLANE_COCKPIT_OFFSET_Y: () => (/* binding */ PLANE_COCKPIT_OFFSET_Y),
/* harmony export */   PLANE_COCKPIT_OFFSET_Z: () => (/* binding */ PLANE_COCKPIT_OFFSET_Z),
/* harmony export */   PLANE_DISTANCE_TO_GROUND: () => (/* binding */ PLANE_DISTANCE_TO_GROUND),
/* harmony export */   ROLL_RATE: () => (/* binding */ ROLL_RATE),
/* harmony export */   RUNWAY_HALF_LENGTH_M: () => (/* binding */ RUNWAY_HALF_LENGTH_M),
/* harmony export */   STICK_RATE: () => (/* binding */ STICK_RATE),
/* harmony export */   TELEMETRY_GRAPH_KEY_CODE: () => (/* binding */ TELEMETRY_GRAPH_KEY_CODE),
/* harmony export */   TERRAIN_MODEL_SIZE: () => (/* binding */ TERRAIN_MODEL_SIZE),
/* harmony export */   TERRAIN_SCALE: () => (/* binding */ TERRAIN_SCALE),
/* harmony export */   THROTTLE_RATE: () => (/* binding */ THROTTLE_RATE),
/* harmony export */   V_RES: () => (/* binding */ V_RES),
/* harmony export */   V_RES_HALF: () => (/* binding */ V_RES_HALF),
/* harmony export */   YAW_RATE: () => (/* binding */ YAW_RATE),
/* harmony export */   isTelemetryGraphKey: () => (/* binding */ isTelemetryGraphKey)
/* harmony export */ });
const FPS_CAP = 15;
const LO_H_RES = 320;
const LO_V_RES = 200;
const HI_H_RES = 640;
const HI_V_RES = 400;
const H_RES = 320;
const V_RES = 200;
const H_RES_HALF = H_RES / 2;
const V_RES_HALF = V_RES / 2;
const TERRAIN_SCALE = 200.0;
const TERRAIN_MODEL_SIZE = 100.0;
const PITCH_RATE = Math.PI / 5;
const ROLL_RATE = Math.PI / 2;
const YAW_RATE = Math.PI / 12;
const MAX_SPEED = 250.0;
const THROTTLE_RATE = 33;
const STICK_RATE = 1.5;
const PLANE_DISTANCE_TO_GROUND = 2.0;
const PLANE_COCKPIT_OFFSET_Y = 1.0;
const PLANE_COCKPIT_OFFSET_Z = 8.0;
const MAX_ALTITUDE = 14000;
const COCKPIT_FOV = 50;
const COCKPIT_FAR = 40000;
const DEBRIS_PARTICLE_COUNT = 48;
const DAMAGE_SMOKE_PARTICLE_COUNT = 160;
const TELEMETRY_GRAPH_KEY_CODE = 'NumLock';
function isTelemetryGraphKey(event) {
    return event.code === TELEMETRY_GRAPH_KEY_CODE
        || event.code === 'Clear'
        || event.key === 'NumLock';
}
const AIRBASE_RUNWAY = { x: 1500, y: 0, z: -800 };
const RUNWAY_HALF_LENGTH_M = 1500;
const APPROACH_ALTITUDE_M = 5000;
const APPROACH_SPEED_KMH = 500;
const APPROACH_SPEED_MPS = APPROACH_SPEED_KMH / 3.6;
const APPROACH_FINAL_DISTANCE_M = 5000;
const PITCH_STICK_FWD_UNITS = 20;
const PITCH_STICK_AFT_UNITS = 80;
const PITCH_STICK_BASE_UNIT_RATE = 10;
const PITCH_STICK_MAX_UNIT_RATE = 80;
const PITCH_STICK_UNIT_ACCEL = 120;


/***/ },

/***/ "./src/script/physics/aeroUtils.ts"
/*!*****************************************!*\
  !*** ./src/script/physics/aeroUtils.ts ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GROUND_AIR_DENSITY: () => (/* binding */ GROUND_AIR_DENSITY),
/* harmony export */   computeAirDensity: () => (/* binding */ computeAirDensity),
/* harmony export */   computeAngleOfAttack: () => (/* binding */ computeAngleOfAttack),
/* harmony export */   computeDynamicPressure: () => (/* binding */ computeDynamicPressure),
/* harmony export */   computeDynamicPressureDragPenalty: () => (/* binding */ computeDynamicPressureDragPenalty),
/* harmony export */   computeIsaAirDensity: () => (/* binding */ computeIsaAirDensity),
/* harmony export */   computeLoadFactorG: () => (/* binding */ computeLoadFactorG),
/* harmony export */   computeMachNumber: () => (/* binding */ computeMachNumber),
/* harmony export */   computeMaxEquilibriumSpeed: () => (/* binding */ computeMaxEquilibriumSpeed),
/* harmony export */   computeSpeedOfSound: () => (/* binding */ computeSpeedOfSound),
/* harmony export */   computeThrustDensityFactor: () => (/* binding */ computeThrustDensityFactor)
/* harmony export */ });
const GRAVITY = 9.8;
const GROUND_AIR_DENSITY = 1.225;
const VNE_MACH = 0.95;
const ISA_SEA_LEVEL_PRESSURE = 101325;
const ISA_SEA_LEVEL_TEMP = 288.15;
const ISA_LAPSE_RATE = 0.0065;
const ISA_TROPOPAUSE_ALT = 11000;
const ISA_TROPOPAUSE_PRESSURE = 22632.1;
const ISA_TROPOPAUSE_TEMP = 216.65;
const GRAVITY_ISA = 9.80665;
const GAS_CONSTANT = 287.053;
function computeIsaAirDensity(altitudeMeters) {
    const h = Math.max(0, altitudeMeters);
    let temperature;
    let pressure;
    if (h <= ISA_TROPOPAUSE_ALT) {
        temperature = ISA_SEA_LEVEL_TEMP - ISA_LAPSE_RATE * h;
        pressure = ISA_SEA_LEVEL_PRESSURE * Math.pow(temperature / ISA_SEA_LEVEL_TEMP, GRAVITY_ISA / (GAS_CONSTANT * ISA_LAPSE_RATE));
    }
    else {
        temperature = ISA_TROPOPAUSE_TEMP;
        pressure = ISA_TROPOPAUSE_PRESSURE * Math.exp(-GRAVITY_ISA * (h - ISA_TROPOPAUSE_ALT) / (GAS_CONSTANT * ISA_TROPOPAUSE_TEMP));
    }
    return pressure / (GAS_CONSTANT * temperature);
}
function computeAirDensity(altitudeMeters) {
    return computeIsaAirDensity(altitudeMeters);
}
function computeDynamicPressure(airDensity, speed) {
    return 0.5 * airDensity * speed * speed;
}
function computeThrustDensityFactor(airDensity, altitudeMeters = 0) {
    const sigma = airDensity / GROUND_AIR_DENSITY;
    const lapse = Math.pow(sigma, 0.7);
    const optimumAltitude = 11000;
    const altPenalty = altitudeMeters <= optimumAltitude
        ? 1
        : Math.max(0.35, 1 - (altitudeMeters - optimumAltitude) / 9000);
    return lapse * altPenalty;
}
const GAMMA = 1.4;
function computeSpeedOfSound(altitudeMeters) {
    const temperature = Math.max(ISA_TROPOPAUSE_TEMP, ISA_SEA_LEVEL_TEMP - ISA_LAPSE_RATE * altitudeMeters);
    return Math.sqrt(GAMMA * GAS_CONSTANT * temperature);
}
function computeMachNumber(speedMps, altitudeMeters) {
    const speedOfSound = computeSpeedOfSound(altitudeMeters);
    if (speedOfSound <= 0) {
        return 0;
    }
    return speedMps / speedOfSound;
}
function computeDynamicPressureDragPenalty(speedMps, altitudeMeters) {
    const speedOfSound = computeSpeedOfSound(altitudeMeters);
    if (speedOfSound <= 0 || speedMps <= 0) {
        return 0;
    }
    const mach = speedMps / speedOfSound;
    if (mach <= VNE_MACH) {
        return 0;
    }
    const excess = (mach - VNE_MACH) / VNE_MACH;
    return 0.55 * excess * excess;
}
function computeMaxEquilibriumSpeed(airDensity, thrustForce, wingArea, dragCoefficient) {
    if (airDensity <= 0 || dragCoefficient <= 0 || thrustForce <= 0) {
        return 0;
    }
    return Math.sqrt(2 * thrustForce / (airDensity * wingArea * dragCoefficient));
}
function computeAngleOfAttack(forward, right, velocity, scratch) {
    const speed = velocity.length();
    if (speed <= 1.0) {
        return 0;
    }
    scratch.copy(velocity).multiplyScalar(1 / speed).projectOnPlane(right);
    if (scratch.lengthSq() <= 1e-6) {
        return 0;
    }
    scratch.normalize();
    const aoaAngle = scratch.angleTo(forward);
    const aoaSign = scratch.cross(forward).dot(right) > 0 ? -1 : 1;
    return aoaSign * aoaAngle;
}
function computeLoadFactorG(accel, up, gravity = GRAVITY) {
    return (accel.x * up.x + (accel.y + gravity) * up.y + accel.z * up.z) / gravity;
}


/***/ },

/***/ "./src/script/physics/f16PaperData.ts"
/*!********************************************!*\
  !*** ./src/script/physics/f16PaperData.ts ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F16_PAPER_ANALYTICAL: () => (/* binding */ F16_PAPER_ANALYTICAL),
/* harmony export */   F16_PAPER_CHART_CASES: () => (/* binding */ F16_PAPER_CHART_CASES),
/* harmony export */   F16_PAPER_VSPAERO: () => (/* binding */ F16_PAPER_VSPAERO),
/* harmony export */   F16_PAPER_VSPAERO_CASES: () => (/* binding */ F16_PAPER_VSPAERO_CASES),
/* harmony export */   FPS_TO_MPS: () => (/* binding */ FPS_TO_MPS),
/* harmony export */   FT_TO_M: () => (/* binding */ FT_TO_M),
/* harmony export */   LB_TO_KG: () => (/* binding */ LB_TO_KG),
/* harmony export */   LB_TO_N: () => (/* binding */ LB_TO_N)
/* harmony export */ });
const F16_PAPER_ANALYTICAL = {
    cd0: 0.018,
    inducedDragK: 0.1489,
    cl0: 0.2,
    clAlphaPerRad: 5.73,
    maxLiftToDrag: 9.66,
    maxLiftToDragAlphaDeg: 2,
    minGlideAngleDeg: 5.91,
    cruiseVelocityFps: 846,
    cruiseAltitudeFt: 30000,
    serviceCeilingFt: 50000,
    wingAreaFt2: 300,
    mtowLb: 42000,
};
const F16_PAPER_VSPAERO = {
    cd0: 0.0124,
    clAlphaPerRad: 3.62,
    inducedDragK: 0.0973,
    maxLiftToDrag: 14,
    maxLiftToDragAlphaDeg: 4,
};
const F16_PAPER_CHART_CASES = [
    {
        id: 'fig7_ld_max',
        figure: 'Fig. 7',
        description: 'Maximum lift-to-drag ratio',
        metric: 'liftToDrag',
        alphaDeg: 2,
        altitudeFt: 0,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 0,
        reference: 9.66,
        tolerance: 0.15,
    },
    {
        id: 'fig9_min_glide',
        figure: 'Fig. 9',
        description: 'Minimum glide angle',
        metric: 'minGlideAngleDeg',
        altitudeFt: 30000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 0,
        reference: 5.91,
        tolerance: 0.1,
    },
    {
        id: 'fig10_min_drag_20k',
        figure: 'Fig. 10',
        description: 'Minimum total drag at 20,000 ft (MTOW)',
        metric: 'minTotalDragLb',
        altitudeFt: 20000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 797,
        reference: 4348.74,
        tolerance: 50,
    },
    {
        id: 'fig10_drag_750fps',
        figure: 'Fig. 10',
        description: 'Total drag at 750 ft/s, 20,000 ft (MTOW)',
        metric: 'totalDragLb',
        altitudeFt: 20000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 750,
        reference: 4381.50,
        tolerance: 50,
    },
    {
        id: 'fig11_min_drag_30k',
        figure: 'Fig. 11',
        description: 'Minimum total drag at 30,000 ft (MTOW)',
        metric: 'minTotalDragLb',
        altitudeFt: 30000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 952,
        reference: 4348.74,
        tolerance: 50,
    },
    {
        id: 'fig11_drag_900fps',
        figure: 'Fig. 11',
        description: 'Total drag at 900 ft/s, 30,000 ft (MTOW)',
        metric: 'totalDragLb',
        altitudeFt: 30000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 900,
        reference: 4375.84,
        tolerance: 50,
    },
    {
        id: 'fig12_min_drag_40k',
        figure: 'Fig. 12',
        description: 'Minimum total drag at 40,000 ft (MTOW)',
        metric: 'minTotalDragLb',
        altitudeFt: 40000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 1173,
        reference: 4348.73,
        tolerance: 50,
    },
    {
        id: 'fig12_drag_1000fps',
        figure: 'Fig. 12',
        description: 'Total drag at 1,000 ft/s, 40,000 ft (MTOW)',
        metric: 'totalDragLb',
        altitudeFt: 40000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 1000,
        reference: 4572.53,
        tolerance: 50,
    },
    {
        id: 'fig16_tr_min_35klb',
        figure: 'Fig. 16',
        description: 'Minimum thrust required at 35,000 lb (30,000 ft)',
        metric: 'thrustRequiredLb',
        altitudeFt: 30000,
        weightLb: 35000,
        velocityFps: 870,
        reference: 3623.96,
        tolerance: 50,
    },
    {
        id: 'fig16_tr_35klb_900fps',
        figure: 'Fig. 16',
        description: 'Thrust required at 35,000 lb, 900 ft/s (30,000 ft)',
        metric: 'thrustRequiredLb',
        altitudeFt: 30000,
        weightLb: 35000,
        velocityFps: 900,
        reference: 3633.01,
        tolerance: 50,
    },
    {
        id: 'fig16_tr_35klb_1000fps',
        figure: 'Fig. 16',
        description: 'Thrust required at 35,000 lb, 1,000 ft/s (30,000 ft)',
        metric: 'thrustRequiredLb',
        altitudeFt: 30000,
        weightLb: 35000,
        velocityFps: 1000,
        reference: 3768.43,
        tolerance: 50,
    },
    {
        id: 'fig17_tr_min_20k',
        figure: 'Fig. 17',
        description: 'Minimum thrust required at 20,000 ft (MTOW)',
        metric: 'thrustRequiredLb',
        altitudeFt: 20000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 797,
        reference: 4348.74,
        tolerance: 50,
    },
    {
        id: 'fig17_tr_min_30k',
        figure: 'Fig. 17',
        description: 'Thrust required at 1,000 ft/s, 30,000 ft (MTOW)',
        metric: 'thrustRequiredLb',
        altitudeFt: 30000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 1000,
        reference: 4370.12,
        tolerance: 50,
    },
    {
        id: 'fig17_tr_1150fps_40k',
        figure: 'Fig. 17',
        description: 'Thrust required at 1,150 ft/s, 40,000 ft (MTOW)',
        metric: 'thrustRequiredLb',
        altitudeFt: 40000,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 1150,
        reference: 4352.20,
        tolerance: 50,
    },
    {
        id: 'assumption_cruise_speed',
        figure: 'Section III',
        description: 'Cruise velocity at 30,000 ft (MTOW)',
        metric: 'cruiseSpeedFps',
        altitudeFt: F16_PAPER_ANALYTICAL.cruiseAltitudeFt,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: F16_PAPER_ANALYTICAL.cruiseVelocityFps,
        reference: 846,
        tolerance: 0.5,
    },
];
const F16_PAPER_VSPAERO_CASES = [
    {
        id: 'fig20_ld_max_vspaero',
        figure: 'Fig. 20',
        description: 'VSPAero maximum L/D',
        metric: 'liftToDrag',
        alphaDeg: 4,
        altitudeFt: 0,
        weightLb: F16_PAPER_ANALYTICAL.mtowLb,
        velocityFps: 0,
        reference: 14,
        tolerance: 0.15,
    },
];
const FT_TO_M = 0.3048;
const FPS_TO_MPS = FT_TO_M;
const LB_TO_N = 4.4482216153;
const LB_TO_KG = 0.45359237;


/***/ },

/***/ "./src/script/physics/f16Profile.ts"
/*!******************************************!*\
  !*** ./src/script/physics/f16Profile.ts ***!
  \******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F16_PROFILE: () => (/* binding */ F16_PROFILE),
/* harmony export */   F16_REFERENCE_CASES: () => (/* binding */ F16_REFERENCE_CASES),
/* harmony export */   MPS_TO_KTS: () => (/* binding */ MPS_TO_KTS)
/* harmony export */ });
/* harmony import */ var _f16PaperData__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./f16PaperData */ "./src/script/physics/f16PaperData.ts");

const F16_PROFILE = {
    combatMassKg: 19051,
    simMassKg: 13608,
    wingAreaM2: 27.87,
    wingSpanM: 9.45,
    cd0: _f16PaperData__WEBPACK_IMPORTED_MODULE_0__.F16_PAPER_ANALYTICAL.cd0,
    inducedDragK: _f16PaperData__WEBPACK_IMPORTED_MODULE_0__.F16_PAPER_ANALYTICAL.inducedDragK,
    cl0: _f16PaperData__WEBPACK_IMPORTED_MODULE_0__.F16_PAPER_ANALYTICAL.cl0,
    clAlphaPerRad: _f16PaperData__WEBPACK_IMPORTED_MODULE_0__.F16_PAPER_ANALYTICAL.clAlphaPerRad,
    abThrustKn: 129.4,
    milThrustKn: 76.3,
    milLeverEnd: 0.98,
    abMinLeverEnd: 0.99,
    minFlyingSpeedMps: 68,
    stallAoaDeg: 22,
    serviceCeilingM: _f16PaperData__WEBPACK_IMPORTED_MODULE_0__.F16_PAPER_ANALYTICAL.serviceCeilingFt * 0.3048,
    cruiseAltitudeM: _f16PaperData__WEBPACK_IMPORTED_MODULE_0__.F16_PAPER_ANALYTICAL.cruiseAltitudeFt * 0.3048,
    cruiseSpeedMps: _f16PaperData__WEBPACK_IMPORTED_MODULE_0__.F16_PAPER_ANALYTICAL.cruiseVelocityFps * 0.3048,
    maxRollRateDegS: 300,
    cat3MaxRollRateDegS: 180,
    maxLoadFactorG: 9.5,
    rotationSpeedMps: 65,
    landingMaxSpeedMps: 90,
    landingMaxVerticalSpeedMps: 8,
    landingMaxRollDeg: 12,
    landingMinPitchDeg: -12,
};
const F16_REFERENCE_CASES = [
    {
        id: 'cd0_paper',
        description: 'Zero-lift drag coefficient (Eq. 2)',
        source: 'Rehman paper analytical',
        metric: 'cd0',
        altitudeMeters: 0,
        reference: 0.018,
        tolerance: 0,
    },
    {
        id: 'induced_k_paper',
        description: 'Induced drag factor K (Eq. 3–5)',
        source: 'Rehman paper analytical',
        metric: 'inducedDragK',
        altitudeMeters: 0,
        reference: 0.1489,
        tolerance: 0.0001,
    },
    {
        id: 'cl_alpha_paper',
        description: 'Lift-curve slope',
        source: 'Rehman paper / NACA 64A204',
        metric: 'clAlphaPerRad',
        altitudeMeters: 0,
        reference: 5.73,
        tolerance: 0.01,
    },
    {
        id: 'ld_max_paper',
        description: 'Maximum lift-to-drag ratio at α ≈ 2°',
        source: 'Rehman Fig. 7',
        metric: 'maxLiftToDrag',
        altitudeMeters: 0,
        alphaDeg: 2,
        reference: 9.66,
        tolerance: 0.3,
    },
    {
        id: 'cruise_speed_paper',
        description: 'Cruise true airspeed at 30,000 ft',
        source: 'Rehman Section III (846 ft/s)',
        metric: 'cruiseSpeedMps',
        altitudeMeters: F16_PROFILE.cruiseAltitudeM,
        reference: F16_PROFILE.cruiseSpeedMps,
        tolerance: 0.5,
    },
    {
        id: 'wing_area',
        description: 'Wing reference area (300 ft²)',
        source: 'Jane\'s / Rehman paper',
        metric: 'wingAreaM2',
        altitudeMeters: 0,
        reference: 27.87,
        tolerance: 0.05,
    },
    {
        id: 'ab_thrust_sl',
        description: 'Full afterburner thrust at sea level',
        source: 'F100-PW-229 (129.4 kN)',
        metric: 'abThrustKn',
        altitudeMeters: 0,
        reference: 129.4,
        tolerance: 2.0,
    },
    {
        id: 'max_mach_fl400',
        description: 'Maximum Mach at 40,000 ft (AB, thrust–drag balance)',
        source: 'Sim envelope with Anderson polar + transonic drag',
        metric: 'maxMach',
        altitudeMeters: 12192,
        reference: 1.89,
        tolerance: 0.12,
    },
    {
        id: 'peak_speed_altitude',
        description: 'Altitude of peak level-flight max speed',
        source: 'Sim envelope (ISA thrust lapse)',
        metric: 'peakMaxSpeedAltitudeM',
        altitudeMeters: 0,
        reference: 11000,
        tolerance: 500,
    },
];
const MPS_TO_KTS = 1.94384;


/***/ },

/***/ "./src/script/physics/fm2/fcs.ts"
/*!***************************************!*\
  !*** ./src/script/physics/fm2/fcs.ts ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FcsPitchLimiter: () => (/* binding */ FcsPitchLimiter),
/* harmony export */   Fm2Fcs: () => (/* binding */ Fm2Fcs),
/* harmony export */   computeCommandedRollRate: () => (/* binding */ computeCommandedRollRate)
/* harmony export */ });
/* harmony import */ var _utils_math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils/math */ "./src/script/utils/math.ts");
/* harmony import */ var _aeroUtils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../aeroUtils */ "./src/script/physics/aeroUtils.ts");


const DEG = Math.PI / 180;
var FcsPitchLimiter;
(function (FcsPitchLimiter) {
    FcsPitchLimiter[FcsPitchLimiter["SOFT"] = 1] = "SOFT";
    FcsPitchLimiter[FcsPitchLimiter["PREDICTIVE"] = 2] = "PREDICTIVE";
    FcsPitchLimiter[FcsPitchLimiter["SMOOTH"] = 3] = "SMOOTH";
})(FcsPitchLimiter || (FcsPitchLimiter = {}));
function smoothstep(edge0, edge1, x) {
    if (edge0 === edge1)
        return x < edge0 ? 0 : 1;
    const t = (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}
const PITCH_RATE_DAMP = 1.1;
const AUTH_FILTER_TAU_S = 0.14;
const PREDICT_AUTH_FILTER_TAU_S = 0.2;
const PREDICT_AOA_DAMP = 0.9;
const PREDICT_AOA_DAMP_CLAMP = 0.3;
const SMOOTH_AUTH_FILTER_TAU_S = 0.3;
const SMOOTH_SLEW_PER_S = 5.0;
function computeCommandedRollRate(input, roll) {
    var _a;
    if (input.landed || Math.abs(input.rollStick) < 1e-6) {
        return 0;
    }
    const mach = (0,_aeroUtils__WEBPACK_IMPORTED_MODULE_1__.computeMachNumber)(input.speed, input.altitudeM);
    const flapFactor = input.flapsExtended ? ((_a = roll.flapsFactor) !== null && _a !== void 0 ? _a : 0.65) : 1;
    const limiter = rollMachLimiter(mach, roll)
        * rollAltitudeLimiter(input.altitudeM, roll)
        * rollAoaLimiter(input.aoaRad, roll)
        * flapFactor;
    const qGain = rollDynamicPressureGain(input.dynamicPressure, input.qRef, roll);
    return input.rollStick * roll.maxRollRateDegS * DEG * qGain * limiter;
}
function rollDynamicPressureGain(dynamicPressure, qRef, roll) {
    var _a, _b;
    const min = (_a = roll.qGainMin) !== null && _a !== void 0 ? _a : 0.12;
    const max = (_b = roll.qGainMax) !== null && _b !== void 0 ? _b : 1.0;
    const q = Math.max(dynamicPressure, 1);
    const ref = Math.max(qRef, 1);
    const raw = min + (max - min) * Math.sqrt(ref / (ref + q));
    return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(raw, min, max);
}
function rollMachLimiter(mach, roll) {
    var _a, _b, _c;
    const onset = (_a = roll.machLimiterOnset) !== null && _a !== void 0 ? _a : 0.85;
    if (mach <= onset) {
        return 1;
    }
    return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(1 - (mach - onset) / ((_b = roll.machLimiterSlope) !== null && _b !== void 0 ? _b : 0.55), (_c = roll.machLimiterFloor) !== null && _c !== void 0 ? _c : 0.35, 1);
}
function rollAltitudeLimiter(altitudeM, roll) {
    var _a, _b, _c;
    const onset = (_a = roll.altLimiterOnsetM) !== null && _a !== void 0 ? _a : 12000;
    if (altitudeM <= onset) {
        return 1;
    }
    return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(1 - (altitudeM - onset) / ((_b = roll.altLimiterSlopeM) !== null && _b !== void 0 ? _b : 20000), (_c = roll.altLimiterFloor) !== null && _c !== void 0 ? _c : 0.45, 1);
}
function rollAoaLimiter(aoaRad, roll) {
    var _a, _b, _c;
    const onset = (_a = roll.aoaLimiterOnsetDeg) !== null && _a !== void 0 ? _a : 15;
    const aoaDeg = Math.abs(aoaRad) / DEG;
    if (aoaDeg <= onset) {
        return 1;
    }
    return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(1 - (aoaDeg - onset) / ((_b = roll.aoaLimiterSlopeDeg) !== null && _b !== void 0 ? _b : 22), (_c = roll.aoaLimiterFloor) !== null && _c !== void 0 ? _c : 0.15, 1);
}
class Fm2Fcs {
    constructor(cfg) {
        this.cfg = cfg;
        this.elevator = 0;
        this.aileron = 0;
        this.rudder = 0;
        this.yawRateLowPass = 0;
        this.elevatorLimitHi = 1;
        this.elevatorLimitLo = -1;
        this.prevAoaRad = 0;
        this.prevLoadG = 1;
        this.aoaRateLowPass = 0;
        this.gRateLowPass = 0;
        this.authLowPass = 1;
        this.pitchTarget = 0;
    }
    reset() {
        this.elevator = 0;
        this.aileron = 0;
        this.rudder = 0;
        this.yawRateLowPass = 0;
        this.prevAoaRad = 0;
        this.prevLoadG = 1;
        this.aoaRateLowPass = 0;
        this.gRateLowPass = 0;
        this.authLowPass = 1;
        this.pitchTarget = 0;
        this.elevatorLimitHi = 1;
        this.elevatorLimitLo = -1;
    }
    getState() {
        return {
            elevator: this.elevator,
            aileron: this.aileron,
            rudder: this.rudder,
            elevatorLimitHi: this.elevatorLimitHi,
            elevatorLimitLo: this.elevatorLimitLo,
        };
    }
    update(input, dt) {
        this.trackPitchRates(input, dt);
        let elevatorTarget;
        let aileronTarget;
        let rudderTarget;
        if (input.limitersEnabled === false) {
            elevatorTarget = (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(input.pitchStick, -1, 1);
            aileronTarget = (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(-input.rollStick, -1, 1);
            rudderTarget = (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(input.yawPedal, -1, 1);
            this.elevatorLimitHi = 1;
            this.elevatorLimitLo = -1;
        }
        else {
            elevatorTarget = this.pitchLaw(input, dt);
            this.updateElevatorLimits(input, dt);
            aileronTarget = this.cfg.roll.rateCommand
                ? this.rateCommandRollLaw(input)
                : this.directRollLaw(input);
            rudderTarget = this.yawLaw(input, aileronTarget, dt);
        }
        const a = dt <= 0 ? 1 : 1 - Math.exp(-dt / Math.max(this.cfg.actuatorTauS, 1e-3));
        this.elevator += (elevatorTarget - this.elevator) * a;
        this.aileron += (aileronTarget - this.aileron) * a;
        this.rudder += (rudderTarget - this.rudder) * a;
        return this.getState();
    }
    updateElevatorLimits(input, dt) {
        const pullAuth = this.filterAuthority(this.pitchAuthority(input.aoaRad, input.loadFactorG, true), dt);
        const pushAuth = this.filterAuthority(this.pitchAuthority(input.aoaRad, input.loadFactorG, false), dt);
        this.elevatorLimitHi = pullAuth;
        this.elevatorLimitLo = -pushAuth;
    }
    trackPitchRates(input, dt) {
        if (dt > 0) {
            const rawAoaRate = (input.aoaRad - this.prevAoaRad) / dt;
            const rawGRate = (input.loadFactorG - this.prevLoadG) / dt;
            const tau = Math.max(this.cfg.pitch.aoaRateFilterTauS, 1e-3);
            const b = 1 - Math.exp(-dt / tau);
            this.aoaRateLowPass += (rawAoaRate - this.aoaRateLowPass) * b;
            this.gRateLowPass += (rawGRate - this.gRateLowPass) * b;
        }
        this.prevAoaRad = input.aoaRad;
        this.prevLoadG = input.loadFactorG;
    }
    pitchLaw(input, dt) {
        switch (input.pitchLimiterMode) {
            case FcsPitchLimiter.PREDICTIVE:
                return this.pitchLawPredictive(input, dt);
            case FcsPitchLimiter.SMOOTH:
                return this.pitchLawSmooth(input, dt);
            case FcsPitchLimiter.SOFT:
            default:
                return this.pitchLawSoft(input, dt);
        }
    }
    pitchAuthority(aoaRad, g, pull) {
        var _a;
        const p = this.cfg.pitch;
        const gMargin = (_a = p.gLimiterSoftMarginG) !== null && _a !== void 0 ? _a : 1.0;
        const aoaDeg = aoaRad / DEG;
        if (pull) {
            const aoaAuth = 1 - smoothstep(p.aoaSoftDeg, p.aoaLimitDeg, aoaDeg);
            const gAuth = 1 - smoothstep(p.maxCommandG - gMargin, p.maxCommandG, g);
            return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(Math.min(aoaAuth, gAuth), 0, 1);
        }
        const aoaAuth = 1 - smoothstep(-p.aoaSoftDeg, -p.aoaLimitDeg, aoaDeg);
        const gAuth = 1 - smoothstep(p.minCommandG + gMargin, p.minCommandG, g);
        return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(Math.min(aoaAuth, gAuth), 0, 1);
    }
    filterAuthority(rawAuth, dt, tau = AUTH_FILTER_TAU_S) {
        const b = dt <= 0 ? 1 : 1 - Math.exp(-dt / tau);
        this.authLowPass += (rawAuth - this.authLowPass) * b;
        return this.authLowPass;
    }
    pitchLawSoft(input, dt) {
        const stick = input.pitchStick;
        const rawAuth = this.pitchAuthority(input.aoaRad, input.loadFactorG, stick >= 0);
        const auth = this.filterAuthority(rawAuth, dt);
        return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(stick * auth + PITCH_RATE_DAMP * input.pitchRate, -1, 1);
    }
    pitchLawPredictive(input, dt) {
        var _a, _b, _c, _d, _e, _f;
        const p = this.cfg.pitch;
        const stick = input.pitchStick;
        const pull = stick >= 0;
        const aoaLead = ((_a = p.aoaLimiterLeadS) !== null && _a !== void 0 ? _a : 0.08) + ((_b = p.envelopeAuthorityLeadS) !== null && _b !== void 0 ? _b : 0.2);
        const gLead = pull
            ? ((_c = p.gLimiterLeadS) !== null && _c !== void 0 ? _c : 0.05) + ((_d = p.envelopeAuthorityLeadS) !== null && _d !== void 0 ? _d : 0.2)
            : ((_e = p.gLimiterNegLeadS) !== null && _e !== void 0 ? _e : 0.02) + ((_f = p.envelopeAuthorityLeadS) !== null && _f !== void 0 ? _f : 0.2);
        const predAoa = input.aoaRad + this.aoaRateLowPass * aoaLead;
        const predG = input.loadFactorG + this.gRateLowPass * gLead;
        const rawAuth = this.pitchAuthority(predAoa, predG, pull);
        const auth = this.filterAuthority(rawAuth, dt, PREDICT_AUTH_FILTER_TAU_S);
        const aoaDamp = (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(PREDICT_AOA_DAMP * (1 - auth) * this.aoaRateLowPass, -PREDICT_AOA_DAMP_CLAMP, PREDICT_AOA_DAMP_CLAMP);
        return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(stick * auth + PITCH_RATE_DAMP * input.pitchRate - aoaDamp, -1, 1);
    }
    pitchLawSmooth(input, dt) {
        const stick = input.pitchStick;
        const rawAuth = this.pitchAuthority(input.aoaRad, input.loadFactorG, stick >= 0);
        const auth = this.filterAuthority(rawAuth, dt, SMOOTH_AUTH_FILTER_TAU_S);
        const target = (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(stick * auth + PITCH_RATE_DAMP * input.pitchRate, -1, 1);
        const maxStep = dt <= 0 ? 1 : SMOOTH_SLEW_PER_S * dt;
        this.pitchTarget = (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(this.pitchTarget + (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(target - this.pitchTarget, -maxStep, maxStep), -1, 1);
        return this.pitchTarget;
    }
    directRollLaw(input) {
        return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(-input.rollStick - this.cfg.roll.rateDamp * input.rollRate, -1, 1);
    }
    rateCommandRollLaw(input) {
        if (input.landed) {
            return 0;
        }
        const commandedRateRad = computeCommandedRollRate(input, this.cfg.roll);
        const rateError = input.rollRate - commandedRateRad;
        return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(this.cfg.roll.rateGain * rateError, -1, 1);
    }
    yawLaw(input, aileronCmd, dt) {
        const yaw = this.cfg.yaw;
        const tau = Math.max(yaw.damperWashoutTauS, 1e-3);
        const a = dt <= 0 ? 1 : 1 - Math.exp(-dt / tau);
        this.yawRateLowPass += (input.yawRate - this.yawRateLowPass) * a;
        const yawRateHighPass = input.yawRate - this.yawRateLowPass;
        const damper = -yaw.damperGain * yawRateHighPass;
        const ari = yaw.ariGain * aileronCmd;
        const pedal = input.yawPedal * yaw.maxRudderCmd;
        return (0,_utils_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(pedal + damper + ari, -1, 1);
    }
}


/***/ },

/***/ "./src/script/physics/model/flightModel.ts"
/*!*************************************************!*\
  !*** ./src/script/physics/model/flightModel.ts ***!
  \*************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FlightModel: () => (/* binding */ FlightModel),
/* harmony export */   SIM_FPS: () => (/* binding */ SIM_FPS)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "./node_modules/three/build/three.core.js");
/* harmony import */ var _utils_math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils/math */ "./src/script/utils/math.ts");
/* harmony import */ var _fm2_fcs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../fm2/fcs */ "./src/script/physics/fm2/fcs.ts");



const SIM_FPS = 120;
const SIM_DELTA = 1.0 / SIM_FPS;
class FlightModel {
    constructor() {
        this.obj = new three__WEBPACK_IMPORTED_MODULE_0__.Object3D();
        this.velocity = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
        this.crashed = false;
        this.landed = true;
        this.landingGearDeployed = true;
        this.flapsExtended = true;
        this.wheelBrakesApplied = false;
        this.forebodyLaminar = false;
        this.pitchLimiterMode = _fm2_fcs__WEBPACK_IMPORTED_MODULE_2__.FcsPitchLimiter.SOFT;
        this.limitersEnabled = true;
        this.elevatorCommandLimitHigh = 1;
        this.elevatorCommandLimitLow = -1;
        this.pitch = 0;
        this.roll = 0;
        this.yaw = 0;
        this.throttle = 0;
        this.effectiveThrottle = 0;
        this.angleOfAttackRad = 0;
        this.loadFactorG = 1;
        this.engineThrustN = 0;
        this.commandedElevator = 0;
        this.commandedAileron = 0;
        this.commandedRudder = 0;
        this.accelWorld = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
        this.forceVectors = [];
        this.forceVectorsRequested = false;
        this.prevPosition = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
        this.prevQuaternion = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
        this.prevVelocity = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
        this.deltaRemainder = 0;
    }
    activate() {
    }
    getSimHealth() { return -1; }
    getSimAmmo() { return -1; }
    getSimFiring() { return false; }
    getSimGearDeployed() { return null; }
    getSimFlapsExtended() { return null; }
    reset() {
        this.obj.position.set(0, 0, 0);
        this.obj.quaternion.setFromAxisAngle(_utils_math__WEBPACK_IMPORTED_MODULE_1__.UP, 0);
        this.velocity.set(0, 0, 0);
        this.crashed = false;
        this.landed = true;
        this.landingGearDeployed = true;
        this.flapsExtended = true;
        this.wheelBrakesApplied = false;
        this.forebodyLaminar = false;
        this.pitchLimiterMode = _fm2_fcs__WEBPACK_IMPORTED_MODULE_2__.FcsPitchLimiter.SOFT;
        this.limitersEnabled = true;
        this.elevatorCommandLimitHigh = 1;
        this.elevatorCommandLimitLow = -1;
        this.pitch = 0;
        this.roll = 0;
        this.yaw = 0;
        this.throttle = 0;
        this.effectiveThrottle = 0;
        this.angleOfAttackRad = 0;
        this.loadFactorG = 1;
        this.engineThrustN = 0;
        this.commandedElevator = 0;
        this.commandedAileron = 0;
        this.commandedRudder = 0;
        this.accelWorld.set(0, 0, 0);
        this.deltaRemainder = 0;
        this.syncPreviousState();
    }
    snapPhysicsState() {
        this.syncPreviousState();
    }
    update(delta) {
        this.deltaRemainder += delta;
        while (this.deltaRemainder >= SIM_DELTA) {
            this.savePreviousState();
            this.step(SIM_DELTA);
            this.deltaRemainder -= SIM_DELTA;
        }
    }
    getRenderInterpolationAlpha() {
        return 1 - this.deltaRemainder / SIM_DELTA;
    }
    getRenderPosition(target) {
        return target.lerpVectors(this.prevPosition, this.obj.position, this.getRenderInterpolationAlpha());
    }
    getRenderQuaternion(target) {
        return target.slerpQuaternions(this.prevQuaternion, this.obj.quaternion, this.getRenderInterpolationAlpha());
    }
    getRenderVelocity(target) {
        return target.lerpVectors(this.prevVelocity, this.velocity, this.getRenderInterpolationAlpha());
    }
    savePreviousState() {
        this.prevPosition.copy(this.obj.position);
        this.prevQuaternion.copy(this.obj.quaternion);
        this.prevVelocity.copy(this.velocity);
    }
    syncPreviousState() {
        this.prevPosition.copy(this.obj.position);
        this.prevQuaternion.copy(this.obj.quaternion);
        this.prevVelocity.copy(this.velocity);
    }
    setPitch(pitch) {
        this.pitch = pitch;
    }
    setRoll(roll) {
        this.roll = roll;
    }
    setYaw(yaw) {
        this.yaw = yaw;
    }
    setThrottle(throttle) {
        this.throttle = throttle;
    }
    syncEffectiveThrottle() {
        this.effectiveThrottle = this.throttle;
    }
    setAircraft(_config) {
    }
    setLandingGearDeployed(deployed) {
        this.landingGearDeployed = deployed;
    }
    setFlapsExtended(extended) {
        this.flapsExtended = extended;
    }
    setWheelBrakes(applied) {
        this.wheelBrakesApplied = applied;
    }
    isWheelBrakesApplied() {
        return this.wheelBrakesApplied;
    }
    setForebodyLaminar(laminar) {
        this.forebodyLaminar = laminar;
    }
    isForebodyLaminar() {
        return this.forebodyLaminar;
    }
    setPitchLimiterMode(mode) {
        this.pitchLimiterMode = mode;
    }
    getPitchLimiterMode() {
        return this.pitchLimiterMode;
    }
    getPilotPitch() { return this.pitch; }
    getPilotRoll() { return this.roll; }
    getPilotYaw() { return this.yaw; }
    getPilotThrottle() { return this.throttle; }
    getWheelBrakesApplied() { return this.wheelBrakesApplied; }
    setLimitersEnabled(enabled) {
        this.limitersEnabled = enabled;
    }
    isLimitersEnabled() {
        return this.limitersEnabled;
    }
    getElevatorCommandLimitHigh() {
        return this.elevatorCommandLimitHigh;
    }
    getElevatorCommandLimitLow() {
        return this.elevatorCommandLimitLow;
    }
    setLanded(isLanded) {
        this.landed = isLanded;
    }
    isLanded() {
        return this.landed;
    }
    setCrashed(isCrashed) {
        this.crashed = isCrashed;
    }
    isCrashed() {
        return this.crashed;
    }
    set position(p) {
        this.obj.position.copy(p);
    }
    get position() {
        return this.obj.position;
    }
    set quaternion(q) {
        this.obj.quaternion.copy(q);
    }
    get quaternion() {
        return this.obj.quaternion;
    }
    set velocityVector(v) {
        this.velocity.copy(v);
    }
    get velocityVector() {
        return this.velocity;
    }
    getEffectiveThrottle() {
        return this.effectiveThrottle;
    }
    getAngleOfAttack() {
        return this.angleOfAttackRad;
    }
    getLoadFactorG() {
        return this.loadFactorG;
    }
    getCommandedElevator() {
        return this.commandedElevator;
    }
    getCommandedAileron() {
        return this.commandedAileron;
    }
    getCommandedRudder() {
        return this.commandedRudder;
    }
    getAccelerationWorld(target = this.accelWorld) {
        return target.copy(this.accelWorld);
    }
    getEngineThrustKn() {
        return this.engineThrustN / 1000;
    }
    setForceVectorsRequested(requested) {
        this.forceVectorsRequested = requested;
        if (!requested) {
            this.forceVectors = [];
        }
    }
    getForceVectors() {
        return this.forceVectors;
    }
    getForceVectorSnapshot() {
        return [];
    }
    useAfterburnerThrottleDetents() {
        return false;
    }
    stepThrottleDetent(current, direction) {
        return Math.max(0, Math.min(1, current + direction * 0.01));
    }
    isInThrottleAbDetentBand(_lever) {
        return false;
    }
    adjustThrottleInput(current, step) {
        return Math.max(0, Math.min(1, current + step));
    }
    getThrottleHudText() {
        return `THR ${(100 * this.effectiveThrottle).toFixed(0)}`;
    }
    getThrottleAudioLevel() {
        return this.effectiveThrottle;
    }
    getEngineNozzleColor() {
        return '#0a0a0a';
    }
}


/***/ },

/***/ "./src/script/utils/math.ts"
/*!**********************************!*\
  !*** ./src/script/utils/math.ts ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FORWARD: () => (/* binding */ FORWARD),
/* harmony export */   N180_OVER_PI: () => (/* binding */ N180_OVER_PI),
/* harmony export */   PI_OVER_180: () => (/* binding */ PI_OVER_180),
/* harmony export */   RIGHT: () => (/* binding */ RIGHT),
/* harmony export */   UP: () => (/* binding */ UP),
/* harmony export */   ZERO: () => (/* binding */ ZERO),
/* harmony export */   calculatePitchRoll: () => (/* binding */ calculatePitchRoll),
/* harmony export */   clamp: () => (/* binding */ clamp),
/* harmony export */   easeOutCirc: () => (/* binding */ easeOutCirc),
/* harmony export */   easeOutQuad: () => (/* binding */ easeOutQuad),
/* harmony export */   easeOutQuint: () => (/* binding */ easeOutQuint),
/* harmony export */   equals: () => (/* binding */ equals),
/* harmony export */   isZero: () => (/* binding */ isZero),
/* harmony export */   lerp: () => (/* binding */ lerp),
/* harmony export */   roundToZero: () => (/* binding */ roundToZero),
/* harmony export */   toDegrees: () => (/* binding */ toDegrees),
/* harmony export */   toRadians: () => (/* binding */ toRadians),
/* harmony export */   vectorHeading: () => (/* binding */ vectorHeading)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "./node_modules/three/build/three.core.js");

const _v = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const _w = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const _q = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
const EPSILON = 0.0001;
const ZERO = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, 0);
const UP = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 1, 0);
const FORWARD = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, 1);
const RIGHT = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, 0, 0);
function isZero(n) {
    return -EPSILON <= n && n <= EPSILON;
}
function equals(a, b, epsilon = EPSILON) {
    return a - epsilon <= b && b <= a + epsilon;
}
function clamp(n, min, max) {
    return Math.max(min, Math.min(n, max));
}
function lerp(t, n0, n1) {
    return n0 + t * (n1 - n0);
}
function vectorHeading(v) {
    let bearing = Math.round(Math.atan2(v.x, -v.z) / (2 * Math.PI) * 360);
    if (bearing < 0) {
        bearing = 360 + bearing;
    }
    return bearing;
}
function roundToZero(v, epsilon = EPSILON) {
    if (equals(v.x, 0.0, epsilon)) {
        v.x = 0;
    }
    if (equals(v.y, 0.0, epsilon)) {
        v.y = 0;
    }
    if (equals(v.z, 0.0, epsilon)) {
        v.z = 0;
    }
    return v;
}
function easeOutCirc(x) {
    return Math.sqrt(1 - (x - 1) * (x - 1));
}
function easeOutQuad(x) {
    return 1 - (1 - x) * (1 - x);
}
function easeOutQuint(x) {
    return 1 - Math.pow(1 - x, 5);
}
const PI_OVER_180 = Math.PI / 180.0;
const N180_OVER_PI = 180.0 / Math.PI;
function toRadians(degrees) {
    return PI_OVER_180 * degrees;
}
function toDegrees(radians) {
    return N180_OVER_PI * radians;
}
function calculatePitchRoll(actor) {
    const forward = actor.getWorldDirection(_v);
    const prjForward = _w.copy(forward)
        .setY(0)
        .normalize();
    const pitch = forward.angleTo(prjForward) * Math.sign(forward.y);
    _q.setFromUnitVectors(forward, prjForward);
    const right = _v.copy(RIGHT)
        .applyQuaternion(actor.quaternion)
        .applyQuaternion(_q);
    _q.setFromUnitVectors(prjForward, FORWARD);
    right.applyQuaternion(_q);
    let roll = Math.acos(right.x) * Math.sign(right.y);
    roll = isNaN(roll) ? 0.0 : roll;
    return [pitch, roll];
}


/***/ }

}]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3JjX3NjcmlwdF9kZWZzX3RzLXNyY19zY3JpcHRfcGh5c2ljc19mMTZQcm9maWxlX3RzLXNyY19zY3JpcHRfcGh5c2ljc19tb2RlbF9mbGlnaHRNb2RlbF90cy5idW5kbGUuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDTyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFFbkIsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDO0FBQ3JCLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQztBQUNyQixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUM7QUFDckIsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDO0FBRXJCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQztBQUNsQixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDbEIsTUFBTSxVQUFVLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztBQUM3QixNQUFNLFVBQVUsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0FBRTdCLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQztBQUM1QixNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQztBQUVqQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUMvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUM5QixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFDeEIsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDO0FBQ3pCLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQztBQUN2QixNQUFNLHdCQUF3QixHQUFHLEdBQUcsQ0FBQztBQUNyQyxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQztBQUNuQyxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQztBQUNuQyxN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QyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFakUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztJQUUzQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztTQUN2QixlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztTQUNqQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDekIsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzQyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25ELElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRWhDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL3JldHJvZmxpZ2h0c2ltLy4vc3JjL3NjcmlwdC9kZWZzLnRzIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltLy4vc3JjL3NjcmlwdC9waHlzaWNzL2Flcm9VdGlscy50cyIsIndlYnBhY2s6Ly9yZXRyb2ZsaWdodHNpbS8uL3NyYy9zY3JpcHQvcGh5c2ljcy9mMTZQYXBlckRhdGEudHMiLCJ3ZWJwYWNrOi8vcmV0cm9mbGlnaHRzaW0vLi9zcmMvc2NyaXB0L3BoeXNpY3MvZjE2UHJvZmlsZS50cyIsIndlYnBhY2s6Ly9yZXRyb2ZsaWdodHNpbS8uL3NyYy9zY3JpcHQvcGh5c2ljcy9mbTIvZmNzLnRzIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltLy4vc3JjL3NjcmlwdC9waHlzaWNzL21vZGVsL2ZsaWdodE1vZGVsLnRzIiwid2VicGFjazovL3JldHJvZmxpZ2h0c2ltLy4vc3JjL3NjcmlwdC91dGlscy9tYXRoLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IGNvbnN0IEZQU19DQVAgPSAxNTsgLy8gRlBTXG5cbmV4cG9ydCBjb25zdCBMT19IX1JFUyA9IDMyMDtcbmV4cG9ydCBjb25zdCBMT19WX1JFUyA9IDIwMDtcbmV4cG9ydCBjb25zdCBISV9IX1JFUyA9IDY0MDtcbmV4cG9ydCBjb25zdCBISV9WX1JFUyA9IDQwMDtcblxuZXhwb3J0IGNvbnN0IEhfUkVTID0gMzIwO1xuZXhwb3J0IGNvbnN0IFZfUkVTID0gMjAwO1xuZXhwb3J0IGNvbnN0IEhfUkVTX0hBTEYgPSBIX1JFUyAvIDI7XG5leHBvcnQgY29uc3QgVl9SRVNfSEFMRiA9IFZfUkVTIC8gMjtcblxuZXhwb3J0IGNvbnN0IFRFUlJBSU5fU0NBTEUgPSAyMDAuMDtcbmV4cG9ydCBjb25zdCBURVJSQUlOX01PREVMX1NJWkUgPSAxMDAuMDtcblxuZXhwb3J0IGNvbnN0IFBJVENIX1JBVEUgPSBNYXRoLlBJIC8gNTsgLy8gUmFkaWFucy9zXG5leHBvcnQgY29uc3QgUk9MTF9SQVRFID0gTWF0aC5QSSAvIDI7IC8vIFJhZGlhbnMvcyAod2FzIM+ALzMsICs1MCUpXG5leHBvcnQgY29uc3QgWUFXX1JBVEUgPSBNYXRoLlBJIC8gMTI7IC8vIFJhZGlhbnMvc1xuZXhwb3J0IGNvbnN0IE1BWF9TUEVFRCA9IDI1MC4wOyAvLyBXb3JsZCB1bml0cy9zXG5leHBvcnQgY29uc3QgVEhST1RUTEVfUkFURSA9IDMzOyAvLyBQZXJjZW50YWdlIG9mIG1heGltdW0vcyBbMCwxMDBdXG5leHBvcnQgY29uc3QgU1RJQ0tfUkFURSA9IDEuNTsgLy8gRnVsbCBzdGljayBkZWZsZWN0aW9uIHBlciBzZWNvbmQgKG5vbi1hcnJvdyBsYXlvdXRzKVxuZXhwb3J0IGNvbnN0IFBMQU5FX0RJU1RBTkNFX1RPX0dST1VORCA9IDIuMDsgLy8gV29ybGQgdW5pdHNcbmV4cG9ydCBjb25zdCBQTEFORV9DT0NLUElUX09GRlNFVF9ZID0gMS4wOyAvLyBXb3JsZCB1bml0c1xuZXhwb3J0IGNvbnN0IFBMQU5FX0NPQ0tQSVRfT0ZGU0VUX1ogPSA4LjA7IC8vIFdvcmxkIHVuaXRzXG5leHBvcnQgY29uc3QgTUFYX0FMVElUVURFID0gMTQwMDA7IC8vIFdvcmxkIHVuaXRzXG5cbmV4cG9ydCBjb25zdCBDT0NLUElUX0ZPViA9IDUwO1xuZXhwb3J0IGNvbnN0IENPQ0tQSVRfRkFSID0gNDAwMDA7XG5cbmV4cG9ydCBjb25zdCBERUJSSVNfUEFSVElDTEVfQ09VTlQgPSA0ODtcbi8qKiBIaXQgZmlyZS9zbW9rZSBwdWZmIHBvb2wgKHNoYXJlZCBhY3Jvc3MgYWlyY3JhZnQgbGVha3MpLiAqL1xuZXhwb3J0IGNvbnN0IERBTUFHRV9TTU9LRV9QQVJUSUNMRV9DT1VOVCA9IDE2MDtcblxuLyoqIEtleWJvYXJkRXZlbnQuY29kZSB0aGF0IG9wZW5zIHRoZSB0ZWxlbWV0cnkgZ3JhcGggcG9wdXAuICovXG5leHBvcnQgY29uc3QgVEVMRU1FVFJZX0dSQVBIX0tFWV9DT0RFID0gJ051bUxvY2snO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNUZWxlbWV0cnlHcmFwaEtleShldmVudDogS2V5Ym9hcmRFdmVudCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBldmVudC5jb2RlID09PSBURUxFTUVUUllfR1JBUEhfS0VZX0NPREVcbiAgICAgICAgfHwgZXZlbnQuY29kZSA9PT0gJ0NsZWFyJ1xuICAgICAgICB8fCBldmVudC5rZXkgPT09ICdOdW1Mb2NrJztcbn1cblxuZXhwb3J0IGNvbnN0IEFJUkJBU0VfUlVOV0FZID0geyB4OiAxNTAwLCB5OiAwLCB6OiAtODAwIH07XG5leHBvcnQgY29uc3QgUlVOV0FZX0hBTEZfTEVOR1RIX00gPSAxNTAwO1xuZXhwb3J0IGNvbnN0IEFQUFJPQUNIX0FMVElUVURFX00gPSA1MDAwO1xuZXhwb3J0IGNvbnN0IEFQUFJPQUNIX1NQRUVEX0tNSCA9IDUwMDtcbmV4cG9ydCBjb25zdCBBUFBST0FDSF9TUEVFRF9NUFMgPSBBUFBST0FDSF9TUEVFRF9LTUggLyAzLjY7XG5leHBvcnQgY29uc3QgQVBQUk9BQ0hfRklOQUxfRElTVEFOQ0VfTSA9IDUwMDA7XG5cbi8vIEFzeW1tZXRyaWMgZm9yZS9hZnQgcGl0Y2gtc3RpY2sgdHJhdmVsIGluIHN0aWNrIHVuaXRzLiBGb3J3YXJkIChwdXNoIC9cbi8vIG5vc2UtZG93bikgcmVhY2hlcyAtUElUQ0hfU1RJQ0tfRldEX1VOSVRTOyBhZnQgKHB1bGwgLyBub3NlLXVwKSByZWFjaGVzXG4vLyArUElUQ0hfU1RJQ0tfQUZUX1VOSVRTLiBSYXcgWy0xLCAxXSBpbnB1dCBpcyBzY2FsZWQgc28gZnVsbCBmb3J3YXJkIG1hcHMgdG9cbi8vIC1GV0QvQUZUIG9mIHRoZSBhZnQgdGhyb3cuXG5leHBvcnQgY29uc3QgUElUQ0hfU1RJQ0tfRldEX1VOSVRTID0gMjA7XG5leHBvcnQgY29uc3QgUElUQ0hfU1RJQ0tfQUZUX1VOSVRTID0gODA7XG4vKiogQXJyb3dzLWxheW91dCBwaXRjaCBob2xkOiBzdGFydGluZyBzdGljay11bml0cyBwZXIgc2Vjb25kLiAqL1xuZXhwb3J0IGNvbnN0IFBJVENIX1NUSUNLX0JBU0VfVU5JVF9SQVRFID0gMTA7XG4vKiogQXJyb3dzLWxheW91dCBwaXRjaCBob2xkOiBtYXhpbXVtIHN0aWNrLXVuaXRzIHBlciBzZWNvbmQgd2hpbGUgaGVsZC4gKi9cbmV4cG9ydCBjb25zdCBQSVRDSF9TVElDS19NQVhfVU5JVF9SQVRFID0gODA7XG4vKiogQXJyb3dzLWxheW91dCBwaXRjaCBob2xkOiBzdGljay11bml0cy9zwrIgYWRkZWQgdG8gdGhlIHN0ZXAgcmF0ZSBvdmVyIGhvbGQgdGltZS4gKi9cbmV4cG9ydCBjb25zdCBQSVRDSF9TVElDS19VTklUX0FDQ0VMID0gMTIwO1xuIiwiaW1wb3J0ICogYXMgVEhSRUUgZnJvbSAndGhyZWUnO1xyXG5cclxuY29uc3QgR1JBVklUWSA9IDkuODtcclxuXHJcbmV4cG9ydCBjb25zdCBHUk9VTkRfQUlSX0RFTlNJVFkgPSAxLjIyNTsgLy8ga2cvbcKzIGF0IHNlYSBsZXZlbCwgSVNBXHJcbmNvbnN0IFZORV9NQUNIID0gMC45NTsgLy8gdHJhbnNvbmljIGRyYWcgcmlzZSBvbnNldCAoc2ltIG9ubHk7IHBhcGVyIGvigoIgPSAwKVxyXG5cclxuY29uc3QgSVNBX1NFQV9MRVZFTF9QUkVTU1VSRSA9IDEwMTMyNTsgLy8gUGFcclxuY29uc3QgSVNBX1NFQV9MRVZFTF9URU1QID0gMjg4LjE1OyAvLyBLXHJcbmNvbnN0IElTQV9MQVBTRV9SQVRFID0gMC4wMDY1OyAvLyBLL21cclxuY29uc3QgSVNBX1RST1BPUEFVU0VfQUxUID0gMTEwMDA7IC8vIG1cclxuY29uc3QgSVNBX1RST1BPUEFVU0VfUFJFU1NVUkUgPSAyMjYzMi4xOyAvLyBQYVxyXG5jb25zdCBJU0FfVFJPUE9QQVVTRV9URU1QID0gMjE2LjY1OyAvLyBLXHJcbmNvbnN0IEdSQVZJVFlfSVNBID0gOS44MDY2NTsgLy8gbS9zwrJcclxuY29uc3QgR0FTX0NPTlNUQU5UID0gMjg3LjA1MzsgLy8gSi8oa2fCt0spXHJcblxyXG4vKiogSVNBIGRlbnNpdHkgKGtnL23Csykg4oCUIEFuZGVyc29uLXN0eWxlIHBlcmZvcm1hbmNlIGFuYWx5c2lzIGF0bW9zcGhlcmUuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlSXNhQWlyRGVuc2l0eShhbHRpdHVkZU1ldGVyczogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IGggPSBNYXRoLm1heCgwLCBhbHRpdHVkZU1ldGVycyk7XHJcbiAgICBsZXQgdGVtcGVyYXR1cmU6IG51bWJlcjtcclxuICAgIGxldCBwcmVzc3VyZTogbnVtYmVyO1xyXG5cclxuICAgIGlmIChoIDw9IElTQV9UUk9QT1BBVVNFX0FMVCkge1xyXG4gICAgICAgIHRlbXBlcmF0dXJlID0gSVNBX1NFQV9MRVZFTF9URU1QIC0gSVNBX0xBUFNFX1JBVEUgKiBoO1xyXG4gICAgICAgIHByZXNzdXJlID0gSVNBX1NFQV9MRVZFTF9QUkVTU1VSRSAqIE1hdGgucG93KFxyXG4gICAgICAgICAgICB0ZW1wZXJhdHVyZSAvIElTQV9TRUFfTEVWRUxfVEVNUCxcclxuICAgICAgICAgICAgR1JBVklUWV9JU0EgLyAoR0FTX0NPTlNUQU5UICogSVNBX0xBUFNFX1JBVEUpLFxyXG4gICAgICAgICk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRlbXBlcmF0dXJlID0gSVNBX1RST1BPUEFVU0VfVEVNUDtcclxuICAgICAgICBwcmVzc3VyZSA9IElTQV9UUk9QT1BBVVNFX1BSRVNTVVJFICogTWF0aC5leHAoXHJcbiAgICAgICAgICAgIC1HUkFWSVRZX0lTQSAqIChoIC0gSVNBX1RST1BPUEFVU0VfQUxUKSAvIChHQVNfQ09OU1RBTlQgKiBJU0FfVFJPUE9QQVVTRV9URU1QKSxcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwcmVzc3VyZSAvIChHQVNfQ09OU1RBTlQgKiB0ZW1wZXJhdHVyZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlQWlyRGVuc2l0eShhbHRpdHVkZU1ldGVyczogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBjb21wdXRlSXNhQWlyRGVuc2l0eShhbHRpdHVkZU1ldGVycyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlRHluYW1pY1ByZXNzdXJlKGFpckRlbnNpdHk6IG51bWJlciwgc3BlZWQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gMC41ICogYWlyRGVuc2l0eSAqIHNwZWVkICogc3BlZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlVGhydXN0RGVuc2l0eUZhY3RvcihhaXJEZW5zaXR5OiBudW1iZXIsIGFsdGl0dWRlTWV0ZXJzID0gMCk6IG51bWJlciB7XHJcbiAgICBjb25zdCBzaWdtYSA9IGFpckRlbnNpdHkgLyBHUk9VTkRfQUlSX0RFTlNJVFk7XHJcbiAgICBjb25zdCBsYXBzZSA9IE1hdGgucG93KHNpZ21hLCAwLjcpO1xyXG4gICAgY29uc3Qgb3B0aW11bUFsdGl0dWRlID0gMTEwMDA7IC8vIG0sIH5GTDM2MCB0aHJ1c3QtbGltaXRlZCBvcHRpbXVtXHJcbiAgICBjb25zdCBhbHRQZW5hbHR5ID0gYWx0aXR1ZGVNZXRlcnMgPD0gb3B0aW11bUFsdGl0dWRlXHJcbiAgICAgICAgPyAxXHJcbiAgICAgICAgOiBNYXRoLm1heCgwLjM1LCAxIC0gKGFsdGl0dWRlTWV0ZXJzIC0gb3B0aW11bUFsdGl0dWRlKSAvIDkwMDApO1xyXG4gICAgcmV0dXJuIGxhcHNlICogYWx0UGVuYWx0eTtcclxufVxyXG5cclxuY29uc3QgR0FNTUEgPSAxLjQ7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVNwZWVkT2ZTb3VuZChhbHRpdHVkZU1ldGVyczogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHRlbXBlcmF0dXJlID0gTWF0aC5tYXgoSVNBX1RST1BPUEFVU0VfVEVNUCwgSVNBX1NFQV9MRVZFTF9URU1QIC0gSVNBX0xBUFNFX1JBVEUgKiBhbHRpdHVkZU1ldGVycyk7XHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KEdBTU1BICogR0FTX0NPTlNUQU5UICogdGVtcGVyYXR1cmUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZU1hY2hOdW1iZXIoc3BlZWRNcHM6IG51bWJlciwgYWx0aXR1ZGVNZXRlcnM6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICBjb25zdCBzcGVlZE9mU291bmQgPSBjb21wdXRlU3BlZWRPZlNvdW5kKGFsdGl0dWRlTWV0ZXJzKTtcclxuICAgIGlmIChzcGVlZE9mU291bmQgPD0gMCkge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHNwZWVkTXBzIC8gc3BlZWRPZlNvdW5kO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZUR5bmFtaWNQcmVzc3VyZURyYWdQZW5hbHR5KHNwZWVkTXBzOiBudW1iZXIsIGFsdGl0dWRlTWV0ZXJzOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgY29uc3Qgc3BlZWRPZlNvdW5kID0gY29tcHV0ZVNwZWVkT2ZTb3VuZChhbHRpdHVkZU1ldGVycyk7XHJcbiAgICBpZiAoc3BlZWRPZlNvdW5kIDw9IDAgfHwgc3BlZWRNcHMgPD0gMCkge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG4gICAgY29uc3QgbWFjaCA9IHNwZWVkTXBzIC8gc3BlZWRPZlNvdW5kO1xyXG4gICAgaWYgKG1hY2ggPD0gVk5FX01BQ0gpIHtcclxuICAgICAgICByZXR1cm4gMDtcclxuICAgIH1cclxuICAgIGNvbnN0IGV4Y2VzcyA9IChtYWNoIC0gVk5FX01BQ0gpIC8gVk5FX01BQ0g7XHJcbiAgICByZXR1cm4gMC41NSAqIGV4Y2VzcyAqIGV4Y2VzcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVNYXhFcXVpbGlicml1bVNwZWVkKFxyXG4gICAgYWlyRGVuc2l0eTogbnVtYmVyLFxyXG4gICAgdGhydXN0Rm9yY2U6IG51bWJlcixcclxuICAgIHdpbmdBcmVhOiBudW1iZXIsXHJcbiAgICBkcmFnQ29lZmZpY2llbnQ6IG51bWJlcixcclxuKTogbnVtYmVyIHtcclxuICAgIGlmIChhaXJEZW5zaXR5IDw9IDAgfHwgZHJhZ0NvZWZmaWNpZW50IDw9IDAgfHwgdGhydXN0Rm9yY2UgPD0gMCkge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIE1hdGguc3FydCgyICogdGhydXN0Rm9yY2UgLyAoYWlyRGVuc2l0eSAqIHdpbmdBcmVhICogZHJhZ0NvZWZmaWNpZW50KSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlQW5nbGVPZkF0dGFjayhcclxuICAgIGZvcndhcmQ6IFRIUkVFLlZlY3RvcjMsXHJcbiAgICByaWdodDogVEhSRUUuVmVjdG9yMyxcclxuICAgIHZlbG9jaXR5OiBUSFJFRS5WZWN0b3IzLFxyXG4gICAgc2NyYXRjaDogVEhSRUUuVmVjdG9yMyxcclxuKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHNwZWVkID0gdmVsb2NpdHkubGVuZ3RoKCk7XHJcbiAgICBpZiAoc3BlZWQgPD0gMS4wKSB7XHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcblxyXG4gICAgc2NyYXRjaC5jb3B5KHZlbG9jaXR5KS5tdWx0aXBseVNjYWxhcigxIC8gc3BlZWQpLnByb2plY3RPblBsYW5lKHJpZ2h0KTtcclxuICAgIGlmIChzY3JhdGNoLmxlbmd0aFNxKCkgPD0gMWUtNikge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG5cclxuICAgIHNjcmF0Y2gubm9ybWFsaXplKCk7XHJcbiAgICBjb25zdCBhb2FBbmdsZSA9IHNjcmF0Y2guYW5nbGVUbyhmb3J3YXJkKTtcclxuICAgIGNvbnN0IGFvYVNpZ24gPSBzY3JhdGNoLmNyb3NzKGZvcndhcmQpLmRvdChyaWdodCkgPiAwID8gLTEgOiAxO1xyXG4gICAgcmV0dXJuIGFvYVNpZ24gKiBhb2FBbmdsZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVMb2FkRmFjdG9yRyhhY2NlbDogVEhSRUUuVmVjdG9yMywgdXA6IFRIUkVFLlZlY3RvcjMsIGdyYXZpdHkgPSBHUkFWSVRZKTogbnVtYmVyIHtcclxuICAgIHJldHVybiAoYWNjZWwueCAqIHVwLnggKyAoYWNjZWwueSArIGdyYXZpdHkpICogdXAueSArIGFjY2VsLnogKiB1cC56KSAvIGdyYXZpdHk7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEYtMTZDIGFlcm9keW5hbWljIGRhdGEgZnJvbTpcclxuICogUmVobWFuLCBcIkFlcm9keW5hbWljIFBlcmZvcm1hbmNlIEFuYWx5c2lzIG9mIEYtMTZDIEZpZ2h0aW5nIEZhbGNvblwiIChOVVNUKS5cclxuICogQ2hhcnQgcmVmZXJlbmNlcyBjb21wdXRlZCB3aXRoIEFuZGVyc29uIElTQSArIHBhcGVyIEVxLiAoMuKAkzUpLCBr4oKCID0gMC5cclxuICovXHJcblxyXG5leHBvcnQgY29uc3QgRjE2X1BBUEVSX0FOQUxZVElDQUwgPSB7XHJcbiAgICAvKiogRXEuICgyKTogQ0QwID0gQ2ZlICogU3dldCAvIFNyZWYgKi9cclxuICAgIGNkMDogMC4wMTgsXHJcbiAgICAvKiogRXEuICgz4oCTNSk6IENEaSA9IEsgKiBDTMKyICovXHJcbiAgICBpbmR1Y2VkRHJhZ0s6IDAuMTQ4OSxcclxuICAgIGNsMDogMC4yLFxyXG4gICAgLyoqIE5BQ0EgNjRBMjA0LCBwZXIgcmFkaWFuICovXHJcbiAgICBjbEFscGhhUGVyUmFkOiA1LjczLFxyXG4gICAgLyoqIEZpZy4gNyBwZWFrICovXHJcbiAgICBtYXhMaWZ0VG9EcmFnOiA5LjY2LFxyXG4gICAgbWF4TGlmdFRvRHJhZ0FscGhhRGVnOiAyLFxyXG4gICAgLyoqIEZpZy4gOSAqL1xyXG4gICAgbWluR2xpZGVBbmdsZURlZzogNS45MSxcclxuICAgIC8qKiBTZWN0aW9uIElJSSBhc3N1bXB0aW9ucyDigJQgY3J1aXNlIGF0IE1UT1cgKi9cclxuICAgIGNydWlzZVZlbG9jaXR5RnBzOiA4NDYsXHJcbiAgICBjcnVpc2VBbHRpdHVkZUZ0OiAzMDAwMCxcclxuICAgIC8qKiBKYW5lJ3MgLyBsaXRlcmF0dXJlIHNlcnZpY2UgY2VpbGluZyAqL1xyXG4gICAgc2VydmljZUNlaWxpbmdGdDogNTAwMDAsXHJcbiAgICB3aW5nQXJlYUZ0MjogMzAwLFxyXG4gICAgbXRvd0xiOiA0MjAwMCxcclxufSBhcyBjb25zdDtcclxuXHJcbi8qKiBPcGVuVlNQIC8gVlNQQWVybyByZXN1bHRzIGNpdGVkIGluIFNlY3Rpb24gSVYuQi4gKi9cclxuZXhwb3J0IGNvbnN0IEYxNl9QQVBFUl9WU1BBRVJPID0ge1xyXG4gICAgY2QwOiAwLjAxMjQsXHJcbiAgICBjbEFscGhhUGVyUmFkOiAzLjYyLFxyXG4gICAgLyoqIERlcml2ZWQgZnJvbSBML0QgbWF4ID0gMTQgYXQgzrEg4omIIDTCsCB3aXRoIENM4oKAID0gMC4yLiAqL1xyXG4gICAgaW5kdWNlZERyYWdLOiAwLjA5NzMsXHJcbiAgICBtYXhMaWZ0VG9EcmFnOiAxNCxcclxuICAgIG1heExpZnRUb0RyYWdBbHBoYURlZzogNCxcclxufSBhcyBjb25zdDtcclxuXHJcbmV4cG9ydCB0eXBlIEYxNlBhcGVyTWV0cmljID1cclxuICAgIHwgJ2xpZnRUb0RyYWcnXHJcbiAgICB8ICdtaW5HbGlkZUFuZ2xlRGVnJ1xyXG4gICAgfCAndGhydXN0UmVxdWlyZWRMYidcclxuICAgIHwgJ3RvdGFsRHJhZ0xiJ1xyXG4gICAgfCAnbWluVG90YWxEcmFnTGInXHJcbiAgICB8ICdjcnVpc2VTcGVlZEZwcydcclxuICAgIHwgJ2NkMCdcclxuICAgIHwgJ2NsQWxwaGFQZXJSYWQnXHJcbiAgICB8ICd2TWluRHJhZ0Zwcyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEYxNlBhcGVyQ2hhcnRDYXNlIHtcclxuICAgIGlkOiBzdHJpbmc7XHJcbiAgICBmaWd1cmU6IHN0cmluZztcclxuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgICBtZXRyaWM6IEYxNlBhcGVyTWV0cmljO1xyXG4gICAgLyoqIEFuZ2xlIG9mIGF0dGFjayBmb3IgTC9EIGNhc2VzIChkZWdyZWVzKS4gKi9cclxuICAgIGFscGhhRGVnPzogbnVtYmVyO1xyXG4gICAgYWx0aXR1ZGVGdDogbnVtYmVyO1xyXG4gICAgd2VpZ2h0TGI6IG51bWJlcjtcclxuICAgIHZlbG9jaXR5RnBzOiBudW1iZXI7XHJcbiAgICByZWZlcmVuY2U6IG51bWJlcjtcclxuICAgIHRvbGVyYW5jZTogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hhcnQgY2hlY2twb2ludHMgZnJvbSBGaWdzLiA3LCA5LCAxMOKAkzEyLCAxNuKAkzE3LlxyXG4gKiBEcmFnL3RocnVzdCByZWZlcmVuY2VzOiBJU0EgKyBwYXBlciBwb2xhciBhdCBzdGF0ZWQgViwgaCwgVyAoTUFUTEFCIG1ldGhvZG9sb2d5KS5cclxuICovXHJcbmV4cG9ydCBjb25zdCBGMTZfUEFQRVJfQ0hBUlRfQ0FTRVM6IEYxNlBhcGVyQ2hhcnRDYXNlW10gPSBbXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdmaWc3X2xkX21heCcsXHJcbiAgICAgICAgZmlndXJlOiAnRmlnLiA3JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gbGlmdC10by1kcmFnIHJhdGlvJyxcclxuICAgICAgICBtZXRyaWM6ICdsaWZ0VG9EcmFnJyxcclxuICAgICAgICBhbHBoYURlZzogMixcclxuICAgICAgICBhbHRpdHVkZUZ0OiAwLFxyXG4gICAgICAgIHdlaWdodExiOiBGMTZfUEFQRVJfQU5BTFlUSUNBTC5tdG93TGIsXHJcbiAgICAgICAgdmVsb2NpdHlGcHM6IDAsXHJcbiAgICAgICAgcmVmZXJlbmNlOiA5LjY2LFxyXG4gICAgICAgIHRvbGVyYW5jZTogMC4xNSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdmaWc5X21pbl9nbGlkZScsXHJcbiAgICAgICAgZmlndXJlOiAnRmlnLiA5JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ01pbmltdW0gZ2xpZGUgYW5nbGUnLFxyXG4gICAgICAgIG1ldHJpYzogJ21pbkdsaWRlQW5nbGVEZWcnLFxyXG4gICAgICAgIGFsdGl0dWRlRnQ6IDMwMDAwLFxyXG4gICAgICAgIHdlaWdodExiOiBGMTZfUEFQRVJfQU5BTFlUSUNBTC5tdG93TGIsXHJcbiAgICAgICAgdmVsb2NpdHlGcHM6IDAsXHJcbiAgICAgICAgcmVmZXJlbmNlOiA1LjkxLFxyXG4gICAgICAgIHRvbGVyYW5jZTogMC4xLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBpZDogJ2ZpZzEwX21pbl9kcmFnXzIwaycsXHJcbiAgICAgICAgZmlndXJlOiAnRmlnLiAxMCcsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdNaW5pbXVtIHRvdGFsIGRyYWcgYXQgMjAsMDAwIGZ0IChNVE9XKScsXHJcbiAgICAgICAgbWV0cmljOiAnbWluVG90YWxEcmFnTGInLFxyXG4gICAgICAgIGFsdGl0dWRlRnQ6IDIwMDAwLFxyXG4gICAgICAgIHdlaWdodExiOiBGMTZfUEFQRVJfQU5BTFlUSUNBTC5tdG93TGIsXHJcbiAgICAgICAgdmVsb2NpdHlGcHM6IDc5NyxcclxuICAgICAgICByZWZlcmVuY2U6IDQzNDguNzQsXHJcbiAgICAgICAgdG9sZXJhbmNlOiA1MCxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdmaWcxMF9kcmFnXzc1MGZwcycsXHJcbiAgICAgICAgZmlndXJlOiAnRmlnLiAxMCcsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdUb3RhbCBkcmFnIGF0IDc1MCBmdC9zLCAyMCwwMDAgZnQgKE1UT1cpJyxcclxuICAgICAgICBtZXRyaWM6ICd0b3RhbERyYWdMYicsXHJcbiAgICAgICAgYWx0aXR1ZGVGdDogMjAwMDAsXHJcbiAgICAgICAgd2VpZ2h0TGI6IEYxNl9QQVBFUl9BTkFMWVRJQ0FMLm10b3dMYixcclxuICAgICAgICB2ZWxvY2l0eUZwczogNzUwLFxyXG4gICAgICAgIHJlZmVyZW5jZTogNDM4MS41MCxcclxuICAgICAgICB0b2xlcmFuY2U6IDUwLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBpZDogJ2ZpZzExX21pbl9kcmFnXzMwaycsXHJcbiAgICAgICAgZmlndXJlOiAnRmlnLiAxMScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdNaW5pbXVtIHRvdGFsIGRyYWcgYXQgMzAsMDAwIGZ0IChNVE9XKScsXHJcbiAgICAgICAgbWV0cmljOiAnbWluVG90YWxEcmFnTGInLFxyXG4gICAgICAgIGFsdGl0dWRlRnQ6IDMwMDAwLFxyXG4gICAgICAgIHdlaWdodExiOiBGMTZfUEFQRVJfQU5BTFlUSUNBTC5tdG93TGIsXHJcbiAgICAgICAgdmVsb2NpdHlGcHM6IDk1MixcclxuICAgICAgICByZWZlcmVuY2U6IDQzNDguNzQsXHJcbiAgICAgICAgdG9sZXJhbmNlOiA1MCxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdmaWcxMV9kcmFnXzkwMGZwcycsXHJcbiAgICAgICAgZmlndXJlOiAnRmlnLiAxMScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdUb3RhbCBkcmFnIGF0IDkwMCBmdC9zLCAzMCwwMDAgZnQgKE1UT1cpJyxcclxuICAgICAgICBtZXRyaWM6ICd0b3RhbERyYWdMYicsXHJcbiAgICAgICAgYWx0aXR1ZGVGdDogMzAwMDAsXHJcbiAgICAgICAgd2VpZ2h0TGI6IEYxNl9QQVBFUl9BTkFMWVRJQ0FMLm10b3dMYixcclxuICAgICAgICB2ZWxvY2l0eUZwczogOTAwLFxyXG4gICAgICAgIHJlZmVyZW5jZTogNDM3NS44NCxcclxuICAgICAgICB0b2xlcmFuY2U6IDUwLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBpZDogJ2ZpZzEyX21pbl9kcmFnXzQwaycsXHJcbiAgICAgICAgZmlndXJlOiAnRmlnLiAxMicsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdNaW5pbXVtIHRvdGFsIGRyYWcgYXQgNDAsMDAwIGZ0IChNVE9XKScsXHJcbiAgICAgICAgbWV0cmljOiAnbWluVG90YWxEcmFnTGInLFxyXG4gICAgICAgIGFsdGl0dWRlRnQ6IDQwMDAwLFxyXG4gICAgICAgIHdlaWdodExiOiBGMTZfUEFQRVJfQU5BTFlUSUNBTC5tdG93TGIsXHJcbiAgICAgICAgdmVsb2NpdHlGcHM6IDExNzMsXHJcbiAgICAgICAgcmVmZXJlbmNlOiA0MzQ4LjczLFxyXG4gICAgICAgIHRvbGVyYW5jZTogNTAsXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIGlkOiAnZmlnMTJfZHJhZ18xMDAwZnBzJyxcclxuICAgICAgICBmaWd1cmU6ICdGaWcuIDEyJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RvdGFsIGRyYWcgYXQgMSwwMDAgZnQvcywgNDAsMDAwIGZ0IChNVE9XKScsXHJcbiAgICAgICAgbWV0cmljOiAndG90YWxEcmFnTGInLFxyXG4gICAgICAgIGFsdGl0dWRlRnQ6IDQwMDAwLFxyXG4gICAgICAgIHdlaWdodExiOiBGMTZfUEFQRVJfQU5BTFlUSUNBTC5tdG93TGIsXHJcbiAgICAgICAgdmVsb2NpdHlGcHM6IDEwMDAsXHJcbiAgICAgICAgcmVmZXJlbmNlOiA0NTcyLjUzLFxyXG4gICAgICAgIHRvbGVyYW5jZTogNTAsXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIGlkOiAnZmlnMTZfdHJfbWluXzM1a2xiJyxcclxuICAgICAgICBmaWd1cmU6ICdGaWcuIDE2JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ01pbmltdW0gdGhydXN0IHJlcXVpcmVkIGF0IDM1LDAwMCBsYiAoMzAsMDAwIGZ0KScsXHJcbiAgICAgICAgbWV0cmljOiAndGhydXN0UmVxdWlyZWRMYicsXHJcbiAgICAgICAgYWx0aXR1ZGVGdDogMzAwMDAsXHJcbiAgICAgICAgd2VpZ2h0TGI6IDM1MDAwLFxyXG4gICAgICAgIHZlbG9jaXR5RnBzOiA4NzAsXHJcbiAgICAgICAgcmVmZXJlbmNlOiAzNjIzLjk2LFxyXG4gICAgICAgIHRvbGVyYW5jZTogNTAsXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIGlkOiAnZmlnMTZfdHJfMzVrbGJfOTAwZnBzJyxcclxuICAgICAgICBmaWd1cmU6ICdGaWcuIDE2JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RocnVzdCByZXF1aXJlZCBhdCAzNSwwMDAgbGIsIDkwMCBmdC9zICgzMCwwMDAgZnQpJyxcclxuICAgICAgICBtZXRyaWM6ICd0aHJ1c3RSZXF1aXJlZExiJyxcclxuICAgICAgICBhbHRpdHVkZUZ0OiAzMDAwMCxcclxuICAgICAgICB3ZWlnaHRMYjogMzUwMDAsXHJcbiAgICAgICAgdmVsb2NpdHlGcHM6IDkwMCxcclxuICAgICAgICByZWZlcmVuY2U6IDM2MzMuMDEsXHJcbiAgICAgICAgdG9sZXJhbmNlOiA1MCxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdmaWcxNl90cl8zNWtsYl8xMDAwZnBzJyxcclxuICAgICAgICBmaWd1cmU6ICdGaWcuIDE2JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RocnVzdCByZXF1aXJlZCBhdCAzNSwwMDAgbGIsIDEsMDAwIGZ0L3MgKDMwLDAwMCBmdCknLFxyXG4gICAgICAgIG1ldHJpYzogJ3RocnVzdFJlcXVpcmVkTGInLFxyXG4gICAgICAgIGFsdGl0dWRlRnQ6IDMwMDAwLFxyXG4gICAgICAgIHdlaWdodExiOiAzNTAwMCxcclxuICAgICAgICB2ZWxvY2l0eUZwczogMTAwMCxcclxuICAgICAgICByZWZlcmVuY2U6IDM3NjguNDMsXHJcbiAgICAgICAgdG9sZXJhbmNlOiA1MCxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdmaWcxN190cl9taW5fMjBrJyxcclxuICAgICAgICBmaWd1cmU6ICdGaWcuIDE3JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ01pbmltdW0gdGhydXN0IHJlcXVpcmVkIGF0IDIwLDAwMCBmdCAoTVRPVyknLFxyXG4gICAgICAgIG1ldHJpYzogJ3RocnVzdFJlcXVpcmVkTGInLFxyXG4gICAgICAgIGFsdGl0dWRlRnQ6IDIwMDAwLFxyXG4gICAgICAgIHdlaWdodExiOiBGMTZfUEFQRVJfQU5BTFlUSUNBTC5tdG93TGIsXHJcbiAgICAgICAgdmVsb2NpdHlGcHM6IDc5NyxcclxuICAgICAgICByZWZlcmVuY2U6IDQzNDguNzQsXHJcbiAgICAgICAgdG9sZXJhbmNlOiA1MCxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdmaWcxN190cl9taW5fMzBrJyxcclxuICAgICAgICBmaWd1cmU6ICdGaWcuIDE3JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RocnVzdCByZXF1aXJlZCBhdCAxLDAwMCBmdC9zLCAzMCwwMDAgZnQgKE1UT1cpJyxcclxuICAgICAgICBtZXRyaWM6ICd0aHJ1c3RSZXF1aXJlZExiJyxcclxuICAgICAgICBhbHRpdHVkZUZ0OiAzMDAwMCxcclxuICAgICAgICB3ZWlnaHRMYjogRjE2X1BBUEVSX0FOQUxZVElDQUwubXRvd0xiLFxyXG4gICAgICAgIHZlbG9jaXR5RnBzOiAxMDAwLFxyXG4gICAgICAgIHJlZmVyZW5jZTogNDM3MC4xMixcclxuICAgICAgICB0b2xlcmFuY2U6IDUwLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBpZDogJ2ZpZzE3X3RyXzExNTBmcHNfNDBrJyxcclxuICAgICAgICBmaWd1cmU6ICdGaWcuIDE3JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RocnVzdCByZXF1aXJlZCBhdCAxLDE1MCBmdC9zLCA0MCwwMDAgZnQgKE1UT1cpJyxcclxuICAgICAgICBtZXRyaWM6ICd0aHJ1c3RSZXF1aXJlZExiJyxcclxuICAgICAgICBhbHRpdHVkZUZ0OiA0MDAwMCxcclxuICAgICAgICB3ZWlnaHRMYjogRjE2X1BBUEVSX0FOQUxZVElDQUwubXRvd0xiLFxyXG4gICAgICAgIHZlbG9jaXR5RnBzOiAxMTUwLFxyXG4gICAgICAgIHJlZmVyZW5jZTogNDM1Mi4yMCxcclxuICAgICAgICB0b2xlcmFuY2U6IDUwLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBpZDogJ2Fzc3VtcHRpb25fY3J1aXNlX3NwZWVkJyxcclxuICAgICAgICBmaWd1cmU6ICdTZWN0aW9uIElJSScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdDcnVpc2UgdmVsb2NpdHkgYXQgMzAsMDAwIGZ0IChNVE9XKScsXHJcbiAgICAgICAgbWV0cmljOiAnY3J1aXNlU3BlZWRGcHMnLFxyXG4gICAgICAgIGFsdGl0dWRlRnQ6IEYxNl9QQVBFUl9BTkFMWVRJQ0FMLmNydWlzZUFsdGl0dWRlRnQsXHJcbiAgICAgICAgd2VpZ2h0TGI6IEYxNl9QQVBFUl9BTkFMWVRJQ0FMLm10b3dMYixcclxuICAgICAgICB2ZWxvY2l0eUZwczogRjE2X1BBUEVSX0FOQUxZVElDQUwuY3J1aXNlVmVsb2NpdHlGcHMsXHJcbiAgICAgICAgcmVmZXJlbmNlOiA4NDYsXHJcbiAgICAgICAgdG9sZXJhbmNlOiAwLjUsXHJcbiAgICB9LFxyXG5dO1xyXG5cclxuLyoqIFZTUEFlcm8gY2hhcnQgY2hlY2twb2ludHMgKEZpZ3MuIDE44oCTMjApLiAqL1xyXG5leHBvcnQgY29uc3QgRjE2X1BBUEVSX1ZTUEFFUk9fQ0FTRVM6IEYxNlBhcGVyQ2hhcnRDYXNlW10gPSBbXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdmaWcyMF9sZF9tYXhfdnNwYWVybycsXHJcbiAgICAgICAgZmlndXJlOiAnRmlnLiAyMCcsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdWU1BBZXJvIG1heGltdW0gTC9EJyxcclxuICAgICAgICBtZXRyaWM6ICdsaWZ0VG9EcmFnJyxcclxuICAgICAgICBhbHBoYURlZzogNCxcclxuICAgICAgICBhbHRpdHVkZUZ0OiAwLFxyXG4gICAgICAgIHdlaWdodExiOiBGMTZfUEFQRVJfQU5BTFlUSUNBTC5tdG93TGIsXHJcbiAgICAgICAgdmVsb2NpdHlGcHM6IDAsXHJcbiAgICAgICAgcmVmZXJlbmNlOiAxNCxcclxuICAgICAgICB0b2xlcmFuY2U6IDAuMTUsXHJcbiAgICB9LFxyXG5dO1xyXG5cclxuZXhwb3J0IGNvbnN0IEZUX1RPX00gPSAwLjMwNDg7XHJcbmV4cG9ydCBjb25zdCBGUFNfVE9fTVBTID0gRlRfVE9fTTtcclxuZXhwb3J0IGNvbnN0IExCX1RPX04gPSA0LjQ0ODIyMTYxNTM7XHJcbmV4cG9ydCBjb25zdCBMQl9UT19LRyA9IDAuNDUzNTkyMzc7XHJcbiIsIi8qKlxyXG4gKiBGLTE2QyBzaW0gcHJvZmlsZSBhbmQgcmVmZXJlbmNlIGRhdGEuXHJcbiAqIEFuYWx5dGljYWwgYWVybzogUmVobWFuLCBcIkFlcm9keW5hbWljIFBlcmZvcm1hbmNlIEFuYWx5c2lzIG9mIEYtMTZDIEZpZ2h0aW5nIEZhbGNvblwiLlxyXG4gKiBQZXJmb3JtYW5jZSBlbnZlbG9wZTogVVNBRiBmYWN0IHNoZWV0IC8gSmFuZSdzLlxyXG4gKi9cclxuaW1wb3J0IHsgRjE2X1BBUEVSX0FOQUxZVElDQUwgfSBmcm9tICcuL2YxNlBhcGVyRGF0YSc7XHJcblxyXG5leHBvcnQgY29uc3QgRjE2X1BST0ZJTEUgPSB7XHJcbiAgICAvKiogTVRPVyBmb3IgcGFwZXIvZW52ZWxvcGUgYW5hbHlzaXMgKH40MiwwMDAgbGIpLiAqL1xyXG4gICAgY29tYmF0TWFzc0tnOiAxOTA1MSxcclxuICAgIC8qKiBUeXBpY2FsIHRha2VvZmYgZ3Jvc3Mgd2VpZ2h0IGZvciBzaW0gZHluYW1pY3MgKH4zMCwwMDAgbGIpLiAqL1xyXG4gICAgc2ltTWFzc0tnOiAxMzYwOCxcclxuICAgIHdpbmdBcmVhTTI6IDI3Ljg3LFxyXG4gICAgd2luZ1NwYW5NOiA5LjQ1LFxyXG4gICAgY2QwOiBGMTZfUEFQRVJfQU5BTFlUSUNBTC5jZDAsXHJcbiAgICBpbmR1Y2VkRHJhZ0s6IEYxNl9QQVBFUl9BTkFMWVRJQ0FMLmluZHVjZWREcmFnSyxcclxuICAgIGNsMDogRjE2X1BBUEVSX0FOQUxZVElDQUwuY2wwLFxyXG4gICAgY2xBbHBoYVBlclJhZDogRjE2X1BBUEVSX0FOQUxZVElDQUwuY2xBbHBoYVBlclJhZCxcclxuICAgIGFiVGhydXN0S246IDEyOS40LFxyXG4gICAgbWlsVGhydXN0S246IDc2LjMsXHJcbiAgICAvKiogTGV2ZXIgYXQgMTAwJSBtaWxpdGFyeSBwb3dlciAoOTggb24gMOKAkzEwMCBxdWFkcmFudCkuICovXHJcbiAgICBtaWxMZXZlckVuZDogMC45OCxcclxuICAgIC8qKiBMZXZlciBhdCBBQjEgZGV0ZW50ICg5OSBvbiAw4oCTMTAwIHF1YWRyYW50KS4gKi9cclxuICAgIGFiTWluTGV2ZXJFbmQ6IDAuOTksXHJcbiAgICBtaW5GbHlpbmdTcGVlZE1wczogNjgsXHJcbiAgICBzdGFsbEFvYURlZzogMjIsXHJcbiAgICBzZXJ2aWNlQ2VpbGluZ006IEYxNl9QQVBFUl9BTkFMWVRJQ0FMLnNlcnZpY2VDZWlsaW5nRnQgKiAwLjMwNDgsXHJcbiAgICBjcnVpc2VBbHRpdHVkZU06IEYxNl9QQVBFUl9BTkFMWVRJQ0FMLmNydWlzZUFsdGl0dWRlRnQgKiAwLjMwNDgsXHJcbiAgICBjcnVpc2VTcGVlZE1wczogRjE2X1BBUEVSX0FOQUxZVElDQUwuY3J1aXNlVmVsb2NpdHlGcHMgKiAwLjMwNDgsXHJcbiAgICAvKiogQ2F0IEkgY2xlYW4tc2hpcCBGQlcgcm9sbC1yYXRlIGNhcCAoZGVnL3MpLiAqL1xyXG4gICAgbWF4Um9sbFJhdGVEZWdTOiAzMDAsXHJcbiAgICAvKiogQ2F0IElJSSBoZWF2eSBzdG9yZXMgcm9sbC1yYXRlIGNhcCAoZGVnL3MpLiAqL1xyXG4gICAgY2F0M01heFJvbGxSYXRlRGVnUzogMTgwLFxyXG4gICAgLyoqIEZCVyBwb3NpdGl2ZSBzdHJ1Y3R1cmFsIGcgbGltaXQgKENhdCBJKS4gKi9cclxuICAgIG1heExvYWRGYWN0b3JHOiA5LjUsXHJcbiAgICAvKiogVGFrZW9mZiByb3RhdGlvbiBzcGVlZCAofjcwIGt0KS4gKi9cclxuICAgIHJvdGF0aW9uU3BlZWRNcHM6IDY1LFxyXG4gICAgLyoqIE1heCB0b3VjaGRvd24gZ3JvdW5kc3BlZWQgd2l0aCBnZWFyIGRvd24uICovXHJcbiAgICBsYW5kaW5nTWF4U3BlZWRNcHM6IDkwLFxyXG4gICAgLyoqIE1heCBzaW5rIHJhdGUgYXQgdG91Y2hkb3duIChtL3MpLiAqL1xyXG4gICAgbGFuZGluZ01heFZlcnRpY2FsU3BlZWRNcHM6IDgsXHJcbiAgICAvKiogTWF4IGJhbmsgYXQgdG91Y2hkb3duIChkZWcpLiAqL1xyXG4gICAgbGFuZGluZ01heFJvbGxEZWc6IDEyLFxyXG4gICAgLyoqIE1pbmltdW0gcGl0Y2ggYXQgdG91Y2hkb3duIChkZWcsIG5vc2UtZG93biBsaW1pdCkuICovXHJcbiAgICBsYW5kaW5nTWluUGl0Y2hEZWc6IC0xMixcclxufSBhcyBjb25zdDtcclxuXHJcbmV4cG9ydCB0eXBlIEYxNlJlZmVyZW5jZU1ldHJpYyA9XHJcbiAgICB8ICdtYXNzS2cnXHJcbiAgICB8ICd3aW5nQXJlYU0yJ1xyXG4gICAgfCAnd2luZ1NwYW5NJ1xyXG4gICAgfCAnYWJUaHJ1c3RLbidcclxuICAgIHwgJ21heE1hY2gnXHJcbiAgICB8ICdtYXhTcGVlZEttaCdcclxuICAgIHwgJ21pbkZseWluZ1NwZWVkS3RzJ1xyXG4gICAgfCAncGVha01heFNwZWVkQWx0aXR1ZGVNJ1xyXG4gICAgfCAnY2QwJ1xyXG4gICAgfCAnaW5kdWNlZERyYWdLJ1xyXG4gICAgfCAnY2xBbHBoYVBlclJhZCdcclxuICAgIHwgJ21heExpZnRUb0RyYWcnXHJcbiAgICB8ICdjcnVpc2VTcGVlZE1wcyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEYxNlJlZmVyZW5jZUNhc2Uge1xyXG4gICAgaWQ6IHN0cmluZztcclxuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgICBzb3VyY2U6IHN0cmluZztcclxuICAgIG1ldHJpYzogRjE2UmVmZXJlbmNlTWV0cmljO1xyXG4gICAgYWx0aXR1ZGVNZXRlcnM6IG51bWJlcjtcclxuICAgIHJlZmVyZW5jZTogbnVtYmVyO1xyXG4gICAgdG9sZXJhbmNlOiBudW1iZXI7XHJcbiAgICAvKiogRm9yIEwvRCBtZXRyaWMuICovXHJcbiAgICBhbHBoYURlZz86IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IEYxNl9SRUZFUkVOQ0VfQ0FTRVM6IEYxNlJlZmVyZW5jZUNhc2VbXSA9IFtcclxuICAgIHtcclxuICAgICAgICBpZDogJ2NkMF9wYXBlcicsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdaZXJvLWxpZnQgZHJhZyBjb2VmZmljaWVudCAoRXEuIDIpJyxcclxuICAgICAgICBzb3VyY2U6ICdSZWhtYW4gcGFwZXIgYW5hbHl0aWNhbCcsXHJcbiAgICAgICAgbWV0cmljOiAnY2QwJyxcclxuICAgICAgICBhbHRpdHVkZU1ldGVyczogMCxcclxuICAgICAgICByZWZlcmVuY2U6IDAuMDE4LFxyXG4gICAgICAgIHRvbGVyYW5jZTogMCxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdpbmR1Y2VkX2tfcGFwZXInLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnSW5kdWNlZCBkcmFnIGZhY3RvciBLIChFcS4gM+KAkzUpJyxcclxuICAgICAgICBzb3VyY2U6ICdSZWhtYW4gcGFwZXIgYW5hbHl0aWNhbCcsXHJcbiAgICAgICAgbWV0cmljOiAnaW5kdWNlZERyYWdLJyxcclxuICAgICAgICBhbHRpdHVkZU1ldGVyczogMCxcclxuICAgICAgICByZWZlcmVuY2U6IDAuMTQ4OSxcclxuICAgICAgICB0b2xlcmFuY2U6IDAuMDAwMSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdjbF9hbHBoYV9wYXBlcicsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdMaWZ0LWN1cnZlIHNsb3BlJyxcclxuICAgICAgICBzb3VyY2U6ICdSZWhtYW4gcGFwZXIgLyBOQUNBIDY0QTIwNCcsXHJcbiAgICAgICAgbWV0cmljOiAnY2xBbHBoYVBlclJhZCcsXHJcbiAgICAgICAgYWx0aXR1ZGVNZXRlcnM6IDAsXHJcbiAgICAgICAgcmVmZXJlbmNlOiA1LjczLFxyXG4gICAgICAgIHRvbGVyYW5jZTogMC4wMSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdsZF9tYXhfcGFwZXInLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4aW11bSBsaWZ0LXRvLWRyYWcgcmF0aW8gYXQgzrEg4omIIDLCsCcsXHJcbiAgICAgICAgc291cmNlOiAnUmVobWFuIEZpZy4gNycsXHJcbiAgICAgICAgbWV0cmljOiAnbWF4TGlmdFRvRHJhZycsXHJcbiAgICAgICAgYWx0aXR1ZGVNZXRlcnM6IDAsXHJcbiAgICAgICAgYWxwaGFEZWc6IDIsXHJcbiAgICAgICAgcmVmZXJlbmNlOiA5LjY2LFxyXG4gICAgICAgIHRvbGVyYW5jZTogMC4zLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBpZDogJ2NydWlzZV9zcGVlZF9wYXBlcicsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdDcnVpc2UgdHJ1ZSBhaXJzcGVlZCBhdCAzMCwwMDAgZnQnLFxyXG4gICAgICAgIHNvdXJjZTogJ1JlaG1hbiBTZWN0aW9uIElJSSAoODQ2IGZ0L3MpJyxcclxuICAgICAgICBtZXRyaWM6ICdjcnVpc2VTcGVlZE1wcycsXHJcbiAgICAgICAgYWx0aXR1ZGVNZXRlcnM6IEYxNl9QUk9GSUxFLmNydWlzZUFsdGl0dWRlTSxcclxuICAgICAgICByZWZlcmVuY2U6IEYxNl9QUk9GSUxFLmNydWlzZVNwZWVkTXBzLFxyXG4gICAgICAgIHRvbGVyYW5jZTogMC41LFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBpZDogJ3dpbmdfYXJlYScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdXaW5nIHJlZmVyZW5jZSBhcmVhICgzMDAgZnTCsiknLFxyXG4gICAgICAgIHNvdXJjZTogJ0phbmVcXCdzIC8gUmVobWFuIHBhcGVyJyxcclxuICAgICAgICBtZXRyaWM6ICd3aW5nQXJlYU0yJyxcclxuICAgICAgICBhbHRpdHVkZU1ldGVyczogMCxcclxuICAgICAgICByZWZlcmVuY2U6IDI3Ljg3LFxyXG4gICAgICAgIHRvbGVyYW5jZTogMC4wNSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdhYl90aHJ1c3Rfc2wnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRnVsbCBhZnRlcmJ1cm5lciB0aHJ1c3QgYXQgc2VhIGxldmVsJyxcclxuICAgICAgICBzb3VyY2U6ICdGMTAwLVBXLTIyOSAoMTI5LjQga04pJyxcclxuICAgICAgICBtZXRyaWM6ICdhYlRocnVzdEtuJyxcclxuICAgICAgICBhbHRpdHVkZU1ldGVyczogMCxcclxuICAgICAgICByZWZlcmVuY2U6IDEyOS40LFxyXG4gICAgICAgIHRvbGVyYW5jZTogMi4wLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBpZDogJ21heF9tYWNoX2ZsNDAwJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gTWFjaCBhdCA0MCwwMDAgZnQgKEFCLCB0aHJ1c3TigJNkcmFnIGJhbGFuY2UpJyxcclxuICAgICAgICBzb3VyY2U6ICdTaW0gZW52ZWxvcGUgd2l0aCBBbmRlcnNvbiBwb2xhciArIHRyYW5zb25pYyBkcmFnJyxcclxuICAgICAgICBtZXRyaWM6ICdtYXhNYWNoJyxcclxuICAgICAgICBhbHRpdHVkZU1ldGVyczogMTIxOTIsXHJcbiAgICAgICAgcmVmZXJlbmNlOiAxLjg5LFxyXG4gICAgICAgIHRvbGVyYW5jZTogMC4xMixcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgaWQ6ICdwZWFrX3NwZWVkX2FsdGl0dWRlJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0FsdGl0dWRlIG9mIHBlYWsgbGV2ZWwtZmxpZ2h0IG1heCBzcGVlZCcsXHJcbiAgICAgICAgc291cmNlOiAnU2ltIGVudmVsb3BlIChJU0EgdGhydXN0IGxhcHNlKScsXHJcbiAgICAgICAgbWV0cmljOiAncGVha01heFNwZWVkQWx0aXR1ZGVNJyxcclxuICAgICAgICBhbHRpdHVkZU1ldGVyczogMCxcclxuICAgICAgICByZWZlcmVuY2U6IDExMDAwLFxyXG4gICAgICAgIHRvbGVyYW5jZTogNTAwLFxyXG4gICAgfSxcclxuXTtcclxuXHJcbmV4cG9ydCBjb25zdCBNUFNfVE9fS1RTID0gMS45NDM4NDtcclxuIiwiLyoqXHJcbiAqIFVuaWZpZWQgZmxpZ2h0LWNvbnRyb2wgc3lzdGVtIGZvciB0aGUgRk0yIG1vZGVsLlxyXG4gKlxyXG4gKiBBIFNJTkdMRSwgY29uZmlnLWRyaXZlbiBjbGFzcyBmbGllcyBldmVyeSBhaXJjcmFmdC4gVGhlIG1vZGVsIGFza3MgdGhlIEZDUyB0b1xyXG4gKiB0dXJuIHBpbG90IHN0aWNrL3BlZGFsIGlucHV0cyAocGx1cyB0aGUgY3VycmVudCBib2R5IHJhdGVzIGFuZCBmbGlnaHRcclxuICogY29uZGl0aW9uKSBpbnRvIG5vcm1hbGl6ZWQgc3VyZmFjZSBjb21tYW5kcyBpbiBbLTEsIDFdLiBQZXIgYXhpcyBhIGJvb2xlYW5cclxuICogcGlja3MgdGhlIGNvbnRyb2wgbGF3OlxyXG4gKiAgIC0gUGl0Y2g6IGFuIEFvQS9nLWxpbWl0aW5nIGxhdy4gVGhyZWUgaW50ZXJjaGFuZ2VhYmxlIGxpbWl0ZXIgc3RyYXRlZ2llcyBhcmVcclxuICogICAgIHNlbGVjdGFibGUgYXQgcnVudGltZSAoc2VlIHtAbGluayBGY3NQaXRjaExpbWl0ZXJ9KTsgYWxsIGNhcCBBb0EgYW5kIGxvYWRcclxuICogICAgIGZhY3RvciB3aGlsZSBrZWVwaW5nIHRoZSBzdGFiaWxhdG9yIG1vdGlvbiBzbW9vdGggYW5kIGZyZWUgb2YgaHVudGluZy5cclxuICogICAtIFJvbGwgKGByb2xsLnJhdGVDb21tYW5kYCk6IGEgcm9sbC1yYXRlIGNvbW1hbmQgbG9vcCAoY2FwcGVkIGFuZCBmYWRlZCBieVxyXG4gKiAgICAgZHluYW1pYyBwcmVzc3VyZSwgTWFjaCwgYWx0aXR1ZGUgYW5kIEFvQSkgT1IgYSBtZWNoYW5pY2FsIGRpcmVjdCBwYXRoXHJcbiAqICAgICAoc3RpY2sg4oaSIGFpbGVyb24gd2l0aCByb2xsLXJhdGUgZGFtcGluZykuXHJcbiAqICAgLSBZYXc6IGEgd2FzaGVkLW91dCB5YXctcmF0ZSBkYW1wZXIgcGx1cyBhbiBhaWxlcm9uLXJ1ZGRlciBpbnRlcmNvbm5lY3QgYW5kXHJcbiAqICAgICBkaXJlY3QgcGVkYWwgYXV0aG9yaXR5IOKAlCBzaGFyZWQgYnkgYm90aCBoYW5kbGluZyB0eXBlcyAoZ2FpbnMgZGlmZmVyKS5cclxuICpcclxuICogT3V0cHV0cyBhcmUgbm9ybWFsaXplZCBjb21tYW5kcyBpbiBbLTEsIDFdOyB0aGUgZmxpZ2h0IG1vZGVsIGNvbnZlcnRzIHRoZW1cclxuICogaW50byBwaHlzaWNhbCBzdXJmYWNlIGluY2lkZW5jZSBmb3IgdGhlIGFlcm8gcGFydHMuIEZpcnN0LW9yZGVyIGFjdHVhdG9yIGxhZ1xyXG4gKiBpcyBhcHBsaWVkIHNvIHN1cmZhY2VzIGNhbm5vdCBzbmFwIGluc3RhbnRhbmVvdXNseS5cclxuICovXHJcbmltcG9ydCB7IGNsYW1wIH0gZnJvbSAnLi4vLi4vdXRpbHMvbWF0aCc7XHJcbmltcG9ydCB7IGNvbXB1dGVNYWNoTnVtYmVyIH0gZnJvbSAnLi4vYWVyb1V0aWxzJztcclxuaW1wb3J0IHsgRm0yRmNzQ29uZmlnLCBGbTJSb2xsTGF3Q29uZmlnIH0gZnJvbSAnLi9mbTJBaXJjcmFmdENvbmZpZyc7XHJcblxyXG5jb25zdCBERUcgPSBNYXRoLlBJIC8gMTgwO1xyXG5cclxuLyoqXHJcbiAqIFBpdGNoIEFvQS9nIGxpbWl0ZXIgc3RyYXRlZ3kuIEFsbCB0aHJlZSBob2xkIHRoZSBzYW1lIEFvQSBhbmQgbG9hZC1mYWN0b3JcclxuICogZW52ZWxvcGU7IHRoZXkgZGlmZmVyIG9ubHkgaW4gSE9XIHRoZXkgZWFzZSB0aGUgc3RhYmlsYXRvciBvZmYgdGhlIGxpbWl0LCBhbmRcclxuICogYXJlIHN3aXRjaGFibGUgaW4gZmxpZ2h0IChrZXlzIDEvMi8zKTpcclxuICpcclxuICogICAxLiB7QGxpbmsgRmNzUGl0Y2hMaW1pdGVyLlNPRlR9IOKAlCBmZWVkLWZvcndhcmQgc29mdCBhdXRob3JpdHkuIFRoZSBwaWxvdCdzXHJcbiAqICAgICAgcHVsbC9wdXNoIGF1dGhvcml0eSBpcyBzY2FsZWQgYnkgYSBzbW9vdGggKHNtb290aHN0ZXApIGZhZGUgb2YgdGhlXHJcbiAqICAgICAgQ1VSUkVOVCBBb0EvZyB0aHJvdWdoIHRoZWlyIHNvZnQgYmFuZHMuIE5vIGZlZWRiYWNrIGxvb3AsIHNvIGl0IGNhbm5vdFxyXG4gKiAgICAgIGh1bnQ7IHBpdGNoLXJhdGUgZGFtcGluZyBrZWVwcyB0aGUgY2FwdHVyZSBnZW50bGUuXHJcbiAqICAgMi4ge0BsaW5rIEZjc1BpdGNoTGltaXRlci5QUkVESUNUSVZFfSDigJQgdGhlIHNhbWUgYXV0aG9yaXR5IGZhZGUgYnV0IGRyaXZlbiBieVxyXG4gKiAgICAgIExFQUQtUFJFRElDVEVEIEFvQS9nIChjdXJyZW50ICsgcmF0ZcK3bGVhZCksIHNvIGl0IHN0YXJ0cyBlYXNpbmcgb2ZmIGJlZm9yZVxyXG4gKiAgICAgIHRoZSBsaW1pdCBhbmQgYWRkcyBBb0EtcmF0ZSBkYW1waW5nIHRoYXQgZ3Jvd3MgdG93YXJkIHRoZSBsaW1pdC4gRmlybWVyLFxyXG4gKiAgICAgIGFudGljaXBhdG9yeSwgbWluaW1hbCBvdmVyc2hvb3QuXHJcbiAqICAgMy4ge0BsaW5rIEZjc1BpdGNoTGltaXRlci5TTU9PVEh9IOKAlCBhbiBlcnJvciByZWd1bGF0b3I6IHB1cmUgc3RpY2sgaW5zaWRlIHRoZVxyXG4gKiAgICAgIGVudmVsb3BlLCBibGVuZGluZyB0byBhIHByb3BvcnRpb25hbC1kZXJpdmF0aXZlIFwiaG9sZFwiIGNvbW1hbmQgdGhhdCBwYXJrc1xyXG4gKiAgICAgIEFvQS9nIGF0IHRoZSBzb2Z0IGVkZ2UsIHdpdGggdGhlIGVsZXZhdG9yIHRhcmdldCBzbGV3LXJhdGUgbGltaXRlZCBzbyB0aGVcclxuICogICAgICBzdGFiaWxhdG9yIGNhbiBuZXZlciBtb3ZlIGFicnVwdGx5LiBTb2Z0ZXN0LCBsYWdnaWVzdCBmZWVsLlxyXG4gKi9cclxuZXhwb3J0IGVudW0gRmNzUGl0Y2hMaW1pdGVyIHtcclxuICAgIFNPRlQgPSAxLFxyXG4gICAgUFJFRElDVElWRSA9IDIsXHJcbiAgICBTTU9PVEggPSAzLFxyXG59XHJcblxyXG4vKiogU21vb3RoIEhlcm1pdGUgZmFkZTogMCBhdCBlZGdlMCwgMSBhdCBlZGdlMSAoZWRnZXMgbWF5IGJlIHJldmVyc2VkKS4gKi9cclxuZnVuY3Rpb24gc21vb3Roc3RlcChlZGdlMDogbnVtYmVyLCBlZGdlMTogbnVtYmVyLCB4OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgaWYgKGVkZ2UwID09PSBlZGdlMSkgcmV0dXJuIHggPCBlZGdlMCA/IDAgOiAxO1xyXG4gICAgY29uc3QgdCA9IGNsYW1wKCh4IC0gZWRnZTApIC8gKGVkZ2UxIC0gZWRnZTApLCAwLCAxKTtcclxuICAgIHJldHVybiB0ICogdCAqICgzIC0gMiAqIHQpO1xyXG59XHJcblxyXG4vLyBMb2NhbCBsaW1pdGVyIHR1bmluZyAoa2VwdCBvdXQgb2YgdGhlIHBlci1haXJjcmFmdCBjb25maWc6IHRoZXNlIHNoYXBlIHRoZVxyXG4vLyBGRUVMIG9mIGVhY2ggc3RyYXRlZ3ksIG5vdCB0aGUgZW52ZWxvcGUgaXRzZWxmLCB3aGljaCBjb21lcyBmcm9tIHRoZSBjb25maWcnc1xyXG4vLyBhb2FTb2Z0RGVnL2FvYUxpbWl0RGVnL21heENvbW1hbmRHL21pbkNvbW1hbmRHKS5cclxuLy8gUGl0Y2gtcmF0ZSBkYW1waW5nIGZvbGRlZCBpbnRvIGV2ZXJ5IGxpbWl0ZXIgbGF3LiBUaGlzIHRlcm0gZG9lcyB0aGUgaGVhdnlcclxuLy8gbGlmdGluZyBmb3IgZW52ZWxvcGUgcHJvdGVjdGlvbjogaXQgYWRkcyBwaGFzZSBsZWFkIHNvIHRoZSBmZWVkLWZvcndhcmRcclxuLy8gYXV0aG9yaXR5IGZhZGUgY2FwdHVyZXMgdGhlIEFvQS9nIGxpbWl0IHdpdGhvdXQgb3ZlcnNob290IG9yIGh1bnRpbmcuIEl0IGFsc29cclxuLy8gcmVsYXhlcyB0aGUgc3RhYmlsYXRvciBiYWNrIGFzIGEgc3RlYWR5IHBpdGNoIHJhdGUgZXN0YWJsaXNoZXMgKGEgdHJpbW1lZFxyXG4vLyB0dXJuIG5lZWRzIGxpdHRsZSBlbGV2YXRvciksIHNvIHRoZSBjb21tYW5kIGlzIGRlbGliZXJhdGVseSBOT1QgYSAxOjEgc3RpY2tcclxuLy8gbWFwIOKAlCBpdCBpcyBhIHJhdGUtZGFtcGVkIGxpbWl0ZXIuXHJcbmNvbnN0IFBJVENIX1JBVEVfREFNUCA9IDEuMTtcclxuY29uc3QgQVVUSF9GSUxURVJfVEFVX1MgPSAwLjE0OyAgICAgIC8vIGxvdy1wYXNzIG9uIHRoZSBzb2Z0LWJhbmQgYXV0aG9yaXR5IGZyYWN0aW9uIChtb2RlIDEpXHJcbmNvbnN0IFBSRURJQ1RfQVVUSF9GSUxURVJfVEFVX1MgPSAwLjI7IC8vIGxvdy1wYXNzIG9uIHRoZSBwcmVkaWN0ZWQgYXV0aG9yaXR5IChtb2RlIDIpXHJcbmNvbnN0IFBSRURJQ1RfQU9BX0RBTVAgPSAwLjk7ICAgICAgICAvLyBleHRyYSDOscyHIGRhbXBpbmcgbmVhciB0aGUgbGltaXQgKG1vZGUgMilcclxuY29uc3QgUFJFRElDVF9BT0FfREFNUF9DTEFNUCA9IDAuMzsgIC8vIGNhcCBvbiB0aGUgzrHMhyBkYW1waW5nIHRlcm0gc28gaXQgbmV2ZXIgamVya3MgKG1vZGUgMilcclxuY29uc3QgU01PT1RIX0FVVEhfRklMVEVSX1RBVV9TID0gMC4zOyAvLyBoZWF2aWVyIGF1dGhvcml0eSBsb3ctcGFzcyBmb3IgdGhlIHNtb290aCBtb2RlIChtb2RlIDMpXHJcbmNvbnN0IFNNT09USF9TTEVXX1BFUl9TID0gNS4wOyAgICAgICAvLyBtYXggZWxldmF0b3ItdGFyZ2V0IGNoYW5nZSBwZXIgc2Vjb25kIChtb2RlIDMpXHJcblxyXG4vKipcclxuICogU3RpY2sgWy0xLCAxXSDihpIgY29tbWFuZGVkIGJvZHkgcm9sbCByYXRlIChyYWQvcykgZm9yIHRoZSByYXRlLWNvbW1hbmQgcm9sbFxyXG4gKiBsYXcuIFRoZSBwZWFrIHJhdGUgKGBtYXhSb2xsUmF0ZURlZ1NgKSBpcyBzY2FsZWQgYnkgYSBkeW5hbWljLXByZXNzdXJlIGdhaW5cclxuICogc2NoZWR1bGUgYW5kIGZhZGVkIGJ5IE1hY2gsIGFsdGl0dWRlLCBBb0EgYW5kIGZsYXAgbGltaXRlcnMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZUNvbW1hbmRlZFJvbGxSYXRlKGlucHV0OiBGY3NJbnB1dCwgcm9sbDogRm0yUm9sbExhd0NvbmZpZyk6IG51bWJlciB7XHJcbiAgICBpZiAoaW5wdXQubGFuZGVkIHx8IE1hdGguYWJzKGlucHV0LnJvbGxTdGljaykgPCAxZS02KSB7XHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbiAgICBjb25zdCBtYWNoID0gY29tcHV0ZU1hY2hOdW1iZXIoaW5wdXQuc3BlZWQsIGlucHV0LmFsdGl0dWRlTSk7XHJcbiAgICBjb25zdCBmbGFwRmFjdG9yID0gaW5wdXQuZmxhcHNFeHRlbmRlZCA/IChyb2xsLmZsYXBzRmFjdG9yID8/IDAuNjUpIDogMTtcclxuICAgIGNvbnN0IGxpbWl0ZXIgPSByb2xsTWFjaExpbWl0ZXIobWFjaCwgcm9sbClcclxuICAgICAgICAqIHJvbGxBbHRpdHVkZUxpbWl0ZXIoaW5wdXQuYWx0aXR1ZGVNLCByb2xsKVxyXG4gICAgICAgICogcm9sbEFvYUxpbWl0ZXIoaW5wdXQuYW9hUmFkLCByb2xsKVxyXG4gICAgICAgICogZmxhcEZhY3RvcjtcclxuICAgIGNvbnN0IHFHYWluID0gcm9sbER5bmFtaWNQcmVzc3VyZUdhaW4oaW5wdXQuZHluYW1pY1ByZXNzdXJlLCBpbnB1dC5xUmVmLCByb2xsKTtcclxuICAgIHJldHVybiBpbnB1dC5yb2xsU3RpY2sgKiByb2xsLm1heFJvbGxSYXRlRGVnUyAqIERFRyAqIHFHYWluICogbGltaXRlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gcm9sbER5bmFtaWNQcmVzc3VyZUdhaW4oZHluYW1pY1ByZXNzdXJlOiBudW1iZXIsIHFSZWY6IG51bWJlciwgcm9sbDogRm0yUm9sbExhd0NvbmZpZyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBtaW4gPSByb2xsLnFHYWluTWluID8/IDAuMTI7XHJcbiAgICBjb25zdCBtYXggPSByb2xsLnFHYWluTWF4ID8/IDEuMDtcclxuICAgIGNvbnN0IHEgPSBNYXRoLm1heChkeW5hbWljUHJlc3N1cmUsIDEpO1xyXG4gICAgY29uc3QgcmVmID0gTWF0aC5tYXgocVJlZiwgMSk7XHJcbiAgICBjb25zdCByYXcgPSBtaW4gKyAobWF4IC0gbWluKSAqIE1hdGguc3FydChyZWYgLyAocmVmICsgcSkpO1xyXG4gICAgcmV0dXJuIGNsYW1wKHJhdywgbWluLCBtYXgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByb2xsTWFjaExpbWl0ZXIobWFjaDogbnVtYmVyLCByb2xsOiBGbTJSb2xsTGF3Q29uZmlnKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IG9uc2V0ID0gcm9sbC5tYWNoTGltaXRlck9uc2V0ID8/IDAuODU7XHJcbiAgICBpZiAobWFjaCA8PSBvbnNldCkge1xyXG4gICAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNsYW1wKDEgLSAobWFjaCAtIG9uc2V0KSAvIChyb2xsLm1hY2hMaW1pdGVyU2xvcGUgPz8gMC41NSksIHJvbGwubWFjaExpbWl0ZXJGbG9vciA/PyAwLjM1LCAxKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcm9sbEFsdGl0dWRlTGltaXRlcihhbHRpdHVkZU06IG51bWJlciwgcm9sbDogRm0yUm9sbExhd0NvbmZpZyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBvbnNldCA9IHJvbGwuYWx0TGltaXRlck9uc2V0TSA/PyAxMjAwMDtcclxuICAgIGlmIChhbHRpdHVkZU0gPD0gb25zZXQpIHtcclxuICAgICAgICByZXR1cm4gMTtcclxuICAgIH1cclxuICAgIHJldHVybiBjbGFtcCgxIC0gKGFsdGl0dWRlTSAtIG9uc2V0KSAvIChyb2xsLmFsdExpbWl0ZXJTbG9wZU0gPz8gMjAwMDApLCByb2xsLmFsdExpbWl0ZXJGbG9vciA/PyAwLjQ1LCAxKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcm9sbEFvYUxpbWl0ZXIoYW9hUmFkOiBudW1iZXIsIHJvbGw6IEZtMlJvbGxMYXdDb25maWcpOiBudW1iZXIge1xyXG4gICAgY29uc3Qgb25zZXQgPSByb2xsLmFvYUxpbWl0ZXJPbnNldERlZyA/PyAxNTtcclxuICAgIGNvbnN0IGFvYURlZyA9IE1hdGguYWJzKGFvYVJhZCkgLyBERUc7XHJcbiAgICBpZiAoYW9hRGVnIDw9IG9uc2V0KSB7XHJcbiAgICAgICAgcmV0dXJuIDE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2xhbXAoMSAtIChhb2FEZWcgLSBvbnNldCkgLyAocm9sbC5hb2FMaW1pdGVyU2xvcGVEZWcgPz8gMjIpLCByb2xsLmFvYUxpbWl0ZXJGbG9vciA/PyAwLjE1LCAxKTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGY3NJbnB1dCB7XHJcbiAgICBwaXRjaFN0aWNrOiBudW1iZXI7IC8vIFstMSwgMV0gcG9zaXRpdmUgPSBub3NlIHVwIC8gcHVsbFxyXG4gICAgcm9sbFN0aWNrOiBudW1iZXI7ICAvLyBbLTEsIDFdIHBvc2l0aXZlID0gcm9sbCByaWdodFxyXG4gICAgeWF3UGVkYWw6IG51bWJlcjsgICAvLyBbLTEsIDFdIHBvc2l0aXZlID0gbm9zZSByaWdodFxyXG4gICAgcGl0Y2hSYXRlOiBudW1iZXI7ICAvLyBhYm91dCArWCAocmFkL3MpXHJcbiAgICB5YXdSYXRlOiBudW1iZXI7ICAgIC8vIGFib3V0ICtZIChyYWQvcylcclxuICAgIHJvbGxSYXRlOiBudW1iZXI7ICAgLy8gYWJvdXQgK1ogKHJhZC9zKVxyXG4gICAgbG9hZEZhY3Rvckc6IG51bWJlcjtcclxuICAgIGFvYVJhZDogbnVtYmVyO1xyXG4gICAgZHluYW1pY1ByZXNzdXJlOiBudW1iZXI7XHJcbiAgICBxUmVmOiBudW1iZXI7XHJcbiAgICBzcGVlZDogbnVtYmVyO1xyXG4gICAgYWx0aXR1ZGVNOiBudW1iZXI7XHJcbiAgICBmbGFwc0V4dGVuZGVkOiBib29sZWFuO1xyXG4gICAgbGFuZGVkOiBib29sZWFuO1xyXG4gICAgLyoqIEFjdGl2ZSBwaXRjaCBBb0EvZyBsaW1pdGVyIHN0cmF0ZWd5IChrZXlzIDEvMi8zKS4gKi9cclxuICAgIHBpdGNoTGltaXRlck1vZGU6IEZjc1BpdGNoTGltaXRlcjtcclxuICAgIC8qKiBXaGVuIGZhbHNlLCBwaWxvdCBzdGljayBtYXBzIHN0cmFpZ2h0IHRvIHRoZSBzdXJmYWNlcyAobm8gZW52ZWxvcGUgcHJvdGVjdGlvbikuICovXHJcbiAgICBsaW1pdGVyc0VuYWJsZWQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmNzT3V0cHV0IHtcclxuICAgIGVsZXZhdG9yOiBudW1iZXI7XHJcbiAgICBhaWxlcm9uOiBudW1iZXI7XHJcbiAgICBydWRkZXI6IG51bWJlcjtcclxuICAgIC8qKiBNYXggbm9zZS11cCBlbGV2YXRvciBjb21tYW5kIGF2YWlsYWJsZSB0aGlzIGZyYW1lIChIVUQgY2xhbXAgbGluZSkuICovXHJcbiAgICBlbGV2YXRvckxpbWl0SGk6IG51bWJlcjtcclxuICAgIC8qKiBNYXggbm9zZS1kb3duIGVsZXZhdG9yIGNvbW1hbmQgYXZhaWxhYmxlIHRoaXMgZnJhbWUgKEhVRCBjbGFtcCBsaW5lKS4gKi9cclxuICAgIGVsZXZhdG9yTGltaXRMbzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRm0yRmNzIHtcclxuICAgIHByaXZhdGUgZWxldmF0b3IgPSAwO1xyXG4gICAgcHJpdmF0ZSBhaWxlcm9uID0gMDtcclxuICAgIHByaXZhdGUgcnVkZGVyID0gMDtcclxuICAgIHByaXZhdGUgeWF3UmF0ZUxvd1Bhc3MgPSAwO1xyXG4gICAgcHJpdmF0ZSBlbGV2YXRvckxpbWl0SGkgPSAxO1xyXG4gICAgcHJpdmF0ZSBlbGV2YXRvckxpbWl0TG8gPSAtMTtcclxuXHJcbiAgICAvLyBQaXRjaC1saW1pdGVyIGZpbHRlciAvIGRlcml2YXRpdmUgc3RhdGUuXHJcbiAgICBwcml2YXRlIHByZXZBb2FSYWQgPSAwO1xyXG4gICAgcHJpdmF0ZSBwcmV2TG9hZEcgPSAxO1xyXG4gICAgcHJpdmF0ZSBhb2FSYXRlTG93UGFzcyA9IDA7ICAgLy8gZmlsdGVyZWQgzrHMhyAocmFkL3MpXHJcbiAgICBwcml2YXRlIGdSYXRlTG93UGFzcyA9IDA7ICAgICAvLyBmaWx0ZXJlZCDEoSAoZy9zKVxyXG4gICAgcHJpdmF0ZSBhdXRoTG93UGFzcyA9IDE7ICAgICAgLy8gZmlsdGVyZWQgc29mdC1iYW5kIGF1dGhvcml0eSAobW9kZXMgMSAmIDIpXHJcbiAgICBwcml2YXRlIHBpdGNoVGFyZ2V0ID0gMDsgICAgICAvLyBzbGV3LWxpbWl0ZWQgZWxldmF0b3IgdGFyZ2V0IChtb2RlIDMpXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjZmc6IEZtMkZjc0NvbmZpZykgeyB9XHJcblxyXG4gICAgcmVzZXQoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5lbGV2YXRvciA9IDA7XHJcbiAgICAgICAgdGhpcy5haWxlcm9uID0gMDtcclxuICAgICAgICB0aGlzLnJ1ZGRlciA9IDA7XHJcbiAgICAgICAgdGhpcy55YXdSYXRlTG93UGFzcyA9IDA7XHJcbiAgICAgICAgdGhpcy5wcmV2QW9hUmFkID0gMDtcclxuICAgICAgICB0aGlzLnByZXZMb2FkRyA9IDE7XHJcbiAgICAgICAgdGhpcy5hb2FSYXRlTG93UGFzcyA9IDA7XHJcbiAgICAgICAgdGhpcy5nUmF0ZUxvd1Bhc3MgPSAwO1xyXG4gICAgICAgIHRoaXMuYXV0aExvd1Bhc3MgPSAxO1xyXG4gICAgICAgIHRoaXMucGl0Y2hUYXJnZXQgPSAwO1xyXG4gICAgICAgIHRoaXMuZWxldmF0b3JMaW1pdEhpID0gMTtcclxuICAgICAgICB0aGlzLmVsZXZhdG9yTGltaXRMbyA9IC0xO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFN0YXRlKCk6IEZjc091dHB1dCB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZWxldmF0b3I6IHRoaXMuZWxldmF0b3IsXHJcbiAgICAgICAgICAgIGFpbGVyb246IHRoaXMuYWlsZXJvbixcclxuICAgICAgICAgICAgcnVkZGVyOiB0aGlzLnJ1ZGRlcixcclxuICAgICAgICAgICAgZWxldmF0b3JMaW1pdEhpOiB0aGlzLmVsZXZhdG9yTGltaXRIaSxcclxuICAgICAgICAgICAgZWxldmF0b3JMaW1pdExvOiB0aGlzLmVsZXZhdG9yTGltaXRMbyxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZShpbnB1dDogRmNzSW5wdXQsIGR0OiBudW1iZXIpOiBGY3NPdXRwdXQge1xyXG4gICAgICAgIHRoaXMudHJhY2tQaXRjaFJhdGVzKGlucHV0LCBkdCk7XHJcblxyXG4gICAgICAgIGxldCBlbGV2YXRvclRhcmdldDogbnVtYmVyO1xyXG4gICAgICAgIGxldCBhaWxlcm9uVGFyZ2V0OiBudW1iZXI7XHJcbiAgICAgICAgbGV0IHJ1ZGRlclRhcmdldDogbnVtYmVyO1xyXG5cclxuICAgICAgICBpZiAoaW5wdXQubGltaXRlcnNFbmFibGVkID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICBlbGV2YXRvclRhcmdldCA9IGNsYW1wKGlucHV0LnBpdGNoU3RpY2ssIC0xLCAxKTtcclxuICAgICAgICAgICAgYWlsZXJvblRhcmdldCA9IGNsYW1wKC1pbnB1dC5yb2xsU3RpY2ssIC0xLCAxKTtcclxuICAgICAgICAgICAgcnVkZGVyVGFyZ2V0ID0gY2xhbXAoaW5wdXQueWF3UGVkYWwsIC0xLCAxKTtcclxuICAgICAgICAgICAgdGhpcy5lbGV2YXRvckxpbWl0SGkgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLmVsZXZhdG9yTGltaXRMbyA9IC0xO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZXZhdG9yVGFyZ2V0ID0gdGhpcy5waXRjaExhdyhpbnB1dCwgZHQpO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUVsZXZhdG9yTGltaXRzKGlucHV0LCBkdCk7XHJcbiAgICAgICAgICAgIGFpbGVyb25UYXJnZXQgPSB0aGlzLmNmZy5yb2xsLnJhdGVDb21tYW5kXHJcbiAgICAgICAgICAgICAgICA/IHRoaXMucmF0ZUNvbW1hbmRSb2xsTGF3KGlucHV0KVxyXG4gICAgICAgICAgICAgICAgOiB0aGlzLmRpcmVjdFJvbGxMYXcoaW5wdXQpO1xyXG4gICAgICAgICAgICBydWRkZXJUYXJnZXQgPSB0aGlzLnlhd0xhdyhpbnB1dCwgYWlsZXJvblRhcmdldCwgZHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYSA9IGR0IDw9IDAgPyAxIDogMSAtIE1hdGguZXhwKC1kdCAvIE1hdGgubWF4KHRoaXMuY2ZnLmFjdHVhdG9yVGF1UywgMWUtMykpO1xyXG4gICAgICAgIHRoaXMuZWxldmF0b3IgKz0gKGVsZXZhdG9yVGFyZ2V0IC0gdGhpcy5lbGV2YXRvcikgKiBhO1xyXG4gICAgICAgIHRoaXMuYWlsZXJvbiArPSAoYWlsZXJvblRhcmdldCAtIHRoaXMuYWlsZXJvbikgKiBhO1xyXG4gICAgICAgIHRoaXMucnVkZGVyICs9IChydWRkZXJUYXJnZXQgLSB0aGlzLnJ1ZGRlcikgKiBhO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBQdWJsaXNoIHRoZSBjdXJyZW50IEFvQS9nIGVudmVsb3BlIGNhcHMgZm9yIHRoZSBIVUQgc3RpY2sgYm94LiAqL1xyXG4gICAgcHJpdmF0ZSB1cGRhdGVFbGV2YXRvckxpbWl0cyhpbnB1dDogRmNzSW5wdXQsIGR0OiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBwdWxsQXV0aCA9IHRoaXMuZmlsdGVyQXV0aG9yaXR5KFxyXG4gICAgICAgICAgICB0aGlzLnBpdGNoQXV0aG9yaXR5KGlucHV0LmFvYVJhZCwgaW5wdXQubG9hZEZhY3RvckcsIHRydWUpLCBkdCk7XHJcbiAgICAgICAgY29uc3QgcHVzaEF1dGggPSB0aGlzLmZpbHRlckF1dGhvcml0eShcclxuICAgICAgICAgICAgdGhpcy5waXRjaEF1dGhvcml0eShpbnB1dC5hb2FSYWQsIGlucHV0LmxvYWRGYWN0b3JHLCBmYWxzZSksIGR0KTtcclxuICAgICAgICB0aGlzLmVsZXZhdG9yTGltaXRIaSA9IHB1bGxBdXRoO1xyXG4gICAgICAgIHRoaXMuZWxldmF0b3JMaW1pdExvID0gLXB1c2hBdXRoO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBNYWludGFpbiBmaWx0ZXJlZCBBb0EtcmF0ZSBhbmQgZy1yYXRlIGVzdGltYXRlcyBmb3IgdGhlIGxpbWl0ZXIgbGF3cy4gKi9cclxuICAgIHByaXZhdGUgdHJhY2tQaXRjaFJhdGVzKGlucHV0OiBGY3NJbnB1dCwgZHQ6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgIGlmIChkdCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3QgcmF3QW9hUmF0ZSA9IChpbnB1dC5hb2FSYWQgLSB0aGlzLnByZXZBb2FSYWQpIC8gZHQ7XHJcbiAgICAgICAgICAgIGNvbnN0IHJhd0dSYXRlID0gKGlucHV0LmxvYWRGYWN0b3JHIC0gdGhpcy5wcmV2TG9hZEcpIC8gZHQ7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhdSA9IE1hdGgubWF4KHRoaXMuY2ZnLnBpdGNoLmFvYVJhdGVGaWx0ZXJUYXVTLCAxZS0zKTtcclxuICAgICAgICAgICAgY29uc3QgYiA9IDEgLSBNYXRoLmV4cCgtZHQgLyB0YXUpO1xyXG4gICAgICAgICAgICB0aGlzLmFvYVJhdGVMb3dQYXNzICs9IChyYXdBb2FSYXRlIC0gdGhpcy5hb2FSYXRlTG93UGFzcykgKiBiO1xyXG4gICAgICAgICAgICB0aGlzLmdSYXRlTG93UGFzcyArPSAocmF3R1JhdGUgLSB0aGlzLmdSYXRlTG93UGFzcykgKiBiO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnByZXZBb2FSYWQgPSBpbnB1dC5hb2FSYWQ7XHJcbiAgICAgICAgdGhpcy5wcmV2TG9hZEcgPSBpbnB1dC5sb2FkRmFjdG9yRztcclxuICAgIH1cclxuXHJcbiAgICAvKiogRGlzcGF0Y2ggdG8gdGhlIHNlbGVjdGVkIHBpdGNoIEFvQS9nIGxpbWl0ZXIgc3RyYXRlZ3kuICovXHJcbiAgICBwcml2YXRlIHBpdGNoTGF3KGlucHV0OiBGY3NJbnB1dCwgZHQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgc3dpdGNoIChpbnB1dC5waXRjaExpbWl0ZXJNb2RlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRmNzUGl0Y2hMaW1pdGVyLlBSRURJQ1RJVkU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5waXRjaExhd1ByZWRpY3RpdmUoaW5wdXQsIGR0KTtcclxuICAgICAgICAgICAgY2FzZSBGY3NQaXRjaExpbWl0ZXIuU01PT1RIOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGl0Y2hMYXdTbW9vdGgoaW5wdXQsIGR0KTtcclxuICAgICAgICAgICAgY2FzZSBGY3NQaXRjaExpbWl0ZXIuU09GVDpcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBpdGNoTGF3U29mdChpbnB1dCwgZHQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFNvZnQtYmFuZCBhdXRob3JpdHkgaW4gWzAsIDFdIGZvciB0aGUgcmVxdWVzdGVkIGRpcmVjdGlvbjogMSA9IHdlbGwgaW5zaWRlXHJcbiAgICAgKiB0aGUgZW52ZWxvcGUsIDAgPSBhdCB0aGUgQW9BIG9yIGcgaGFyZCBsaW1pdCAod2hpY2hldmVyIGJpdGVzIGZpcnN0KS4gVGhlXHJcbiAgICAgKiBmYWRlIGlzIGEgc21vb3Roc3RlcCBvdmVyIGVhY2ggc29mdCBiYW5kLCBzbyBhdXRob3JpdHkg4oCUIGFuZCB0aHVzIHRoZVxyXG4gICAgICogc3RhYmlsYXRvciDigJQgZWFzZXMgb2ZmIGdyYWR1YWxseSByYXRoZXIgdGhhbiBjbGlwcGluZy5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBwaXRjaEF1dGhvcml0eShhb2FSYWQ6IG51bWJlciwgZzogbnVtYmVyLCBwdWxsOiBib29sZWFuKTogbnVtYmVyIHtcclxuICAgICAgICBjb25zdCBwID0gdGhpcy5jZmcucGl0Y2g7XHJcbiAgICAgICAgY29uc3QgZ01hcmdpbiA9IHAuZ0xpbWl0ZXJTb2Z0TWFyZ2luRyA/PyAxLjA7XHJcbiAgICAgICAgY29uc3QgYW9hRGVnID0gYW9hUmFkIC8gREVHO1xyXG4gICAgICAgIGlmIChwdWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFvYUF1dGggPSAxIC0gc21vb3Roc3RlcChwLmFvYVNvZnREZWcsIHAuYW9hTGltaXREZWcsIGFvYURlZyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGdBdXRoID0gMSAtIHNtb290aHN0ZXAocC5tYXhDb21tYW5kRyAtIGdNYXJnaW4sIHAubWF4Q29tbWFuZEcsIGcpO1xyXG4gICAgICAgICAgICByZXR1cm4gY2xhbXAoTWF0aC5taW4oYW9hQXV0aCwgZ0F1dGgpLCAwLCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgYW9hQXV0aCA9IDEgLSBzbW9vdGhzdGVwKC1wLmFvYVNvZnREZWcsIC1wLmFvYUxpbWl0RGVnLCBhb2FEZWcpO1xyXG4gICAgICAgIGNvbnN0IGdBdXRoID0gMSAtIHNtb290aHN0ZXAocC5taW5Db21tYW5kRyArIGdNYXJnaW4sIHAubWluQ29tbWFuZEcsIGcpO1xyXG4gICAgICAgIHJldHVybiBjbGFtcChNYXRoLm1pbihhb2FBdXRoLCBnQXV0aCksIDAsIDEpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmlsdGVyQXV0aG9yaXR5KHJhd0F1dGg6IG51bWJlciwgZHQ6IG51bWJlciwgdGF1OiBudW1iZXIgPSBBVVRIX0ZJTFRFUl9UQVVfUyk6IG51bWJlciB7XHJcbiAgICAgICAgY29uc3QgYiA9IGR0IDw9IDAgPyAxIDogMSAtIE1hdGguZXhwKC1kdCAvIHRhdSk7XHJcbiAgICAgICAgdGhpcy5hdXRoTG93UGFzcyArPSAocmF3QXV0aCAtIHRoaXMuYXV0aExvd1Bhc3MpICogYjtcclxuICAgICAgICByZXR1cm4gdGhpcy5hdXRoTG93UGFzcztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFN0cmF0ZWd5IDEg4oCUIFNPRlQ6IGZlZWQtZm9yd2FyZCBhdXRob3JpdHkgc2NhbGluZyBvbiB0aGUgY3VycmVudCBBb0EvZyxcclxuICAgICAqIHBsdXMgcGl0Y2gtcmF0ZSBkYW1waW5nLiBQdXJlbHkgb3Blbi1sb29wIG9uIHRoZSBlbnZlbG9wZSwgc28gaXQgY2Fubm90XHJcbiAgICAgKiBzZXQgdXAgYSBsaW1pdCBjeWNsZTsgdGhlIGNhcHR1cmUgaXMgc21vb3RoZWQgYnkgdGhlIGF1dGhvcml0eSBsb3ctcGFzc1xyXG4gICAgICogYW5kIHRoZSByYXRlLWRhbXBpbmcgdGVybS5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBwaXRjaExhd1NvZnQoaW5wdXQ6IEZjc0lucHV0LCBkdDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBjb25zdCBzdGljayA9IGlucHV0LnBpdGNoU3RpY2s7XHJcbiAgICAgICAgY29uc3QgcmF3QXV0aCA9IHRoaXMucGl0Y2hBdXRob3JpdHkoaW5wdXQuYW9hUmFkLCBpbnB1dC5sb2FkRmFjdG9yRywgc3RpY2sgPj0gMCk7XHJcbiAgICAgICAgY29uc3QgYXV0aCA9IHRoaXMuZmlsdGVyQXV0aG9yaXR5KHJhd0F1dGgsIGR0KTtcclxuICAgICAgICByZXR1cm4gY2xhbXAoc3RpY2sgKiBhdXRoICsgUElUQ0hfUkFURV9EQU1QICogaW5wdXQucGl0Y2hSYXRlLCAtMSwgMSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTdHJhdGVneSAyIOKAlCBQUkVESUNUSVZFOiB0aGUgYXV0aG9yaXR5IGZhZGUgaXMgZmVkIHRoZSBMRUFELVBSRURJQ1RFRCBBb0EvZ1xyXG4gICAgICogKGN1cnJlbnQgKyBmaWx0ZXJlZCByYXRlIMK3IGxlYWQpLCBzbyB0aGUgbGltaXRlciBzdGFydHMgZWFzaW5nIHRoZSBwdWxsXHJcbiAgICAgKiBiZWZvcmUgdGhlIGFpcmNyYWZ0IGFjdHVhbGx5IHJlYWNoZXMgdGhlIGJvdW5kYXJ5LiBBbiDOscyHIGRhbXBpbmcgdGVybSB0aGF0XHJcbiAgICAgKiBncm93cyBhcyBhdXRob3JpdHkgaXMgd2l0aGRyYXduIGFycmVzdHMgdGhlIGFwcHJvYWNoIHdpdGhvdXQgYSBoYXJkIHN0b3AuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgcGl0Y2hMYXdQcmVkaWN0aXZlKGlucHV0OiBGY3NJbnB1dCwgZHQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgY29uc3QgcCA9IHRoaXMuY2ZnLnBpdGNoO1xyXG4gICAgICAgIGNvbnN0IHN0aWNrID0gaW5wdXQucGl0Y2hTdGljaztcclxuICAgICAgICBjb25zdCBwdWxsID0gc3RpY2sgPj0gMDtcclxuICAgICAgICBjb25zdCBhb2FMZWFkID0gKHAuYW9hTGltaXRlckxlYWRTID8/IDAuMDgpICsgKHAuZW52ZWxvcGVBdXRob3JpdHlMZWFkUyA/PyAwLjIpO1xyXG4gICAgICAgIGNvbnN0IGdMZWFkID0gcHVsbFxyXG4gICAgICAgICAgICA/IChwLmdMaW1pdGVyTGVhZFMgPz8gMC4wNSkgKyAocC5lbnZlbG9wZUF1dGhvcml0eUxlYWRTID8/IDAuMilcclxuICAgICAgICAgICAgOiAocC5nTGltaXRlck5lZ0xlYWRTID8/IDAuMDIpICsgKHAuZW52ZWxvcGVBdXRob3JpdHlMZWFkUyA/PyAwLjIpO1xyXG4gICAgICAgIGNvbnN0IHByZWRBb2EgPSBpbnB1dC5hb2FSYWQgKyB0aGlzLmFvYVJhdGVMb3dQYXNzICogYW9hTGVhZDtcclxuICAgICAgICBjb25zdCBwcmVkRyA9IGlucHV0LmxvYWRGYWN0b3JHICsgdGhpcy5nUmF0ZUxvd1Bhc3MgKiBnTGVhZDtcclxuXHJcbiAgICAgICAgY29uc3QgcmF3QXV0aCA9IHRoaXMucGl0Y2hBdXRob3JpdHkocHJlZEFvYSwgcHJlZEcsIHB1bGwpO1xyXG4gICAgICAgIGNvbnN0IGF1dGggPSB0aGlzLmZpbHRlckF1dGhvcml0eShyYXdBdXRoLCBkdCwgUFJFRElDVF9BVVRIX0ZJTFRFUl9UQVVfUyk7XHJcblxyXG4gICAgICAgIC8vIM6xzIcgZGFtcGluZyBncm93cyB0b3dhcmQgdGhlIGxpbWl0ICgxIOKIkiBhdXRoKTsgaXQgb3Bwb3NlcyBhIHJpc2luZyB8QW9BfCxcclxuICAgICAgICAvLyBzbyB0aGUgaGlnaGVyIHRoZSBhaXJjcmFmdCBjbGltYnMgaW50byB0aGUgc29mdCBiYW5kIHRoZSBtb3JlIHRoZSBGQ1NcclxuICAgICAgICAvLyByZXNpc3RzIGZ1cnRoZXIgQW9BIGJ1aWxkLXVwIOKAlCBhIHNtb290aCBhZXJvZHluYW1pYyBcIndhbGxcIi4gQ2xhbXBlZCBzbyBhXHJcbiAgICAgICAgLy8gdHJhbnNpZW50IM6xzIcgc3Bpa2UgY2FuIG5ldmVyIGplcmsgdGhlIHN0YWJpbGF0b3IuXHJcbiAgICAgICAgY29uc3QgYW9hRGFtcCA9IGNsYW1wKFxyXG4gICAgICAgICAgICBQUkVESUNUX0FPQV9EQU1QICogKDEgLSBhdXRoKSAqIHRoaXMuYW9hUmF0ZUxvd1Bhc3MsXHJcbiAgICAgICAgICAgIC1QUkVESUNUX0FPQV9EQU1QX0NMQU1QLCBQUkVESUNUX0FPQV9EQU1QX0NMQU1QLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgcmV0dXJuIGNsYW1wKHN0aWNrICogYXV0aCArIFBJVENIX1JBVEVfREFNUCAqIGlucHV0LnBpdGNoUmF0ZSAtIGFvYURhbXAsIC0xLCAxKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFN0cmF0ZWd5IDMg4oCUIFNNT09USDogdGhlIHNhbWUgZmVlZC1mb3J3YXJkIGF1dGhvcml0eSBmYWRlIGFzIFNPRlQgYnV0IHdpdGhcclxuICAgICAqIGEgaGVhdmllciBhdXRob3JpdHkgbG93LXBhc3MgQU5EIGEgc2xldy1yYXRlIGxpbWl0IG9uIHRoZSBlbGV2YXRvciB0YXJnZXQsXHJcbiAgICAgKiBzbyB0aGUgY29tbWFuZGVkIHN0YWJpbGF0b3IgY2FuIG5ldmVyIG1vdmUgYWJydXB0bHkgbm8gbWF0dGVyIGhvdyBzaGFycGx5XHJcbiAgICAgKiB0aGUgc3RpY2sgaXMgdGhyb3duIG9yIGhvdyBmYXN0IHRoZSBlbnZlbG9wZSBpcyBhcHByb2FjaGVkLiBUaGUgdHJhZGUtb2ZmXHJcbiAgICAgKiBpcyBhIHNsaWdodGx5IHNvZnRlciwgbGFnZ2llciByZXNwb25zZSDigJQgZGVsaWJlcmF0ZWx5IHRoZSBnZW50bGVzdCBvZiB0aGVcclxuICAgICAqIHRocmVlLiBCZWluZyBvcGVuLWxvb3Agb24gdGhlIGVudmVsb3BlIGl0IGNhbm5vdCBzZXQgdXAgYSBsaW1pdCBjeWNsZS5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBwaXRjaExhd1Ntb290aChpbnB1dDogRmNzSW5wdXQsIGR0OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGNvbnN0IHN0aWNrID0gaW5wdXQucGl0Y2hTdGljaztcclxuICAgICAgICBjb25zdCByYXdBdXRoID0gdGhpcy5waXRjaEF1dGhvcml0eShpbnB1dC5hb2FSYWQsIGlucHV0LmxvYWRGYWN0b3JHLCBzdGljayA+PSAwKTtcclxuICAgICAgICBjb25zdCBhdXRoID0gdGhpcy5maWx0ZXJBdXRob3JpdHkocmF3QXV0aCwgZHQsIFNNT09USF9BVVRIX0ZJTFRFUl9UQVVfUyk7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gY2xhbXAoc3RpY2sgKiBhdXRoICsgUElUQ0hfUkFURV9EQU1QICogaW5wdXQucGl0Y2hSYXRlLCAtMSwgMSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG1heFN0ZXAgPSBkdCA8PSAwID8gMSA6IFNNT09USF9TTEVXX1BFUl9TICogZHQ7XHJcbiAgICAgICAgdGhpcy5waXRjaFRhcmdldCA9IGNsYW1wKFxyXG4gICAgICAgICAgICB0aGlzLnBpdGNoVGFyZ2V0ICsgY2xhbXAodGFyZ2V0IC0gdGhpcy5waXRjaFRhcmdldCwgLW1heFN0ZXAsIG1heFN0ZXApLFxyXG4gICAgICAgICAgICAtMSwgMSxcclxuICAgICAgICApO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBpdGNoVGFyZ2V0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBNZWNoYW5pY2FsIGRpcmVjdCByb2xsOiBzdGljayBzdHJhaWdodCB0aHJvdWdoLCB3aXRoIHJvbGwtcmF0ZSBkYW1waW5nLiAqL1xyXG4gICAgcHJpdmF0ZSBkaXJlY3RSb2xsTGF3KGlucHV0OiBGY3NJbnB1dCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIGNsYW1wKC1pbnB1dC5yb2xsU3RpY2sgLSB0aGlzLmNmZy5yb2xsLnJhdGVEYW1wICogaW5wdXQucm9sbFJhdGUsIC0xLCAxKTtcclxuICAgIH1cclxuXHJcbiAgICAvKiogUm9sbC1yYXRlIGNvbW1hbmQgbGF3IOKGkiBhaWxlcm9uLiAqL1xyXG4gICAgcHJpdmF0ZSByYXRlQ29tbWFuZFJvbGxMYXcoaW5wdXQ6IEZjc0lucHV0KTogbnVtYmVyIHtcclxuICAgICAgICBpZiAoaW5wdXQubGFuZGVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBjb21tYW5kZWRSYXRlUmFkID0gY29tcHV0ZUNvbW1hbmRlZFJvbGxSYXRlKGlucHV0LCB0aGlzLmNmZy5yb2xsKTtcclxuICAgICAgICBjb25zdCByYXRlRXJyb3IgPSBpbnB1dC5yb2xsUmF0ZSAtIGNvbW1hbmRlZFJhdGVSYWQ7XHJcbiAgICAgICAgcmV0dXJuIGNsYW1wKHRoaXMuY2ZnLnJvbGwucmF0ZUdhaW4gKiByYXRlRXJyb3IsIC0xLCAxKTtcclxuICAgIH1cclxuXHJcbiAgICAvKiogWWF3IGRhbXBlciAod2FzaGVkIG91dCkgKyBhaWxlcm9uLXJ1ZGRlciBpbnRlcmNvbm5lY3QgKyBwZWRhbC4gKi9cclxuICAgIHByaXZhdGUgeWF3TGF3KGlucHV0OiBGY3NJbnB1dCwgYWlsZXJvbkNtZDogbnVtYmVyLCBkdDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBjb25zdCB5YXcgPSB0aGlzLmNmZy55YXc7XHJcbiAgICAgICAgY29uc3QgdGF1ID0gTWF0aC5tYXgoeWF3LmRhbXBlcldhc2hvdXRUYXVTLCAxZS0zKTtcclxuICAgICAgICBjb25zdCBhID0gZHQgPD0gMCA/IDEgOiAxIC0gTWF0aC5leHAoLWR0IC8gdGF1KTtcclxuICAgICAgICB0aGlzLnlhd1JhdGVMb3dQYXNzICs9IChpbnB1dC55YXdSYXRlIC0gdGhpcy55YXdSYXRlTG93UGFzcykgKiBhO1xyXG4gICAgICAgIGNvbnN0IHlhd1JhdGVIaWdoUGFzcyA9IGlucHV0Lnlhd1JhdGUgLSB0aGlzLnlhd1JhdGVMb3dQYXNzO1xyXG5cclxuICAgICAgICBjb25zdCBkYW1wZXIgPSAteWF3LmRhbXBlckdhaW4gKiB5YXdSYXRlSGlnaFBhc3M7XHJcbiAgICAgICAgY29uc3QgYXJpID0geWF3LmFyaUdhaW4gKiBhaWxlcm9uQ21kO1xyXG4gICAgICAgIGNvbnN0IHBlZGFsID0gaW5wdXQueWF3UGVkYWwgKiB5YXcubWF4UnVkZGVyQ21kO1xyXG4gICAgICAgIHJldHVybiBjbGFtcChwZWRhbCArIGRhbXBlciArIGFyaSwgLTEsIDEpO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCAqIGFzIFRIUkVFIGZyb20gJ3RocmVlJztcclxuaW1wb3J0IHsgVVAgfSBmcm9tICcuLi8uLi91dGlscy9tYXRoJztcclxuaW1wb3J0IHsgRm0yQWlyY3JhZnRDb25maWcgfSBmcm9tICcuLi9mbTIvZm0yQWlyY3JhZnRDb25maWcnO1xyXG5pbXBvcnQgeyBGY3NQaXRjaExpbWl0ZXIgfSBmcm9tICcuLi9mbTIvZmNzJztcclxuXHJcbmV4cG9ydCBjb25zdCBTSU1fRlBTID0gMTIwO1xyXG5jb25zdCBTSU1fREVMVEEgPSAxLjAgLyBTSU1fRlBTO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBuZXQgZm9yY2UgYWN0aW5nIG9uIGEgc2luZ2xlIGJvZHkgcGFydCwgc2VyaWFsaXNlZCBmb3IgdGhlIGRlYnVnIG92ZXJsYXkuXHJcbiAqIE9yaWdpbiBhbmQgdmVjdG9yIGFyZSBib3RoIGV4cHJlc3NlZCBpbiB0aGUgYWlyY3JhZnQgYm9keSBmcmFtZSAobWV0cmVzIGFuZFxyXG4gKiBuZXd0b25zIHJlc3BlY3RpdmVseSkuIFRoZSBvdmVybGF5IGRlY29tcG9zZXMgYHZlY2AgaW50byBpdHMgWC9ZL1ogYm9keS1heGlzXHJcbiAqIGNvbXBvbmVudHMgYW5kIGRyYXdzIG9uZSBhcnJvdyBwZXIgYXhpcywgcmF0aGVyIHRoYW4gYSBzaW5nbGUgcmVzdWx0YW50IGFycm93LlxyXG4gKi9cclxuLyoqIFdoaWNoIGtpbmQgb2YgZm9yY2UgYSBzYW1wbGUgcmVwcmVzZW50cyAoZHJpdmVzIHRoZSBvdmVybGF5IGNvbG91cikuICovXHJcbmV4cG9ydCB0eXBlIEZvcmNlVmVjdG9yS2luZCA9ICdsaWZ0JyB8ICdkcmFnJyB8ICd0aHJ1c3QnIHwgJ3dlaWdodCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZvcmNlVmVjdG9yU2FtcGxlIHtcclxuICAgIHBhcnQ6IHN0cmluZztcclxuICAgIC8qKiBXaGF0IHRoZSB2ZWN0b3IgcmVwcmVzZW50czsgZGVmYXVsdHMgdG8gJ2xpZnQnIHdoZW4gb21pdHRlZC4gKi9cclxuICAgIGtpbmQ/OiBGb3JjZVZlY3RvcktpbmQ7XHJcbiAgICBvcmlnaW46IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcclxuICAgIHZlYzogW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xyXG59XHJcblxyXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRmxpZ2h0TW9kZWwge1xyXG5cclxuICAgIHByb3RlY3RlZCBvYmogPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcclxuICAgIHByb3RlY3RlZCB2ZWxvY2l0eTogVEhSRUUuVmVjdG9yMyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7IC8vIG0vc1xyXG5cclxuICAgIHByb3RlY3RlZCBjcmFzaGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBwcm90ZWN0ZWQgbGFuZGVkOiBib29sZWFuID0gdHJ1ZTtcclxuICAgIHByb3RlY3RlZCBsYW5kaW5nR2VhckRlcGxveWVkOiBib29sZWFuID0gdHJ1ZTtcclxuICAgIHByb3RlY3RlZCBmbGFwc0V4dGVuZGVkOiBib29sZWFuID0gdHJ1ZTtcclxuICAgIHByb3RlY3RlZCB3aGVlbEJyYWtlc0FwcGxpZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIC8qKlxyXG4gICAgICogUmV5bm9sZHMtbnVtYmVyIHJlZ2ltZSBmb3IgaGlnaC1hbHBoYSBmb3JlYm9keSBmbG93IChFcmljc3NvbiwgSUNBUy05Mi00LjZSKS5cclxuICAgICAqIGZhbHNlID0gZnVsbC1zY2FsZSBmbGlnaHQ6IHRyYW5zaXRpb24vbW90aW9uIGNvdXBsaW5nIGtlZXBzIGZvcmVib2R5XHJcbiAgICAgKiBzZXBhcmF0aW9uIHN5bW1ldHJpYywgc28gbm8gbm9zZSBzbGljZSAodGhlIHJlYWwtYWlyY3JhZnQgZGVmYXVsdCkuXHJcbiAgICAgKiB0cnVlICA9IHN1YnNjYWxlIC8gbGFtaW5hcjogdGhlIGZvcmVib2R5IHZvcnRleCBhc3ltbWV0cnkgaXMgbGl2ZSwgc28gYVxyXG4gICAgICogaGlnaC1hbHBoYSBtYW5ldXZlciAoY29icmEpIGRlcGFydHMgaW50byBhIG5vc2Ugc2xpY2Ug4oCUIHRoZSB3aW5kLXR1bm5lbFxyXG4gICAgICogYmVoYXZpb3VyIHRoZSBwYXBlciB3YXJucyBkb2VzIE5PVCByZXByZXNlbnQgZnVsbC1zY2FsZSBmbGlnaHQuXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCBmb3JlYm9keUxhbWluYXI6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAvKiogQWN0aXZlIHBpdGNoIEFvQS9nIGxpbWl0ZXIgc3RyYXRlZ3kgKGtleXMgMS8yLzMpLiBGTTIgb25seS4gKi9cclxuICAgIHByb3RlY3RlZCBwaXRjaExpbWl0ZXJNb2RlOiBGY3NQaXRjaExpbWl0ZXIgPSBGY3NQaXRjaExpbWl0ZXIuU09GVDtcclxuXHJcbiAgICAvKiogRkJXIEFvQS9nIGxpbWl0ZXJzLiBUcnVlID0gbm9ybWFsIGVudmVsb3BlIHByb3RlY3Rpb247IGZhbHNlID0gcGlsb3Qgb3ZlcnJpZGUuICovXHJcbiAgICBwcm90ZWN0ZWQgbGltaXRlcnNFbmFibGVkOiBib29sZWFuID0gdHJ1ZTtcclxuICAgIC8qKlxyXG4gICAgICogQ3VycmVudCBlbGV2YXRvci1jb21tYW5kIGNsYW1wIGJvdW5kcyBpbiBbLTEsIDFdIChwb3NpdGl2ZSA9IG5vc2UtdXAgLyBhZnRcclxuICAgICAqIHN0aWNrKS4gV2l0aCBsaW1pdGVycyBPTiB0aGVzZSByZWZsZWN0IHRoZSBjb21iaW5lZCBBb0EvZyBjYXBzOyB3aXRoXHJcbiAgICAgKiBsaW1pdGVycyBPRkYgdGhleSBhcmUgwrExLiBVc2VkIGJ5IHRoZSBIVUQgc3RpY2sgYm94LlxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgZWxldmF0b3JDb21tYW5kTGltaXRIaWdoOiBudW1iZXIgPSAxO1xyXG4gICAgcHJvdGVjdGVkIGVsZXZhdG9yQ29tbWFuZExpbWl0TG93OiBudW1iZXIgPSAtMTtcclxuXHJcbiAgICBwcm90ZWN0ZWQgcGl0Y2g6IG51bWJlciA9IDA7IC8vIFstMSwgMV1cclxuICAgIHByb3RlY3RlZCByb2xsOiBudW1iZXIgPSAwOyAvLyBbLTEsIDFdXHJcbiAgICBwcm90ZWN0ZWQgeWF3OiBudW1iZXIgPSAwOyAvLyBbLTEsIDFdXHJcbiAgICBwcm90ZWN0ZWQgdGhyb3R0bGU6IG51bWJlciA9IDA7IC8vIFswLCAxXVxyXG4gICAgcHJvdGVjdGVkIGVmZmVjdGl2ZVRocm90dGxlOiBudW1iZXIgPSAwOyAvLyBbMCwgMV1cclxuXHJcbiAgICBwcm90ZWN0ZWQgYW5nbGVPZkF0dGFja1JhZDogbnVtYmVyID0gMDtcclxuICAgIHByb3RlY3RlZCBsb2FkRmFjdG9yRzogbnVtYmVyID0gMTtcclxuICAgIHByb3RlY3RlZCBlbmdpbmVUaHJ1c3ROOiBudW1iZXIgPSAwO1xyXG4gICAgLyoqXHJcbiAgICAgKiBMYXRlc3QgRkNTLWNvbW1hbmRlZCwgcG9zdC1hY3R1YXRvci1sYWcgc3VyZmFjZSBkZWZsZWN0aW9ucyBpbiBbLTEsIDFdLFxyXG4gICAgICogZXhwcmVzc2VkIGluIHRoZSBTQU1FIHBvbGFyaXR5IGFzIHRoZSByYXcgcGlsb3Qgc3RpY2sgdGhleSBhbmltYXRlIGZyb21cclxuICAgICAqIChwb3NpdGl2ZSBlbGV2YXRvciA9IG5vc2UtdXAgLyBhZnQgc3RpY2ssIHBvc2l0aXZlIGFpbGVyb24gPSByaWdodCByb2xsXHJcbiAgICAgKiBzdGljaywgcG9zaXRpdmUgcnVkZGVyID0gcmlnaHQgcGVkYWwpLiBUaGVzZSBkcml2ZSB0aGUgVklTSUJMRSBjb250cm9sXHJcbiAgICAgKiBzdXJmYWNlcyBzbyB0aGUgZmx5LWJ5LXdpcmUgc2hhcGluZyAocm9sbC95YXcgbGF3cykgaXNcclxuICAgICAqIHZpc2libGUgb24gdGhlIG1vZGVsLiBUaGV5IGRlZmF1bHQgdG8gMCB1bnRpbCB0aGUgZmlyc3QgcGh5c2ljcyBzdGF0ZS5cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIGNvbW1hbmRlZEVsZXZhdG9yOiBudW1iZXIgPSAwO1xyXG4gICAgcHJvdGVjdGVkIGNvbW1hbmRlZEFpbGVyb246IG51bWJlciA9IDA7XHJcbiAgICBwcm90ZWN0ZWQgY29tbWFuZGVkUnVkZGVyOiBudW1iZXIgPSAwO1xyXG4gICAgLyoqIFdvcmxkLWZyYW1lIGxpbmVhciBhY2NlbGVyYXRpb24gZnJvbSB0aGUgbGFzdCBwaHlzaWNzIHN0ZXAgKG0vc8KyKS4gKi9cclxuICAgIHByb3RlY3RlZCByZWFkb25seSBhY2NlbFdvcmxkID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIExhdGVzdCBwZXItcGFydCBmb3JjZSB2ZWN0b3JzIChib2R5IGZyYW1lKSBmb3IgdGhlIGRlYnVnIG92ZXJsYXkuIE9ubHlcclxuICAgICAqIHBvcHVsYXRlZCB3aGlsZSB7QGxpbmsgc2V0Rm9yY2VWZWN0b3JzUmVxdWVzdGVkfSBpcyBlbmFibGVkLCBvdGhlcndpc2VcclxuICAgICAqIGxlZnQgZW1wdHkgdG8gYXZvaWQgdGhlIHBlci1zdGVwIGFsbG9jYXRpb24gLyB0cmFuc2ZlciBjb3N0LlxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgZm9yY2VWZWN0b3JzOiBGb3JjZVZlY3RvclNhbXBsZVtdID0gW107XHJcbiAgICAvKiogV2hldGhlciB0aGUgZGVidWcgZm9yY2UtdmVjdG9yIHNuYXBzaG90IHNob3VsZCBiZSBwcm9kdWNlZCBlYWNoIHN0ZXAuICovXHJcbiAgICBwcm90ZWN0ZWQgZm9yY2VWZWN0b3JzUmVxdWVzdGVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgcHJpdmF0ZSBwcmV2UG9zaXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG4gICAgcHJpdmF0ZSBwcmV2UXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XHJcbiAgICBwcml2YXRlIHByZXZWZWxvY2l0eSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XHJcbiAgICBwcml2YXRlIGRlbHRhUmVtYWluZGVyOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGFic3RyYWN0IHN0ZXAoZGVsdGE6IG51bWJlcik6IHZvaWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsZWQgd2hlbiB0aGlzIG1vZGVsIGJlY29tZXMgdGhlIGFjdGl2ZSBtb2RlbCBmb3IgaXRzIGVudGl0eSAob25cclxuICAgICAqIGNvbnN0cnVjdGlvbiBvZiB0aGUgZW50aXR5IGFuZCBvbiBldmVyeSBydW50aW1lIG1vZGVsIHN3YXApLiBMZXRzIGFcclxuICAgICAqIHNoYXJlZC13b3JrZXIgcHJveHkgY2xhaW0gb3duZXJzaGlwIG9mIGl0cyBzbG90LiBOby1vcCBieSBkZWZhdWx0LlxyXG4gICAgICovXHJcbiAgICBhY3RpdmF0ZSgpOiB2b2lkIHtcclxuICAgICAgICAvLyBOby1vcCBieSBkZWZhdWx0LlxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLSBDb21iYXQtc2ltIG1pcnJvciAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyBQb3B1bGF0ZWQgb25seSBieSB0aGUgc2hhcmVkIGNvbWJhdC1zaW0gcHJveHkgKHNlZSBTaW1Qcm94eUZsaWdodE1vZGVsKTtcclxuICAgIC8vIHRoZSBkZWZhdWx0cyBiZWxvdyBtZWFuIFwibm90IHNpbXVsYXRlZCBpbiB0aGUgY29tYmF0IHdvcmtlclwiLlxyXG5cclxuICAgIC8qKiBIZWFsdGggaW4gWzAsIG1heEhlYWx0aF0sIG9yIC0xIHdoZW4gdGhpcyBtb2RlbCBpcyBub3Qgc2ltLW93bmVkLiAqL1xyXG4gICAgZ2V0U2ltSGVhbHRoKCk6IG51bWJlciB7IHJldHVybiAtMTsgfVxyXG5cclxuICAgIC8qKiBSZW1haW5pbmcgZ3VuIHJvdW5kcywgb3IgLTEgd2hlbiB0aGlzIG1vZGVsIGlzIG5vdCBzaW0tb3duZWQuICovXHJcbiAgICBnZXRTaW1BbW1vKCk6IG51bWJlciB7IHJldHVybiAtMTsgfVxyXG5cclxuICAgIC8qKiBXaGV0aGVyIHRoZSBpbi13b3JrZXIgcGlsb3QvdHJpZ2dlciBwcm9kdWNlZCBhIGZpcmluZyBzb2x1dGlvbiB0aGlzIGZyYW1lLiAqL1xyXG4gICAgZ2V0U2ltRmlyaW5nKCk6IGJvb2xlYW4geyByZXR1cm4gZmFsc2U7IH1cclxuXHJcbiAgICAvKiogU2ltLW93bmVkIGdlYXIgc3RhdGUsIG9yIG51bGwgd2hlbiB0aGlzIG1vZGVsIGlzIG5vdCBzaW0tb3duZWQuICovXHJcbiAgICBnZXRTaW1HZWFyRGVwbG95ZWQoKTogYm9vbGVhbiB8IG51bGwgeyByZXR1cm4gbnVsbDsgfVxyXG5cclxuICAgIC8qKiBTaW0tb3duZWQgZmxhcHMgc3RhdGUsIG9yIG51bGwgd2hlbiB0aGlzIG1vZGVsIGlzIG5vdCBzaW0tb3duZWQuICovXHJcbiAgICBnZXRTaW1GbGFwc0V4dGVuZGVkKCk6IGJvb2xlYW4gfCBudWxsIHsgcmV0dXJuIG51bGw7IH1cclxuXHJcbiAgICByZXNldCgpIHtcclxuICAgICAgICB0aGlzLm9iai5wb3NpdGlvbi5zZXQoMCwgMCwgMCk7XHJcbiAgICAgICAgdGhpcy5vYmoucXVhdGVybmlvbi5zZXRGcm9tQXhpc0FuZ2xlKFVQLCAwKTtcclxuICAgICAgICB0aGlzLnZlbG9jaXR5LnNldCgwLCAwLCAwKTtcclxuICAgICAgICB0aGlzLmNyYXNoZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmxhbmRlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5sYW5kaW5nR2VhckRlcGxveWVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmZsYXBzRXh0ZW5kZWQgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMud2hlZWxCcmFrZXNBcHBsaWVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5mb3JlYm9keUxhbWluYXIgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnBpdGNoTGltaXRlck1vZGUgPSBGY3NQaXRjaExpbWl0ZXIuU09GVDtcclxuICAgICAgICB0aGlzLmxpbWl0ZXJzRW5hYmxlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5lbGV2YXRvckNvbW1hbmRMaW1pdEhpZ2ggPSAxO1xyXG4gICAgICAgIHRoaXMuZWxldmF0b3JDb21tYW5kTGltaXRMb3cgPSAtMTtcclxuICAgICAgICB0aGlzLnBpdGNoID0gMDtcclxuICAgICAgICB0aGlzLnJvbGwgPSAwO1xyXG4gICAgICAgIHRoaXMueWF3ID0gMDtcclxuICAgICAgICB0aGlzLnRocm90dGxlID0gMDtcclxuICAgICAgICB0aGlzLmVmZmVjdGl2ZVRocm90dGxlID0gMDtcclxuICAgICAgICB0aGlzLmFuZ2xlT2ZBdHRhY2tSYWQgPSAwO1xyXG4gICAgICAgIHRoaXMubG9hZEZhY3RvckcgPSAxO1xyXG4gICAgICAgIHRoaXMuZW5naW5lVGhydXN0TiA9IDA7XHJcbiAgICAgICAgdGhpcy5jb21tYW5kZWRFbGV2YXRvciA9IDA7XHJcbiAgICAgICAgdGhpcy5jb21tYW5kZWRBaWxlcm9uID0gMDtcclxuICAgICAgICB0aGlzLmNvbW1hbmRlZFJ1ZGRlciA9IDA7XHJcbiAgICAgICAgdGhpcy5hY2NlbFdvcmxkLnNldCgwLCAwLCAwKTtcclxuICAgICAgICB0aGlzLmRlbHRhUmVtYWluZGVyID0gMDtcclxuICAgICAgICB0aGlzLnN5bmNQcmV2aW91c1N0YXRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIEFsaWduIHJlbmRlciBpbnRlcnBvbGF0aW9uIGFmdGVyIHRlbGVwb3J0IG9yIGFpcmJvcm5lIHNwYXduLiAqL1xyXG4gICAgc25hcFBoeXNpY3NTdGF0ZSgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnN5bmNQcmV2aW91c1N0YXRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlKGRlbHRhOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmRlbHRhUmVtYWluZGVyICs9IGRlbHRhO1xyXG4gICAgICAgIHdoaWxlICh0aGlzLmRlbHRhUmVtYWluZGVyID49IFNJTV9ERUxUQSkge1xyXG4gICAgICAgICAgICB0aGlzLnNhdmVQcmV2aW91c1N0YXRlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc3RlcChTSU1fREVMVEEpO1xyXG4gICAgICAgICAgICB0aGlzLmRlbHRhUmVtYWluZGVyIC09IFNJTV9ERUxUQTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIDEgPSBsYXRlc3QgcGh5c2ljcyBzdGF0ZSwgMCA9IHByZXZpb3VzIHBoeXNpY3Mgc3RhdGUuICovXHJcbiAgICBnZXRSZW5kZXJJbnRlcnBvbGF0aW9uQWxwaGEoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gMSAtIHRoaXMuZGVsdGFSZW1haW5kZXIgLyBTSU1fREVMVEE7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UmVuZGVyUG9zaXRpb24odGFyZ2V0OiBUSFJFRS5WZWN0b3IzKTogVEhSRUUuVmVjdG9yMyB7XHJcbiAgICAgICAgcmV0dXJuIHRhcmdldC5sZXJwVmVjdG9ycyh0aGlzLnByZXZQb3NpdGlvbiwgdGhpcy5vYmoucG9zaXRpb24sIHRoaXMuZ2V0UmVuZGVySW50ZXJwb2xhdGlvbkFscGhhKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFJlbmRlclF1YXRlcm5pb24odGFyZ2V0OiBUSFJFRS5RdWF0ZXJuaW9uKTogVEhSRUUuUXVhdGVybmlvbiB7XHJcbiAgICAgICAgcmV0dXJuIHRhcmdldC5zbGVycFF1YXRlcm5pb25zKHRoaXMucHJldlF1YXRlcm5pb24sIHRoaXMub2JqLnF1YXRlcm5pb24sIHRoaXMuZ2V0UmVuZGVySW50ZXJwb2xhdGlvbkFscGhhKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFJlbmRlclZlbG9jaXR5KHRhcmdldDogVEhSRUUuVmVjdG9yMyk6IFRIUkVFLlZlY3RvcjMge1xyXG4gICAgICAgIHJldHVybiB0YXJnZXQubGVycFZlY3RvcnModGhpcy5wcmV2VmVsb2NpdHksIHRoaXMudmVsb2NpdHksIHRoaXMuZ2V0UmVuZGVySW50ZXJwb2xhdGlvbkFscGhhKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2F2ZVByZXZpb3VzU3RhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5wcmV2UG9zaXRpb24uY29weSh0aGlzLm9iai5wb3NpdGlvbik7XHJcbiAgICAgICAgdGhpcy5wcmV2UXVhdGVybmlvbi5jb3B5KHRoaXMub2JqLnF1YXRlcm5pb24pO1xyXG4gICAgICAgIHRoaXMucHJldlZlbG9jaXR5LmNvcHkodGhpcy52ZWxvY2l0eSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzeW5jUHJldmlvdXNTdGF0ZSgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnByZXZQb3NpdGlvbi5jb3B5KHRoaXMub2JqLnBvc2l0aW9uKTtcclxuICAgICAgICB0aGlzLnByZXZRdWF0ZXJuaW9uLmNvcHkodGhpcy5vYmoucXVhdGVybmlvbik7XHJcbiAgICAgICAgdGhpcy5wcmV2VmVsb2NpdHkuY29weSh0aGlzLnZlbG9jaXR5KTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRQaXRjaChwaXRjaDogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5waXRjaCA9IHBpdGNoO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFJvbGwocm9sbDogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5yb2xsID0gcm9sbDtcclxuICAgIH1cclxuXHJcbiAgICBzZXRZYXcoeWF3OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLnlhdyA9IHlhdztcclxuICAgIH1cclxuXHJcbiAgICBzZXRUaHJvdHRsZSh0aHJvdHRsZTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy50aHJvdHRsZSA9IHRocm90dGxlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBNYXRjaCBzcG9vbGVkIGVuZ2luZSBzdGF0ZSB0byBjb21tYW5kZWQgdGhyb3R0bGUgKGUuZy4gYWlyYm9ybmUgc3Bhd24pLiAqL1xyXG4gICAgc3luY0VmZmVjdGl2ZVRocm90dGxlKCkge1xyXG4gICAgICAgIHRoaXMuZWZmZWN0aXZlVGhyb3R0bGUgPSB0aGlzLnRocm90dGxlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2VsZWN0IHRoZSBhaXJjcmFmdCB0aGlzIG1vZGVsIHNob3VsZCBzaW11bGF0ZS4gT25seSB0aGUgRk0yIG1vZGVsIGlzXHJcbiAgICAgKiBwZXItYWlyY3JhZnQgZm9yIG5vdzsgZXZlcnkgb3RoZXIgbW9kZWwgaWdub3JlcyB0aGlzIChnZW5lcmljIGR5bmFtaWNzKS5cclxuICAgICAqL1xyXG4gICAgc2V0QWlyY3JhZnQoX2NvbmZpZzogRm0yQWlyY3JhZnRDb25maWcpOiB2b2lkIHtcclxuICAgICAgICAvLyBOby1vcCBieSBkZWZhdWx0LlxyXG4gICAgfVxyXG5cclxuICAgIHNldExhbmRpbmdHZWFyRGVwbG95ZWQoZGVwbG95ZWQ6IGJvb2xlYW4pIHtcclxuICAgICAgICB0aGlzLmxhbmRpbmdHZWFyRGVwbG95ZWQgPSBkZXBsb3llZDtcclxuICAgIH1cclxuXHJcbiAgICBzZXRGbGFwc0V4dGVuZGVkKGV4dGVuZGVkOiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy5mbGFwc0V4dGVuZGVkID0gZXh0ZW5kZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0V2hlZWxCcmFrZXMoYXBwbGllZDogYm9vbGVhbikge1xyXG4gICAgICAgIHRoaXMud2hlZWxCcmFrZXNBcHBsaWVkID0gYXBwbGllZDtcclxuICAgIH1cclxuXHJcbiAgICBpc1doZWVsQnJha2VzQXBwbGllZCgpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy53aGVlbEJyYWtlc0FwcGxpZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZWxlY3QgdGhlIGhpZ2gtYWxwaGEgZm9yZWJvZHkgUmV5bm9sZHMgcmVnaW1lIChFcmljc3NvbiwgSUNBUy05Mi00LjZSKS5cclxuICAgICAqIGZhbHNlIChkZWZhdWx0KSA9IGZ1bGwtc2NhbGUgZmxpZ2h0LCBsYXRlcmFsbHkgc3ltbWV0cmljIChubyBub3NlIHNsaWNlKTtcclxuICAgICAqIHRydWUgPSBzdWJzY2FsZSAvIGxhbWluYXIsIHdoZXJlIHRoZSBmb3JlYm9keSB2b3J0ZXggYXN5bW1ldHJ5IGRlcGFydHMgYVxyXG4gICAgICogY29icmEgaW50byBhIG5vc2Ugc2xpY2UuIE9ubHkgdGhlIEZNMiBtb2RlbCBhY3RzIG9uIHRoaXMuXHJcbiAgICAgKi9cclxuICAgIHNldEZvcmVib2R5TGFtaW5hcihsYW1pbmFyOiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy5mb3JlYm9keUxhbWluYXIgPSBsYW1pbmFyO1xyXG4gICAgfVxyXG5cclxuICAgIGlzRm9yZWJvZHlMYW1pbmFyKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZvcmVib2R5TGFtaW5hcjtcclxuICAgIH1cclxuXHJcbiAgICAvKiogU2VsZWN0IHRoZSBwaXRjaCBBb0EvZyBsaW1pdGVyIHN0cmF0ZWd5IChrZXlzIDEvMi8zKS4gT25seSBGTTIgYWN0cyBvbiBpdC4gKi9cclxuICAgIHNldFBpdGNoTGltaXRlck1vZGUobW9kZTogRmNzUGl0Y2hMaW1pdGVyKSB7XHJcbiAgICAgICAgdGhpcy5waXRjaExpbWl0ZXJNb2RlID0gbW9kZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQaXRjaExpbWl0ZXJNb2RlKCk6IEZjc1BpdGNoTGltaXRlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGl0Y2hMaW1pdGVyTW9kZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQaWxvdFBpdGNoKCk6IG51bWJlciB7IHJldHVybiB0aGlzLnBpdGNoOyB9XHJcbiAgICBnZXRQaWxvdFJvbGwoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMucm9sbDsgfVxyXG4gICAgZ2V0UGlsb3RZYXcoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMueWF3OyB9XHJcbiAgICBnZXRQaWxvdFRocm90dGxlKCk6IG51bWJlciB7IHJldHVybiB0aGlzLnRocm90dGxlOyB9XHJcbiAgICBnZXRXaGVlbEJyYWtlc0FwcGxpZWQoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLndoZWVsQnJha2VzQXBwbGllZDsgfVxyXG5cclxuICAgIC8qKiBFbmFibGUvZGlzYWJsZSB0aGUgRkJXIEFvQS9nIGxpbWl0ZXJzIChmYWxzZSA9IHBpbG90IGxpbWl0ZXIgb3ZlcnJpZGUpLiAqL1xyXG4gICAgc2V0TGltaXRlcnNFbmFibGVkKGVuYWJsZWQ6IGJvb2xlYW4pIHtcclxuICAgICAgICB0aGlzLmxpbWl0ZXJzRW5hYmxlZCA9IGVuYWJsZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgaXNMaW1pdGVyc0VuYWJsZWQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGltaXRlcnNFbmFibGVkO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEVsZXZhdG9yQ29tbWFuZExpbWl0SGlnaCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmVsZXZhdG9yQ29tbWFuZExpbWl0SGlnaDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRFbGV2YXRvckNvbW1hbmRMaW1pdExvdygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmVsZXZhdG9yQ29tbWFuZExpbWl0TG93O1xyXG4gICAgfVxyXG5cclxuICAgIHNldExhbmRlZChpc0xhbmRlZDogYm9vbGVhbikge1xyXG4gICAgICAgIHRoaXMubGFuZGVkID0gaXNMYW5kZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgaXNMYW5kZWQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGFuZGVkO1xyXG4gICAgfVxyXG5cclxuICAgIHNldENyYXNoZWQoaXNDcmFzaGVkOiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy5jcmFzaGVkID0gaXNDcmFzaGVkO1xyXG4gICAgfVxyXG5cclxuICAgIGlzQ3Jhc2hlZCgpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jcmFzaGVkO1xyXG4gICAgfVxyXG5cclxuICAgIHNldCBwb3NpdGlvbihwOiBUSFJFRS5WZWN0b3IzKSB7XHJcbiAgICAgICAgdGhpcy5vYmoucG9zaXRpb24uY29weShwKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgcG9zaXRpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMub2JqLnBvc2l0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHNldCBxdWF0ZXJuaW9uKHE6IFRIUkVFLlF1YXRlcm5pb24pIHtcclxuICAgICAgICB0aGlzLm9iai5xdWF0ZXJuaW9uLmNvcHkocSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHF1YXRlcm5pb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMub2JqLnF1YXRlcm5pb247XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IHZlbG9jaXR5VmVjdG9yKHY6IFRIUkVFLlZlY3RvcjMpIHtcclxuICAgICAgICB0aGlzLnZlbG9jaXR5LmNvcHkodik7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IHZlbG9jaXR5VmVjdG9yKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnZlbG9jaXR5O1xyXG4gICAgfVxyXG5cclxuICAgIGdldEVmZmVjdGl2ZVRocm90dGxlKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZWZmZWN0aXZlVGhyb3R0bGU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gWy0xLDFdIC0gVmFsdWVzID49IDAgbWVhbiBzdGFsbFxyXG4gICAgYWJzdHJhY3QgZ2V0U3RhbGxTdGF0dXMoKTogbnVtYmVyO1xyXG5cclxuICAgIGdldEFuZ2xlT2ZBdHRhY2soKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hbmdsZU9mQXR0YWNrUmFkO1xyXG4gICAgfVxyXG5cclxuICAgIGdldExvYWRGYWN0b3JHKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubG9hZEZhY3Rvckc7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGQ1MtY29tbWFuZGVkIHZpc2libGUgc3VyZmFjZSBkZWZsZWN0aW9ucyBpbiBbLTEsIDFdLCBpbiByYXctc3RpY2sgcG9sYXJpdHlcclxuICAgICAqIChzZWUge0BsaW5rIGNvbW1hbmRlZEVsZXZhdG9yfSkuIFVzZWQgdG8gYW5pbWF0ZSB0aGUgY29udHJvbCBzdXJmYWNlcyBzbyB0aGVcclxuICAgICAqIGZseS1ieS13aXJlIHNoYXBpbmcgaXMgdmlzaWJsZSBvbiB0aGUgbW9kZWwuXHJcbiAgICAgKi9cclxuICAgIGdldENvbW1hbmRlZEVsZXZhdG9yKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29tbWFuZGVkRWxldmF0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29tbWFuZGVkQWlsZXJvbigpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbW1hbmRlZEFpbGVyb247XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29tbWFuZGVkUnVkZGVyKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29tbWFuZGVkUnVkZGVyO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEFjY2VsZXJhdGlvbldvcmxkKHRhcmdldDogVEhSRUUuVmVjdG9yMyA9IHRoaXMuYWNjZWxXb3JsZCk6IFRIUkVFLlZlY3RvcjMge1xyXG4gICAgICAgIHJldHVybiB0YXJnZXQuY29weSh0aGlzLmFjY2VsV29ybGQpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEVuZ2luZVRocnVzdEtuKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZW5naW5lVGhydXN0TiAvIDEwMDA7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIEVuYWJsZS9kaXNhYmxlIHByb2R1Y3Rpb24gb2YgdGhlIGRlYnVnIGZvcmNlLXZlY3RvciBzbmFwc2hvdCBlYWNoIHN0ZXAuICovXHJcbiAgICBzZXRGb3JjZVZlY3RvcnNSZXF1ZXN0ZWQocmVxdWVzdGVkOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5mb3JjZVZlY3RvcnNSZXF1ZXN0ZWQgPSByZXF1ZXN0ZWQ7XHJcbiAgICAgICAgaWYgKCFyZXF1ZXN0ZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5mb3JjZVZlY3RvcnMgPSBbXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIExhdGVzdCBwZXItcGFydCBmb3JjZSB2ZWN0b3JzIChib2R5IGZyYW1lKSBmb3IgdGhlIGRlYnVnIG92ZXJsYXkuICovXHJcbiAgICBnZXRGb3JjZVZlY3RvcnMoKTogRm9yY2VWZWN0b3JTYW1wbGVbXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9yY2VWZWN0b3JzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVpbGQgYSBmcmVzaCwgc2VyaWFsaXNhYmxlIHNuYXBzaG90IG9mIHRoZSBjdXJyZW50IHBlci1wYXJ0IGZvcmNlIHZlY3RvcnMuXHJcbiAgICAgKiBCYXNlIG1vZGVscyBoYXZlIG5vIGFlcm9keW5hbWljIGRlY29tcG9zaXRpb24sIHNvIHRoaXMgcmV0dXJucyBlbXB0eS5cclxuICAgICAqL1xyXG4gICAgZ2V0Rm9yY2VWZWN0b3JTbmFwc2hvdCgpOiBGb3JjZVZlY3RvclNhbXBsZVtdIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcblxyXG4gICAgdXNlQWZ0ZXJidXJuZXJUaHJvdHRsZURldGVudHMoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHN0ZXBUaHJvdHRsZURldGVudChjdXJyZW50OiBudW1iZXIsIGRpcmVjdGlvbjogMSB8IC0xKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgY3VycmVudCArIGRpcmVjdGlvbiAqIDAuMDEpKTtcclxuICAgIH1cclxuXHJcbiAgICBpc0luVGhyb3R0bGVBYkRldGVudEJhbmQoX2xldmVyOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIE92ZXJyaWRlIGluIG1vZGVscyB3aXRoIGEgbm9uLWxpbmVhciB0aHJvdHRsZSBxdWFkcmFudC4gKi9cclxuICAgIGFkanVzdFRocm90dGxlSW5wdXQoY3VycmVudDogbnVtYmVyLCBzdGVwOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBjdXJyZW50ICsgc3RlcCkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBPdmVycmlkZSBpbiBtb2RlbHMgd2l0aCBhIG5vbi1saW5lYXIgdGhyb3R0bGUgcXVhZHJhbnQuICovXHJcbiAgICBnZXRUaHJvdHRsZUh1ZFRleHQoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYFRIUiAkeygxMDAgKiB0aGlzLmVmZmVjdGl2ZVRocm90dGxlKS50b0ZpeGVkKDApfWA7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIE5vcm1hbGl6ZWQgZW5naW5lIHBvd2VyIGZvciBhdWRpbyBbMCwgMV0uICovXHJcbiAgICBnZXRUaHJvdHRsZUF1ZGlvTGV2ZWwoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5lZmZlY3RpdmVUaHJvdHRsZTtcclxuICAgIH1cclxuXHJcbiAgICAvKiogQ1NTIGNvbG9yIGZvciBlbmdpbmUgbm96emxlIHJlbmRlcmluZyAoTUlMIGJsYWNrIGJ5IGRlZmF1bHQpLiAqL1xyXG4gICAgZ2V0RW5naW5lTm96emxlQ29sb3IoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gJyMwYTBhMGEnO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCAqIGFzIFRIUkVFIGZyb20gJ3RocmVlJztcclxuXHJcbmNvbnN0IF92ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuY29uc3QgX3cgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5jb25zdCBfcSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XHJcblxyXG5jb25zdCBFUFNJTE9OID0gMC4wMDAxO1xyXG5cclxuZXhwb3J0IGNvbnN0IFpFUk8gPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKTtcclxuZXhwb3J0IGNvbnN0IFVQID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XHJcbmV4cG9ydCBjb25zdCBGT1JXQVJEID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSk7XHJcbmV4cG9ydCBjb25zdCBSSUdIVCA9IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDAsIDApO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzWmVybyhuOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiAtRVBTSUxPTiA8PSBuICYmIG4gPD0gRVBTSUxPTjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFscyhhOiBudW1iZXIsIGI6IG51bWJlciwgZXBzaWxvbjogbnVtYmVyID0gRVBTSUxPTik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIGEgLSBlcHNpbG9uIDw9IGIgJiYgYiA8PSBhICsgZXBzaWxvbjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNsYW1wKG46IG51bWJlciwgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLm1heChtaW4sIE1hdGgubWluKG4sIG1heCkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGVycCh0OiBudW1iZXIsIG4wOiBudW1iZXIsIG4xOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIG4wICsgdCAqIChuMSAtIG4wKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHZlY3RvckhlYWRpbmcodjogVEhSRUUuVmVjdG9yMyk6IG51bWJlciB7XHJcbiAgICBsZXQgYmVhcmluZyA9IE1hdGgucm91bmQoTWF0aC5hdGFuMih2LngsIC12LnopIC8gKDIgKiBNYXRoLlBJKSAqIDM2MCk7XHJcbiAgICBpZiAoYmVhcmluZyA8IDApIHtcclxuICAgICAgICBiZWFyaW5nID0gMzYwICsgYmVhcmluZztcclxuICAgIH1cclxuICAgIHJldHVybiBiZWFyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcm91bmRUb1plcm8odjogVEhSRUUuVmVjdG9yMywgZXBzaWxvbjogbnVtYmVyID0gRVBTSUxPTik6IFRIUkVFLlZlY3RvcjMge1xyXG4gICAgaWYgKGVxdWFscyh2LngsIDAuMCwgZXBzaWxvbikpIHtcclxuICAgICAgICB2LnggPSAwO1xyXG4gICAgfVxyXG4gICAgaWYgKGVxdWFscyh2LnksIDAuMCwgZXBzaWxvbikpIHtcclxuICAgICAgICB2LnkgPSAwO1xyXG4gICAgfVxyXG4gICAgaWYgKGVxdWFscyh2LnosIDAuMCwgZXBzaWxvbikpIHtcclxuICAgICAgICB2LnogPSAwO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHY7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBlYXNlT3V0Q2lyYyh4OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGguc3FydCgxIC0gKHggLSAxKSAqICh4IC0gMSkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZWFzZU91dFF1YWQoeDogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gMSAtICgxIC0geCkgKiAoMSAtIHgpO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiBlYXNlT3V0UXVpbnQoeDogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gMSAtIE1hdGgucG93KDEgLSB4LCA1KTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFBJX09WRVJfMTgwID0gTWF0aC5QSSAvIDE4MC4wO1xyXG5leHBvcnQgY29uc3QgTjE4MF9PVkVSX1BJID0gMTgwLjAgLyBNYXRoLlBJO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRvUmFkaWFucyhkZWdyZWVzOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIFBJX09WRVJfMTgwICogZGVncmVlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRvRGVncmVlcyhyYWRpYW5zOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE4xODBfT1ZFUl9QSSAqIHJhZGlhbnM7XHJcbn1cclxuXHJcbi8vIFJldHVybnMgW3BpdGNoLCByb2xsXSBpbiByYWRpYW5zXHJcbmV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVQaXRjaFJvbGwoYWN0b3I6IHtcclxuICAgIHF1YXRlcm5pb246IFRIUkVFLlF1YXRlcm5pb247XHJcbiAgICBnZXRXb3JsZERpcmVjdGlvbjogKHY6IFRIUkVFLlZlY3RvcjMpID0+IFRIUkVFLlZlY3RvcjM7XHJcbn0pOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIGNvbnN0IGZvcndhcmQgPSBhY3Rvci5nZXRXb3JsZERpcmVjdGlvbihfdik7XHJcbiAgICBjb25zdCBwcmpGb3J3YXJkID0gX3cuY29weShmb3J3YXJkKVxyXG4gICAgICAgIC5zZXRZKDApXHJcbiAgICAgICAgLm5vcm1hbGl6ZSgpO1xyXG4gICAgY29uc3QgcGl0Y2ggPSBmb3J3YXJkLmFuZ2xlVG8ocHJqRm9yd2FyZCkgKiBNYXRoLnNpZ24oZm9yd2FyZC55KTtcclxuXHJcbiAgICBfcS5zZXRGcm9tVW5pdFZlY3RvcnMoZm9yd2FyZCwgcHJqRm9yd2FyZCk7XHJcblxyXG4gICAgY29uc3QgcmlnaHQgPSBfdi5jb3B5KFJJR0hUKVxyXG4gICAgICAgIC5hcHBseVF1YXRlcm5pb24oYWN0b3IucXVhdGVybmlvbilcclxuICAgICAgICAuYXBwbHlRdWF0ZXJuaW9uKF9xKTtcclxuICAgIF9xLnNldEZyb21Vbml0VmVjdG9ycyhwcmpGb3J3YXJkLCBGT1JXQVJEKTtcclxuICAgIHJpZ2h0LmFwcGx5UXVhdGVybmlvbihfcSk7XHJcbiAgICBsZXQgcm9sbCA9IE1hdGguYWNvcyhyaWdodC54KSAqIE1hdGguc2lnbihyaWdodC55KTtcclxuICAgIHJvbGwgPSBpc05hTihyb2xsKSA/IDAuMCA6IHJvbGw7XHJcblxyXG4gICAgcmV0dXJuIFtwaXRjaCwgcm9sbF07XHJcbn1cclxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9