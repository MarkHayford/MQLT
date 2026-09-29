import { PrismaService } from '../prisma/prisma.service';
export declare class PuzzlesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProjectBackpack(userId: string, projectId: string): Promise<{
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
    getProjects(userId: string): Promise<any[]>;
    getPieceDetail(userId: string, projectId: string, pieceId: string): Promise<{
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
    getAchievements(userId: string): Promise<any[]>;
    private serializeBackpackPrize;
    private serializeCertificate;
    private serializePuzzleProject;
    private isSeatBooking;
    private formatDate;
}
