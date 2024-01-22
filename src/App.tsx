import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { AppContext, initialData } from "./AppContext";
import { DataType, InvestmentType } from "./Types";
import { General } from "./General";
import { Accounts } from "./Accounts";
import { Investments } from "./Investments";
import { Incomes } from "./Incomes";
import { Taxes } from "./Taxes";
import { Expenses } from "./Expenses";

// TODO:
// - styling
// - re-design how Projections are structured to allow styling cues such as
//   when an investment or account starts and stops being drawn
// - handle taxes on IRA withdrawls
// - handle taxes on capital gains from investments
// - multiple data sets, to allow showing different scenarios
// - implement asset classes?
// - use API to get current stock prices
// - invest extra income
// - Medicare
// - branding
// - charts
// - slider controls to adjust values and watch projections change in real time
//    perhaps a "focused" number?

type ProjectionType = {
  year: number;
  age: number;
  accountValues: number[]; // indexes match data.accounts
  investmentValues: number[]; // indexes match data.investments
  incomeValues: number[]; // indexes match data.incomes
  expenseValues: number[]; // indexes match data.expenses
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

const within = (year: number, start?: string, stop?: string) => {
  const midYear = `${year}-07-01`;
  if (start && start > midYear) return false;
  if (stop && stop < midYear) return false;
  return true;
};

function App() {
  const [data, setData] = useState(initialData);

  const projections: ProjectionType[] = useMemo(() => {
    const startYear = new Date().getFullYear();
    const result = [];

    // initialize the first year based on current values
    let prior: ProjectionType = {
      year: startYear,
      age: data.general.age,
      accountValues: data.accounts.map((a) => a.value || 0),
      investmentValues: data.investments.map(
        (i) => (i.shares && i.price && i.shares * i.price) || 0
      ),
      incomeValues: data.incomes.map(
        (income) =>
          (within(startYear, income.start, income.stop) && income.value) || 0
      ),
      expenseValues: data.expenses.map(
        (expense) =>
          (within(startYear, expense.start, expense.stop) && expense.value) || 0
      ),
      dividends: 0,
      income: 0,
      taxes: 0,
      expenses: 0,
      delta: 0,
    };
    prior.income = prior.incomeValues.reduce((tot, value) => tot + value, 0);
    prior.expenses = prior.expenseValues.reduce((tot, value) => tot + value, 0);
    result.push(prior);

    // project future years
    while (prior.age < data.general.lifeExpectancy) {
      const year = prior.year + 1;

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

      const incomeValues = prior.incomeValues.map((value, index) => {
        const income = data.incomes[index];
        if (within(year, income.start, income.stop)) {
          // if we've started using an income already, increment it by inflation
          if (value) return incrementByPercentage(value, data.general.inflation);
          // we haven't used it yet, start using it
          return income.value || 0;
        }
        // if this income is not in range of the current year, zero it
        return 0;
      });
      const income = incomeValues.reduce((tot, value) => tot + value, 0);

      const expenseValues = prior.expenseValues.map((value, index) => {
        const expense = data.expenses[index];
        if (within(year, expense.start, expense.stop)) {
          // if we've started using an expense already, increment it by inflation
          if (value) return incrementByPercentage(value, data.general.inflation);
          // we haven't used it yet, start using it
          return expense.value || 0;
        }
        // if this expense is not in range of the current year, zero it
        return 0;
      });
      const expenses = expenseValues.reduce((tot, value) => tot + value, 0);

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
      } else {
        // TODO: handle more income than taxes + expenses by investing
      }

      const current: ProjectionType = {
        year,
        age: prior.age + 1,
        accountValues,
        investmentValues,
        incomeValues,
        expenseValues,
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
      if (!data.general) {
        data.general = data.global;
        delete data.global;
      }
      // if (!data.global)
      //   data.global = { inflation: 0.04, age: 55, lifeExpectancy: 95 };
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

        <General />
        <Accounts />
        <Investments />
        <Incomes />
        <Taxes />
        <Expenses />

        <header>
          <h2>Projection</h2>
        </header>
        {/* <div>within {JSON.stringify(within(2038, '2037-01-01', ''))}</div> */}
        <table className="years">
          <thead>
            <tr>
              <th>year</th>
              <th>age</th>
              <th>delta</th>
              <th>expenses</th>
              {data.expenses.length > 1 &&
                data.expenses.map((expense) => (
                  <th key={expense.id}>{expense.name}</th>
                ))}
              <th>taxes</th>
              <th>income</th>
              {data.incomes.map((income) => (
                <th key={income.id}>{income.name}</th>
              ))}
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
                {data.expenses.length > 1 &&
                  projection.expenseValues.map((value, index) => (
                    <td key={index} className="number">
                      ${Math.round(value).toLocaleString()}
                    </td>
                  ))}
                <td className="number">
                  ${Math.round(projection.taxes).toLocaleString()}
                </td>
                <td className="number">
                  ${Math.round(projection.income).toLocaleString()}
                </td>
                {projection.incomeValues.map((value, index) => (
                  <td key={index} className="number">
                    ${Math.round(value).toLocaleString()}
                  </td>
                ))}
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
