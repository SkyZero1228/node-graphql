import { AbstractIndexCreationTask } from 'ravendb';

class Prospects extends AbstractIndexCreationTask {
  public constructor() {
    super();
    this.map = `from prospects in docs.Prospects
    select new
    {
        Query = new
        {
            firstName = prospects.firstName,
            lastName = prospects.lastName,
            deliveryEndpoint = prospects.deliveryEndpoint,
            deliveryMethod = prospects.deliveryMethod,
            redeemed = prospects.redeemed ? "Yes" : "No",
            userId = prospects.userId
        },
        firstName = prospects.firstName,
        lastName = prospects.lastName,
        deliveryEndpoint = prospects.deliveryEndpoint,
        deliveryMethod = prospects.deliveryMethod,
        redeemed = prospects.redeemed ? "Yes" : "No",
        name = prospects.firstName + ' ' + prospects.lastName,
        userId = prospects.userId
    }`;
  }
}

export { Prospects };
