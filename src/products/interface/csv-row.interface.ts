export interface CSVRow {
    ProductID: string;
    ItemID: string;
    Vendor: string;
    ProductName?: string;
    Price?: number;
    Description?: string;
    Manufacturer?: string;
    Category?: string;
    Packaging?: string;
    ItemDescription?: string;
    PrimaryCategoryName?:string;
  }