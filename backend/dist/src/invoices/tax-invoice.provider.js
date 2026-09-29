"use strict";
/**
 * P2 stub — tax-control invoice providers.
 * Env: INVOICE_TAX_PROVIDER=manual|nuonuo|baiwang (default manual)
 * Real NuoNuo / Baiwang keys are NOT wired yet; use ManualTaxInvoiceProvider.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaxInvoiceProvider = getTaxInvoiceProvider;
exports.ManualTaxInvoiceProvider = void 0;
exports.NuoNuoTaxInvoiceProvider = void 0;
exports.BaiwangTaxInvoiceProvider = void 0;

class ManualTaxInvoiceProvider {
    constructor() {
        this.name = "manual";
    }
    async issue(_request) {
        return {
            ok: false,
            provider: this.name,
            message: "请使用人工开具（填写 PDF / 发票号）",
            code: "MANUAL_ONLY",
        };
    }
    async query(_invoiceNo) {
        return { ok: false, provider: this.name, message: "人工开具无远程查询", code: "MANUAL_ONLY" };
    }
    async redFlush(_request, _reason) {
        return { ok: false, provider: this.name, message: "人工开具不支持自动红冲", code: "MANUAL_ONLY" };
    }
}
exports.ManualTaxInvoiceProvider = ManualTaxInvoiceProvider;

class NuoNuoTaxInvoiceProvider {
    constructor() {
        this.name = "nuonuo";
        // Expected env later: NUONUO_APP_KEY / NUONUO_APP_SECRET / NUONUO_TAX_NUM / NUONUO_BASE_URL
    }
    _configured() {
        return !!(process.env.NUONUO_APP_KEY && process.env.NUONUO_APP_SECRET);
    }
    async issue(_request) {
        if (!this._configured()) {
            const err = new Error("诺诺税控未配置（缺少 NUONUO_APP_KEY/SECRET）");
            err.status = 501;
            err.code = "TAX_PROVIDER_NOT_CONFIGURED";
            throw err;
        }
        const err = new Error("诺诺税控对接尚未实现");
        err.status = 501;
        err.code = "TAX_PROVIDER_NOT_IMPLEMENTED";
        throw err;
    }
    async query(_invoiceNo) {
        const err = new Error("诺诺税控对接尚未实现");
        err.status = 501;
        throw err;
    }
    async redFlush(_request, _reason) {
        const err = new Error("诺诺税控对接尚未实现");
        err.status = 501;
        throw err;
    }
}
exports.NuoNuoTaxInvoiceProvider = NuoNuoTaxInvoiceProvider;

class BaiwangTaxInvoiceProvider {
    constructor() {
        this.name = "baiwang";
        // Expected env later: BAIWANG_APP_KEY / BAIWANG_APP_SECRET / BAIWANG_TAX_NUM / BAIWANG_BASE_URL
    }
    _configured() {
        return !!(process.env.BAIWANG_APP_KEY && process.env.BAIWANG_APP_SECRET);
    }
    async issue(_request) {
        if (!this._configured()) {
            const err = new Error("百望税控未配置（缺少 BAIWANG_APP_KEY/SECRET）");
            err.status = 501;
            err.code = "TAX_PROVIDER_NOT_CONFIGURED";
            throw err;
        }
        const err = new Error("百望税控对接尚未实现");
        err.status = 501;
        err.code = "TAX_PROVIDER_NOT_IMPLEMENTED";
        throw err;
    }
    async query(_invoiceNo) {
        const err = new Error("百望税控对接尚未实现");
        err.status = 501;
        throw err;
    }
    async redFlush(_request, _reason) {
        const err = new Error("百望税控对接尚未实现");
        err.status = 501;
        throw err;
    }
}
exports.BaiwangTaxInvoiceProvider = BaiwangTaxInvoiceProvider;

function getTaxInvoiceProvider(name) {
    const key = String(name || process.env.INVOICE_TAX_PROVIDER || "manual").trim().toLowerCase();
    if (key === "nuonuo")
        return new NuoNuoTaxInvoiceProvider();
    if (key === "baiwang")
        return new BaiwangTaxInvoiceProvider();
    return new ManualTaxInvoiceProvider();
}
