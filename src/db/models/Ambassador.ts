export interface IAmbassador {
  updatedAt: Date;
  isSubscribed: boolean;
  email: string;
  remoteLoginId: string;
  lastName: string;
  firstName: string;
  id: string;
  status: string;
  createdAt?: Date;
  stripeCustomerId: string;
  stripeCardSource: string;
  phone: string;
  password: string;
}
