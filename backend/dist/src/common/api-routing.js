"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIVENESS_PATH = exports.DEFAULT_API_PREFIX = void 0;
exports.normalizeApiPrefix = normalizeApiPrefix;
exports.configureApiRouting = configureApiRouting;
const common_1 = require("@nestjs/common");
exports.DEFAULT_API_PREFIX = 'v1';
exports.LIVENESS_PATH = 'healthz';
function normalizeApiPrefix(configuredPrefix) {
    const normalized = (configuredPrefix ?? '')
        .trim()
        .replace(/^\/+|\/+$/g, '');
    return normalized || exports.DEFAULT_API_PREFIX;
}
function configureApiRouting(app, configuredPrefix) {
    const apiPrefix = normalizeApiPrefix(configuredPrefix);
    app.setGlobalPrefix(apiPrefix, {
        exclude: [{ path: exports.LIVENESS_PATH, method: common_1.RequestMethod.GET }],
    });
    return apiPrefix;
}
//# sourceMappingURL=api-routing.js.map