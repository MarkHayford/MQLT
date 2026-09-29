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
    return function (target, key) { decorator(target, key, paramIndex); };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleAuthController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const console_auth_service_1 = require("./console-auth.service");
const console_token_guard_1 = require("./console-token.guard");
let ConsoleAuthController = class ConsoleAuthController {
    constructor(consoleAuthService) {
        this.consoleAuthService = consoleAuthService;
    }
    login(body) {
        return this.consoleAuthService.login(body);
    }
    me(user) {
        return this.consoleAuthService.me(user);
    }
    updateProfile(user, body) {
        return this.consoleAuthService.updateProfile(user, body);
    }
    changePassword(user, body) {
        return this.consoleAuthService.changePassword(user, body);
    }
    uploadAvatar(user, file) {
        return this.consoleAuthService.uploadAvatar(user, file);
    }
};
exports.ConsoleAuthController = ConsoleAuthController;
__decorate([
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsoleAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)("me"),
    (0, common_1.UseGuards)(console_token_guard_1.ConsoleTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsoleAuthController.prototype, "me", null);
__decorate([
    (0, common_1.Patch)("profile"),
    (0, common_1.UseGuards)(console_token_guard_1.ConsoleTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConsoleAuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)("password"),
    (0, common_1.UseGuards)(console_token_guard_1.ConsoleTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConsoleAuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)("avatar"),
    (0, common_1.UseGuards)(console_token_guard_1.ConsoleTokenGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConsoleAuthController.prototype, "uploadAvatar", null);
exports.ConsoleAuthController = ConsoleAuthController = __decorate([
    (0, swagger_1.ApiTags)("console-auth"),
    (0, common_1.Controller)("console/auth"),
    __metadata("design:paramtypes", [console_auth_service_1.ConsoleAuthService])
], ConsoleAuthController);
