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
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tax_invoice_provider_1 = require("./tax-invoice.provider");

const MALL_ELIGIBLE = ["PAID", "UNRECEIVED", "UNUSED", "COMPLETED"];
const RENTAL_ELIGIBLE = ["PAID", "EN_ROUTE", "ARRIVED", "IN_TRIP", "COMPLETED"];
const ACTIVE_INVOICE_STATUSES = ["PENDING", "ISSUED"];

function normalizeTaxNo(raw) {
    return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

/** 纳税人识别号：15/17/18/20 位字母数字（不含 I/O/Z/S/V 等税号规范可再收紧，此处宽松校验） */
function isValidTaxNo(raw) {
    const v = normalizeTaxNo(raw);
    if (![15, 17, 18, 20].includes(v.length))
        return false;
    return /^[0-9A-Z]+$/.test(v);
}

function issuerKey(issuerType, enterpriseId) {
    if (String(issuerType) === "PLATFORM")
        return "PLATFORM";
    return `ENTERPRISE:${String(enterpriseId || "").trim()}`;
}

let InvoicesService = class InvoicesService {
    constructor(prisma) {
        this.prisma = prisma;
    }

    // ---- Invoice titles ----
    list(userId) {
        return this.prisma.invoiceTitle.findMany({
            where: { userId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });
    }
    async create(userId, body) {
        const mapped = this.mapInvoiceTitleCreate(userId, body);
        this.assertTitleTax(mapped.type, mapped.taxNo);
        const dup = await this.findDuplicateTitle(userId, mapped.type, mapped.name, mapped.taxNo);
        if (dup) {
            throw new common_1.BadRequestException("该抬头已存在，请直接选用或编辑已有抬头");
        }
        return this.prisma.$transaction(async (tx) => {
            const shouldDefault = Boolean(body.isDefault ?? false) || (await tx.invoiceTitle.count({ where: { userId } })) === 0;
            if (shouldDefault) {
                await tx.invoiceTitle.updateMany({ where: { userId }, data: { isDefault: false } });
            }
            return tx.invoiceTitle.create({
                data: { ...mapped, isDefault: shouldDefault },
            });
        });
    }
    async update(userId, id, body) {
        const mapped = this.mapInvoiceTitleUpdate(body);
        const current = await this.prisma.invoiceTitle.findFirst({ where: { id, userId } });
        if (!current)
            throw new common_1.NotFoundException("发票抬头不存在");
        const nextType = mapped.type != null ? mapped.type : current.type;
        const nextName = mapped.name != null ? mapped.name : current.name;
        const nextTax = mapped.taxNo !== undefined ? mapped.taxNo : current.taxNo;
        this.assertTitleTax(nextType, nextTax);
        const dup = await this.findDuplicateTitle(userId, nextType, nextName, nextTax, id);
        if (dup) {
            throw new common_1.BadRequestException("该抬头已存在，请直接选用或编辑已有抬头");
        }
        return this.prisma.$transaction(async (tx) => {
            if (Boolean(body.isDefault ?? false)) {
                await tx.invoiceTitle.updateMany({ where: { userId, id: { not: id } }, data: { isDefault: false } });
            }
            return tx.invoiceTitle.update({
                where: { id_userId: { id, userId } },
                data: mapped,
            });
        });
    }
    async remove(userId, id) {
        await this.prisma.invoiceTitle.delete({ where: { id_userId: { id, userId } } });
        return { id, deleted: true };
    }
    assertTitleTax(type, taxNo) {
        const t = String(type || "personal").toLowerCase();
        if (t === "company" || t === "enterprise") {
            if (!taxNo || !String(taxNo).trim())
                throw new common_1.BadRequestException("企业抬头需填写税号");
            if (!isValidTaxNo(taxNo))
                throw new common_1.BadRequestException("纳税人识别号格式不正确（需为 15/17/18/20 位字母或数字）");
        }
    }
    async findDuplicateTitle(userId, type, name, taxNo, excludeId) {
        const t = String(type || "personal").toLowerCase();
        const n = String(name || "").trim();
        if (!n)
            return null;
        const where = { userId, type: t, name: n };
        if (excludeId)
            where.id = { not: excludeId };
        const rows = await this.prisma.invoiceTitle.findMany({ where, take: 20 });
        const wantTax = normalizeTaxNo(taxNo);
        for (const row of rows) {
            if (normalizeTaxNo(row.taxNo) === wantTax)
                return row;
        }
        return null;
    }
    mapInvoiceTitleCreate(userId, body) {
        const type = String(body.type ?? "personal").toLowerCase();
        const taxNoRaw = body.taxNo ?? body.taxNumber ?? null;
        const taxNo = taxNoRaw != null && String(taxNoRaw).trim() ? normalizeTaxNo(taxNoRaw) : null;
        return {
            userId,
            type,
            name: (body.name ?? body.title ?? ""),
            taxNo,
            email: (body.email ?? ""),
            phone: (body.phone ?? null),
            isDefault: Boolean(body.isDefault ?? false),
        };
    }
    mapInvoiceTitleUpdate(body) {
        const out = {};
        if (body.type != null)
            out.type = String(body.type).toLowerCase();
        if (body.name != null || body.title != null)
            out.name = (body.name ?? body.title);
        if (body.taxNo != null || body.taxNumber != null) {
            const raw = body.taxNo ?? body.taxNumber;
            out.taxNo = raw != null && String(raw).trim() ? normalizeTaxNo(raw) : null;
        }
        if (body.email != null)
            out.email = body.email;
        if (body.phone != null)
            out.phone = body.phone;
        if (body.isDefault != null)
            out.isDefault = Boolean(body.isDefault);
        return out;
    }

    // ---- Eligible + requests ----
    async listEligible(userId) {
        const blocked = await this.activeSourceMap(userId);
        const [orders, bookings, rentals] = await Promise.all([
            this.prisma.order.findMany({
                where: { userId, userDeletedAt: null, status: { in: MALL_ELIGIBLE } },
                include: { items: { include: { product: true } } },
                orderBy: { createdAt: "desc" },
                take: 200,
            }),
            this.prisma.studyBooking.findMany({
                where: {
                    userId,
                    userDeletedAt: null,
                    status: { in: ["BOOKED", "COMPLETED"] },
                    amount: { gt: 0 },
                    paidAt: { not: null },
                    cancelledAt: null,
                },
                include: { project: true },
                orderBy: { createdAt: "desc" },
                take: 200,
            }),
            this.prisma.rentalOrder.findMany({
                where: {
                    userId,
                    status: { in: RENTAL_ELIGIBLE },
                    paidAt: { not: null },
                },
                orderBy: { createdAt: "desc" },
                take: 200,
            }),
        ]);

        const productIds = [];
        for (const order of orders) {
            for (const it of order.items || []) {
                if (it.productId)
                    productIds.push(String(it.productId));
            }
        }
        const productProjectMap = await this.loadProductProjectIds(productIds);
        const projectIds = new Set();
        for (const pid of Object.values(productProjectMap)) {
            if (pid)
                projectIds.add(pid);
        }
        for (const booking of bookings) {
            if (booking.projectId)
                projectIds.add(String(booking.projectId));
        }
        const projectEnterprise = await this.loadProjectEnterprises([...projectIds]);

        const out = [];
        for (const order of orders) {
            const resolved = this.resolveMallIssuer(order, productProjectMap, projectEnterprise);
            if (!resolved.ok) {
                // skip whole order when multi-enterprise / missing binding
                continue;
            }
            const key = `MALL_ORDER:${order.id}`;
            const inv = blocked.get(key) || "";
            out.push({
                id: order.id,
                sourceType: "MALL_ORDER",
                title: this.mallOrderTitle(order),
                orderNo: order.orderNo,
                amount: order.amount.toString(),
                time: order.createdAt,
                status: order.status,
                invoiceStatus: inv,
                issuerType: "ENTERPRISE",
                enterpriseId: resolved.enterpriseId,
                issuerLabel: resolved.enterpriseName || "企业",
            });
        }
        for (const booking of bookings) {
            const eid = booking.project && booking.project.enterpriseId
                ? String(booking.project.enterpriseId)
                : (projectEnterprise[String(booking.projectId)] && projectEnterprise[String(booking.projectId)].enterpriseId) || "";
            if (!eid)
                continue;
            const entName = (projectEnterprise[String(booking.projectId)] && projectEnterprise[String(booking.projectId)].enterpriseName)
                || "";
            const key = `STUDY_BOOKING:${booking.id}`;
            const inv = blocked.get(key) || "";
            const projectTitle = (booking.project && booking.project.title) || "研学预约";
            out.push({
                id: booking.id,
                sourceType: "STUDY_BOOKING",
                title: projectTitle,
                orderNo: booking.id,
                amount: booking.amount.toString(),
                time: booking.paidAt || booking.createdAt,
                status: booking.status,
                invoiceStatus: inv,
                issuerType: "ENTERPRISE",
                enterpriseId: eid,
                issuerLabel: entName || "企业",
            });
        }
        for (const rental of rentals) {
            const price = rental.agreedPrice != null ? rental.agreedPrice
                : (rental.offeredPrice != null ? rental.offeredPrice : rental.refPrice);
            if (price == null || !(Number(price.toString()) > 0))
                continue;
            const key = `RENTAL_ORDER:${rental.id}`;
            const inv = blocked.get(key) || "";
            out.push({
                id: rental.id,
                sourceType: "RENTAL_ORDER",
                title: "租车订单",
                orderNo: rental.orderNo,
                amount: Number(price.toString()).toFixed(2),
                time: rental.paidAt || rental.createdAt,
                status: rental.status,
                invoiceStatus: inv,
                issuerType: "PLATFORM",
                enterpriseId: null,
                issuerLabel: "平台",
            });
        }
        return out;
    }

    async listRequests(userId) {
        const list = await this.prisma.invoiceRequest.findMany({
            where: { userId },
            include: { items: true },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return list.map((item) => this.serializeRequest(item));
    }

    async getRequest(userId, id) {
        const item = await this.prisma.invoiceRequest.findFirst({
            where: { id, userId },
            include: { items: true },
        });
        if (!item)
            throw new common_1.NotFoundException("发票申请不存在");
        return this.serializeRequest(item);
    }

    async createRequest(userId, body) {
        const itemsInput = Array.isArray(body && body.items) ? body.items : [];
        if (!itemsInput.length)
            throw new common_1.BadRequestException("请选择需要开票的订单");

        let email = String((body && body.email) || "").trim();
        let titleType = String((body && (body.titleType || body.type)) || "").trim().toLowerCase();
        let titleName = String((body && (body.titleName || body.name || body.title)) || "").trim();
        let taxNo = body && (body.taxNo != null || body.taxNumber != null)
            ? String(body.taxNo ?? body.taxNumber).trim() || null
            : null;
        let phone = body && body.phone != null ? String(body.phone).trim() || null : null;

        if (body && body.titleId) {
            const title = await this.prisma.invoiceTitle.findFirst({
                where: { id: String(body.titleId), userId },
            });
            if (!title)
                throw new common_1.BadRequestException("发票抬头不存在");
            titleType = String(title.type || "personal").toLowerCase();
            titleName = String(title.name || "").trim();
            taxNo = title.taxNo || null;
            if (!email)
                email = String(title.email || "").trim();
            if (!phone)
                phone = title.phone || null;
        }

        if (!titleName)
            throw new common_1.BadRequestException("请填写发票抬头");
        if (!titleType)
            titleType = taxNo ? "company" : "personal";
        if (titleType !== "personal" && titleType !== "company")
            throw new common_1.BadRequestException("抬头类型无效");
        if (titleType === "company") {
            if (!taxNo)
                throw new common_1.BadRequestException("企业抬头需填写税号");
            taxNo = normalizeTaxNo(taxNo);
            if (!isValidTaxNo(taxNo))
                throw new common_1.BadRequestException("纳税人识别号格式不正确（需为 15/17/18/20 位字母或数字）");
        }
        else {
            taxNo = taxNo ? normalizeTaxNo(taxNo) : null;
        }
        if (!email)
            throw new common_1.BadRequestException("请填写接收邮箱");

        const normalized = [];
        const seen = new Set();
        for (const raw of itemsInput) {
            const sourceType = String((raw && raw.sourceType) || "").trim().toUpperCase();
            const sourceId = String((raw && raw.sourceId) || (raw && raw.id) || "").trim();
            if (!sourceId)
                throw new common_1.BadRequestException("开票明细缺少订单 ID");
            if (sourceType !== "MALL_ORDER" && sourceType !== "STUDY_BOOKING" && sourceType !== "RENTAL_ORDER")
                throw new common_1.BadRequestException("不支持的开票来源");
            const key = `${sourceType}:${sourceId}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            normalized.push({ sourceType, sourceId });
        }
        if (!normalized.length)
            throw new common_1.BadRequestException("请选择需要开票的订单");

        const blocked = await this.activeSourceMap(userId);
        const resolved = [];
        let amountSum = 0;
        let requestIssuerType = null;
        let requestEnterpriseId = null;
        let requestEnterpriseName = null;

        const productIdsNeeded = [];
        // first pass mall product ids for batch resolve
        for (const item of normalized) {
            if (item.sourceType === "MALL_ORDER") {
                const order = await this.prisma.order.findFirst({
                    where: { id: item.sourceId, userId, userDeletedAt: null },
                    include: { items: true },
                });
                if (order) {
                    for (const it of order.items || []) {
                        if (it.productId)
                            productIdsNeeded.push(String(it.productId));
                    }
                }
            }
        }
        const productProjectMap = await this.loadProductProjectIds(productIdsNeeded);
        const projectIds = new Set(Object.values(productProjectMap).filter(Boolean));
        const projectEnterprise = await this.loadProjectEnterprises([...projectIds]);

        for (const item of normalized) {
            const key = `${item.sourceType}:${item.sourceId}`;
            if (blocked.has(key))
                throw new common_1.BadRequestException("所选订单已在开票中或已开票");

            if (item.sourceType === "MALL_ORDER") {
                const order = await this.prisma.order.findFirst({
                    where: { id: item.sourceId, userId, userDeletedAt: null },
                    include: { items: { include: { product: true } } },
                });
                if (!order)
                    throw new common_1.BadRequestException("商城订单不存在或不属于当前用户");
                if (!MALL_ELIGIBLE.includes(order.status))
                    throw new common_1.BadRequestException(`订单 ${order.orderNo} 当前状态不可开票`);
                const iss = this.resolveMallIssuer(order, productProjectMap, projectEnterprise);
                if (!iss.ok)
                    throw new common_1.BadRequestException(iss.reason || "该文创订单无法确定开票企业");
                const ik = issuerKey("ENTERPRISE", iss.enterpriseId);
                if (!requestIssuerType) {
                    requestIssuerType = "ENTERPRISE";
                    requestEnterpriseId = iss.enterpriseId;
                    requestEnterpriseName = iss.enterpriseName || null;
                }
                else if (issuerKey(requestIssuerType, requestEnterpriseId) !== ik) {
                    throw new common_1.BadRequestException("一次申请只能选择同一开票方（不可混选平台租车与企业订单，也不可混选不同企业）");
                }
                const amt = Number(order.amount.toString());
                amountSum += amt;
                resolved.push({
                    sourceType: "MALL_ORDER",
                    sourceId: order.id,
                    sourceNo: order.orderNo,
                    title: this.mallOrderTitle(order),
                    amount: order.amount,
                });
            }
            else if (item.sourceType === "STUDY_BOOKING") {
                const booking = await this.prisma.studyBooking.findFirst({
                    where: { id: item.sourceId, userId, userDeletedAt: null },
                    include: { project: true },
                });
                if (!booking)
                    throw new common_1.BadRequestException("研学预约不存在或不属于当前用户");
                if (booking.status !== "BOOKED" && booking.status !== "COMPLETED")
                    throw new common_1.BadRequestException("研学预约当前状态不可开票");
                if (booking.cancelledAt)
                    throw new common_1.BadRequestException("已取消的预约不可开票");
                if (!booking.paidAt)
                    throw new common_1.BadRequestException("未支付的研学预约不可开票");
                const amt = Number(booking.amount.toString());
                if (!(amt > 0))
                    throw new common_1.BadRequestException("预约金额为 0，不可开票");
                const eid = booking.project && booking.project.enterpriseId
                    ? String(booking.project.enterpriseId).trim()
                    : "";
                if (!eid)
                    throw new common_1.BadRequestException("该研学预约未绑定开票企业，暂不可开票");
                let entName = "";
                if (booking.projectId) {
                    const pe = await this.loadProjectEnterprises([String(booking.projectId)]);
                    entName = (pe[String(booking.projectId)] && pe[String(booking.projectId)].enterpriseName) || "";
                }
                const ik = issuerKey("ENTERPRISE", eid);
                if (!requestIssuerType) {
                    requestIssuerType = "ENTERPRISE";
                    requestEnterpriseId = eid;
                    requestEnterpriseName = entName || null;
                }
                else if (issuerKey(requestIssuerType, requestEnterpriseId) !== ik) {
                    throw new common_1.BadRequestException("一次申请只能选择同一开票方（不可混选平台租车与企业订单，也不可混选不同企业）");
                }
                amountSum += amt;
                resolved.push({
                    sourceType: "STUDY_BOOKING",
                    sourceId: booking.id,
                    sourceNo: booking.id,
                    title: (booking.project && booking.project.title) || "研学预约",
                    amount: booking.amount,
                });
            }
            else {
                const rental = await this.prisma.rentalOrder.findFirst({
                    where: { id: item.sourceId, userId },
                });
                if (!rental)
                    throw new common_1.BadRequestException("租车订单不存在或不属于当前用户");
                if (!RENTAL_ELIGIBLE.includes(rental.status))
                    throw new common_1.BadRequestException("租车订单当前状态不可开票");
                if (!rental.paidAt)
                    throw new common_1.BadRequestException("未支付的租车订单不可开票");
                const price = rental.agreedPrice != null ? rental.agreedPrice
                    : (rental.offeredPrice != null ? rental.offeredPrice : rental.refPrice);
                if (price == null || !(Number(price.toString()) > 0))
                    throw new common_1.BadRequestException("租车订单金额无效，不可开票");
                const ik = issuerKey("PLATFORM", null);
                if (!requestIssuerType) {
                    requestIssuerType = "PLATFORM";
                    requestEnterpriseId = null;
                    requestEnterpriseName = "平台";
                }
                else if (issuerKey(requestIssuerType, requestEnterpriseId) !== ik) {
                    throw new common_1.BadRequestException("一次申请只能选择同一开票方（不可混选平台租车与企业订单，也不可混选不同企业）");
                }
                const amt = Number(price.toString());
                amountSum += amt;
                resolved.push({
                    sourceType: "RENTAL_ORDER",
                    sourceId: rental.id,
                    sourceNo: rental.orderNo,
                    title: "租车订单",
                    amount: amt.toFixed(2),
                });
            }
        }

        const created = await this.prisma.$transaction(async (tx) => {
            for (const item of resolved) {
                const conflict = await tx.invoiceRequestItem.findFirst({
                    where: {
                        sourceType: item.sourceType,
                        sourceId: item.sourceId,
                        request: { status: { in: ACTIVE_INVOICE_STATUSES } },
                    },
                });
                if (conflict)
                    throw new common_1.BadRequestException("所选订单已在开票中或已开票");
            }
            return tx.invoiceRequest.create({
                data: {
                    userId,
                    status: "PENDING",
                    titleType,
                    titleName,
                    taxNo,
                    email,
                    phone,
                    amount: amountSum.toFixed(2),
                    issuerType: requestIssuerType || "ENTERPRISE",
                    enterpriseId: requestEnterpriseId,
                    enterpriseName: requestEnterpriseName,
                    items: {
                        create: resolved.map((r) => ({
                            sourceType: r.sourceType,
                            sourceId: r.sourceId,
                            sourceNo: r.sourceNo,
                            title: r.title,
                            amount: r.amount,
                        })),
                    },
                },
                include: { items: true },
            });
        });
        return this.serializeRequest(created);
    }

    /** P1 email placeholder — never blocks issue */
    async notifyInvoiceEmail(request) {
        const smtpHost = process.env.SMTP_HOST || process.env.INVOICE_SMTP_HOST || "";
        if (!smtpHost) {
            try {
                await this.prisma.invoiceRequest.update({
                    where: { id: request.id },
                    data: { emailStatus: "skipped", emailSentAt: null },
                });
            }
            catch (_e) { }
            console.log("[invoice-email] skipped (no SMTP):", request.id, request.email);
            return { status: "skipped", message: "邮件：已跳过（未配置）" };
        }
        try {
            await this.prisma.invoiceRequest.update({
                where: { id: request.id },
                data: { emailStatus: "pending", emailSentAt: null },
            });
        }
        catch (_e2) { }
        console.log("[invoice-email] queued (SMTP configured, send not wired):", request.id, request.email);
        console.log("[invoice-email] html preview:", this.buildInvoiceEmailHtml(request).slice(0, 200));
        return { status: "pending", message: "邮件：已排队" };
    }

    buildInvoiceEmailHtml(request) {
        const amount = request.amount != null ? request.amount.toString() : "0";
        const pdf = request.pdfUrl || "";
        const no = request.invoiceNo || "";
        return `<!doctype html><html><body style="font-family:sans-serif;color:#222">
<h2>电子发票已开具</h2>
<p>抬头：${String(request.titleName || "").replace(/</g, "")}</p>
<p>金额：¥${amount}</p>
<p>发票号码：${String(no).replace(/</g, "") || "—"}</p>
<p>${pdf ? `<a href="${String(pdf).replace(/"/g, "")}">下载 PDF</a>` : "PDF 稍后可在小程序查看"}</p>
<p style="color:#888;font-size:12px">开票方：${request.issuerType === "PLATFORM" ? "平台" : (request.enterpriseName || "企业")}</p>
</body></html>`;
    }

    getTaxProvider() {
        return (0, tax_invoice_provider_1.getTaxInvoiceProvider)();
    }

    async autoIssueViaProvider(request) {
        const provider = this.getTaxProvider();
        return provider.issue(request);
    }

    async loadProductProjectIds(productIds) {
        const map = {};
        const ids = [...new Set((productIds || []).map((x) => String(x)).filter(Boolean))];
        if (!ids.length)
            return map;
        try {
            const placeholders = ids.map((_, i) => "$" + (i + 1)).join(", ");
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT id, "projectId" FROM "Product" WHERE id IN (` + placeholders + `)`,
                ...ids
            );
            for (const row of rows || []) {
                map[String(row.id)] = row.projectId != null ? String(row.projectId) : "";
            }
        }
        catch (_e) {
            for (const id of ids) {
                try {
                    const rows = await this.prisma.$queryRawUnsafe(`SELECT "projectId" FROM "Product" WHERE id = $1`, id);
                    map[id] = rows.length && rows[0].projectId != null ? String(rows[0].projectId) : "";
                }
                catch (_e2) {
                    map[id] = "";
                }
            }
        }
        return map;
    }

    async loadProjectEnterprises(projectIds) {
        const map = {};
        const ids = [...new Set((projectIds || []).map((x) => String(x)).filter(Boolean))];
        if (!ids.length)
            return map;
        const projects = await this.prisma.studyProject.findMany({
            where: { id: { in: ids } },
            select: { id: true, enterpriseId: true, enterprise: { select: { id: true, name: true, shortName: true } } },
        });
        for (const p of projects) {
            const eid = p.enterpriseId ? String(p.enterpriseId) : "";
            const name = (p.enterprise && (p.enterprise.shortName || p.enterprise.name)) || "";
            map[String(p.id)] = { enterpriseId: eid, enterpriseName: name };
        }
        return map;
    }

    resolveMallIssuer(order, productProjectMap, projectEnterprise) {
        const items = order.items || [];
        if (!items.length)
            return { ok: false, reason: "文创订单无商品明细" };
        const eids = new Set();
        let name = "";
        for (const it of items) {
            const productId = it.productId ? String(it.productId) : (it.product && it.product.id ? String(it.product.id) : "");
            const projectId = productProjectMap[productId] || "";
            if (!projectId)
                return { ok: false, reason: `商品未绑定研学项目，无法确定开票企业` };
            const pe = projectEnterprise[projectId] || {};
            const eid = pe.enterpriseId || "";
            if (!eid)
                return { ok: false, reason: "项目未绑定企业，暂不可开票" };
            eids.add(eid);
            if (!name && pe.enterpriseName)
                name = pe.enterpriseName;
        }
        if (eids.size > 1)
            return { ok: false, reason: "该订单商品属于多家企业，暂不支持合并开票" };
        const enterpriseId = [...eids][0];
        return { ok: true, enterpriseId, enterpriseName: name };
    }

    async activeSourceMap(userId) {
        const rows = await this.prisma.invoiceRequestItem.findMany({
            where: {
                request: {
                    userId,
                    status: { in: ACTIVE_INVOICE_STATUSES },
                },
            },
            include: { request: { select: { status: true } } },
        });
        const map = new Map();
        for (const row of rows) {
            const st = row.request && row.request.status;
            const label = st === "ISSUED" ? "已开票" : "开票中";
            map.set(`${row.sourceType}:${row.sourceId}`, label);
        }
        return map;
    }

    mallOrderTitle(order) {
        const items = order.items || [];
        if (!items.length)
            return "商城订单";
        const first = items[0];
        const name = (first.product && first.product.name) || "商城商品";
        if (items.length > 1)
            return `${name} 等 ${items.length} 件`;
        return name;
    }

    serializeRequest(item) {
        return {
            id: item.id,
            userId: item.userId,
            status: item.status,
            titleType: item.titleType,
            titleName: item.titleName,
            taxNo: item.taxNo,
            email: item.email,
            phone: item.phone,
            amount: item.amount != null ? item.amount.toString() : "0",
            pdfUrl: item.pdfUrl || null,
            invoiceNo: item.invoiceNo || null,
            rejectReason: item.rejectReason || null,
            adminRemark: item.adminRemark || null,
            issuedAt: item.issuedAt || null,
            issuedById: item.issuedById || null,
            issuerType: item.issuerType || "ENTERPRISE",
            enterpriseId: item.enterpriseId || null,
            enterpriseName: item.enterpriseName || null,
            emailSentAt: item.emailSentAt || null,
            emailStatus: item.emailStatus || null,
            taxProvider: item.taxProvider || null,
            taxRemoteId: item.taxRemoteId || null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            itemCount: Array.isArray(item.items) ? item.items.length : undefined,
            items: Array.isArray(item.items)
                ? item.items.map((it) => ({
                    id: it.id,
                    sourceType: it.sourceType,
                    sourceId: it.sourceId,
                    sourceNo: it.sourceNo,
                    title: it.title,
                    amount: it.amount != null ? it.amount.toString() : "0",
                }))
                : undefined,
            user: item.user
                ? {
                    id: item.user.id,
                    nickname: item.user.nickname,
                    phone: item.user.phone,
                    studyNo: item.user.studyNo,
                }
                : undefined,
        };
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvoicesService);
