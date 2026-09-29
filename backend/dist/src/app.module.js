"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const addresses_module_1 = require("./addresses/addresses.module");
const admin_module_1 = require("./admin/admin.module");
const common_module_1 = require("./common/common.module");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./auth/auth.module");
const feedback_module_1 = require("./feedback/feedback.module");
const commerce_module_1 = require("./commerce/commerce.module");
const health_module_1 = require("./health/health.module");
const invoices_module_1 = require("./invoices/invoices.module");
const mall_module_1 = require("./mall/mall.module");
const orders_module_1 = require("./orders/orders.module");
const prisma_module_1 = require("./prisma/prisma.module");
const puzzles_module_1 = require("./puzzles/puzzles.module");
const study_module_1 = require("./study/study.module");
const travelers_module_1 = require("./travelers/travelers.module");
const users_module_1 = require("./users/users.module");
const storage_module_1 = require("./storage/storage.module");
const community_module_1 = require("./community/community.module");
const console_auth_module_1 = require("./console-auth/console-auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            common_module_1.CommonModule,
            health_module_1.HealthModule,
            admin_module_1.AdminModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            storage_module_1.StorageModule,
            addresses_module_1.AddressesModule,
            study_module_1.StudyModule,
            puzzles_module_1.PuzzlesModule,
            mall_module_1.MallModule,
            orders_module_1.OrdersModule,
            invoices_module_1.InvoicesModule,
            travelers_module_1.TravelersModule,
            feedback_module_1.FeedbackModule,
            commerce_module_1.CommerceModule,
            community_module_1.CommunityModule,
            console_auth_module_1.ConsoleAuthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map