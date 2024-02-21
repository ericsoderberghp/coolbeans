import React, { useContext, useMemo, useState } from "react";
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
  dividends: number;
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

export const Projections = () => {
  const { data } = useContext(AppContext);
  const [expanded, setExpanded] = useState(true);

  const projections: ProjectionType[] = useMemo(() => {
    const startYear = new Date().getFullYear();
    const result = [];
    const changed: { [key: string]: boolean } = {};

    // initialize the first year based on current values
    let prior: ProjectionType = {
      year: startYear,
      age: data.general.age,
      accounts: data.accounts.map((account) => {
        const investments = account.investments.map((investment) => ({
          investment,
          value:
            (investment.shares &&
              investment.price &&
              investment.shares * investment.price) ||
            0,
          dividends: 0,
        }));
        changed[account.id] = false;
        return {
          account,
          value:
            account.value || // if account has no value, sum investment values
            investments
              .map((i) => i.value)
              .reduce((tot, value) => tot + value, 0) ||
            0,
          dividends: 0,
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
    prior.income = prior.incomes
      .map((i) => i.value)
      .reduce((tot, value) => tot + value, 0);
    prior.expense = prior.expenses
      .map((e) => e.value)
      .reduce((tot, value) => tot + value, 0);

    result.push(prior);

    // project future years
    while (prior.age < data.general.until) {
      const year = prior.year + 1;

      // calculate account and investment performance
      const accounts = prior.accounts.map((a) => {
        const account = a.account;
        const investments = a.investments.map((i) => {
          const investment = i.investment;
          // dividends from the prior year's values
          const dividends = incrementByPercentage(i.value, investment.dividend);
          // returns from the prior year's values
          const returns = incrementByPercentage(i.value, investment.return);
          return {
            investment,
            value: returns + dividends, // re-invest for now
            dividends,
          };
        });
        const dividends = investments
          .map((i) => i.dividends)
          .reduce((tot, value) => tot + value, 0);
        return {
          account,
          value: incrementByPercentage(a.value, account.return),
          dividends,
          investments,
          change: false,
        };
      });

      const assets = accounts
        .map(
          (a) =>
            a.value +
            a.investments
              .map((i) => i.value)
              .reduce((tot, value) => tot + value, 0)
        )
        .reduce((tot, value) => tot + value, 0);

      const nonQualifiedDividends = accounts
        .map((a) => (!a.account.qualified && a.dividends) || 0)
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

      const income = incomes
        .map((i) => i.value)
        .reduce((tot, value) => tot + value, 0);

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

      // determine the tax for the adjusted gross income
      const adjustedGrossIncome = nonQualifiedDividends + income;
      const taxes = data.taxes.map((tax) => {
        const rate = tax.rates.find(
          (rate) =>
            (rate.min || 0) < adjustedGrossIncome &&
            (!rate.max || rate.max > adjustedGrossIncome)
        );
        const value = percentageOf(adjustedGrossIncome, rate?.rate || 0);
        return { tax, rate, value };
      });
      const tax = taxes
        .map((t) => t.value)
        .reduce((tot, value) => tot + value, 0);

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
        dividends: 0,
        income,
        tax,
        expense,
        delta,
      };
      result.push(current);
      prior = current;
    }

    return result;
  }, [data]);

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
              {/* <th className="number">dividends</th> */}
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
                <th scope="row" className="number">{projection.year}</th>
                <td className="number">{projection.age}</td>
                <td className="number">
                  ${Math.round(projection.delta).toLocaleString()}
                </td>
                <td className="number">
                  ${Math.round(projection.expense).toLocaleString()}
                </td>
                {expanded &&
                  data.expenses.length > 1 &&
                  projection.expenses.map(({ expense: { id }, value }) => (
                    <td key={id} className="number">
                      ${Math.round(value).toLocaleString()}
                    </td>
                  ))}
                <td className="number">
                  ${Math.round(projection.tax).toLocaleString()}
                </td>
                <td className="number">
                  ${Math.round(projection.income).toLocaleString()}
                </td>
                {expanded &&
                  projection.incomes.map(({ income: { id }, value }) => (
                    <td key={id} className="number">
                      ${Math.round(value).toLocaleString()}
                    </td>
                  ))}
                {/* <td className="number">
                ${Math.round(projection.dividends).toLocaleString()}
              </td> */}
                <td className="number">
                  ${Math.round(projection.assets).toLocaleString()}
                </td>
                {expanded &&
                  projection.accounts.map(
                    ({ account: { id }, value, investments, change }) => [
                      <td
                        key={id}
                        className={`number${change ? " change" : ""}`}
                      >
                        ${Math.round(value).toLocaleString()}
                      </td>,
                      investments.map(({ investment: { id }, value }) => (
                        <td key={id} className="number">
                          ${Math.round(value).toLocaleString()}
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
