import appSettings from './appSettings';
import certificates from './certificates';
import clickFunnels from './clickFunnels';
import faqs from './frequentlyAskedQuestions';
import prospects from './prospects';
import reservations from './reservations';
import users from './users';
import stripe from './stripe';
import trips from './trips';
import videos from './videos';
import roles from './roles';
import commission from './commission';
import funnel from './funnel';
import lead from './lead';
import order from './order';
import product from './product';
import domain from './domain';
import userSubscription from './userSubscription';
import escapeBucks from './escapeBucks';

export const queries = {
  ...appSettings,
  ...clickFunnels,
  ...certificates,
  ...faqs,
  ...prospects,
  ...reservations,
  ...roles,
  ...stripe,
  ...trips,
  ...users,
  ...videos,
  ...commission,
  ...funnel,
  ...lead,
  ...order,
  ...product,
  ...domain,
  ...userSubscription,
  ...escapeBucks,
};
