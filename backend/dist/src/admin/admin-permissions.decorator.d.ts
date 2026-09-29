import { AdminPermission } from './admin-permissions';
export declare const ADMIN_PERMISSIONS_KEY = "admin:permissions";
export declare function RequireAdminPermissions(...permissions: AdminPermission[]): import("@nestjs/common").CustomDecorator<string>;
