import {
  sorTransferMemberFromBoomerangToPlus,
  sorTransferMemberFromBoomerangToVip,
  sorTransferMemberFromPlusToViP,
  sorTransferMemberFromVipToPlus,
} from './sor';
import { ITransferUser } from '../interfaces/users';
import roles from '../roles';

export async function transferUser(userInfo: ITransferUser): Promise<boolean> {
  const { email, fromRole, toRole } = userInfo;
  try {
    switch (fromRole) {
      case roles.TVVip:
        return await sorTransferMemberFromVipToPlus(email);
        break;
      case roles.TVBoomerang:
        if (toRole === roles.TVPlus) {
          return await sorTransferMemberFromBoomerangToPlus(email);
          break;
        } else if (toRole === roles.TVVip) {
          return await sorTransferMemberFromBoomerangToVip(email);
          break;
        }
      case roles.TVPlus:
        return await sorTransferMemberFromPlusToViP(email);
        break;
      default:
        return false;
    }
  } catch (ex) {
    throw new Error(ex.message);
  }
}
