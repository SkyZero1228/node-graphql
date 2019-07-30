import { IApiResponse, IApiResponseBase } from './common';

export interface ISorPerson {
  City: string;
  Country: string;
  FirstName: string;
  LastName: string;
  Phone: string;
  PostalCode: string;
  SecondaryPhone: string;
  State: string;
  StreetAddress: string;
}

export interface ISorMember {
  contractNumber: string;
  CurrentPointBalance: number;
  DateCreated: Date;
  Email: string;
  ExpirationDate: Date;
  MyUserSettings: any[];
  OtherID: string;
  PrimaryPerson: ISorPerson;
  Reason: string;
  Status: string;
  UserID: number;
  VacationClubId: number;
}

export interface ISorAccountResponse {
  UserId: number;
}

export interface ISorAccountReference {
  userId: number;
  contractNumber: string;
}

export interface ISorApiResponse {
  Account: ISorAccountResponse;
  ResultType: string;
  Message: string;
}

export interface IApiCredentials {
  username: string;
  password: string;
}

export interface ISorClub {
  clubId: number;
  apiCredentials?: IApiCredentials;
  loginUrl?: string;
  subscriberTypePrefix?: number;
  userAccountTypeId?: number;
}

export interface ISorClubs {
  TripValetPlus: ISorClub;
  TripValetVip: ISorClub;
  TripValetBoomerang: ISorClub;
}

export interface ISorSinglSignOnRequest {
  APIUsername: string;
  APIPassword: string;
  Email?: string;
  ContractNumber?: string;
}

export interface ISorSsoLoginResponse {
  success: boolean;
  token: string;
  message?: string;
}

export interface ISorGetMemberApiResponse extends IApiResponseBase {
  sorMember?: ISorMember;
}
