import { type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AddressesService } from './addresses.service';
export declare class AddressesController {
    private readonly addressesService;
    constructor(addressesService: AddressesService);
    list(user: CurrentUserPayload): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        userId: string;
        receiver: string;
        province: string;
        city: string;
        district: string;
        detail: string;
        isDefault: boolean;
    }[]>;
    create(user: CurrentUserPayload, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        userId: string;
        receiver: string;
        province: string;
        city: string;
        district: string;
        detail: string;
        isDefault: boolean;
    }>;
    update(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        userId: string;
        receiver: string;
        province: string;
        city: string;
        district: string;
        detail: string;
        isDefault: boolean;
    }>;
    removeByPost(user: CurrentUserPayload, id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    remove(user: CurrentUserPayload, id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
}
