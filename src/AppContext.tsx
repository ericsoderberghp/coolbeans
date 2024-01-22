import { createContext } from "react";
import { DataType } from "./Types";

export type AppContextType = {
  data: DataType;
  updateData: (func: (d: DataType) => void) => void;
}

export const initialData: DataType = {
  general: { inflation: 0.04, age: 55, lifeExpectancy: 95 },
  accounts: [],
  investments: [],
  incomes: [],
  taxes: [], // TODO: default
  expenses: [],
};

const defaultUpdateData = (func: (d: DataType) => void) => {};

export const AppContext = createContext<AppContextType>({
  data: initialData,
  updateData: defaultUpdateData,
});
