import { AuthService } from './auth.service';
import { LoginDto, PhoneCodeLoginDto, RegisterDto, ResetPasswordDto, WechatBindDto, WechatLoginDto } from './dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            isAdmin: boolean;
            isSuperAdmin: boolean;
            adminRole: "NONE" | "SUPER_ADMIN" | "OPERATIONS_DIRECTOR" | "STUDY_OPERATOR" | "MALL_OPERATOR" | "ORDER_OPERATOR" | "USER_OPERATOR" | "SERVICE_AGENT" | "OBSERVER";
            adminRoleLabel: "普通账号" | "超级管理员" | "运营总监" | "研学运营" | "商城运营" | "订单履约" | "用户运营" | "客服" | "只读观察员";
            adminPermissions: import("../admin/admin-permissions").AdminPermission[];
            id: string;
            phone: string;
            openId: string;
            nickname: string;
            points: number;
            studyNo: string;
        };
    }>;
    loginByCode(dto: PhoneCodeLoginDto): Promise<{
        accessToken: string;
        user: {
            isAdmin: boolean;
            isSuperAdmin: boolean;
            adminRole: "NONE" | "SUPER_ADMIN" | "OPERATIONS_DIRECTOR" | "STUDY_OPERATOR" | "MALL_OPERATOR" | "ORDER_OPERATOR" | "USER_OPERATOR" | "SERVICE_AGENT" | "OBSERVER";
            adminRoleLabel: "普通账号" | "超级管理员" | "运营总监" | "研学运营" | "商城运营" | "订单履约" | "用户运营" | "客服" | "只读观察员";
            adminPermissions: import("../admin/admin-permissions").AdminPermission[];
            id: string;
            phone: string;
            openId: string;
            nickname: string;
            points: number;
            studyNo: string;
        };
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
    }>;
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: {
            isAdmin: boolean;
            isSuperAdmin: boolean;
            adminRole: "NONE" | "SUPER_ADMIN" | "OPERATIONS_DIRECTOR" | "STUDY_OPERATOR" | "MALL_OPERATOR" | "ORDER_OPERATOR" | "USER_OPERATOR" | "SERVICE_AGENT" | "OBSERVER";
            adminRoleLabel: "普通账号" | "超级管理员" | "运营总监" | "研学运营" | "商城运营" | "订单履约" | "用户运营" | "客服" | "只读观察员";
            adminPermissions: import("../admin/admin-permissions").AdminPermission[];
            id: string;
            phone: string;
            openId: string;
            nickname: string;
            points: number;
            studyNo: string;
        };
    }>;
    wechatLogin(dto: WechatLoginDto): Promise<{
        requiresBinding: boolean;
        auth: {
            accessToken: string;
            user: {
                isAdmin: boolean;
                isSuperAdmin: boolean;
                adminRole: "NONE" | "SUPER_ADMIN" | "OPERATIONS_DIRECTOR" | "STUDY_OPERATOR" | "MALL_OPERATOR" | "ORDER_OPERATOR" | "USER_OPERATOR" | "SERVICE_AGENT" | "OBSERVER";
                adminRoleLabel: "普通账号" | "超级管理员" | "运营总监" | "研学运营" | "商城运营" | "订单履约" | "用户运营" | "客服" | "只读观察员";
                adminPermissions: import("../admin/admin-permissions").AdminPermission[];
                id: string;
                phone: string;
                openId: string;
                nickname: string;
                points: number;
                studyNo: string;
            };
        };
        bindToken?: undefined;
    } | {
        requiresBinding: boolean;
        bindToken: string;
        auth?: undefined;
    }>;
    wechatBind(dto: WechatBindDto): Promise<{
        accessToken: string;
        user: {
            isAdmin: boolean;
            isSuperAdmin: boolean;
            adminRole: "NONE" | "SUPER_ADMIN" | "OPERATIONS_DIRECTOR" | "STUDY_OPERATOR" | "MALL_OPERATOR" | "ORDER_OPERATOR" | "USER_OPERATOR" | "SERVICE_AGENT" | "OBSERVER";
            adminRoleLabel: "普通账号" | "超级管理员" | "运营总监" | "研学运营" | "商城运营" | "订单履约" | "用户运营" | "客服" | "只读观察员";
            adminPermissions: import("../admin/admin-permissions").AdminPermission[];
            id: string;
            phone: string;
            openId: string;
            nickname: string;
            points: number;
            studyNo: string;
        };
    }>;
    logout(): {
        success: boolean;
    };
}
