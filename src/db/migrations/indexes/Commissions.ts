import { AbstractIndexCreationTask } from 'ravendb';

class Commissions extends AbstractIndexCreationTask {
  public constructor() {
    super();
    this.map = `from commission in docs.Commissions
    select new
    {
        Query = new
        {
            commission.payCommissionOn,
            commission.status,
            _cEmail = commission.customer.email,
            _aEmail = commission.affiliate.email,
            _cName = commission.customer.firstName + ' ' + commission.customer.lastName,
            _aName = commission.affiliate.firstName + ' ' + commission.affiliate.lastName,
            createdAt = commission.createdAt
        },
        customerId = commission.customer.id,
        affiliateId = commission.affiliate.id,
        orderId = commission.order.id,
        payCommissionOn = commission.payCommissionOn,
        createdAt = commission.createdAt
    }`;
  }
}

export { Commissions };
