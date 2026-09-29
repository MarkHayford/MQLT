export declare const STUDY_PROJECT_CHECK_IN_TYPE = "mqlt-study-checkin-project";
export declare const STUDY_USER_CHECK_IN_TYPE = "mqlt-study-checkin-user";
export declare const STUDY_ROUTE_POINT_CHECK_IN_TYPE = "mqlt-study-checkin-route-point";
export type StudyProjectCheckInPayload = {
    type: typeof STUDY_PROJECT_CHECK_IN_TYPE;
    projectId: string;
    code: string;
};
export type StudyRoutePointCheckInPayload = {
    type: typeof STUDY_ROUTE_POINT_CHECK_IN_TYPE;
    projectId: string;
    routePointId: string;
    code: string;
};
export declare function createStudyProjectCheckInCode(projectId: string): string;
export declare function createStudyProjectCheckInPayload(projectId: string): StudyProjectCheckInPayload;
export declare function verifyStudyProjectCheckInCode(projectId: string, code: string): boolean;
export declare function createStudyRoutePointCheckInCode(projectId: string, routePointId: string): string;
export declare function createStudyRoutePointCheckInPayload(projectId: string, routePointId: string): StudyRoutePointCheckInPayload;
export declare function verifyStudyRoutePointCheckInCode(projectId: string, routePointId: string, code: string): boolean;
