import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { AppContext, initialData } from "./AppContext";
import { DataType, InvestmentType } from "./Types";
import { Global } from "./Global";
import { Accounts } from "./Accounts";
import { Investments } from "./Investments";
import { Incomes } from "./Incomes";
import { Taxes } from "./Taxes";
import { Expenses } from "./Expenses";

// TODO:
// - implement income and expense dates, start with just year
// - Social Security
// - implement asset classes?
// - use API to get current stock prices
// - multiple data sets, to allow showing different scenarios
// - invest extra income
// - Medicare
// - styling
// - branding
// - charts
// - slider controls to adjust values and watch projections change in real time
//    perhaps a "focused" number?

type ProjectionType = {
  year: number;
  age: number;
  accountValues: number[];
  investmentValues: number[]; // indexes match data.investments
  dividends: number;
  income: number;
  taxes: number;
  expenses: number;
  delta: number;
};

const incrementByPercentage = (value: number, percentage: number = 0) =>
  value + (value * percentage) / 100;

const accountForInvestment = (data: DataType, investment: InvestmentType) =>
  investment.account
    ? data.accounts.find((account) => account.id === investment.account)
    : undefined;

const isQualified = (data: DataType, investment: InvestmentType) => {
  const account = accountForInvestment(data, investment);
  return account && account.qualified;
};

