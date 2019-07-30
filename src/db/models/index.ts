import * as AppSettings from './AppSettings';
import * as Certificate from './Certificate';
import * as ClickFunnelPurchase from './ClickFunnelPurchase';
import * as DumpBucket from './DumpBucket';
import * as Exception from './Exception';
import * as FrequentlyAskedQuestion from './FrequentlyAskedQuestion';
import * as Prospect from './Prospect';
import * as User from './User';
import * as Video from './Video';
import * as Reservation from './Reservation';
import * as ReservationDeposit from './ReservationDeposit';
import * as Trip from './Trip';
import * as Commission from './Commission';
import * as Funnel from './Funnel';
import * as Lead from './Lead';
import * as Order from './Order';
import * as Product from './Product';
import * as UserSubscription from './UserSubscription';
import * as EscapeBuck from './EscapeBuck';

export default {
  ...AppSettings,
  ...Certificate,
  ...ClickFunnelPurchase,
  ...Commission,
  ...DumpBucket,
  ...Exception,
  ...FrequentlyAskedQuestion,
  ...Funnel,
  ...Lead,
  ...Order,
  ...Product,
  ...Prospect,
  ...Reservation,
  ...ReservationDeposit,
  ...Trip,
  ...User,
  ...UserSubscription,
  ...Video,
  ...EscapeBuck,
};
