import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import { DataType, InvestmentType } from "./Types";

type ProjectionType = {
  year: number;
  age: number;
  accountValues: number[]; // indexes match data.accounts
  investmentValues: number[]; // indexes match data.investments
  incomeValues: number[]; // indexes match data.incomes
  expenseValues: number[]; // indexes match data.expenses
  assets: number;
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

export const Projections = () => {
  const { data } = useContext(AppContext);
  const [expanded, setExpanded] = useState(true);

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
      assets: 0,
      dividends: 0,
      income: 0,
      taxes: 0,
      expenses: 0,
      delta: 0,
    };
    prior.assets = prior.accountValues.reduce((tot, value) => tot + value, 0);
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
      const assets = accountValues.reduce((tot, value) => tot + value, 0);

      const incomeValues = prior.incomeValues.map((value, index) => {
        const income = data.incomes[index];
        if (within(year, income.start, income.stop)) {
          // if we've started using an income already, increment it by inflation
          if (value)
            return incrementByPercentage(value, data.general.inflation);
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
          if (value)
            return incrementByPercentage(value, data.general.inflation);
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
        assets,
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

  return (
    <div>
      <header>
        <h2>Projections</h2>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? "collapse" : "expand"}
        </button>
      </header>
      {/* <div>within {JSON.stringify(within(2038, '2037-01-01', ''))}</div> */}
      <table className="years">
        <thead>
          <tr>
            <th className="number">year</th>
            <th className="number">age</th>
            <th className="number">delta</th>
            <th className="number">expenses</th>
            {expanded &&
              data.expenses.length > 1 &&
              data.expenses.map((expense) => (
                <th key={expense.id}>{expense.name}</th>
              ))}
            <th className="number">taxes</th>
            <th className="number">income</th>
            {expanded &&
              data.incomes.map((income) => (
                <th key={income.id}>{income.name}</th>
              ))}
            <th className="number">dividends</th>
            <th className="number">assets</th>
            {expanded &&
              data.accounts.map((account) => (
                <th key={account.id}>{account.name}</th>
              ))}
            {expanded &&
              data.investments.map((investment) => (
                <th key={investment.id}>{investment.name}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {projections.map((projection) => (
            <tr key={projection.year}>
              <td className="number">{projection.year}</td>
              <td className="number">{projection.age}</td>
              <td className="number">
                ${Math.round(projection.delta).toLocaleString()}
              </td>
              <td className="number">
                ${Math.round(projection.expenses).toLocaleString()}
              </td>
              {expanded &&
                data.expenses.length > 1 &&
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
              {expanded &&
                projection.incomeValues.map((value, index) => (
                  <td key={index} className="number">
                    ${Math.round(value).toLocaleString()}
                  </td>
                ))}
              <td className="number">
                ${Math.round(projection.dividends).toLocaleString()}
              </td>
              <td className="number">
                ${Math.round(projection.assets).toLocaleString()}
              </td>
              {expanded &&
                projection.accountValues.map((value, index) => (
                  <td key={index} className="number">
                    ${Math.round(value).toLocaleString()}
                  </td>
                ))}
              {expanded &&
                projection.investmentValues.map((value, index) => (
                  <td key={index} className="number">
                    ${Math.round(value).toLocaleString()}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
