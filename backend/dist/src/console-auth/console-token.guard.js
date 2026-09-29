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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleTokenGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
let ConsoleTokenGuard = class ConsoleTokenGuard {
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authorization = String(request.headers.authorization ?? "");
        const [type, token] = authorization.split(" ");
        if (type !== "Bearer" || !token)
            throw new common_1.UnauthorizedException("请先登录控制台");
        let payload;
        try {
            payload = this.jwtService.verify(token);
        }
        catch (_e) {
            throw new common_1.UnauthorizedException("登录已失效，请重新登录");
        }
        if (!payload || payload.typ !== "console" || !payload.sub)
            throw new common_1.UnauthorizedException("登录凭证无效");
        request.user = payload;
        return true;
    }
};
exports.ConsoleTokenGuard = ConsoleTokenGuard;
exports.ConsoleTokenGuard = ConsoleTokenGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], ConsoleTokenGuard);
