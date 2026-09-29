import { type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { TravelersService } from './travelers.service';
export declare class TravelersController {
    private readonly travelersService;
    constructor(travelersService: TravelersService);
    list(user: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string;
        idCard: string;
        userId: string;
        isSelf: boolean;
    }[]>;
    create(user: CurrentUserPayload, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string;
        idCard: string;
        userId: string;
        isSelf: boolean;
    }>;
    update(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string;
        idCard: string;
        userId: string;
        isSelf: boolean;
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
