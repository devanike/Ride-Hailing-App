import { Timestamp } from "firebase/firestore";

export type PaymentMethod = "cash" | "transfer" | "card";
export type PaymentStatus = "pending" | "completed" | "failed";

export interface Payment {
  paymentId: string;
  rideId: string;
  driverId: string;
  passengerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  paidAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: "success" | "failed";
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      rideId: string;
      driverId: string;
      passengerId: string;
      amount: number;
      pickup: string;
      dropoff: string;
      custom_fields?: {
        display_name: string;
        variable_name: string;
        value: string;
      }[];
    };
    fees: number;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
    };
  };
}
