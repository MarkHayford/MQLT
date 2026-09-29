export type CurrentUserPayload = {
    sub: string;
    phone?: string;
    openId?: string;
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
