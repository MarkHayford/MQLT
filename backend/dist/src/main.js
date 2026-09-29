"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const api_routing_1 = require("./common/api-routing");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    const apiPrefix = (0, api_routing_1.configureApiRouting)(app, config.get('API_PREFIX'));
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
    const corsOrigins = String(process.env.CORS_ORIGINS || config.get('CORS_ORIGINS') || 'http://127.0.0.1:8080,http://localhost:5173')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
    if (process.env.NODE_ENV !== 'production') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Mengqi Chain Study API')
            .setDescription('Backend API for the mini program.')
            .setVersion('0.1.0')
            .addBearerAuth()
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
    }
    const port = config.get('PORT', 3000);
    const host = config.get('HOST', '127.0.0.1');
    await app.listen(port, host);
}
void bootstrap();
//# sourceMappingURL=main.js.map