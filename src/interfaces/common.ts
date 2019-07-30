export interface IBooleanResponse {
  success: boolean;
}

export interface IBooleanMessageResponse {
  success: boolean;
  message: string;
}

export interface IApiResponseBase extends IBooleanResponse {
  error?: string;
}

export interface IApiResponse {
  payload: any;
}

export interface IApiMessageResponse extends IBooleanResponse {
  message: any;
}
