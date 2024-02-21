import React, { useCallback, useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import { AccountType, ExpenseType, IncomeType, InvestmentType } from "./Types";
import { General } from "./General";

type ProjectionType = {
  year: number;
  age: number;
  accounts: {
    account: AccountType;
    value: number;
    dividends: number;
    change: boolean;
    investments: {
      investment: InvestmentType;
      value: number;
      dividends: number;
    }[];
  }[];
  incomes: {
    income: IncomeType;
    value: number;
  }[];
  expenses: {
    expense: ExpenseType;
    value: number;
  }[];
  assets: number;
  dividends: number; // non-qualified income
  income: number;
  tax: number;
  expense: number;
  delta: number;
};

const percentageOf = (value: number, percentage: number = 0) =>
  (value * percentage) / 100;

const incrementByPercentage = (value: number, percentage: number = 0) =>
  value + (value * percentage) / 100;

const within = (year: number, start?: string, stop?: string) => {
  const midYear = `${year}-07-01`;
  if (start && start > midYear) return false;
  if (stop && stop < midYear) return false;
  return true;
};

const humanDollars = (value: number) =>
  value ? `$${Math.round(value).toLocaleString()}` : "";

export const Projections = () => {
  const { data } = useContext(AppContext);
  const [expanded, setExpanded] = useState(true);

  const calculateTax = useCallback((income: number) =>
    data.taxes
      .map((tax) => {
        const rate = tax.rates.find(
          (rate) => (rate.min || 0) < income && (!rate.max || rate.max > income)
        );
        const value = percentageOf(income, rate?.rate || 0);
        return { tax, rate, value };
      })
      .map((t) => t.value)
      .reduce((tot, value) => tot + value, 0), [data]);

  const projections: ProjectionType[] = useMemo(() => {
    const startYear = new Date().getFullYear();
    const result = [];
    const changed: { [key: string]: boolean } = {};

    // initialize the first year based on current values
    let prior: ProjectionType = {
      year: startYear,
      age: data.general.age,
      accounts: data.accounts.map((account) => {
        const investments = account.investments.map((investment) => {
          const value =
            (investment.shares &&
              investment.price &&
              investment.shares * investment.price) ||
            0;
          return {
            investment,
            value,
            dividends: percentageOf(value, investment.dividend),
          };
        });
        changed[account.id] = false;
        return {
          account,
          value:
            account.value || // if account has no value, sum investment values
            investments
              .map((i) => i.value)
              .reduce((tot, value) => tot + value, 0) ||
            0,
          dividends: account.qualified
            ? 0
            : (account.value &&
                account.dividend &&
                percentageOf(account.value, account.dividend)) ||
              investments
                .map((i) => i.dividends)
                .reduce((tot, value) => tot + value, 0),
          investments,
          change: false,
        };
      }),
      incomes: data.incomes.map((income) => ({
        income,
        value:
          (within(startYear, income.start, income.stop) && income.value) || 0,
      })),
      expenses: data.expenses.map((expense) => ({
        expense,
        value:
          (within(startYear, expense.start, expense.stop) && expense.value) ||
          0,
      })),
      assets: 0,
      dividends: 0,
      income: 0,
      tax: 0,
      expense: 0,
      delta: 0,
    };

    prior.assets = prior.accounts
      .map((a) => a.value)
      .reduce((tot, value) => tot + value, 0);
    prior.dividends = prior.accounts
      .map((a) => a.dividends)
      .reduce((tot, value) => tot + value, 0);
    prior.income = prior.incomes
      .map((i) => i.value)
      .reduce((tot, value) => tot + value, 0);
    prior.expense = prior.expenses
      .map((e) => e.value)
      .reduce((tot, value) => tot + value, 0);
    prior.tax = calculateTax(prior.income);

    // project future years
    while (prior.age < data.general.until) {
      const year = prior.year + 1;

      // calculate account and investment performance
      const accounts = prior.accounts.map((a) => {
        const account = a.account;
        const investments = a.investments.map((i) => {
          const investment = i.investment;
          // dividends from the prior year's values
          const dividends = percentageOf(i.value, investment.dividend);
          // returns from the prior year's values plus
          // re-invest qualified dividends
          const value =
            incrementByPercentage(i.value, investment.return) +
            (account.qualified ? dividends : 0);
          return {
            investment,
            value,
            // only inclue non-qualified dividends as income
            dividends: account.qualified ? 0 : dividends,
          };
        });
        const dividends = investments
          .map((i) => i.dividends)
          .reduce((tot, dividend) => tot + dividend, 0);
        const investmentsValue = investments
          .map((i) => i.value)
          .reduce((tot, value) => tot + value, 0);
        // if the account has a value use that otherwise use investments value
        const value = account.value
          ? incrementByPercentage(a.value, account.return)
          : investmentsValue;
        return {
          account,
          value,
          dividends,
          investments,
          change: false,
        };
      });

      const assets = accounts
        .map((a) => a.value)
        .reduce((tot, value) => tot + value, 0);
      const dividends = accounts
        .map((a) => a.dividends || 0)
        .reduce((tot, value) => tot + value, 0);

      const incomes = prior.incomes.map((i) => {
        const income = i.income;
        let value = i.value;
        if (within(year, income.start, income.stop)) {
          // if we've started using an income already, increment it by inflation
          if (value)
            value = incrementByPercentage(value, data.general.inflation);
          // we haven't used it yet, start using it
          else value = income.value || 0;
        } else {
          // if this income is not in range of the current year, zero it
          value = 0;
        }
        return { income, value };
      });

      const income =
        incomes.map((i) => i.value).reduce((tot, value) => tot + value, 0) +
        dividends;

      const expenses = prior.expenses.map((e) => {
        const expense = e.expense;
        let value = e.value;
        if (within(year, expense.start, expense.stop)) {
          // if we've started using an expense already, increment it by inflation
          if (value)
            value = incrementByPercentage(value, data.general.inflation);
          // we haven't used it yet, start using it
          else value = expense.value || 0;
        } else {
          // if this expense is not in range of the current year, zero it
          value = 0;
        }
        return { expense, value };
      });

      const expense = expenses
        .map((e) => e.value)
        .reduce((tot, value) => tot + value, 0);

      // determine the tax for the income
      const tax = calculateTax(income);

      const delta = income - (tax + expense);
      if (delta < 0) {
        let shortfall = Math.abs(delta);

        // pull from assets, starting from lowest priority
        const orderedAccounts = accounts.toSorted(
          (a1, a2) => (a1.account.priority || 0) - (a2.account.priority || 0)
        );

        while (shortfall && orderedAccounts.length) {
          const acc = orderedAccounts.shift();
          if (acc) {
            if (acc.investments.length) {
              const orderedInvestments = acc.investments.toSorted(
                (i1, i2) =>
                  (i1.investment.priority || 0) - (i2.investment.priority || 0)
              );
              while (shortfall && orderedInvestments.length) {
                const inv = orderedInvestments.shift();
                if (inv) {
                  if (shortfall < inv.value) {
                    inv.value -= shortfall;
                    shortfall = 0;
                  } else {
                    shortfall -= inv.value;
                    inv.value = 0;
                  }
                }
              }
            } else {
              if (shortfall < acc.value) {
                acc.value -= shortfall;
                shortfall = 0;
                acc.change = !changed[acc.account.id] && true;
                changed[acc.account.id] = true;
              } else {
                shortfall -= acc.value;
                acc.value = 0;
                acc.change = !changed[acc.account.id] && true;
                changed[acc.account.id] = true;
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
        accounts,
        incomes,
        expenses,
        assets,
        dividends,
        income,
        tax,
        expense,
        delta,
      };
      result.push(current);
      prior = current;
    }

    return result;
  }, [data, calculateTax]);

  return (
    <section>
      <header>
        <h2>Projections</h2>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? "collapse" : "expand"}
        </button>
      </header>
      <General />
      <div className="tableContainer">
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
                  <th key={expense.id} className="number">
                    {expense.name}
                  </th>
                ))}
              <th className="number">taxes</th>
              <th className="number">income</th>
              {expanded &&
                data.incomes.map((income) => (
                  <th key={income.id} className="number">
                    {income.name}
                  </th>
                ))}
              <th className="number">dividends</th>
              <th className="number">assets</th>
              {expanded &&
                data.accounts.map((account) => [
                  <th key={account.id} className="number">
                    {account.name}
                  </th>,
                  account.investments.map((investment) => (
                    <th key={investment.id} className="number">
                      {investment.name}
                    </th>
                  )),
                ])}
            </tr>
          </thead>
          <tbody>
            {projections.map((projection) => (
              <tr key={projection.year}>
                <th scope="row" className="number">
                  {projection.year}
                </th>
                <td className="number">{projection.age}</td>
                <td className="number">{humanDollars(projection.delta)}</td>
                <td className="number">{humanDollars(projection.expense)}</td>
                {expanded &&
                  data.expenses.length > 1 &&
                  projection.expenses.map(({ expense: { id }, value }) => (
                    <td key={id} className="number">
                      {humanDollars(value)}
                    </td>
                  ))}
                <td className="number">{humanDollars(projection.tax)}</td>
                <td className="number">{humanDollars(projection.income)}</td>
                {expanded &&
                  projection.incomes.map(({ income: { id }, value }) => (
                    <td key={id} className="number">
                      {humanDollars(value)}
                    </td>
                  ))}
                <td className="number">{humanDollars(projection.dividends)}</td>
                <td className="number">{humanDollars(projection.assets)}</td>
                {expanded &&
                  projection.accounts.map(
                    ({ account: { id }, value, investments, change }) => [
                      <td
                        key={id}
                        className={`number${change ? " change" : ""}`}
                      >
                        {humanDollars(value)}
                      </td>,
                      investments.map(({ investment: { id }, value }) => (
                        <td key={id} className="number">
                          {humanDollars(value)}
                        </td>
                      )),
                    ]
                  )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
