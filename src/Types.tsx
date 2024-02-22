
export type GeneralType = {
  inflation: number;
  age: number;
  until: number;
};

export type AccountType = {
  id: number;
  name: string;
  // qualified means tax-deferred, taxes are paid on withdrawl
  qualified: boolean;
  // allow not bothering with investments by setting value and return on account
  value?: number;
  return?: number;
  dividend?: number;
  priority?: number;
  investments: InvestmentType[];
};

export type InvestmentType = {
  id: number;
  name: string;
  shares?: number;
  basis?: number;
  price?: number;
  dividend?: number; // yearly percentage
  return?: number; // yearly percentage
  priority?: number;
};

export type IncomeType = {
  id: number;
  name: string;
  value: number; // yearly value
  start?: string; // e.g. '2024-01-01'
  stop?: string;
};

export type ExpenseType = {
  id: number;
  name: string;
  value: number; // yearly value
  start?: string;
  stop?: string;
};

export type TaxType = {
  id: number;
  name: string;
  kind: "income" | "gains";
  rates: RateType[];
};

export type RateType = {
  id: number;
  rate: number; // yearly percentage
  min?: number;
  max?: number;
  // start?: string;
  // end?: string;
};

export type DataType = {
  name?: string;
  general: GeneralType;
  accounts: AccountType[];
  incomes: IncomeType[];
  taxes: TaxType[];
  expenses: ExpenseType[];
};
