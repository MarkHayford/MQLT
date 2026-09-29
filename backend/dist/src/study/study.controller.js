"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const study_service_1 = require("./study.service");
let StudyController = class StudyController {
    constructor(studyService) {
        this.studyService = studyService;
    }
    async projectSchedule(id, from, to) {
        return this.studyService.listPublicScheduleDays(id, from, to);
    }
    projects(category, keyword) {
        return this.studyService.getProjects({ category, keyword });
    }
    projectDetail(id) {
        return this.studyService.getProjectDetail(id);
    }
    projectRoutePoints(id) {
        return this.studyService.getProjectRoutePoints(id);
    }
    projectDocumentDetail(id, docIndex) {
        return this.studyService.getProjectDocumentDetail(id, docIndex);
    }
    projectImage(filename, res) {
        return this.studyService.sendProjectImage(filename, res);
    }
    projectAdminAccess(user, id) {
        return this.studyService.getProjectAdminAccess(user.sub, id);
    }
    createBooking(user, body) {
        return this.studyService.createBooking(user.sub, body);
    }
    payBooking(user, id) {
        return this.studyService.payBooking(user.sub, id);
    }
    bookingDetail(user, id) {
        return this.studyService.getBookingDetail(user.sub, id);
    }
    checkInTicket(user, id) {
        return this.studyService.getBookingCheckInTicket(user.sub, id);
    }
    redeemCheckIn(user, body) {
        return this.studyService.redeemBookingCheckIn(user.sub, body);
    }
    verifyBooking(user, id) {
        return this.studyService.verifyBookingParticipant(user.sub, id);
    }
    confirmBooking(user, id) {
        return this.studyService.confirmBooking(user.sub, id);
    }
    addBookingParticipants(user, id, body) {
        return this.studyService.addBookingParticipants(user.sub, id, body);
    }
    removeBookingParticipantByDelete(user, id, participantBookingId) {
        return this.studyService.removeBookingParticipant(user.sub, id, participantBookingId);
    }
    removeBookingParticipant(user, id, participantBookingId) {
        return this.studyService.removeBookingParticipant(user.sub, id, participantBookingId);
    }
    cancelBooking(user, id) {
        return this.studyService.cancelBooking(user.sub, id);
    }
    deleteBooking(user, id) {
        return this.studyService.deleteBooking(user.sub, id);
    }
    bookings(user) {
        return this.studyService.getBookings(user.sub);
    }
    listRentalDrivers(user, query) {
        return this.studyService.listRentalDrivers(user.sub, query);
    }
    planTripWithAi(user, body) {
        return this.studyService.planTripWithAi(user.sub, body);
    }
    floatingNotices(authorization) {
        return this.studyService.getFloatingNotices(this.extractBearerToken(authorization));
    }
    notices(projectId) {
        return this.studyService.getNotices(projectId);
    }
    noticeDetail(id) {
        return this.studyService.getNoticeDetail(id);
    }
    platformSettings() {
        return this.studyService.publicPlatformSettings();
    }

    getExploreSession(user, id, query) {
        return this.studyService.getExploreSession(user.sub, id, query || {});
    }
    checkInRoutePoint(user, id, routePointId, body) {
        return this.studyService.checkInRoutePoint(user.sub, id, routePointId, body || {});
    }
    routePointCheckInCode(user, id, routePointId) {
        return this.studyService.getRoutePointCheckInCode(user.sub, id, routePointId);
    }
    routePointKnowledgeTask(user, id, routePointId) {
        return this.studyService.getRoutePointKnowledgeTask(user.sub, id, routePointId);
    }
    completeRoutePointKnowledgeTask(user, id, routePointId, body) {
        return this.studyService.completeRoutePointKnowledgeTask(user.sub, id, routePointId, body || {});
    }
    completeStationStep(user, id, routePointId, stepId, body) {
        return this.studyService.completeStationStep(user.sub, id, routePointId, stepId, body || {});
    }
    listMyCoupons(user) {
        return this.studyService.listUserCoupons(user.sub);
    }
    startStationGamePlay(user, id, routePointId, stepId) {
        return this.studyService.startStationGamePlay(user.sub, id, routePointId, stepId);
    }
    h5GamePlay(query) {
        return this.studyService.getH5GamePlay(query || {});
    }
    h5GameResult(body) {
        return this.studyService.submitH5GameResult(body || {});
    }
    earlyExitTour(user, id) {
        return this.studyService.earlyExitTour(user.sub, id);
    }
    pauseTour(user, id) {
        return this.studyService.pauseTour(user.sub, id);
    }
    resumeTour(user, id) {
        return this.studyService.resumeTour(user.sub, id);
    }
    getTourMall(user, id) {
        return this.studyService.getTourMallForUser(user.sub, id);
    }
    redeemTourMall(user, id, body) {
        return this.studyService.redeemTourMallItem(user.sub, id, body || {});
    }


    extractBearerToken(authorization) {
        const [type, token] = String(authorization ?? '').split(' ');
        if (type !== 'Bearer' || !token)
            return null;
        return token;
    }

    createRentalOrder(user, body) {
        return this.studyService.createRentalOrder(user.sub, body || {});
    }
    listMyRentalOrders(user, query) {
        return this.studyService.listMyRentalOrders(user.sub, query || {});
    }
    listOpenRentalPool(user, query) {
        return this.studyService.listOpenRentalPool(user.sub, query || {});
    }
    getRentalOrderDetail(user, id) {
        return this.studyService.getRentalOrderDetail(user.sub, id);
    }
    claimRentalOrder(user, id) {
        return this.studyService.claimRentalOrder(user.sub, id);
    }
    releaseRentalOrder(user, id, body) {
        return this.studyService.releaseRentalOrder(user.sub, id, body || {});
    }
    cancelRentalOrder(user, id, body) {
        return this.studyService.cancelRentalOrder(user.sub, id, body || {});
    }

    listRentalMessages(user, id, query) {
        return this.studyService.listRentalMessages(user.sub, id, query || {});
    }
    postRentalMessage(user, id, body) {
        return this.studyService.postRentalMessage(user.sub, id, body || {});
    }
    setRentalOfferedPrice(user, id, body) {
        return this.studyService.setRentalOfferedPrice(user.sub, id, body || {});
    }
    acceptRentalPrice(user, id) {
        return this.studyService.acceptRentalPrice(user.sub, id);
    }
    rejectRentalPrice(user, id, body) {
        return this.studyService.rejectRentalPrice(user.sub, id, body || {});
    }
    payRentalOrder(user, id) {
        return this.studyService.payRentalOrder(user.sub, id);
    }

    advanceRentalOrderStatus(user, id, body) {
        return this.studyService.advanceRentalOrderStatus(user.sub, id, body || {});
    }
};

