import { Context, verifyAccess, getNowUtc } from '../../utils';
import { Video } from '../../db/models/Video';
import * as RevenueSharesInterfaces from '../../interfaces/revenueShares';
import * as moment from 'moment';
import { createAndSendException } from '../../utils';
import Roles from '../../roles';
import { RevenueShare } from '../../db/models/RevenueShare';

export default {
  async addRevenueShare(_parent, args: RevenueSharesInterfaces.IAddRevenueShareArgs, { session, req }: Context): Promise<RevenueSharesInterfaces.IRevenueShare> {
    try {
      //   verifyAccess(req, [Roles.Administrator]);
      const { user, userRole, funnel, daysToPayCommission, commissionAmount, commissionType } = args.revenueShare;
      const revenueShare = new RevenueShare(user, daysToPayCommission, commissionType, commissionAmount);
      revenueShare.userRole = userRole;
      revenueShare.funnel = funnel;
      await session.store(revenueShare);
      await session.saveChanges();
      return revenueShare;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Development Team has been notified.');
    }
  },

  // async editRevenueShare(_parent, args: RevenueSharesInterfaces.IRevenueShare, { session, req }: Context): Promise<RevenueSharesInterfaces.IRevenueShare> {
  //     verifyAccess(req, [Roles.Administrator]);
  //     try {
  //         let revenueShare = await session.load<RevenueShare>(args.id);

  //         if (!revenueShare) {
  //             return null;
  //         }

  //         revenueShare = Object.assign(revenueShare, { ...args, updatedAt: getNowUtc() });
  //         await session.saveChanges();
  //         return revenueShare;
  //     } catch (ex) {
  //         await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
  //         await session.saveChanges();
  //         throw new Error('There was an error. Please try again. The Tech team has been notified.');
  //     }
  // },
};
