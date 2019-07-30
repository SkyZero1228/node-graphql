import { IDomain, IDomainReference } from '../../interfaces/domains';

export class Domain implements IDomain {
  public updatedAt?: Date;
  public createdAt?: Date;
  public id?: string;

  constructor(public tld: string = '', public enabled: boolean = false) {}
}

export class DomainReference implements IDomainReference {
  constructor(public id: string, public tld: string) {}
}
