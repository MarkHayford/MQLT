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
exports.WechatBindDto = exports.WechatLoginDto = exports.RegisterDto = exports.ResetPasswordDto = exports.PhoneCodeLoginDto = exports.LoginDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '13800138000' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(11, 11),
    __metadata("design:type", String)
], LoginDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 64),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class PhoneCodeLoginDto {
}
exports.PhoneCodeLoginDto = PhoneCodeLoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '13800138000' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(11, 11),
    __metadata("design:type", String)
], PhoneCodeLoginDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    __metadata("design:type", String)
], PhoneCodeLoginDto.prototype, "smsCode", void 0);
class ResetPasswordDto extends PhoneCodeLoginDto {
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'newpass123' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 64),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);
class RegisterDto extends LoginDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '研学学员', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "nickname", void 0);
class WechatLoginDto {
}
exports.WechatLoginDto = WechatLoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'wx-login-code' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WechatLoginDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '研学学员', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WechatLoginDto.prototype, "nickname", void 0);
class WechatBindDto extends LoginDto {
}
exports.WechatBindDto = WechatBindDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'wechat-bind-token' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WechatBindDto.prototype, "bindToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 6),
    __metadata("design:type", String)
], WechatBindDto.prototype, "smsCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '研学学员', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WechatBindDto.prototype, "nickname", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '男', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WechatBindDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '北京市 北京市 东城区', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WechatBindDto.prototype, "region", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '第一实验小学', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WechatBindDto.prototype, "school", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '张三' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 30),
    __metadata("design:type", String)
], WechatBindDto.prototype, "realName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '110101199001011234' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(18, 18),
    __metadata("design:type", String)
], WechatBindDto.prototype, "idCard", void 0);

// password optional for wechat bind (password auth disabled)
__decorate([
    (0, swagger_1.ApiProperty)({ example: '', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 64),
    __metadata("design:type", String)
], WechatBindDto.prototype, "password", void 0);
//# sourceMappingURL=dto.js.map