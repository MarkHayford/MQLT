"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDY_ROUTE_POINT_CHECK_IN_TYPE = exports.STUDY_USER_CHECK_IN_TYPE = exports.STUDY_PROJECT_CHECK_IN_TYPE = void 0;
exports.createStudyProjectCheckInCode = createStudyProjectCheckInCode;
exports.createStudyProjectCheckInPayload = createStudyProjectCheckInPayload;
exports.verifyStudyProjectCheckInCode = verifyStudyProjectCheckInCode;
exports.createStudyRoutePointCheckInCode = createStudyRoutePointCheckInCode;
exports.createStudyRoutePointCheckInPayload = createStudyRoutePointCheckInPayload;
exports.verifyStudyRoutePointCheckInCode = verifyStudyRoutePointCheckInCode;
const crypto_1 = require("crypto");
exports.STUDY_PROJECT_CHECK_IN_TYPE = 'mqlt-study-checkin-project';
exports.STUDY_USER_CHECK_IN_TYPE = 'mqlt-study-checkin-user';
exports.STUDY_ROUTE_POINT_CHECK_IN_TYPE = 'mqlt-study-checkin-route-point';
function checkInSecret() {
    return process.env.STUDY_CHECKIN_SECRET || process.env.JWT_SECRET || process.env.ADMIN_TOKEN || '';
}
function createStudyProjectCheckInCode(projectId) {
    const secret = checkInSecret();
    if (!secret)
        throw new Error('STUDY_CHECKIN_SECRET or JWT_SECRET is required');
    return (0, crypto_1.createHmac)('sha256', secret)
        .update(`${exports.STUDY_PROJECT_CHECK_IN_TYPE}:v1:${projectId}`)
        .digest('hex');
}
function createStudyProjectCheckInPayload(projectId) {
    return {
        type: exports.STUDY_PROJECT_CHECK_IN_TYPE,
        projectId,
        code: createStudyProjectCheckInCode(projectId),
    };
}
function verifyStudyProjectCheckInCode(projectId, code) {
    if (!projectId || !code)
        return false;
    const expected = createStudyProjectCheckInCode(projectId);
    const left = Buffer.from(expected);
    const right = Buffer.from(code);
    return left.length === right.length && (0, crypto_1.timingSafeEqual)(left, right);
}
function createStudyRoutePointCheckInCode(projectId, routePointId) {
    const secret = checkInSecret();
    if (!secret)
        throw new Error('STUDY_CHECKIN_SECRET or JWT_SECRET is required');
    return (0, crypto_1.createHmac)('sha256', secret)
        .update(`${exports.STUDY_ROUTE_POINT_CHECK_IN_TYPE}:v1:${projectId}:${routePointId}`)
        .digest('hex');
}
function createStudyRoutePointCheckInPayload(projectId, routePointId) {
    return {
        type: exports.STUDY_ROUTE_POINT_CHECK_IN_TYPE,
        projectId,
        routePointId,
        code: createStudyRoutePointCheckInCode(projectId, routePointId),
    };
}
function verifyStudyRoutePointCheckInCode(projectId, routePointId, code) {
    if (!projectId || !routePointId || !code)
        return false;
    const expected = createStudyRoutePointCheckInCode(projectId, routePointId);
    const left = Buffer.from(expected);
    const right = Buffer.from(code);
    return left.length === right.length && (0, crypto_1.timingSafeEqual)(left, right);
}
//# sourceMappingURL=study-check-in-code.js.map