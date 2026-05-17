import { DeliveryStatus } from '@prisma/client';

export interface DeliveryData {
  id: string;
  deliveryDate: Date;
  status: DeliveryStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}

export interface DeliveryWithAddress extends DeliveryData {
  address: {
    label: string;
    street: string;
    city: string;
    province: string;
    recipientName: string | null;
  };
}

export interface UpdateDeliveryInput {
  status?: DeliveryStatus;
  shippedAt?: Date;
  deliveredAt?: Date;
}