"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_mall_service_1 = require("./admin-mall.service");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const admin_token_guard_1 = require("./admin-token.guard");
const auth_module_1 = require("../auth/auth.module");
const study_module_1 = require("../study/study.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, study_module_1.StudyModule],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_service_1.AdminService, admin_mall_service_1.AdminMallService, admin_token_guard_1.AdminTokenGuard],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map