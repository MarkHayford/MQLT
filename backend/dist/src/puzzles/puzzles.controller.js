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
exports.PuzzlesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const puzzles_service_1 = require("./puzzles.service");
let PuzzlesController = class PuzzlesController {
    constructor(puzzlesService) {
        this.puzzlesService = puzzlesService;
    }
    projects(user) {
        return this.puzzlesService.getProjects(user.sub);
    }
    backpack(user, projectId) {
        return this.puzzlesService.getProjectBackpack(user.sub, projectId);
    }
    pieceDetail(user, projectId, pieceId) {
        return this.puzzlesService.getPieceDetail(user.sub, projectId, pieceId);
    }
    checkIn(body) {
        return this.puzzlesService.checkIn(body);
    }
    achievements(user) {
        return this.puzzlesService.getAchievements(user.sub);
    }
};
exports.PuzzlesController = PuzzlesController;
__decorate([
    (0, common_1.Get)('projects'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PuzzlesController.prototype, "projects", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/backpack'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PuzzlesController.prototype, "backpack", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/pieces/:pieceId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('pieceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PuzzlesController.prototype, "pieceDetail", null);
__decorate([
    (0, common_1.Post)('check-in'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PuzzlesController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Get)('achievements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PuzzlesController.prototype, "achievements", null);
exports.PuzzlesController = PuzzlesController = __decorate([
    (0, swagger_1.ApiTags)('puzzles'),
    (0, common_1.Controller)('puzzles'),
    __metadata("design:paramtypes", [puzzles_service_1.PuzzlesService])
], PuzzlesController);
//# sourceMappingURL=puzzles.controller.js.map