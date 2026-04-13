export type BrpBusinessUnit = {
  id: number;
  name: string;
  mailaddress: string;
};

export type BrpWebCategory = {
  id: number;
  name: string;
  sortorder: number;
};

export type BrpProduct = {
  id: number;
  number: string;
  name: string;
  description: string;
  priceincvat: number;
  priceexvat: number;
  producttype: string;
  webcategoryid: number;
  webcategory: string;
  bookablefrominternet: boolean;
};

export type BrpOrderItem = {
  id: number;
  producttype: string;
  productname: string;
  productid: number;
  numberofproducts: number;
  priceexvat: number;
  priceincvat: number;
};

export type BrpOrder = {
  id: number;
  number: number;
  lefttopay: number;
  sum: number;
  businessunitid: number;
  items: BrpOrderItem[];
  preliminary: boolean;
  preliminaryuntil: string;
};

export type BrpPersonVerifyResponse = {
  found: boolean;
  person: {
    id: number;
    email: string;
    firstname: string;
    lastname: string;
  } | null;
};

export type BrpPaymentLinkResponse = {
  orderid: number;
  lefttopay: number;
  paymentUrl: string;
  paymentmethodid: number;
  preliminaryuntil: string;
};
