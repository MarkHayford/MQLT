import { type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PuzzlesService } from './puzzles.service';
export declare class PuzzlesController {
    private readonly puzzlesService;
    constructor(puzzlesService: PuzzlesService);
    projects(user: CurrentUserPayload): Promise<any[]>;
    backpack(user: CurrentUserPayload, projectId: string): Promise<{
        projectId: string;
        projectTitle: string;
        subtitle: string;
        gradientStart: string;
        gradientEnd: string;
        gridCols: number;
        gridRows: number;
        collectedCount: number;
        totalCount: number;
        completed: boolean;
        pieces: {
            id: any;
            name: any;
            icon: any;
            collected: boolean;
            collectedAt: any;
            routePointId: any;
            routePointTitle: any;
        }[];
        prizes: {
            id: any;
            productId: any;
            name: string;
            desc: string;
            icon: any;
            imageUrl: any;
            quantity: any;
            acquired: boolean;
            acquiredText: string;
            grantedAt: any;
            grantedByName: any;
        }[];
        certificate: {
            id: any;
            certificateNo: any;
            holderName: any;
            projectTitle: any;
            summary: any;
            issuedAt: any;
            issuedDate: string;
        } | null;
    }>;
    pieceDetail(user: CurrentUserPayload, projectId: string, pieceId: string): Promise<{
        projectId: string;
        pieceId: string;
        projectTitle: string;
        pieceName: string;
        icon: string;
        gradientStart: string;
        gradientEnd: string;
        collected: boolean;
        collectedTime: string;
        checkLocation: string;
        intro: string[];
        unlockTip: string;
        rewardTip: string;
    }>;
    checkIn(body: Record<string, unknown>): {
        checkedAt: string;
        unlocked: boolean;
    };
    achievements(user: CurrentUserPayload): Promise<any[]>;
}
