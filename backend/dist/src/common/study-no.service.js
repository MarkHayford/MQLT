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
exports.StudyNoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const STUDY_NO_PREFIX = 'YX';
const STUDY_NO_DIGITS = 10;
const STUDY_NO_PATTERN = /^YX\d{10}$/;
const MAX_STUDY_NO_SEQUENCE = 9999999999;
let StudyNoService = class StudyNoService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalize(value) {
        const studyNo = String(value ?? '').trim().toUpperCase();
        if (!STUDY_NO_PATTERN.test(studyNo)) {
            throw new common_1.BadRequestException('研学号格式必须为 YX 加 10 位数字');
        }
        return studyNo;
    }
    isValid(value) {
        return STUDY_NO_PATTERN.test(String(value ?? '').trim().toUpperCase());
    }
    async issue() {
        for (let attempt = 0; attempt < 5; attempt++) {
            const studyNo = this.format(await this.nextSequenceValue());
            const existed = await this.prisma.user.findUnique({
                where: { studyNo },
                select: { id: true },
            });
            if (!existed)
                return studyNo;
        }
        throw new common_1.ConflictException('研学号生成冲突，请重试');
    }
    async nextSequenceValue() {
        const rows = await this.prisma.$queryRaw `
      SELECT nextval('study_no_seq')::text AS value
    `;
        const value = Number(rows[0]?.value ?? 0);
        if (!Number.isInteger(value) || value < 1 || value > MAX_STUDY_NO_SEQUENCE) {
            throw new common_1.ConflictException('研学号序列已超出可用范围');
        }
        return value;
    }
    format(sequence) {
        return `${STUDY_NO_PREFIX}${sequence.toString().padStart(STUDY_NO_DIGITS, '0')}`;
    }
};
exports.StudyNoService = StudyNoService;
exports.StudyNoService = StudyNoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudyNoService);
//# sourceMappingURL=study-no.service.js.map