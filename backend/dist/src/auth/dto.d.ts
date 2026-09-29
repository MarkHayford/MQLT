export declare class LoginDto {
    phone: string;
    password: string;
}
export declare class PhoneCodeLoginDto {
    phone: string;
    smsCode: string;
}
export declare class ResetPasswordDto extends PhoneCodeLoginDto {
    newPassword: string;
}
export declare class RegisterDto extends LoginDto {
    nickname?: string;
}
export declare class WechatLoginDto {
    code: string;
    nickname?: string;
}
export declare class WechatBindDto extends LoginDto {
    bindToken: string;
    smsCode: string;
    nickname?: string;
    gender: string;
    region?: string;
    school?: string;
    realName?: string;
    idCard?: string;
}
