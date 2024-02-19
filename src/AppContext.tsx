import { createContext } from "react";
import { DataType } from "./Types";

export type AppContextType = {
  data: DataType;
  updateData: (func: (d: DataType) => void) => void;
};

// from https://www.irs.gov/filing/federal-income-tax-rates-and-brackets
const initialTaxes = [
  {
    id: 1,
    name: "US income",
    rates: [
      { id: 1, rate: 10, min: 0, max: 20000 },
      { id: 2, rate: 12, min: 22001, max: 89450 },
      { id: 3, rate: 22, min: 89451, max: 190750 },
      { id: 4, rate: 24, min: 190751, max: 364200 },
      { id: 5, rate: 32, min: 364201, max: 462500 },
      { id: 6, rate: 35, min: 462501, max: 693750 },
    ],
  },
  {
    id: 7,
    name: "CA income",
    rates: [
      { id: 1, rate: 1, min: 0, max: 20197 },
      { id: 2, rate: 2, min: 20198, max: 47883 },
      { id: 3, rate: 4, min: 47884, max: 75575 },
      { id: 4, rate: 6, min: 75576, max: 104909 },
      { id: 5, rate: 8, min: 104910, max: 132589 },
      { id: 6, rate: 9.3, min: 132590, max: 677277 },
      { id: 7, rate: 10.3, min: 677278, max: 812727 },
    ],
  },
];

export const initialData: DataType = {
  general: { inflation: 4, age: 55, until: 95 },
  accounts: [],
  incomes: [],
  taxes: initialTaxes,
  expenses: [],
};

const defaultUpdateData = (func: (d: DataType) => void) => {};

export const AppContext = createContext<AppContextType>({
  data: initialData,
  updateData: defaultUpdateData,
});
