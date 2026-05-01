declare module "bakong-khqr" {
  export class IndividualInfo {
    constructor(bakongAccountID: string, merchantName: string, merchantCity: string);
    currency: number;
    amount: number;
    expirationTimestamp: string;
    billNumber?: string;
    storeLabel?: string;
    terminalLabel?: string;
    mobileNumber?: string;
    purposeOfTransaction?: string;
  }

  export class MerchantInfo {
    constructor(merchantId: string, merchantName: string, merchantCity: string);
    currency: number;
    amount: number;
    expirationTimestamp: string;
  }

  export const khqrData: {
    currency: { usd: number; khr: number };
    merchantType: { merchant: string; individual: string };
  };

  export class BakongKHQR {
    generateIndividual(info: IndividualInfo): {
      status: { code: number; errorCode: number | null; message: string | null };
      data: { qr: string; md5: string } | null;
    };
    generateMerchant(info: MerchantInfo): {
      status: { code: number; errorCode: number | null; message: string | null };
      data: { qr: string; md5: string } | null;
    };
    static decode(qr: string): unknown;
    static verify(qr: string): unknown;
  }
}
