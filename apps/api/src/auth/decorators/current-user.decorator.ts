import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser, RequestWithTenant } from '../../common/types';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<RequestWithTenant>();
    const user = req.user as AuthUser;
    return data ? user?.[data] : user;
  },
);
