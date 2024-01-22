
export type GeneralType = {
  inflation: number;
  age: number;
  lifeExpectancy: number;
};

export type AccountType = {
  id: number;
  name: string;
  // qualified means tax-deferred, taxes are paid on withdrawl
  qualified: boolean;
  // allow not bothering with investments by setting value and return on account
  value?: number;
  return?: number;
  priority?: number;
};

export type InvestmentType = {
  id: number;
  account: number;
  name: string;
  shares?: number;
  basis?: number;
  price?: number;
  dividend?: number;
  return?: number; // yearly
  priority?: number;
};

export type IncomeType = {
  id: number;
  name: string;
  value: number; // yearly
  start?: string; // e.g. '2024-01-01'
  stop?: string;
};

export type ExpenseType = {
  id: number;
  name: string;
  value: number; // yearly
  start?: string;
  stop?: string;
};

export type TaxType = {
  id: number;
  name: string;
  rate: number; // yearly
  min?: number;
  max?: number;
  start?: string;
  end?: string;
};

export type DataType = {
  name?: string;
  general: GeneralType;
  accounts: AccountType[];
  investments: InvestmentType[];
  incomes: IncomeType[];
  taxes: TaxType[];
  expenses: ExpenseType[];
};
