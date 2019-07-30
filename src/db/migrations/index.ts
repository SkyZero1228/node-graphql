import Orders from './2018-10-28-OrdersIndex';
import OrderCommissionToRootCommissionDocuments from './2018-10-28-OrderCommissionToRootCommissionDocuments';
import CommissionsPendingByAffiliate from './2018-11-01-CommissionsPendingByAffiliateIndex';
import CommissionsByAffiliateLifetime from './2018-11-01-CommissionsByAffiliateLifetimeIndex';
import Commissions from './2018-12-12-CommissionsIndex';
import AddOrderTotalToCommission from './2018-11-01-AddOrderTotalToCommission';
import RedoUserSubscription from './2018-11-11-RedoUserSubscription';
import UserSubscriptions from './2018-11-20-UserSubscriptionsIndex';
import Leads from './2019-11-24-LeadsIndex';
import PatchProductsWithSetup from './2018-11-26-PatchProductsWithSetup';
import PatchFunnelsWithSetup from './2018-11-26-PatchFunnelsWithSetup';
import LeadVisitsIndexes from './2018-12-01-LeadVisitsIndexes';
import AddDisplayNameToProduct from './2018-12-01-AddDisplayNameToProduct';
import AddProductDisplayNameToFunnelSteps from './2018-12-01-AddProductDisplayNameToFunnelSteps';
import UpdateProspectsWithDeliveryEndpointAndMethod from './2018-12-02-UpdateProspectsWithDeliveryEndpointAndMethod';
import Users from './2018-12-05-UserIndex';
import Funnels from './2018-12-05-FunnelsIndex';
import Prospects from './2018-12-10-Prospects';
import CertificatesMembershipLevelToArray from './2018-12-19-CertificatesMembershipLevelToArray';
import PatchProductsWithPaymentAccount from './2019-01-23-PatchProductsWithPaymentAccount';
import TotalEscapeBucksByUserIdIndex from './2019-01-28-TotalEscapeBucksByUserIdIndex';
import TotalCommissionsPaidByUserIdIndex from './2019-01-28-TotalCommissionsPaidByUserIdIndex';
import TotalCommissionsPendingByUserIdIndex from './2019-01-28-TotalCommissionsPendingByUserIdIndex';

export default {
  [Orders.name]: Orders,
  [Users.name]: Users,
  [OrderCommissionToRootCommissionDocuments.name]: OrderCommissionToRootCommissionDocuments,
  [CommissionsPendingByAffiliate.name]: CommissionsPendingByAffiliate,
  [CommissionsByAffiliateLifetime.name]: CommissionsByAffiliateLifetime,
  [Commissions.name]: Commissions,
  [AddOrderTotalToCommission.name]: AddOrderTotalToCommission,
  [RedoUserSubscription.name]: RedoUserSubscription,
  [UserSubscriptions.name]: UserSubscriptions,
  [Funnels.name]: Funnels,
  [Leads.name]: Leads,
  [PatchProductsWithSetup.name]: PatchProductsWithSetup,
  [PatchFunnelsWithSetup.name]: PatchFunnelsWithSetup,
  [LeadVisitsIndexes.name]: LeadVisitsIndexes,
  [AddDisplayNameToProduct.name]: AddDisplayNameToProduct,
  [AddProductDisplayNameToFunnelSteps.name]: AddProductDisplayNameToFunnelSteps,
  [UpdateProspectsWithDeliveryEndpointAndMethod.name]: UpdateProspectsWithDeliveryEndpointAndMethod,
  [Prospects.name]: Prospects,
  [CertificatesMembershipLevelToArray.name]: CertificatesMembershipLevelToArray,
  [PatchProductsWithPaymentAccount.name]: PatchProductsWithPaymentAccount,
  [TotalEscapeBucksByUserIdIndex.name]: TotalEscapeBucksByUserIdIndex,
  [TotalCommissionsPaidByUserIdIndex.name]: TotalCommissionsPaidByUserIdIndex,
  [TotalCommissionsPendingByUserIdIndex.name]: TotalCommissionsPendingByUserIdIndex,
};