function App() {
  const [data, setData] = useState(initialData);

  const projections: ProjectionType[] = useMemo(() => {
    const year = new Date().getFullYear();
    const result = [];

    // initialize the first year based on current values
    let prior: ProjectionType = {
      year,
      age: data.global.age,
      accountValues: data.accounts.map((a) => a.value || 0),
      investmentValues: data.investments.map(
        (i) => (i.shares && i.price && i.shares * i.price) || 0
      ),
      dividends: 0,
      income: data.incomes.reduce((tot, income) => tot + income.value, 0),
      taxes: 0,
      expenses: data.expenses.reduce((tot, expense) => tot + expense.value, 0),
      delta: 0,
    };
    result.push(prior);

    // project future years
    while (prior.age < data.global.lifeExpectancy) {
      // dividends from the prior year's values
      const investmentDividends = prior.investmentValues.map(
        (value, index) =>
          (value * (data.investments[index].dividend || 0)) / 100
      );

      // total dividends from prior year
      const dividends = investmentDividends.reduce((tot, val) => tot + val, 0);

      // returns from the prior year's values
      const accountReturns = prior.accountValues.map((value, index) =>
        incrementByPercentage(value, data.accounts[index].return)
      );
      const investmentReturns = prior.investmentValues.map((value, index) =>
        incrementByPercentage(value, data.investments[index].return)
      );

      // current values account for returns and re-invested
      // dividends for qualified accounts
      const accountValues = prior.accountValues.map(
        (value, index) => accountReturns[index]
      );
      const investmentValues = prior.investmentValues.map(
        (value, index) =>
          investmentReturns[index] +
          ((isQualified(data, data.investments[index]) &&
            investmentDividends[index]) ||
            0)
      );

      // account for inflation in income and expenses
      const income = incrementByPercentage(prior.income, data.global.inflation);
      const expenses = incrementByPercentage(
        prior.expenses,
        data.global.inflation
      );

      // determine the tax for the adjusted gross income
      const adjustedGrossIncome = dividends + income;
      const tax = data.taxes.find(
        (tax) =>
          (tax.min || 0) < adjustedGrossIncome &&
          (!tax.max || tax.max > adjustedGrossIncome)
      );
      const taxes = tax ? (adjustedGrossIncome * tax.rate) / 100 : 0;

      const delta = income - (taxes + expenses);
      if (delta < 0) {
        let shortfall = Math.abs(delta);

        // pull from principle, starting from lowest priority
        const availableInvestments = data.investments
          .map(({ priority }, index) => ({
            index,
            priority: priority || 0,
            value: investmentValues[index],
          }))
          .filter(({ priority, value }) => value && priority)
          .sort(({ priority: p1 }, { priority: p2 }) => p2 - p1);
        const availableAccounts = data.accounts
          .map(({ priority }, index) => ({
            index,
            priority: priority || 0,
            value: accountValues[index],
          }))
          .filter(({ priority, value }) => value && priority)
          .sort(({ priority: p1 }, { priority: p2 }) => p2 - p1);

        while (
          shortfall &&
          (availableInvestments.length || availableAccounts.length)
        ) {
          const available = availableInvestments.shift();
          if (available) {
            if (shortfall < available.value) {
              investmentValues[available.index] -= shortfall;
              shortfall = 0;
            } else {
              shortfall -= investmentValues[available.index];
              investmentValues[available.index] = 0;
            }
          } else {
            const available = availableAccounts.shift();
            if (available) {
              if (shortfall < available.value) {
                accountValues[available.index] -= shortfall;
                shortfall = 0;
              } else {
                shortfall -= accountValues[available.index];
                accountValues[available.index] = 0;
              }
            }
          }
        }

        // if we still have shortfall, pull from accounts
      } else {
        // TODO: handle more income than taxes + expenses by investing
      }

      const current: ProjectionType = {
        year: prior.year + 1,
        age: prior.age + 1,
        accountValues,
        investmentValues,
        dividends,
        income,
        taxes,
        expenses,
        delta,
      };
      result.push(current);
      prior = current;
    }

    return result;
  }, [data]);

  // load saved data initially
  useEffect(() => {
    const buffer = localStorage.getItem("retirementData");
    if (buffer) {
      const data = JSON.parse(buffer);
      // upgrades
      if (!data.global)
        data.global = { inflation: 0.04, age: 55, lifeExpectancy: 95 };
      // if (!data.taxes) data.taxes = [];
      setData(data);
    }
  }, []);

  const updateData = useCallback(
    (func: (d: DataType) => void) => {
      const nextData = JSON.parse(JSON.stringify(data));
      func(nextData);
      localStorage.setItem("retirementData", JSON.stringify(nextData));
      setData(nextData);
    },
    [data]
  );

  const appContextValue = useMemo(
    () => ({ data, updateData }),
    [data, updateData]
  );

  return (
    <AppContext.Provider value={appContextValue}>
      <main>
        <header>
          <h1>Cool Beans</h1>
        </header>

        <Global />
        <Accounts />
        <Investments />
        <Incomes />
        <Taxes />
        <Expenses />

        <header>
          <h2>Projection</h2>
        </header>
        <table className="years">
          <thead>
            <tr>
              <th>year</th>
              <th>age</th>
              <th>delta</th>
              <th>expenses</th>
              <th>taxes</th>
              <th>income</th>
              <th>dividends</th>
              {data.investments.map((investment) => (
                <th key={investment.id}>{investment.name}</th>
              ))}
              {data.accounts.map((account) => (
                <th key={account.id}>{account.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projections.map((projection) => (
              <tr key={projection.year}>
                <td>{projection.year}</td>
                <td>{projection.age}</td>
                <td className="number">
                  ${Math.round(projection.delta).toLocaleString()}
                </td>
                <td className="number">
                  ${Math.round(projection.expenses).toLocaleString()}
                </td>
                <td className="number">
                  ${Math.round(projection.taxes).toLocaleString()}
                </td>
                <td className="number">
                  ${Math.round(projection.income).toLocaleString()}
                </td>
                <td className="number">
                  ${Math.round(projection.dividends).toLocaleString()}
                </td>
                {projection.investmentValues.map((value, index) => (
                  <td key={index} className="number">
                    ${Math.round(value).toLocaleString()}
                  </td>
                ))}
                {projection.accountValues.map((value, index) => (
                  <td key={index} className="number">
                    ${Math.round(value).toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </AppContext.Provider>
  );
}

export default App;
