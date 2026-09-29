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
exports.MallController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const mall_service_1 = require("./mall.service");
let MallController = class MallController {
    constructor(mallService) {
        this.mallService = mallService;
    }
    products(projectId) {
        return this.mallService.getProducts(projectId);
    }
    productDetail(id) {
        return this.mallService.getProductDetail(id);
    }
    productComments(id, page, pageSize) {
        return this.mallService.listProductComments(id, false, { page, pageSize });
    }
    reviewAccess(user, id) {
        return this.mallService.getReviewAccess(user.sub, id);
    }
    createProductComment(user, id, body) {
        return this.mallService.createProductComment(user.sub, id, body);
    }
    productImage(filename, res) {
        return this.mallService.sendProductImage(filename, res);
    }
    cart(user) {
        return this.mallService.getCart(user.sub);
    }
    addCart(user, body) {
        return this.mallService.addCart(user.sub, body);
    }
    updateCart(user, itemId, body) {
        return this.mallService.updateCart(user.sub, itemId, body);
    }
    removeCart(user, itemId) {
        return this.mallService.removeCart(user.sub, itemId);
    }
    favorites(user) {
        return this.mallService.getFavorites(user.sub);
    }
    addFavorite(user, body) {
        return this.mallService.addFavorite(user.sub, body);
    }
    removeFavorite(user, productId) {
        return this.mallService.removeFavorite(user.sub, productId);
    }
};
exports.MallController = MallController;
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "products", null);
__decorate([
    (0, common_1.Get)('products/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "productDetail", null);
__decorate([
    (0, common_1.Get)('products/:id/comments'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "productComments", null);
__decorate([
    (0, common_1.Get)('products/:id/review-access'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "reviewAccess", null);
__decorate([
    (0, common_1.Post)('products/:id/comments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "createProductComment", null);
__decorate([
    (0, common_1.Get)('product-images/:filename'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "productImage", null);
__decorate([
    (0, common_1.Get)('cart'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "cart", null);
__decorate([
    (0, common_1.Post)('cart'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "addCart", null);
__decorate([
    (0, common_1.Put)('cart/:itemId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "updateCart", null);
__decorate([
    (0, common_1.Delete)('cart/:itemId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "removeCart", null);
__decorate([
    (0, common_1.Get)('favorites'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "favorites", null);
__decorate([
    (0, common_1.Post)('favorites'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "addFavorite", null);
__decorate([
    (0, common_1.Delete)('favorites/:productId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MallController.prototype, "removeFavorite", null);
exports.MallController = MallController = __decorate([
    (0, swagger_1.ApiTags)('mall'),
    (0, common_1.Controller)('mall'),
    __metadata("design:paramtypes", [mall_service_1.MallService])
], MallController);
//# sourceMappingURL=mall.controller.js.map
