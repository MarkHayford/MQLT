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
exports.CommunityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const community_service_1 = require("./community.service");
let CommunityController = class CommunityController {
    constructor(communityService) {
        this.communityService = communityService;
    }
    list(authorization, query) {
        return this.communityService.list(authorization, query || {});
    }
    mine(user, query) {
        return this.communityService.listMine(user.sub, query || {});
    }
    create(user, body) {
        return this.communityService.create(user.sub, body || {});
    }
    update(user, id, body) {
        return this.communityService.update(user.sub, id, body || {});
    }
    remove(user, id) {
        return this.communityService.remove(user.sub, id);
    }
    setPrivate(user, id) {
        return this.communityService.setPrivate(user.sub, id);
    }
    submit(user, id) {
        return this.communityService.submit(user.sub, id);
    }
    comments(id) {
        return this.communityService.listComments(id);
    }
    addComment(user, id, body) {
        return this.communityService.addComment(user.sub, id, body || {});
    }
    like(user, id) {
        return this.communityService.toggleLike(user.sub, id);
    }
    detail(authorization, id) {
        return this.communityService.detail(authorization, id);
    }
};
exports.CommunityController = CommunityController;
__decorate([
    (0, common_1.Get)("posts"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("posts/mine"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "mine", null);
__decorate([
    (0, common_1.Post)("posts"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "create", null);
__decorate([
    (0, common_1.Post)("posts/:id/update"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "update", null);
__decorate([
    (0, common_1.Post)("posts/:id/delete"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)("posts/:id/private"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "setPrivate", null);
__decorate([
    (0, common_1.Post)("posts/:id/submit"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)("posts/:id/comments"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "comments", null);
__decorate([
    (0, common_1.Post)("posts/:id/comments"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "addComment", null);
__decorate([
    (0, common_1.Post)("posts/:id/like"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "like", null);
__decorate([
    (0, common_1.Get)("posts/:id"),
    __param(0, (0, common_1.Headers)("authorization")),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "detail", null);
exports.CommunityController = CommunityController = __decorate([
    (0, swagger_1.ApiTags)("community"),
    (0, common_1.Controller)("community"),
    __metadata("design:paramtypes", [community_service_1.CommunityService])
], CommunityController);
//# sourceMappingURL=community.controller.js.map