__decorate([
    (0, common_1.Get)('projects/:id/schedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, String, String]),
    __metadata('design:returntype', void 0)
], StudyController.prototype, 'projectSchedule', null);

exports.StudyController = StudyController;
__decorate([
    (0, common_1.Get)("projects"),
    __param(0, (0, common_1.Query)("category")),
    __param(1, (0, common_1.Query)("keyword")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "projects", null);
__decorate([
    (0, common_1.Get)("projects/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "projectDetail", null);
__decorate([
    (0, common_1.Get)("projects/:id/route-points"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "projectRoutePoints", null);
__decorate([
    (0, common_1.Get)("projects/:id/documents/:docIndex"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("docIndex")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "projectDocumentDetail", null);
__decorate([
    (0, common_1.Get)("project-images/:filename"),
    __param(0, (0, common_1.Param)("filename")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "projectImage", null);
__decorate([
    (0, common_1.Get)("projects/:id/admin-access"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "projectAdminAccess", null);
__decorate([
    (0, common_1.Post)("bookings"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Post)("bookings/:id/pay"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "payBooking", null);
__decorate([
    (0, common_1.Get)("bookings/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "bookingDetail", null);
__decorate([
    (0, common_1.Get)("bookings/:id/check-in-ticket"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "checkInTicket", null);
__decorate([
    (0, common_1.Post)("bookings/redeem-check-in"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "redeemCheckIn", null);
__decorate([
    (0, common_1.Post)("bookings/:id/verify"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "verifyBooking", null);
__decorate([
    (0, common_1.Post)("bookings/:id/confirm"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "confirmBooking", null);
__decorate([
    (0, common_1.Post)("bookings/:id/participants"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "addBookingParticipants", null);
__decorate([
    (0, common_1.Delete)("bookings/:id/participants/:participantBookingId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Param)("participantBookingId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "removeBookingParticipantByDelete", null);
__decorate([
    (0, common_1.Post)("bookings/:id/participants/:participantBookingId/delete"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Param)("participantBookingId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "removeBookingParticipant", null);
__decorate([
    (0, common_1.Post)("bookings/:id/cancel"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "cancelBooking", null);
__decorate([
    (0, common_1.Post)("bookings/:id/delete"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "deleteBooking", null);
__decorate([
    (0, common_1.Get)("bookings"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "bookings", null);
__decorate([
    (0, common_1.Get)("rental/drivers"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "listRentalDrivers", null);
__decorate([
    (0, common_1.Post)("ai/plan"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "planTripWithAi", null);
__decorate([
    (0, common_1.Get)("floating-notices"),
    __param(0, (0, common_1.Headers)("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "floatingNotices", null);
__decorate([
    (0, common_1.Get)("notices"),
    __param(0, (0, common_1.Query)("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "notices", null);
__decorate([
    (0, common_1.Get)("notices/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "noticeDetail", null);
__decorate([
    (0, common_1.Get)("platform"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "platformSettings", null);

__decorate([
    (0, common_1.Post)("rental/orders"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "createRentalOrder", null);
__decorate([
    (0, common_1.Get)("rental/orders"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "listMyRentalOrders", null);
__decorate([
    (0, common_1.Get)("rental/orders/pool"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "listOpenRentalPool", null);
__decorate([
    (0, common_1.Get)("rental/orders/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "getRentalOrderDetail", null);
__decorate([
    (0, common_1.Post)("rental/orders/:id/claim"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "claimRentalOrder", null);
__decorate([
    (0, common_1.Post)("rental/orders/:id/release"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "releaseRentalOrder", null);
__decorate([
    (0, common_1.Post)("rental/orders/:id/cancel"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "cancelRentalOrder", null);


__decorate([
    (0, common_1.Get)("rental/orders/:id/messages"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "listRentalMessages", null);
__decorate([
    (0, common_1.Post)("rental/orders/:id/messages"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "postRentalMessage", null);
__decorate([
    (0, common_1.Post)("rental/orders/:id/offer"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "setRentalOfferedPrice", null);
__decorate([
    (0, common_1.Post)("rental/orders/:id/accept-price"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "acceptRentalPrice", null);
__decorate([
    (0, common_1.Post)("rental/orders/:id/reject-price"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "rejectRentalPrice", null);
__decorate([
    (0, common_1.Post)("rental/orders/:id/pay"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "payRentalOrder", null);


__decorate([
    (0, common_1.Post)("rental/orders/:id/status"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "advanceRentalOrderStatus", null);
__decorate([
    (0, common_1.Get)('projects/:id/explore-session'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "getExploreSession", null);
__decorate([
    (0, common_1.Post)('projects/:id/route-points/:routePointId/check-in'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('routePointId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "checkInRoutePoint", null);
__decorate([
    (0, common_1.Get)('projects/:id/route-points/:routePointId/check-in-code'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('routePointId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "routePointCheckInCode", null);
__decorate([
    (0, common_1.Get)('projects/:id/route-points/:routePointId/knowledge-task'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('routePointId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "routePointKnowledgeTask", null);
__decorate([
    (0, common_1.Post)('projects/:id/route-points/:routePointId/knowledge-task/complete'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('routePointId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "completeRoutePointKnowledgeTask", null);
__decorate([
    (0, common_1.Post)('projects/:id/route-points/:routePointId/station-steps/:stepId/complete'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('routePointId')),
    __param(3, (0, common_1.Param)('stepId')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "completeStationStep", null);
__decorate([
    (0, common_1.Get)('coupons'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "listMyCoupons", null);
__decorate([
    (0, common_1.Post)('projects/:id/route-points/:routePointId/station-steps/:stepId/game-play'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('routePointId')),
    __param(3, (0, common_1.Param)('stepId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "startStationGamePlay", null);
__decorate([
    (0, common_1.Get)('h5/game-play'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "h5GamePlay", null);
__decorate([
    (0, common_1.Post)('h5/game-result'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "h5GameResult", null);
__decorate([
    (0, common_1.Post)('bookings/:id/tour/early-exit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "earlyExitTour", null);
__decorate([
    (0, common_1.Post)('bookings/:id/tour/pause'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "pauseTour", null);
__decorate([
    (0, common_1.Post)('bookings/:id/tour/resume'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "resumeTour", null);


__decorate([
    (0, common_1.Get)('projects/:id/tour-mall'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "getTourMall", null);
__decorate([
    (0, common_1.Post)('projects/:id/tour-mall/redeem'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], StudyController.prototype, "redeemTourMall", null);

StudyController = __decorate([
    (0, swagger_1.ApiTags)("study"),
    (0, common_1.Controller)("study"),
    __metadata("design:paramtypes", [study_service_1.StudyService])
], StudyController);

exports.StudyController = StudyController;
