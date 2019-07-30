import appSettings from './appSettings';
import auth from './auth';
import certificates from './certificates';
import clickFunnels from './clickFunnels';
import faqs from './frequentlyAskedQuestions';
import prospects from './prospects';
import trips from './trips';
import videos from './videos';
import reservations from './reservations';
import users from './users';
import domains from './domains';
import products from './products';
import revenueShares from './revenueShares';
import coinMdInvoice from './coinMd';
import commissions from './commissions';
import funnels from './funnels';
import leads from './leads';
import stripe from './stripe';
export const mutations = {
  ...appSettings,
  ...auth,
  ...certificates,
  ...clickFunnels,
  ...faqs,
  ...prospects,
  ...reservations,
  ...revenueShares,
  ...trips,
  ...videos,
  ...users,
  ...domains,
  ...products,
  ...coinMdInvoice,
  ...commissions,
  ...funnels,
  ...leads,
  ...stripe,
};
