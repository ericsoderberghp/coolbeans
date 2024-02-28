import { createContext } from "react";
import { DataType, TaxType, RMDType } from "./Types";

export type AppContextType = {
  data: DataType;
  updateData: (func: (d: DataType) => void) => void;
  showHelp: boolean;
};

const initialTaxes: TaxType[] = [
  {
    id: 1,
    name: "Federal",
    kind: "income",
    // from https://www.irs.gov/filing/federal-income-tax-rates-and-brackets
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
    id: 2,
    name: "Federal",
    kind: "gains",
    // from https://www.irs.gov/taxtopics/tc409
    rates: [
      { id: 1, rate: 0, min: 0, max: 89250 },
      { id: 2, rate: 15, min: 89251, max: 553850 },
      { id: 3, rate: 20, min: 553851 },
    ],
  },
  {
    id: 3,
    name: "State CA",
    kind: "income",
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

// from https://www.irs.gov/publications/p590b#en_US_2022_publink100090310
const initialRMDs: RMDType[] = [
  { id: 1, age: 73, distribution: 26.5 },
  { id: 2, age: 74, distribution: 25.5 },
  { id: 3, age: 75, distribution: 24.6 },
  { id: 4, age: 76, distribution: 23.7 },
  { id: 5, age: 77, distribution: 22.9 },
  { id: 6, age: 78, distribution: 22.0 },
  { id: 7, age: 79, distribution: 21.1 },
  { id: 8, age: 80, distribution: 20.2 },
  { id: 9, age: 81, distribution: 19.4 },
  { id: 10, age: 82, distribution: 18.5 },
  { id: 11, age: 83, distribution: 17.7 },
  { id: 12, age: 84, distribution: 16.8 },
  { id: 13, age: 85, distribution: 16.0 },
  { id: 14, age: 86, distribution: 15.2 },
  { id: 15, age: 87, distribution: 14.4 },
  { id: 16, age: 88, distribution: 13.7 },
  { id: 17, age: 89, distribution: 12.9 },
  { id: 18, age: 90, distribution: 12.2 },
  { id: 19, age: 91, distribution: 11.5 },
  { id: 20, age: 92, distribution: 10.8 },
  { id: 21, age: 93, distribution: 10.1 },
  { id: 22, age: 94, distribution: 9.5 },
  { id: 23, age: 95, distribution: 8.9 },
  { id: 22, age: 96, distribution: 8.4 },
  { id: 23, age: 97, distribution: 7.8 },
  { id: 24, age: 98, distribution: 7.3 },
  { id: 25, age: 99, distribution: 6.8 },
  { id: 26, age: 100, distribution: 6.4 },
  // TODO: more years
];

export const initialData: DataType = {
  general: { inflation: 4, age: 55, until: 95 },
  accounts: [],
  incomes: [],
  taxes: initialTaxes,
  rmds: initialRMDs,
  expenses: [],
};

const defaultUpdateData = (func: (d: DataType) => void) => {};

export const AppContext = createContext<AppContextType>({
  data: initialData,
  updateData: defaultUpdateData,
  showHelp: true,
});
