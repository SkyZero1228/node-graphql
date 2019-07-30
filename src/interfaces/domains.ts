export interface IDomain {
  id?: string;
  tld: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDomainRoleSorAccount {
  domain: IDomain[];
  role: string[];

  sorAccount: string[];
}

export interface IDomainReference {
  id?: string;
  tld: string;
}

export interface IDomainArgs {
  domain: IDomain;
}
