import { PrismaService } from '../prisma/prisma.service';
export declare class StudyNoService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    normalize(value: unknown): string;
    isValid(value: unknown): boolean;
    issue(): Promise<string>;
    private nextSequenceValue;
    private format;
}
