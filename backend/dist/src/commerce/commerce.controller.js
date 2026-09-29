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
exports.CommerceController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const commerce_service_1 = require("./commerce.service");

let CommerceController = class CommerceController {
    constructor(commerceService) {
        this.commerceService = commerceService;
    }
    getAccess(user) { return this.commerceService.getAccess(user.sub); }

    // enterprise
    enterpriseDashboard(user, enterpriseId) { return this.commerceService.getEnterpriseDashboard(user.sub, enterpriseId); }
    enterpriseLive(user, enterpriseId) { return this.commerceService.listEnterpriseLive(user.sub, enterpriseId); }
    enterprisePeople(user, enterpriseId, query) { return this.commerceService.listEnterprisePeople(user.sub, enterpriseId, query || {}); }
    enterpriseRevenue(user, enterpriseId) { return this.commerceService.getEnterpriseRevenue(user.sub, enterpriseId); }
    setZoneEnabled(user, enterpriseId, pointId, body) { return this.commerceService.setZoneEnabled(user.sub, enterpriseId, pointId, body?.enabled); }
    saveActivity(user, enterpriseId, body) { return this.commerceService.saveActivity(user.sub, enterpriseId, body || {}); }
    deleteActivity(user, enterpriseId, activityId) { return this.commerceService.deleteActivity(user.sub, enterpriseId, activityId); }
    replyReview(user, enterpriseId, reviewId, body) { return this.commerceService.replyReview(user.sub, enterpriseId, reviewId, body || {}); }

    enterpriseZones(user, enterpriseId) { return this.commerceService.getEnterpriseZones(user.sub, enterpriseId); }
    enterpriseZoneDetail(user, enterpriseId, pointId) { return this.commerceService.getEnterpriseZoneDetail(user.sub, enterpriseId, pointId); }
    saveEnterpriseZone(user, enterpriseId, body) { return this.commerceService.saveEnterpriseZone(user.sub, enterpriseId, body || {}); }
    deleteEnterpriseZone(user, enterpriseId, pointId) { return this.commerceService.deleteEnterpriseZone(user.sub, enterpriseId, pointId); }
    enterprisePrizes(user, enterpriseId) { return this.commerceService.getEnterprisePrizes(user.sub, enterpriseId); }
    grantPrize(user, enterpriseId, body) { return this.commerceService.grantEnterprisePrize(user.sub, enterpriseId, body || {}); }
    grantPoints(user, enterpriseId, body) { return this.commerceService.grantEnterprisePoints(user.sub, enterpriseId, body || {}); }
    personDetail(user, enterpriseId, bookingId) { return this.commerceService.getPersonDetail(user.sub, enterpriseId, bookingId); }
    personCheckIn(user, enterpriseId, bookingId, body) {
        return this.commerceService.checkInEnterprisePerson(user.sub, enterpriseId, bookingId, body?.action || 'checkin');
    }
    personPointCheckIn(user, enterpriseId, bookingId, pointId, body) {
        return this.commerceService.checkInEnterprisePersonPoint(user.sub, enterpriseId, bookingId, pointId, body?.action || 'checkin');
    }
    updateEnterprise(user, enterpriseId, body) { return this.commerceService.updateEnterpriseProfile(user.sub, enterpriseId, body || {}); }
    updateProject(user, enterpriseId, projectId, body) { return this.commerceService.updateEnterpriseProject(user.sub, enterpriseId, projectId, body || {}); }

    // driver
    driverHome(user) { return this.commerceService.getDriverHome(user.sub); }
    driverOnline(user, body) { return this.commerceService.setDriverOnline(user.sub, body || {}); }
    driverCity(user, body) { return this.commerceService.updateDriverCity(user.sub, body || {}); }
    acceptJob(user, jobId) { return this.commerceService.acceptJob(user.sub, jobId); }
    claimRentalOrder(user, id) { return this.commerceService.claimRentalOrder(user.sub, id); }
    releaseRentalOrder(user, id) { return this.commerceService.releaseRentalOrder(user.sub, id); }
    setRentalOfferedPrice(user, id, body) { return this.commerceService.setRentalOfferedPrice(user.sub, id, body || {}); }
    updateRentalOrderStatus(user, id, body) { return this.commerceService.updateRentalOrderStatus(user.sub, id, body || {}); }
    updateJobStatus(user, jobId, body) { return this.commerceService.updateJobStatus(user.sub, jobId, body || {}); }
    driverWallet(user) { return this.commerceService.getDriverWallet(user.sub); }
    driverWithdraw(user, body) { return this.commerceService.requestDriverWithdraw(user.sub, body || {}); }
    driverWithdrawals(user) { return this.commerceService.listDriverWithdrawals(user.sub); }

    // platform
    platformHome(user) { return this.commerceService.getPlatformHome(user.sub); }
    platformEnterprises(user) { return this.commerceService.listPlatformEnterprises(user.sub); }
    platformDrivers(user) { return this.commerceService.listPlatformDrivers(user.sub); }
    platformProjects(user) { return this.commerceService.listPlatformProjects(user.sub); }
    saveSetting(user, body) { return this.commerceService.savePlatformSetting(user.sub, body || {}); }
    platformCreateDriver(user, body) { return this.commerceService.platformCreateDriver(user.sub, body || {}); }
    platformUpdateDriver(user, driverId, body) { return this.commerceService.platformUpdateDriver(user.sub, driverId, body || {}); }
    platformUpdateEnterprise(user, enterpriseId, body) { return this.commerceService.platformUpdateEnterprise(user.sub, enterpriseId, body || {}); }
    platformUpdateProject(user, projectId, body) { return this.commerceService.platformUpdateProject(user.sub, projectId, body || {}); }
    platformUpdateUser(user, targetUserId, body) { return this.commerceService.platformUpdateUser(user.sub, targetUserId, body || {}); }
    platformUsers(user, query) { return this.commerceService.listPlatformUsers(user.sub, query || {}); }
    platformFeedback(user) { return this.commerceService.listPlatformFeedback(user.sub); }
    platformReplyFeedback(user, feedbackId, body) { return this.commerceService.replyPlatformFeedback(user.sub, feedbackId, body || {}); }
    platformNotices(user) { return this.commerceService.listPlatformNotices(user.sub); }
    platformSaveNotice(user, body) { return this.commerceService.savePlatformNotice(user.sub, body || {}); }
    platformDeleteNotice(user, noticeId) { return this.commerceService.deletePlatformNotice(user.sub, noticeId); }
};
exports.CommerceController = CommerceController;

