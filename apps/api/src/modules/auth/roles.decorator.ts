import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = () => {
  return (target: object, propertyKey: string, parameterIndex: number) => {
    // Parameter decorator placeholder — used via @Req() in controllers
  };
};
