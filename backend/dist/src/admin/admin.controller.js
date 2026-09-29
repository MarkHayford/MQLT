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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const admin_permissions_1 = require("./admin-permissions");
const admin_permissions_decorator_1 = require("./admin-permissions.decorator");
const admin_mall_service_1 = require("./admin-mall.service");
const admin_token_guard_1 = require("./admin-token.guard");
const admin_service_1 = require("./admin.service");
const study_service_1 = require("../study/study.service");
let AdminController = class AdminController {
    constructor(adminService, adminMallService, studyService) {
        this.adminService = adminService;
        this.adminMallService = adminMallService;
        this.studyService = studyService;
    }
    accessPolicy() {
        return {
            roles: admin_permissions_1.ADMIN_ROLE_OPTIONS,
            permissions: admin_permissions_1.ADMIN_PERMISSION_OPTIONS,
        };
    }
    overview() {
        return this.adminService.overview();
    }
    users(keyword, filter, page, pageSize) {
        return this.adminService.users(keyword, filter, page, pageSize);
    }
    createUser(body, req) {
        return this.adminService.createUser(body, this.canManageAccess(req), this.actorOf(req));
    }
    userDetail(id) {
        return this.adminService.userDetail(id);
    }
    userRecords(id, kind, page, pageSize) {
        return this.adminService.userRecords(id, kind, page, pageSize);
    }
    async updateUserRecord(userId, kind, id, body, req) {
        const actor = this.actorOf(req);
        if (String(kind) === 'orders') {
            await this.adminService.assertUserRecord(userId, 'orders', id);
            const result = await this.adminMallService.updateOrder(id, body || {}, actor);
            await this.adminService.writeOpLog(actor, { module: 'user', action: 'update', targetType: 'Order', targetId: id, targetLabel: userId, summary: '修改文创订单', detail: { userId } });
            return result;
        }
        return this.adminService.updateUserRecord(userId, kind, id, body || {}, actor);
    }
    async cancelUserRecord(userId, kind, id, req) {
        const actor = this.actorOf(req);
        if (String(kind) === 'orders') {
            await this.adminService.assertUserRecord(userId, 'orders', id);
            const result = await this.adminMallService.cancelOrder(id);
            await this.adminService.writeOpLog(actor, { module: 'user', action: 'cancel', targetType: 'Order', targetId: id, targetLabel: userId, summary: '取消文创订单', detail: { userId } });
            return result;
        }
        return this.adminService.cancelUserRecord(userId, kind, id, actor);
    }
    async deleteUserRecord(userId, kind, id, req) {
        const actor = this.actorOf(req);
        if (String(kind) === 'orders') {
            await this.adminService.assertUserRecord(userId, 'orders', id);
            const result = await this.adminMallService.deleteOrder(id);
            await this.adminService.writeOpLog(actor, { module: 'user', action: 'delete', targetType: 'Order', targetId: id, targetLabel: userId, summary: '删除文创订单', detail: { userId } });
            return result;
        }
        return this.adminService.deleteUserRecord(userId, kind, id, actor);
    }
    updateUser(id, body, req) {
        return this.adminService.updateUser(id, body, this.canManageAccess(req), this.actorOf(req));
    }
    uploadUserAvatar(id, file) {
        return this.adminService.uploadUserAvatar(id, file);
    }
    completeUserAvatar(id, body) {
        return this.adminService.completeUserAvatarUpload(id, body);
    }
    grantUserPoints(id, body) {
        return this.adminService.grantUserPoints(id, body);
    }
    deductUserPoints(id, body) {
        return this.adminService.deductUserPoints(id, body);
    }
    deleteUser(id, req) {
        return this.adminService.deleteUser(id, this.actorOf(req));
    }
    deleteUsers(body, req) {
        return this.adminService.deleteUsers((body && body.ids) || [], this.actorOf(req));
    }
    operationLogs(module, keyword, from, to, targetType, targetId, page, pageSize, enterpriseId, projectId, req) {
        return this.adminService.listOperationLogs({ module, keyword, from, to, targetType, targetId, page, pageSize, enterpriseId, projectId }, this.actorOf(req));
    }
    userOperationLogs(id, page, pageSize) {
        return this.adminService.listOperationLogs({ targetType: 'User', targetId: id, page, pageSize });
    }
    productOperationLogs(id, page, pageSize) {
        return this.adminService.listProductOperationLogs(id, { page, pageSize });
    }
    deleteOperationLog(id, req) {
        return this.adminService.deleteOperationLog(id, this.actorOf(req));
    }
    clearOperationLogs(body, req) {
        return this.adminService.clearOperationLogs(body || {}, this.actorOf(req));
    }
    deletePointRecord(id) {
        return this.adminService.deletePointRecord(id);
    }
    products(keyword, category, status, enterpriseId, req) {
        return this.adminMallService.products(keyword, category, status, this.actorOf(req), enterpriseId);
    }
    productCategories() {
        return this.adminMallService.productCategories();
    }
    createProduct(body, req) {
        return this.adminMallService.createProduct(body, this.actorOf(req));
    }
    uploadProductImage(file, oldUrl) {
        return this.adminMallService.uploadProductImage(file, oldUrl);
    }
    uploadStudyVideo(file, oldUrl) {
        return this.adminMallService.uploadStudyVideo(file, oldUrl);
    }
    uploadStudyGame(file, oldUrl) {
        return this.adminMallService.uploadStudyGame(file, oldUrl);
    }
    listStudyGames() {
        return this.adminMallService.listStudyGames();
    }
    purgeStorage(body) {
        return this.adminMallService.purgeManagedS3Urls((body && (body.urls || body.keys)) || []);
    }
    async listStudyProjectResources(id, type, req) {
        await this.adminService.assertProjectCapability(id, this.actorOf(req), 'project.resources');
        return this.adminMallService.listProjectResources(id, type);
    }
    async createStudyProjectResource(id, body, req) {
        await this.adminService.assertProjectCapability(id, this.actorOf(req), 'project.resources');
        return this.adminMallService.createProjectResource(id, body || {});
    }
    async updateStudyProjectResource(id, rid, body, req) {
        await this.adminService.assertProjectCapability(id, this.actorOf(req), 'project.resources');
        return this.adminMallService.updateProjectResource(id, rid, body || {});
    }
    async uploadStudyProjectResource(id, file, body, req) {
        await this.adminService.assertProjectCapability(id, this.actorOf(req), 'project.resources');
        return this.adminMallService.uploadProjectResourceFile(id, file, body || {});
    }
    async deleteStudyProjectResource(id, rid, req) {
        await this.adminService.assertProjectCapability(id, this.actorOf(req), 'project.resources');
        return this.adminMallService.deleteProjectResource(id, rid, false);
    }
    async listCertTemplates(id, req) {
        return this.adminService.listCertTemplates(id, this.actorOf(req));
    }
    async createCertTemplate(id, body, req) {
        return this.adminService.createCertTemplate(id, body || {}, this.actorOf(req));
    }
    async updateCertTemplate(id, tid, body, req) {
        return this.adminService.updateCertTemplate(id, tid, body || {}, this.actorOf(req));
    }
    async deleteCertTemplate(id, tid, req) {
        return this.adminService.deleteCertTemplate(id, tid, this.actorOf(req));
    }
    async getTourMallSettings(id, req) {
        return this.adminService.getTourMallSettings(id, this.actorOf(req));
    }
    async saveTourMallSettings(id, body, req) {
        return this.adminService.saveTourMallSettings(id, body || {}, this.actorOf(req));
    }
    async getAudienceTemplates(id, req) {
        return this.adminService.getAudienceTemplates(id, this.actorOf(req));
    }
    async saveAudienceTemplates(id, body, req) {
        return this.adminService.saveAudienceTemplates(id, body || {}, this.actorOf(req));
    }
    async getPuzzleSource(id, req) {
        return this.adminService.getPuzzleSource(id, this.actorOf(req));
    }
    async savePuzzleSource(id, body, req) {
        return this.adminService.savePuzzleSource(id, body || {}, this.actorOf(req));
    }

    async getStudyProjectContacts(id, req) {
        return this.adminService.getStudyProjectContacts(id, this.actorOf(req));
    }
    async saveStudyProjectContacts(id, body, req) {
        return this.adminService.saveStudyProjectContacts(id, body || {}, this.actorOf(req));
    }

    async listStudyScheduleDays(id, query, req) {
        return this.adminService.listScheduleDays(id, query || {}, this.actorOf(req));
    }
    async getStudyScheduleDay(id, date, req) {
        return this.adminService.getScheduleDay(id, date, this.actorOf(req));
    }
    async upsertStudyScheduleDay(id, body, req) {
        return this.adminService.upsertScheduleDay(id, body || {}, this.actorOf(req));
    }
    async batchStudyScheduleDays(id, body, req) {
        return this.adminService.batchSetScheduleDays(id, body || {}, this.actorOf(req));
    }
    async copyStudySchedule(id, body, req) {
        return this.adminService.copySchedule(id, body || {}, this.actorOf(req));
    }
    async listStudyScheduleLogs(id, query, req) {
        return this.adminService.listScheduleLogs(id, query || {}, this.actorOf(req));
    }
    async listStudyContentVersions(id, query, req) {
        return this.adminService.listContentVersions(id, query || {}, this.actorOf(req));
    }
    async createStudyContentVersion(id, body, req) {
        return this.adminService.createContentVersion(id, body || {}, this.actorOf(req));
    }
    async updateStudyContentVersion(id, versionId, body, req) {
        return this.adminService.updateContentVersion(id, versionId, body || {}, this.actorOf(req));
    }
    async deleteStudyContentVersion(id, versionId, req) {
        return this.adminService.deleteContentVersion(id, versionId, this.actorOf(req));
    }
    async snapshotStudyContentVersions(id, req) {
        return this.adminService.snapshotDefaultContentVersions(id, this.actorOf(req));
    }
    async seedStudySchedule(id, body, req) {
        return this.adminService.seedScheduleHorizon(id, this.actorOf(req), body || {});
    }

    async studyProjectLiveSummary(id, date, req) {
        const actor = this.actorOf(req);
        const summary = await this.adminService.studyProjectLiveSummary(id, date, actor);
        try {
            return await this.studyService.enrichLiveAttendeesProgress(summary);
        } catch (_e) {
            return summary;
        }
    }
    patchStudyProjectDayOps(id, body, req) {
        return this.adminService.patchStudyProjectDayOps(id, body || {}, this.actorOf(req));
    }
    async liveSkipStationStep(id, body, req) {
        const actor = this.actorOf(req);
        await this.adminService.assertProjectCapability(id, actor, 'project.live');
        const result = await this.studyService.adminSkipOrCompleteStationStep(id, body || {});
        try {
            await this.adminService.writeOpLog(actor, {
                module: 'study', action: 'update', targetType: 'StudyBooking',
                targetId: result.bookingId, targetLabel: result.participantName || result.bookingId,
                summary: result.mode === 'complete' ? '现场远程强制完成关卡' : '现场远程跳步',
                detail: { projectId: id, routePointId: result.routePointId, stepId: result.stepId, mode: result.mode },
                projectId: id,
            });
        } catch (_e) {}
        return result;
    }
    async liveForceEndStation(id, body, req) {
        const actor = this.actorOf(req);
        await this.adminService.assertProjectCapability(id, actor, 'project.live');
        const result = await this.studyService.adminForceEndStation(id, body || {});
        try {
            await this.adminService.writeOpLog(actor, {
                module: 'study', action: 'update', targetType: 'StudyBooking',
                targetId: result.bookingId, targetLabel: result.bookingId,
                summary: '现场远程结束站点',
                detail: { projectId: id, routePointId: result.routePointId, forcedSkipped: result.forcedSkipped },
                projectId: id,
            });
        } catch (_e) {}
        return result;
    }
    async liveSetGraduationUnlock(id, body, req) {
        const actor = this.actorOf(req);
        await this.adminService.assertProjectCapability(id, actor, 'project.live');
        const result = await this.studyService.adminSetGraduationUnlock(id, body || {});
        try {
            await this.adminService.writeOpLog(actor, {
                module: 'study', action: 'update', targetType: 'StudyBooking',
                targetId: result.bookingId, targetLabel: result.participantName || result.bookingId,
                summary: result.graduated ? '手动解锁结业/商城兑换' : '手动锁定结业兑换',
                detail: { projectId: id, graduated: result.graduated, mallRedeemUnlocked: result.mallRedeemUnlocked },
                projectId: id,
            });
        } catch (_e) {}
        return result;
    }
    async live18ProxyBooking(id, body, req) {
        return this.adminService.live18ProxyBooking(id, body || {}, this.actorOf(req));
    }
    async live18Reschedule(id, body, req) {
        return this.adminService.live18RescheduleBooking(id, body || {}, this.actorOf(req));
    }
    async live18Seats(id, body, req) {
        return this.adminService.live18AdjustSeats(id, body || {}, this.actorOf(req));
    }
    async live18Waitlist(id, body, req) {
        return this.adminService.live18Waitlist(id, body || {}, this.actorOf(req));
    }
    async live18ForceCheckIn(id, body, req) {
        return this.adminService.live18ForceCheckIn(id, body || {}, this.actorOf(req));
    }
    async live18NoshowRemind(id, body, req) {
        return this.adminService.live18NoshowRemind(id, body || {}, this.actorOf(req));
    }
    async live18TourFlags(id, body, req) {
        return this.adminService.live18SetTourFlags(id, body || {}, this.actorOf(req));
    }
    async live18Anomaly(id, body, req) {
        return this.adminService.live18Anomaly(id, body || {}, this.actorOf(req));
    }
    async live18PointsLedger(id, query, req) {
        return this.adminService.live18PointsLedger(id, query || {}, this.actorOf(req));
    }
    async live18AdjustPoints(id, body, req) {
        return this.adminService.live18AdjustPoints(id, body || {}, this.actorOf(req));
    }
    async live18Coupons(id, query, req) {
        return this.adminService.live18CouponsInspect(id, query || {}, this.actorOf(req));
    }
    async live18BatchCoupons(id, body, req) {
        return this.adminService.live18BatchIssueCoupons(id, body || {}, this.actorOf(req));
    }
    async live18UpdateCoupon(id, couponId, body, req) {
        return this.adminService.live18UpdateCouponExpiry(id, couponId, body || {}, this.actorOf(req));
    }
    async live18Cert(id, body, req) {
        return this.adminService.live18CertAction(id, body || {}, this.actorOf(req));
    }
    async live18Puzzle(id, body, req) {
        return this.adminService.live18PuzzlePiece(id, body || {}, this.actorOf(req));
    }
    async live18ScanLookup(id, body, req) {
        return this.adminService.live18ScanLookup(id, body || {}, this.actorOf(req));
    }


    async batchDeleteStudyProjectResources(id, body, req) {
        await this.adminService.assertProjectCapability(id, this.actorOf(req), 'project.resources');
        return this.adminMallService.batchDeleteProjectResources(id, (body && body.ids) || []);
    }
    productDetail(id) {
        return this.adminMallService.productDetail(id);
    }
    updateProduct(id, body, req) {
        return this.adminMallService.updateProduct(id, body, this.actorOf(req));
    }
    adjustProductStock(id, body, req) {
        return this.adminMallService.adjustStock(id, body, this.actorOf(req));
    }
    deleteProduct(id, req) {
        return this.adminMallService.deleteProduct(id, this.actorOf(req));
    }
    productComments(id, keyword, date, rating, status, page, pageSize) {
        return this.adminMallService.listProductComments(id, { keyword, date, rating, status, page, pageSize });
    }
    replyProductComment(id, body, req) {
        return this.adminMallService.replyProductComment(id, body, this.actorOf(req));
    }
    hideProductComment(id, commentId, req) {
        return this.adminMallService.hideProductComment(id, commentId, this.actorOf(req));
    }
    deleteProductComment(id, commentId, req) {
        return this.adminMallService.deleteProductComment(id, commentId, this.actorOf(req));
    }
    studyProjects(keyword, status, page, pageSize, enterpriseId, review, req) {
        return this.adminService.studyProjects(keyword, status, page, pageSize, this.actorOf(req), enterpriseId, review);
    }
    createStudyProject(body, req) {
        return this.adminService.createStudyProject(body || {}, this.actorOf(req));
    }
    studyProjectDetail(id, req) {
        return this.adminService.studyProjectDetail(id, this.actorOf(req));
    }
    reviewStudyProject(id, body, req) {
        return this.adminService.reviewStudyProject(id, body || {}, this.actorOf(req));
    }
    listEnterprises(keyword, req) {
        return this.adminService.listEnterprises(keyword, this.actorOf(req));
    }
    createEnterprise(body, req) {
        return this.adminService.createEnterprise(body || {}, this.actorOf(req));
    }
    enterpriseDetail(id, req) {
        return this.adminService.enterpriseDetail(id, this.actorOf(req));
    }
    updateEnterprise(id, body, req) {
        return this.adminService.updateEnterprise(id, body || {}, this.actorOf(req));
    }
    deleteEnterprise(id, req) {
        return this.adminService.deleteEnterprise(id, this.actorOf(req));
    }
    enterpriseFinance(id, month, kind, req) {
        return this.adminService.enterpriseFinance(id, { month, kind }, this.actorOf(req));
    }
    enterpriseFinanceDetail(id, kind, itemId, req) {
        return this.adminService.enterpriseFinanceDetail(id, { kind, itemId }, this.actorOf(req));
    }
    listPayoutAccounts(id, req) {
        return this.adminService.listPayoutAccounts(id, this.actorOf(req));
    }
    savePayoutAccount(id, body, req) {
        return this.adminService.savePayoutAccount(id, body || {}, this.actorOf(req));
    }
    deletePayoutAccount(id, accountId, req) {
        return this.adminService.deletePayoutAccount(id, accountId, this.actorOf(req));
    }
    listEnterpriseWithdrawals(id, req) {
        return this.adminService.listEnterpriseWithdrawals(id, this.actorOf(req));
    }
    applyEnterpriseWithdraw(id, body, req) {
        return this.adminService.applyEnterpriseWithdraw(id, body || {}, this.actorOf(req));
    }
    listPlatformEnterpriseWithdrawals(status, req) {
        return this.adminService.listPlatformEnterpriseWithdrawals(status, this.actorOf(req));
    }
    reviewEnterpriseWithdraw(id, body, req) {
        return this.adminService.reviewEnterpriseWithdraw(id, body || {}, this.actorOf(req));
    }
    platformFinance(month, req) {
        return this.adminService.platformFinance({ month }, this.actorOf(req));
    }
    commissionBoard(req) {
        return this.adminService.commissionBoard(this.actorOf(req));
    }
    saveCommissionDefaults(body, req) {
        return this.adminService.saveCommissionDefaults(body || {}, this.actorOf(req));
    }
    studyProjectProducts(id) {
        return this.adminService.studyProjectProducts(id);
    }
    setStudyProjectProducts(id, body, req) {
        return this.adminService.setStudyProjectProducts(id, (body && body.productIds) || [], this.actorOf(req));
    }
    updateStudyProject(id, body, req) {
        return this.adminService.updateStudyProject(id, body, this.actorOf(req));
    }
    deleteStudyProject(id, req) {
        return this.adminService.deleteStudyProject(id, this.actorOf(req));
    }
    studyProjectBookings(id) {
        return this.adminService.studyProjectBookings(id);
    }
    studyProjectCheckInCode(id) {
        return this.adminService.studyProjectCheckInCode(id);
    }
    studyProjectRoutePoints(id) {
        return this.adminService.studyProjectRoutePoints(id);
    }
    createStudyProjectRoutePoint(id, body, req) {
        return this.adminService.createStudyProjectRoutePoint(id, body || {}, this.actorOf(req));
    }
    updateStudyProjectRoutePoint(id, pointId, body, req) {
        return this.adminService.updateStudyProjectRoutePoint(id, pointId, body || {}, this.actorOf(req));
    }
    deleteStudyProjectRoutePoint(id, pointId, req) {
        return this.adminService.deleteStudyProjectRoutePoint(id, pointId, this.actorOf(req));
    }
    studyProjectDepartureSettings(id) {
        return this.adminService.studyProjectDepartureSettings(id);
    }
    updateStudyProjectDepartureSettings(id, body) {
        return this.adminService.updateStudyProjectDepartureSettings(id, body);
    }
    studyProjectRoutePointCheckInCode(id, pointId, req) {
        return this.adminService.studyProjectRoutePointCheckInCode(id, pointId, this.actorOf(req));
    }
    rotateStudyProjectRoutePointCheckInCode(id, pointId, req) {
        return this.adminService.rotateStudyProjectRoutePointCheckInCode(id, pointId, this.actorOf(req));
    }
    studyProjectOrganizers(id) {
        return this.adminService.studyProjectOrganizers(id);
    }
    addStudyProjectOrganizer(id, body) {
        return this.adminService.addStudyProjectOrganizer(id, body);
    }
    removeStudyProjectOrganizer(id, userId) {
        return this.adminService.removeStudyProjectOrganizer(id, userId);
    }
    studyProjectAdmins(id) {
        return this.adminService.studyProjectAdmins(id);
    }
    addStudyProjectAdmin(id, body) {
        return this.adminService.addStudyProjectAdmin(id, body);
    }
    removeStudyProjectAdmin(id, userId) {
        return this.adminService.removeStudyProjectAdmin(id, userId);
    }
    addStudyProjectUser(id, body) {
        return this.adminService.addStudyProjectUser(id, body);
    }
    addUserStudyProject(id, body) {
        return this.adminService.addUserStudyProject(id, body);
    }
    notices(keyword, projectId, page, pageSize, enterpriseId, kind, req) {
        return this.adminService.notices(keyword, projectId, page, pageSize, this.actorOf(req), enterpriseId, kind);
    }
    createNotice(body, req) {
        return this.adminService.createNotice(body, this.actorOf(req));
    }
    updateNotice(id, body, req) {
        return this.adminService.updateNotice(id, body, this.actorOf(req));
    }
    deleteNotice(id, req) {
        return this.adminService.deleteNotice(id, this.actorOf(req));
    }
    batchDeleteNotices(body, req) {
        return this.adminService.deleteNotices((body && body.ids) || [], this.actorOf(req));
    }
    listPublisherUnits(keyword, kind, page, pageSize, req) {
        return this.adminService.listPublisherUnits(keyword, kind, page, pageSize, this.actorOf(req));
    }
    updatePublisherUnit(kind, id, body, req) {
        return this.adminService.updatePublisherUnit(kind, id, body || {}, this.actorOf(req));
    }
    communityPosts(keyword, status, page, pageSize) {
        return this.adminService.communityPosts(keyword, status, page, pageSize);
    }
    createCommunityPost(body, req) {
        return this.adminService.createCommunityPost(body || {}, this.actorOf(req));
    }
    communityPostDetail(id) {
        return this.adminService.communityPostDetail(id);
    }
    updateCommunityPost(id, body, req) {
        return this.adminService.updateCommunityPost(id, body || {}, this.actorOf(req));
    }
    deleteCommunityPost(id, req) {
        return this.adminService.deleteCommunityPost(id, this.actorOf(req));
    }
    batchCommunityPosts(body, req) {
        return this.adminService.batchCommunityPosts(body || {}, this.actorOf(req));
    }
    contentReview(keyword, status, page, pageSize, req) {
        return this.adminService.contentReview(keyword, status, page, pageSize, this.actorOf(req));
    }
    batchContentReview(body, req) {
        return this.adminService.batchContentReview(body || {}, this.actorOf(req));
    }
    floatingNotices() {
        return this.adminService.floatingNotices();
    }
    createFloatingNotice(body) {
        return this.adminService.createFloatingNotice(body);
    }
    updateFloatingNotice(id, body) {
        return this.adminService.updateFloatingNotice(id, body);
    }
    deleteFloatingNotice(id) {
        return this.adminService.deleteFloatingNotice(id);
    }
    orders(status, keyword, enterpriseId, req) {
        return this.adminMallService.orders(status, keyword, this.actorOf(req), enterpriseId);
    }
    payOrder(id) {
        return this.adminMallService.payOrder(id);
    }
    shipOrder(id, body) {
        return this.adminMallService.shipOrder(id, body);
    }
    completeOrder(id, req) {
        return this.adminMallService.completeOrder(id, this.actorOf(req));
    }
    cancelOrder(id) {
        return this.adminMallService.cancelOrder(id);
    }
    orderDetail(id) {
        return this.adminMallService.orderDetail(id);
    }
    updateOrder(id, body, req) {
        return this.adminMallService.updateOrder(id, body, this.actorOf(req));
    }
    deleteOrder(id) {
        return this.adminMallService.deleteOrder(id);
    }
    batchDeleteOrders(body) {
        return this.adminMallService.deleteOrders((body && body.ids) || []);
    }
    bookings(status, keyword, projectId, filter, page, pageSize, appointmentDate, enterpriseId, req) {
        return this.adminService.bookings(status, keyword, projectId, filter, page, pageSize, this.actorOf(req), enterpriseId, appointmentDate);
    }
    updateBooking(id, body) {
        return this.adminService.updateBooking(id, body);
    }
    redeemBooking(id, body, req) {
        return this.adminService.redeemBookingCheckIn(id, body || {}, this.actorOf(req));
    }
    deleteBooking(id) {
        return this.adminService.deleteBooking(id);
    }
    batchDeleteBookings(body, req) {
        return this.adminService.deleteBookings((body && body.ids) || [], this.actorOf(req));
    }
    feedback(status) {
        return this.adminService.feedback(status);
    }
    updateFeedback(id, body) {
        return this.adminService.updateFeedback(id, body);
    }
    listInvoices(status, enterpriseId, scope, req) {
        return this.adminService.listInvoices(status, enterpriseId, scope, this.actorOf(req));
    }
    getInvoice(id, req) {
        return this.adminService.getInvoice(id, this.actorOf(req));
    }
    updateInvoice(id, body, req) {
        return this.adminService.updateInvoice(id, body || {}, this.actorOf(req));
    }
    autoIssueInvoice(id, req) {
        return this.adminService.autoIssueInvoice(id, this.actorOf(req));
    }
    platformSettings() {
        return this.adminService.getPlatformSettings();
    }
    savePlatformSettings(body, req) {
        return this.adminService.savePlatformSettings(body || {}, this.actorOf(req));
    }
    uploadSplashFile(file) {
        return this.adminService.uploadSplashFile(file);
    }
    listConsoleOperators() {
        return this.adminService.listConsoleOperators();
    }
    createConsoleOperator(body, req) {
        return this.adminService.createConsoleOperator(body || {}, this.actorOf(req));
    }
    updateConsoleOperator(id, body, req) {
        return this.adminService.updateConsoleOperator(id, body || {}, this.actorOf(req));
    }
    listMpStaff(req) {
        return this.adminService.listMpStaff(this.actorOf(req));
    }
    saveMpRoles(body, req) {
        return this.adminService.saveMpRoles(body || {}, this.actorOf(req));
    }
    createMpStaff(body, req) {
        return this.adminService.createMpStaff(body || {}, this.actorOf(req));
    }
    updateMpStaff(accountId, body, req) {
        return this.adminService.updateMpStaff(accountId, body || {}, this.actorOf(req));
    }
    deleteMpStaff(accountId, req) {
        return this.adminService.deleteMpStaff(accountId, this.actorOf(req));
    }
    deleteMpStaffs(body, req) {
        return this.adminService.deleteMpStaffs((body && body.ids) || [], this.actorOf(req));
    }
    listEnterpriseStaff(id, req) {
        return this.adminService.listEnterpriseStaff(id, this.actorOf(req));
    }
    saveEnterpriseRoles(id, body, req) {
        return this.adminService.saveEnterpriseRoles(id, body || {}, this.actorOf(req));
    }
    createEnterpriseStaff(id, body, req) {
        return this.adminService.createEnterpriseStaff(id, body || {}, this.actorOf(req));
    }
    updateEnterpriseStaff(id, accountId, body, req) {
        return this.adminService.updateEnterpriseStaff(id, accountId, body || {}, this.actorOf(req));
    }
    deleteEnterpriseStaff(id, accountId, req) {
        return this.adminService.deleteEnterpriseStaff(id, accountId, this.actorOf(req));
    }
    deleteEnterpriseStaffs(id, body, req) {
        return this.adminService.deleteEnterpriseStaffs(id, (body && body.ids) || [], this.actorOf(req));
    }
    drivers(keyword, status, city, page, pageSize) {
        return this.adminService.listDrivers(keyword, status, city, page, pageSize);
    }
    createDriver(body, req) {
        return this.adminService.createDriver(body || {}, this.actorOf(req));
    }
    updateDriver(id, body, req) {
        return this.adminService.updateDriver(id, body || {}, this.actorOf(req));
    }
    deleteDriver(id, req) {
        return this.adminService.deleteDriver(id, this.actorOf(req));
    }

    rentalOrders(status, keyword, page, pageSize) {
        return this.adminService.listRentalOrders(status, keyword, page, pageSize);
    }
    rentalOrderMessages(id) {
        return this.adminService.listRentalOrderMessages(id);
    }
    driverJobs(status, keyword, driverId, page, pageSize) {
        return this.adminService.listDriverJobs(status, keyword, driverId, page, pageSize);
    }
    updateDriverJob(id, body, req) {
        return this.adminService.updateDriverJob(id, body || {}, this.actorOf(req));
    }
    deleteDriverJob(id, req) {
        return this.adminService.deleteDriverJob(id, this.actorOf(req));
    }
    batchDeleteDriverJobs(body, req) {
        return this.adminService.deleteDriverJobs((body && body.ids) || [], this.actorOf(req));
    }
    driverWithdrawals(status, page, pageSize) {
        return this.adminService.listDriverWithdrawals(status, page, pageSize);
    }
    reviewDriverWithdraw(id, body, req) {
        return this.adminService.reviewDriverWithdraw(id, body || {}, this.actorOf(req));
    }
    batchReviewDriverWithdrawals(body, req) {
        return this.adminService.reviewDriverWithdraws((body && body.ids) || [], body || {}, this.actorOf(req));
    }
    deleteDriverWithdraw(id, req) {
        return this.adminService.deleteDriverWithdraw(id, this.actorOf(req));
    }
    batchDeleteDriverWithdrawals(body, req) {
        return this.adminService.deleteDriverWithdraws((body && body.ids) || [], this.actorOf(req));
    }
    canManageAccess(req) {
        return Boolean(req?.user?.adminPermissions?.includes(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE));
    }
    actorOf(req) {
        const user = (req && req.user) || {};
        const forwarded = req && req.headers ? (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) : '';
        return {
            actorId: String(user.sub || user.id || ''),
            actorName: String(user.name || user.realName || user.phone || '运维'),
            actorPhone: String(user.phone || ''),
            ip: String(forwarded || req.ip || '').split(',')[0].trim(),
            mpAccess: !!user.mpAccess,
            merchantAccess: !!user.merchantAccess,
            enterpriseId: user.enterpriseId ? String(user.enterpriseId) : '',
            adminPermissions: Array.isArray(user.adminPermissions) ? user.adminPermissions : [],
            merchantProjectIds: Array.isArray(user.merchantProjectIds) ? user.merchantProjectIds : [],
            mpEnterpriseIds: Array.isArray(user.mpEnterpriseIds) ? user.mpEnterpriseIds : [],
            mpProjectIds: Array.isArray(user.mpProjectIds) ? user.mpProjectIds : [],
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('access-policy'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "accessPolicy", null);
__decorate([
    (0, common_1.Get)('overview'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.OVERVIEW_READ),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_READ),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('filter')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "users", null);
__decorate([
    (0, common_1.Post)('users'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createUser", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "userDetail", null);
__decorate([
    (0, common_1.Get)('users/:id/records'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('kind')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "userRecords", null);
__decorate([
    (0, common_1.Put)('users/:userId/records/:kind/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateUserRecord", null);
__decorate([
    (0, common_1.Post)('users/:userId/records/:kind/:id/cancel'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "cancelUserRecord", null);
__decorate([
    (0, common_1.Delete)('users/:userId/records/:kind/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteUserRecord", null);
__decorate([
    (0, common_1.Put)('users/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Post)('users/:id/avatar'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "uploadUserAvatar", null);
__decorate([
    (0, common_1.Post)('users/:id/avatar/complete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "completeUserAvatar", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Post)('users/batch-delete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteUsers", null);
__decorate([
    (0, common_1.Get)('operation-logs'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.OVERVIEW_READ),
    __param(0, (0, common_1.Query)('module')),
    __param(1, (0, common_1.Query)('keyword')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('targetType')),
    __param(5, (0, common_1.Query)('targetId')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('pageSize')),
    __param(8, (0, common_1.Query)('enterpriseId')),
    __param(9, (0, common_1.Query)('projectId')),
    __param(10, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "operationLogs", null);
__decorate([
    (0, common_1.Get)('users/:id/operation-logs'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "userOperationLogs", null);
__decorate([
    (0, common_1.Get)('products/:id/operation-logs'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "productOperationLogs", null);
__decorate([
    (0, common_1.Delete)('operation-logs/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteOperationLog", null);
__decorate([
    (0, common_1.Post)('operation-logs/clear'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.USERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "clearOperationLogs", null);
__decorate([
    (0, common_1.Get)('products'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_READ),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('enterpriseId')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "products", null);
__decorate([
    (0, common_1.Get)('products/categories'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_READ),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "productCategories", null);
__decorate([
    (0, common_1.Post)('products'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Post)('products/images'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_MANAGE),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('oldUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "uploadProductImage", null);
__decorate([
    (0, common_1.Post)('study-projects/videos'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { dest: '/tmp', limits: { fileSize: 800 * 1024 * 1024 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('oldUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "uploadStudyVideo", null);
__decorate([
    (0, common_1.Post)('study-projects/games'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { dest: '/tmp', limits: { fileSize: 800 * 1024 * 1024 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('oldUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "uploadStudyGame", null);
__decorate([
    (0, common_1.Get)('study-projects/games'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listStudyGames", null);
__decorate([
    (0, common_1.Post)('storage/purge'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "purgeStorage", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/resources'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listStudyProjectResources", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/resources'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createStudyProjectResource", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/resources/upload'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { dest: '/tmp', limits: { fileSize: 800 * 1024 * 1024 } })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "uploadStudyProjectResource", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/resources/batch-delete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchDeleteStudyProjectResources", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/resources/:rid'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('rid')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateStudyProjectResource", null);
__decorate([
    (0, common_1.Delete)('study-projects/:id/resources/:rid'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('rid')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteStudyProjectResource", null);
__decorate([
    (0, common_1.Get)('products/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "productDetail", null);
__decorate([
    (0, common_1.Put)('products/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Post)('products/:id/stock-adjustments'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "adjustProductStock", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)('products/:id/comments'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('keyword')),
    __param(2, (0, common_1.Query)('date')),
    __param(3, (0, common_1.Query)('rating')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "productComments", null);
__decorate([
    (0, common_1.Post)('products/:id/comments'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "replyProductComment", null);
__decorate([
    (0, common_1.Post)('products/:id/comments/:commentId/hide'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "hideProductComment", null);
__decorate([
    (0, common_1.Delete)('products/:id/comments/:commentId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MALL_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteProductComment", null);
__decorate([
    (0, common_1.Get)('study-projects'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, common_1.Query)('enterpriseId')),
    __param(5, (0, common_1.Query)('review')),
    __param(6, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjects", null);
__decorate([
    (0, common_1.Post)('study-projects'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createStudyProject", null);
__decorate([
    (0, common_1.Get)('enterprises'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listEnterprises", null);
__decorate([
    (0, common_1.Post)('enterprises'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createEnterprise", null);
__decorate([
    (0, common_1.Get)('enterprises/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "enterpriseDetail", null);
__decorate([
    (0, common_1.Put)('enterprises/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateEnterprise", null);
__decorate([
    (0, common_1.Delete)('enterprises/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteEnterprise", null);
__decorate([
    (0, common_1.Get)('enterprises/:id/finance'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('kind')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "enterpriseFinance", null);
__decorate([
    (0, common_1.Get)('enterprises/:id/finance/:kind/:itemId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('itemId')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "enterpriseFinanceDetail", null);
__decorate([
    (0, common_1.Get)('enterprises/:id/payout-accounts'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listPayoutAccounts", null);
__decorate([
    (0, common_1.Post)('enterprises/:id/payout-accounts'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "savePayoutAccount", null);
__decorate([
    (0, common_1.Delete)('enterprises/:id/payout-accounts/:accountId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('accountId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deletePayoutAccount", null);
__decorate([
    (0, common_1.Get)('enterprises/:id/withdrawals'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listEnterpriseWithdrawals", null);
__decorate([
    (0, common_1.Post)('enterprises/:id/withdrawals'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "applyEnterpriseWithdraw", null);
__decorate([
    (0, common_1.Get)('enterprise-withdrawals'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listPlatformEnterpriseWithdrawals", null);
__decorate([
    (0, common_1.Post)('enterprise-withdrawals/:id/review'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reviewEnterpriseWithdraw", null);
__decorate([
    (0, common_1.Get)('finance/platform'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Query)('month')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "platformFinance", null);
__decorate([
    (0, common_1.Get)('commission'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "commissionBoard", null);
__decorate([
    (0, common_1.Put)('commission/defaults'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "saveCommissionDefaults", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/products'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjectProducts", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/products'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "setStudyProjectProducts", null);
__decorate([
    (0, common_1.Get)('study-projects/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjectDetail", null);
__decorate([
    (0, common_1.Put)('study-projects/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateStudyProject", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/review'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reviewStudyProject", null);
__decorate([
    (0, common_1.Delete)('study-projects/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteStudyProject", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/bookings'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjectBookings", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/check-in-code'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjectCheckInCode", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/route-points'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjectRoutePoints", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/route-points'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createStudyProjectRoutePoint", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/route-points/:pointId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('pointId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateStudyProjectRoutePoint", null);
__decorate([
    (0, common_1.Delete)('study-projects/:id/route-points/:pointId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('pointId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteStudyProjectRoutePoint", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/route-points/:pointId/check-in-code'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('pointId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjectRoutePointCheckInCode", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/route-points/:pointId/check-in-code/rotate'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('pointId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rotateStudyProjectRoutePointCheckInCode", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/organizers'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjectOrganizers", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/organizers'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addStudyProjectOrganizer", null);
__decorate([
    (0, common_1.Delete)('study-projects/:id/organizers/:userId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "removeStudyProjectOrganizer", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/admins'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjectAdmins", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/admins'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addStudyProjectAdmin", null);
__decorate([
    (0, common_1.Delete)('study-projects/:id/admins/:userId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "removeStudyProjectAdmin", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/bookings'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addStudyProjectUser", null);
__decorate([
    (0, common_1.Post)('users/:id/bookings'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addUserStudyProject", null);
__decorate([
    (0, common_1.Get)('notices'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('projectId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, common_1.Query)('enterpriseId')),
    __param(5, (0, common_1.Query)('kind')),
    __param(6, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "notices", null);
__decorate([
    (0, common_1.Post)('notices'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createNotice", null);
__decorate([
    (0, common_1.Put)('notices/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateNotice", null);
__decorate([
    (0, common_1.Delete)('notices/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteNotice", null);
__decorate([
    (0, common_1.Post)('notices/batch-delete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchDeleteNotices", null);
__decorate([
    (0, common_1.Get)('publisher-units'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MEDIA_CATS),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('kind')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listPublisherUnits", null);
__decorate([
    (0, common_1.Put)('publisher-units/:kind/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.MEDIA_CATS),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updatePublisherUnit", null);
__decorate([
    (0, common_1.Get)('community-posts'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "communityPosts", null);
__decorate([
    (0, common_1.Post)('community-posts'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createCommunityPost", null);
__decorate([
    (0, common_1.Get)('community-posts/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "communityPostDetail", null);
__decorate([
    (0, common_1.Put)('community-posts/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCommunityPost", null);
__decorate([
    (0, common_1.Delete)('community-posts/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteCommunityPost", null);
__decorate([
    (0, common_1.Post)('community-posts/batch'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchCommunityPosts", null);
__decorate([
    (0, common_1.Get)('content-review'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "contentReview", null);
__decorate([
    (0, common_1.Post)('content-review/batch'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchContentReview", null);
__decorate([
    (0, common_1.Get)('floating-notices'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "floatingNotices", null);
__decorate([
    (0, common_1.Post)('floating-notices'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createFloatingNotice", null);
__decorate([
    (0, common_1.Put)('floating-notices/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateFloatingNotice", null);
__decorate([
    (0, common_1.Delete)('floating-notices/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteFloatingNotice", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('keyword')),
    __param(2, (0, common_1.Query)('enterpriseId')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "orders", null);
__decorate([
    (0, common_1.Post)('orders/:id/pay'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "payOrder", null);
__decorate([
    (0, common_1.Post)('orders/:id/ship'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "shipOrder", null);
__decorate([
    (0, common_1.Post)('orders/:id/complete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "completeOrder", null);
__decorate([
    (0, common_1.Post)('orders/:id/cancel'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "cancelOrder", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "orderDetail", null);
__decorate([
    (0, common_1.Put)('orders/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateOrder", null);
__decorate([
    (0, common_1.Delete)('orders/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteOrder", null);
__decorate([
    (0, common_1.Post)('orders/batch-delete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchDeleteOrders", null);
__decorate([
    (0, common_1.Get)('bookings'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('keyword')),
    __param(2, (0, common_1.Query)('projectId')),
    __param(3, (0, common_1.Query)('filter')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('pageSize')),
    __param(6, (0, common_1.Query)('appointmentDate')),
    __param(7, (0, common_1.Query)('enterpriseId')),
    __param(8, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "bookings", null);
__decorate([
    (0, common_1.Put)('bookings/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateBooking", null);
__decorate([
    (0, common_1.Post)('bookings/:id/redeem'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "redeemBooking", null);
__decorate([
    (0, common_1.Delete)('bookings/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteBooking", null);
__decorate([
    (0, common_1.Post)('bookings/batch-delete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchDeleteBookings", null);
__decorate([
    (0, common_1.Get)('feedback'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.FEEDBACK_READ),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "feedback", null);
__decorate([
    (0, common_1.Put)('feedback/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.FEEDBACK_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateFeedback", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.INVOICE_READ),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('enterpriseId')),
    __param(2, (0, common_1.Query)('scope')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listInvoices", null);
__decorate([
    (0, common_1.Get)('invoices/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.INVOICE_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.Put)('invoices/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.INVOICE_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateInvoice", null);
__decorate([
    (0, common_1.Post)('invoices/:id/auto-issue'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.INVOICE_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "autoIssueInvoice", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "platformSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "savePlatformSettings", null);
__decorate([
    (0, common_1.Get)('operators'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listConsoleOperators", null);
__decorate([
    (0, common_1.Post)('operators'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createConsoleOperator", null);
__decorate([
    (0, common_1.Put)('operators/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateConsoleOperator", null);
__decorate([
    (0, common_1.Get)('mp-staff'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listMpStaff", null);
__decorate([
    (0, common_1.Put)('mp-roles'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "saveMpRoles", null);
__decorate([
    (0, common_1.Post)('mp-staff'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createMpStaff", null);
__decorate([
    (0, common_1.Put)('mp-staff/:accountId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __param(0, (0, common_1.Param)('accountId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateMpStaff", null);
__decorate([
    (0, common_1.Delete)('mp-staff/:accountId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __param(0, (0, common_1.Param)('accountId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteMpStaff", null);
__decorate([
    (0, common_1.Post)('mp-staff/batch-delete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ACCESS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteMpStaffs", null);
__decorate([
    (0, common_1.Get)('enterprises/:id/staff'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.OVERVIEW_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listEnterpriseStaff", null);
__decorate([
    (0, common_1.Put)('enterprises/:id/roles'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.OVERVIEW_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "saveEnterpriseRoles", null);
__decorate([
    (0, common_1.Post)('enterprises/:id/staff'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.OVERVIEW_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createEnterpriseStaff", null);
__decorate([
    (0, common_1.Put)('enterprises/:id/staff/:accountId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.OVERVIEW_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('accountId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateEnterpriseStaff", null);
__decorate([
    (0, common_1.Delete)('enterprises/:id/staff/:accountId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.OVERVIEW_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('accountId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteEnterpriseStaff", null);
__decorate([
    (0, common_1.Post)('enterprises/:id/staff/batch-delete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.OVERVIEW_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteEnterpriseStaffs", null);
__decorate([
    (0, common_1.Get)('drivers'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('city')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "drivers", null);
__decorate([
    (0, common_1.Post)('drivers'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createDriver", null);
__decorate([
    (0, common_1.Put)('drivers/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateDriver", null);
__decorate([
    (0, common_1.Delete)('drivers/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteDriver", null);

__decorate([
    (0, common_1.Get)('rental-orders'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('keyword')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rentalOrders", null);
__decorate([
    (0, common_1.Get)('rental-orders/:id/messages'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rentalOrderMessages", null);



__decorate([
    (0, common_1.Get)('driver-jobs'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('keyword')),
    __param(2, (0, common_1.Query)('driverId')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "driverJobs", null);
__decorate([
    (0, common_1.Put)('driver-jobs/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateDriverJob", null);
__decorate([
    (0, common_1.Delete)('driver-jobs/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteDriverJob", null);
__decorate([
    (0, common_1.Post)('driver-jobs/batch-delete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchDeleteDriverJobs", null);
__decorate([
    (0, common_1.Get)('driver-withdrawals'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "driverWithdrawals", null);
__decorate([
    (0, common_1.Post)('driver-withdrawals/:id/review'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reviewDriverWithdraw", null);
__decorate([
    (0, common_1.Post)('driver-withdrawals/batch-review'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchReviewDriverWithdrawals", null);
__decorate([
    (0, common_1.Delete)('driver-withdrawals/:id'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteDriverWithdraw", null);
__decorate([
    (0, common_1.Post)('driver-withdrawals/batch-delete'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchDeleteDriverWithdrawals", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/cert-templates'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listCertTemplates", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/cert-templates'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createCertTemplate", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/cert-templates/:tid'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('tid')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCertTemplate", null);
__decorate([
    (0, common_1.Delete)('study-projects/:id/cert-templates/:tid'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('tid')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteCertTemplate", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/tour-mall'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getTourMallSettings", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/tour-mall'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "saveTourMallSettings", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/audience-templates'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAudienceTemplates", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/audience-templates'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "saveAudienceTemplates", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/puzzle-source'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPuzzleSource", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/puzzle-source'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "savePuzzleSource", null);


__decorate([
    (0, common_1.Get)('study-projects/:id/contacts'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStudyProjectContacts", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/contacts'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "saveStudyProjectContacts", null);

__decorate([
    (0, common_1.Get)('study-projects/:id/schedule'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listStudyScheduleDays", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/schedule/day'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStudyScheduleDay", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/schedule/day'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "upsertStudyScheduleDay", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/schedule/batch'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "batchStudyScheduleDays", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/schedule/copy'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "copyStudySchedule", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/schedule/logs'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listStudyScheduleLogs", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/content-versions'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listStudyContentVersions", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/content-versions'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createStudyContentVersion", null);
__decorate([
    (0, common_1.Put)('study-projects/:id/content-versions/:versionId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('versionId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateStudyContentVersion", null);
__decorate([
    (0, common_1.Delete)('study-projects/:id/content-versions/:versionId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('versionId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteStudyContentVersion", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/content-versions/snapshot-defaults'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "snapshotStudyContentVersions", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/schedule/seed'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.STUDY_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "seedStudySchedule", null);

__decorate([
    (0, common_1.Get)('study-projects/:id/live'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "studyProjectLiveSummary", null);
__decorate([
    (0, common_1.Patch)('study-projects/:id/live/day-ops'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "patchStudyProjectDayOps", null);

__decorate([
    (0, common_1.Post)('study-projects/:id/live/skip-step'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "liveSkipStationStep", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/end-station'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "liveForceEndStation", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/graduation'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "liveSetGraduationUnlock", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/proxy-booking'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18ProxyBooking", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/reschedule'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18Reschedule", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/seats'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18Seats", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/waitlist'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18Waitlist", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/force-checkin'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18ForceCheckIn", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/noshow-remind'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18NoshowRemind", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/tour-flags'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18TourFlags", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/anomaly'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18Anomaly", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/live/points-ledger'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18PointsLedger", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/points-adjust'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18AdjustPoints", null);
__decorate([
    (0, common_1.Get)('study-projects/:id/live/coupons'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18Coupons", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/coupons/batch'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18BatchCoupons", null);
__decorate([
    (0, common_1.Patch)('study-projects/:id/live/coupons/:couponId'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('couponId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18UpdateCoupon", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/cert'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18Cert", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/puzzle'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18Puzzle", null);
__decorate([
    (0, common_1.Post)('study-projects/:id/live/scan-lookup'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.ORDERS_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "live18ScanLookup", null);
__decorate([
    (0, common_1.Post)('splash-file'),
    (0, admin_permissions_decorator_1.RequireAdminPermissions)(admin_permissions_1.ADMIN_PERMISSIONS.SETTINGS_MANAGE),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { dest: '/tmp', limits: { fileSize: 80 * 1024 * 1024 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "uploadSplashFile", null);


exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(admin_token_guard_1.AdminTokenGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        admin_mall_service_1.AdminMallService,
        study_service_1.StudyService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map