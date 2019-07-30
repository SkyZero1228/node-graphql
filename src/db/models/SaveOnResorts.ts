import { ISorCreateMemberRequest } from '../../helpers/sor';

export class SorCreateMemberRequest implements ISorCreateMemberRequest {
  constructor(public Email: string, public ContractNumber: string, public Address: string, public City: string, public State: string, public PostalCode: string, public TwoLetterCountryCode: string, public Phone: string, public Password: string, public FirstName: string, public LastName: string, public UserAccountTypeID: number) {}
}