function G(method, path, ...extra) {
    return function (proto, key, desc) {
        const list = [
            (0, common_1[method])(path),
            (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
            ...extra,
            __metadata("design:type", Function),
            __metadata("design:returntype", void 0),
        ];
        return __decorate(list, proto, key, desc);
    };
}

// Decorate manually with __decorate for each method - Nest needs proper param decorators
const CU = () => __param(0, (0, current_user_decorator_1.CurrentUser)());
const P = (name, idx) => __param(idx, (0, common_1.Param)(name));
const B = (idx) => __param(idx, (0, common_1.Body)());
const Q = (idx) => __param(idx, (0, common_1.Query)());
const UG = (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard);

function route(method, path, paramMeta, protoKey) {
    const decorators = [(0, common_1[method])(path), UG];
    for (let i = 0; i < paramMeta.length; i++) decorators.push(paramMeta[i]);
    decorators.push(__metadata("design:type", Function));
    decorators.push(__metadata("design:returntype", void 0));
    __decorate(decorators, CommerceController.prototype, protoKey, null);
}

route('Get', 'access', [CU()], 'getAccess');
route('Get', 'enterprise/:enterpriseId/dashboard', [CU(), P('enterpriseId', 1)], 'enterpriseDashboard');
route('Get', 'enterprise/:enterpriseId/live', [CU(), P('enterpriseId', 1)], 'enterpriseLive');
route('Get', 'enterprise/:enterpriseId/people', [CU(), P('enterpriseId', 1), Q(2)], 'enterprisePeople');
route('Get', 'enterprise/:enterpriseId/revenue', [CU(), P('enterpriseId', 1)], 'enterpriseRevenue');
route('Put', 'enterprise/:enterpriseId/zones/:pointId', [CU(), P('enterpriseId', 1), P('pointId', 2), B(3)], 'setZoneEnabled');
route('Post', 'enterprise/:enterpriseId/activities', [CU(), P('enterpriseId', 1), B(2)], 'saveActivity');
route('Delete', 'enterprise/:enterpriseId/activities/:activityId', [CU(), P('enterpriseId', 1), P('activityId', 2)], 'deleteActivity');
route('Post', 'enterprise/:enterpriseId/reviews/:reviewId/reply', [CU(), P('enterpriseId', 1), P('reviewId', 2), B(3)], 'replyReview');

route('Get', 'enterprise/:enterpriseId/zones', [CU(), P('enterpriseId', 1)], 'enterpriseZones');
route('Get', 'enterprise/:enterpriseId/zones/:pointId/detail', [CU(), P('enterpriseId', 1), P('pointId', 2)], 'enterpriseZoneDetail');
route('Post', 'enterprise/:enterpriseId/zones', [CU(), P('enterpriseId', 1), B(2)], 'saveEnterpriseZone');
route('Delete', 'enterprise/:enterpriseId/zones/:pointId', [CU(), P('enterpriseId', 1), P('pointId', 2)], 'deleteEnterpriseZone');
route('Get', 'enterprise/:enterpriseId/prizes', [CU(), P('enterpriseId', 1)], 'enterprisePrizes');
route('Post', 'enterprise/:enterpriseId/prizes/grant', [CU(), P('enterpriseId', 1), B(2)], 'grantPrize');
route('Post', 'enterprise/:enterpriseId/points/grant', [CU(), P('enterpriseId', 1), B(2)], 'grantPoints');
route('Get', 'enterprise/:enterpriseId/people/:bookingId', [CU(), P('enterpriseId', 1), P('bookingId', 2)], 'personDetail');
route('Post', 'enterprise/:enterpriseId/people/:bookingId/check-in', [CU(), P('enterpriseId', 1), P('bookingId', 2), B(3)], 'personCheckIn');
route('Post', 'enterprise/:enterpriseId/people/:bookingId/points/:pointId/check-in', [CU(), P('enterpriseId', 1), P('bookingId', 2), P('pointId', 3), B(4)], 'personPointCheckIn');
route('Put', 'enterprise/:enterpriseId/profile', [CU(), P('enterpriseId', 1), B(2)], 'updateEnterprise');
route('Put', 'enterprise/:enterpriseId/projects/:projectId', [CU(), P('enterpriseId', 1), P('projectId', 2), B(3)], 'updateProject');

route('Get', 'driver/home', [CU()], 'driverHome');
route('Post', 'driver/online', [CU(), B(1)], 'driverOnline');
route('Post', 'driver/city', [CU(), B(1)], 'driverCity');
route('Post', 'driver/jobs/:jobId/accept', [CU(), P('jobId', 1)], 'acceptJob');
route('Post', 'driver/rental/:id/claim', [CU(), P('id', 1)], 'claimRentalOrder');
route('Post', 'driver/rental/:id/release', [CU(), P('id', 1)], 'releaseRentalOrder');
route('Post', 'driver/rental/:id/offer', [CU(), P('id', 1), B(2)], 'setRentalOfferedPrice');
route('Post', 'driver/rental/:id/status', [CU(), P('id', 1), B(2)], 'updateRentalOrderStatus');
route('Post', 'driver/jobs/:jobId/status', [CU(), P('jobId', 1), B(2)], 'updateJobStatus');
route('Get', 'driver/wallet', [CU()], 'driverWallet');
route('Post', 'driver/withdraw', [CU(), B(1)], 'driverWithdraw');
route('Get', 'driver/withdrawals', [CU()], 'driverWithdrawals');

route('Get', 'platform/home', [CU()], 'platformHome');
route('Get', 'platform/enterprises', [CU()], 'platformEnterprises');
route('Get', 'platform/drivers', [CU()], 'platformDrivers');
route('Get', 'platform/projects', [CU()], 'platformProjects');
route('Post', 'platform/settings', [CU(), B(1)], 'saveSetting');
route('Post', 'platform/drivers', [CU(), B(1)], 'platformCreateDriver');
route('Put', 'platform/drivers/:driverId', [CU(), P('driverId', 1), B(2)], 'platformUpdateDriver');
route('Put', 'platform/enterprises/:enterpriseId', [CU(), P('enterpriseId', 1), B(2)], 'platformUpdateEnterprise');
route('Put', 'platform/projects/:projectId', [CU(), P('projectId', 1), B(2)], 'platformUpdateProject');
route('Get', 'platform/users', [CU(), Q(1)], 'platformUsers');
route('Put', 'platform/users/:targetUserId', [CU(), P('targetUserId', 1), B(2)], 'platformUpdateUser');
route('Get', 'platform/feedback', [CU()], 'platformFeedback');
route('Post', 'platform/feedback/:feedbackId/reply', [CU(), P('feedbackId', 1), B(2)], 'platformReplyFeedback');
route('Get', 'platform/notices', [CU()], 'platformNotices');
route('Post', 'platform/notices', [CU(), B(1)], 'platformSaveNotice');
route('Delete', 'platform/notices/:noticeId', [CU(), P('noticeId', 1)], 'platformDeleteNotice');

exports.CommerceController = CommerceController = __decorate([
    (0, common_1.Controller)('commerce'),
    __metadata("design:paramtypes", [commerce_service_1.CommerceService])
], CommerceController);
//# sourceMappingURL=commerce.controller.js.map
