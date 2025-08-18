import { Context, Next } from 'hono';
import { v4 as uuid } from 'uuid';

export const requestIdMiddleware = async (c: Context, next: Next) => {
    c.set('proxyRequestId', uuid());
    await next();
};
