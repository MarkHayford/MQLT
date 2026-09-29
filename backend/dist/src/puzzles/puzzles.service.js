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
exports.PuzzlesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let PuzzlesService = class PuzzlesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProjectBackpack(userId, projectId) {
        const [project, bookingRaw, projectAdmin, projectOrganizer] = await Promise.all([
            this.prisma.studyProject.findUnique({ where: { id: projectId } }),
            this.prisma.studyBooking.findFirst({
                where: {
                    projectId,
                    userId,
                    userDeletedAt: null,
                    status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.studyProjectAdmin.findUnique({
                where: { projectId_userId: { projectId, userId } },
            }),
            this.prisma.studyProjectOrganizer.findUnique({
                where: { projectId_userId: { projectId, userId } },
            }),
        ]);
        if (!project)
            throw new common_1.NotFoundException('研学项目不存在');
        const canView = bookingRaw != null || projectAdmin != null || projectOrganizer != null;
        if (!canView)
            throw new common_1.ForbiddenException('当前用户不能查看该研学背包');

        // 同行人订单可能没写 tripPlan，从同组发起人补（不可对 const 解构结果再赋值）
        let booking = bookingRaw;
        if (booking != null) {
            booking = await this.resolveBookingWithTrip(booking);
        }

        // 只按用户预约行程里的研学点拼图；接待/离场等服务点不算；空行程不回退全目录
        const selectedIds = this.readTripSpotIds(booking);
        const allPoints = await this.prisma.studyRoutePoint.findMany({
            where: { projectId, enabled: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        const studyPoints = allPoints.filter((rp) => !this.isServiceRoutePoint(rp));
        const pointById = {};
        for (let i = 0; i < studyPoints.length; i++)
            pointById[studyPoints[i].id] = studyPoints[i];
        const pointByZone = {};
        for (let i = 0; i < studyPoints.length; i++) {
            const m = String(studyPoints[i].description ?? '').match(/\[zoneId=([^\]]+)\]/);
            if (m)
                pointByZone[m[1]] = studyPoints[i];
        }

        let targetPoints = [];
        if (selectedIds.length > 0) {
            for (let i = 0; i < selectedIds.length; i++) {
                const sid = selectedIds[i];
                const hit = pointById[sid] || pointByZone[sid] || null;
                if (hit != null && !this.isServiceRoutePoint(hit))
                    targetPoints.push(hit);
            }
        }
        // 有预约但行程为空：拼图为空，提示重新选点；管理员无行程可看空板

        const checkIns = booking != null && this.isSeatBooking(booking)
            ? await this.prisma.studyRoutePointCheckIn.findMany({
                where: { bookingId: booking.id, projectId },
            })
            : [];
        const checkInByRoutePointId = {};
        for (let i = 0; i < checkIns.length; i++)
            checkInByRoutePointId[checkIns[i].routePointId] = checkIns[i];

        const catalog = this.getZoneCatalogMeta();
        const pieces = [];
        for (let i = 0; i < targetPoints.length; i++) {
            const rp = targetPoints[i];
            const zoneMeta = this.resolveZoneMeta(rp, catalog);
            const checkIn = checkInByRoutePointId[rp.id] ?? null;
            pieces.push({
                id: (i + 1).toString(),
                name: zoneMeta.name,
                icon: zoneMeta.icon,
                collected: checkIn != null,
                collectedAt: checkIn != null ? checkIn.checkedInAt.toISOString() : null,
                routePointId: rp.id,
                routePointTitle: rp.title,
            });
        }

        const collectedCount = pieces.filter((piece) => piece.collected).length;
        const totalCount = pieces.length;
        const grid = this.calcPuzzleGrid(totalCount);

        const prizeGrants = booking != null && this.isSeatBooking(booking)
            ? await this.prisma.studyPrizeGrant.findMany({
                where: {
                    projectId,
                    bookingId: booking.id,
                    userId,
                },
                include: {
                    product: true,
                    grantedBy: true,
                },
                orderBy: { grantedAt: 'desc' },
            })
            : [];
        const certificate = booking != null
            ? await this.prisma.studyCertificate.findUnique({ where: { bookingId: booking.id } })
            : null;

        const dayCount = this.readTripDayCount(booking);
        const subtitle = totalCount > 0
            ? ('你的行程 ' + totalCount.toString() + ' 站' + (dayCount > 1 ? (' · ' + dayCount.toString() + ' 天') : '') + '，打卡收集拼图')
            : (booking != null ? '行程点位未写入，请重新预约选择研学点' : '完成点位打卡后收集拼图');

        return {
            projectId,
            projectTitle: project.title,
            subtitle,
            // 小程序主题色，不再用项目金色
            gradientStart: '#1C384A',
            gradientEnd: '#3F6782',
            gridCols: grid.cols,
            gridRows: grid.rows,
            collectedCount,
            totalCount,
            completed: totalCount > 0 && collectedCount >= totalCount,
            pieces,
            prizes: prizeGrants.map((grant) => this.serializeBackpackPrize(grant)),
            certificate: this.serializeCertificate(certificate),
        };
    }

    readTripSpotIds(booking) {
        if (booking == null || booking.tripPlan == null)
            return [];
        let plan = booking.tripPlan;
        if (typeof plan === 'string') {
            try {
                plan = JSON.parse(plan);
            }
            catch (_e) {
                return [];
            }
        }
        if (plan == null || typeof plan !== 'object')
            return [];
        const days = Array.isArray(plan.days) ? plan.days : [];
        const ids = [];
        for (let i = 0; i < days.length; i++) {
            const d = days[i] || {};
            const raw = Array.isArray(d.spotIds) ? d.spotIds : (Array.isArray(d.routePointIds) ? d.routePointIds : []);
            for (let j = 0; j < raw.length; j++) {
                const id = String(raw[j] ?? '').trim();
                if (id.length > 0 && ids.indexOf(id) < 0)
                    ids.push(id);
            }
        }
        return ids;
    }

    readTripDayCount(booking) {
        if (booking == null || booking.tripPlan == null)
            return 0;
        let plan = booking.tripPlan;
        if (typeof plan === 'string') {
            try {
                plan = JSON.parse(plan);
            }
            catch (_e) {
                return 0;
            }
        }
        if (plan == null || typeof plan !== 'object')
            return 0;
        if (Array.isArray(plan.dayKeys))
            return plan.dayKeys.length;
        if (Array.isArray(plan.days))
            return plan.days.length;
        return 0;
    }

    calcPuzzleGrid(total) {
        if (total <= 0)
            return { cols: 2, rows: 2 };
        if (total <= 2)
            return { cols: total, rows: 1 };
        if (total <= 4)
            return { cols: 2, rows: 2 };
        if (total <= 6)
            return { cols: 3, rows: 2 };
        if (total <= 9)
            return { cols: 3, rows: 3 };
        const cols = 3;
        const rows = Math.ceil(total / cols);
        return { cols, rows };
    }

    getZoneCatalogMeta() {
        return {
            zone_family_playground: { name: '童趣工坊', icon: '/static/icon-puzzle.svg' },
            zone_family_farm: { name: '小小牧场', icon: '/static/icon-cow.svg' },
            zone_family_science: { name: '奇妙科学角', icon: '/static/icon-lab.svg' },
            zone_college_career: { name: '职业启航', icon: '/static/icon-cap.svg' },
            zone_college_lab: { name: '创新实验室', icon: '/static/icon-telescope.svg' },
            zone_college_forum: { name: '学长对谈', icon: '/static/icon-book.svg' },
            zone_biz_showcase: { name: '品牌展陈', icon: '/static/icon-building.svg' },
            zone_biz_smart: { name: '智慧产线', icon: '/static/icon-factory.svg' },
            zone_biz_meeting: { name: '商务会晤', icon: '/static/icon-cup.svg' },
        };
    }

    resolveZoneMeta(routePoint, catalog) {
        const tag = String(routePoint.description ?? '').match(/\[zoneId=([^\]]+)\]/);
        const zoneId = tag ? tag[1] : routePoint.id;
        if (catalog[zoneId] != null)
            return catalog[zoneId];
        if (catalog[routePoint.id] != null)
            return catalog[routePoint.id];
        // title fallback
        const title = String(routePoint.title ?? '探索点');
        return { name: title, icon: '/static/icon-puzzle.svg' };
    }
    async getProjects(userId) {
        const projects = await this.prisma.puzzleProject.findMany({
            where: {
                project: {
                    status: { in: ['正在进行中', '已结束'] },
                    bookings: {
                        some: {
                            userId,
                            userDeletedAt: null,
                            status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
                        },
                    },
                },
            },
            include: { project: true, pieces: { orderBy: { pieceNo: 'asc' } } },
            orderBy: { projectId: 'asc' },
        });
        const result = [];
        for (const project of projects) {
            result.push(await this.serializePuzzleProject(project, userId));
        }
        return result;
    }
    async getPieceDetail(userId, projectId, pieceId) {
        const puzzleProject = await this.prisma.puzzleProject.findUnique({
            where: { projectId },
            include: { project: true },
        });
        if (!puzzleProject)
            throw new common_1.NotFoundException('Puzzle project not found');
        if (puzzleProject.project.status !== '正在进行中' && puzzleProject.project.status !== '已结束') {
            throw new common_1.ForbiddenException('Puzzle project is not active');
        }
        const booking = await this.prisma.studyBooking.findFirst({
            where: {
                userId,
                projectId,
                userDeletedAt: null,
                status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
            },
            select: { id: true, participantRole: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!booking)
            throw new common_1.ForbiddenException('Puzzle project is not available for this user');
        const piece = await this.prisma.puzzlePiece.findFirst({
            where: { puzzleProjectId: puzzleProject.id, pieceNo: Number(pieceId) },
        });
        if (!piece)
            throw new common_1.NotFoundException('Puzzle piece not found');
        const routePoints = await this.prisma.studyRoutePoint.findMany({
            where: { projectId, enabled: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        const routePoint = routePoints[Math.max(0, piece.pieceNo - 1)] ?? null;
        const checkIn = routePoint != null && this.isSeatBooking(booking)
            ? await this.prisma.studyRoutePointCheckIn.findUnique({
                where: {
                    bookingId_routePointId: {
                        bookingId: booking.id,
                        routePointId: routePoint.id,
                    },
                },
            })
            : null;
        const checkLocation = routePoint != null
            ? `${puzzleProject.project.title} · ${routePoint.title}`
            : `${puzzleProject.project.title} · ${piece.name} 打卡点`;
        return {
            projectId,
            pieceId: piece.pieceNo.toString(),
            projectTitle: puzzleProject.project.title,
            pieceName: piece.name,
            icon: piece.icon,
            gradientStart: puzzleProject.project.gradientStart,
            gradientEnd: puzzleProject.project.gradientEnd,
            collected: checkIn != null,
            collectedTime: checkIn != null ? this.formatDate(checkIn.checkedInAt) : '',
            checkLocation,
            intro: [
                `${piece.name}是「${puzzleProject.project.title}」拼图中的第 ${piece.pieceNo} 块。`,
                '完成对应研学打卡任务后，即可点亮此拼图并计入项目收集进度。',
            ],
            unlockTip: routePoint != null
                ? `参与「${puzzleProject.project.title}」，在「${routePoint.title}」完成签到即可解锁。`
                : `参与「${puzzleProject.project.title}」，完成对应打卡点签到即可解锁。`,
            rewardTip: `集齐 ${puzzleProject.gridCols}×${puzzleProject.gridRows} 全部拼图可解锁项目纪念奖励。`,
        };
    }
    checkIn(body) {
        return {
            unlocked: true,
            ...body,
            checkedAt: new Date().toISOString(),
        };
    }
    async getAchievements(userId) {
        const certificates = await this.prisma.studyCertificate.findMany({
            where: { userId },
            include: {
                project: {
                    include: { puzzle: true },
                },
                booking: true,
            },
            orderBy: { issuedAt: 'desc' },
        });
        const result = [];
        for (const certificate of certificates) {
            const prizeGrants = await this.prisma.studyPrizeGrant.findMany({
                where: {
                    projectId: certificate.projectId,
                    bookingId: certificate.bookingId,
                    userId,
                },
                include: { product: true },
                orderBy: { grantedAt: 'desc' },
            });
            const rewards = prizeGrants.length > 0
                ? prizeGrants.map((grant) => {
                    const quantityText = grant.quantity > 1 ? ` x${grant.quantity}` : '';
                    return `${grant.product?.name ?? '研学奖品'}${quantityText}`;
                })
                : ['研学结业证书'];
            result.push({
                projectId: certificate.projectId,
                projectTitle: certificate.projectTitle,
                gradientStart: certificate.project.gradientStart,
                gradientEnd: certificate.project.gradientEnd,
                badgeIcon: '/static/icon-certificate.svg',
                completedDate: this.formatDate(certificate.issuedAt),
                certificateNo: certificate.certificateNo,
                holderName: certificate.holderName,
                issuedAt: certificate.issuedAt,
                summary: certificate.summary,
                highlights: [
                    '完成项目研学流程',
                    '完成项目成果归档',
                    '获得研学结业证书',
                ],
                rewards,
            });
        }
        return result;
    }
    serializeBackpackPrize(grant) {
        const product = grant.product ?? {};
        const grantedAt = grant.grantedAt instanceof Date ? grant.grantedAt.toISOString().slice(0, 10) : '';
        const quantityText = grant.quantity > 1 ? ` x${grant.quantity}` : '';
        const note = String(grant.note ?? '').trim();
        return {
            id: grant.id,
            productId: grant.productId,
            name: `${product.name ?? '研学奖品'}${quantityText}`,
            desc: note.length > 0 ? note : `管理员于 ${grantedAt} 发放`,
            icon: product.imageUrl || product.icon || '/static/icon-package.svg',
            imageUrl: product.imageUrl ?? '',
            quantity: grant.quantity,
            acquired: true,
            acquiredText: '已获得',
            grantedAt: grant.grantedAt,
            grantedByName: grant.grantedBy?.nickname ?? '',
        };
    }
    serializeCertificate(certificate) {
        if (certificate == null)
            return null;
        return {
            id: certificate.id,
            certificateNo: certificate.certificateNo,
            holderName: certificate.holderName,
            projectTitle: certificate.projectTitle,
            summary: certificate.summary,
            issuedAt: certificate.issuedAt,
            issuedDate: this.formatDate(certificate.issuedAt),
        };
    }
    async serializePuzzleProject(puzzleProject, userId) {
        // 列表页也按用户行程动态拼图（与背包一致）
        try {
            const bp = await this.getProjectBackpack(userId, puzzleProject.projectId);
            return {
                id: puzzleProject.projectId,
                title: bp.projectTitle,
                subtitle: bp.subtitle,
                gradientStart: bp.gradientStart,
                gradientEnd: bp.gradientEnd,
                gridCols: bp.gridCols,
                gridRows: bp.gridRows,
                status: puzzleProject.project.status,
                certificate: bp.certificate,
                pieces: bp.pieces.map((piece) => ({
                    id: piece.id,
                    name: piece.name,
                    icon: piece.icon,
                    collected: piece.collected,
                })),
            };
        }
        catch (_e) {
            return {
                id: puzzleProject.projectId,
                title: puzzleProject.title,
                subtitle: puzzleProject.subtitle,
                gradientStart: '#1C384A',
                gradientEnd: '#3F6782',
                gridCols: 2,
                gridRows: 2,
                status: puzzleProject.project.status,
                certificate: null,
                pieces: [],
            };
        }
    }
    async resolveBookingWithTrip(booking) {
        if (booking == null) return null;
        const plan = booking.tripPlan;
        const hasDays = plan != null && typeof plan === 'object' && Array.isArray(plan.days) && plan.days.length > 0;
        if (hasDays) return booking;
        const gid = booking.bookingGroupId ?? booking.id;
        const group = await this.prisma.studyBooking.findMany({
            where: { OR: [{ bookingGroupId: gid }, { id: gid }] },
            orderBy: { createdAt: 'asc' },
        });
        for (let i = 0; i < group.length; i++) {
            const g = group[i];
            const tp = g.tripPlan;
            if (tp != null && typeof tp === 'object' && Array.isArray(tp.days) && tp.days.length > 0) {
                return Object.assign({}, booking, {
                    tripPlan: tp,
                    rentalOptionId: booking.rentalOptionId ?? g.rentalOptionId,
                });
            }
        }
        return booking;
    }
    isServiceRoutePoint(routePoint) {
        if (routePoint == null) return true;
        const title = String(routePoint.title ?? '');
        const desc = String(routePoint.description ?? '');
        const id = String(routePoint.id ?? '');
        const blob = (title + ' ' + desc + ' ' + id).toLowerCase();
        if (title.indexOf('接待') >= 0 || title.indexOf('离场') >= 0 || title.indexOf('出口') >= 0)
            return true;
        if (title.indexOf('入口') >= 0 && title.indexOf('大厅') >= 0)
            return true;
        if (blob.indexOf('[service=') >= 0 || blob.indexOf('pointkind=service') >= 0)
            return true;
        if (id.indexOf('entrance') >= 0 || id.indexOf('exit') >= 0)
            return true;
        if (id === 'study-route-6-1' || id === 'study-route-6-6' || id === 'zone_service_exit')
            return true;
        return false;
    }
    isSeatBooking(booking) {
        return booking.participantRole !== 'ORGANIZER';
    }
    formatDate(value) {
        if (value == null)
            return '';
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime()))
            return '';
        return date.toISOString().slice(0, 10);
    }
};
exports.PuzzlesService = PuzzlesService;
exports.PuzzlesService = PuzzlesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PuzzlesService);
//# sourceMappingURL=puzzles.service.js.map