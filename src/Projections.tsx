import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import {
  AccountType,
  DataType,
  ExpenseType,
  IncomeType,
  InvestmentType,
  TaxType,
} from "./Types";
import { General } from "./General";
import { humanDollars } from "./utils";

type ProjectionType = {
  year: number;
  age: number;
  accounts: {
    account: AccountType;
    value: number;
    dividends: number;
    sales: number;
    gains: number;
    investments: {
      investment: InvestmentType;
      value: number; // generally price * shares
      dividends: number;
      shares: number; // adjusted based on sales
      gains: number;
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
  dividends: number; // non-qualified dividend income
  sales: number; // value of assets sold
  gains: number; // non-qualified capital gains from sales of assets
  income: number;
  tax: number;
  expense: number;
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

const total = (tot: number, value: number) => tot + value;

// TODO: add comments!

const calculateTax = (income: number, gains: number, taxes: TaxType[]) => {
  const incomeTax = taxes
    .filter((tax) => tax.kind === "income")
    .map((tax) => {
      const rate = tax.rates.find(
        (rate) => (rate.min || 0) < income && (!rate.max || rate.max > income)
      );
      const value = percentageOf(income, rate?.rate || 0);
      return { tax, rate, value };
    })
    .map((t) => t.value)
    .reduce(total, 0);

  const capitalGainsTax = taxes
    .filter((tax) => tax.kind === "gains")
    .map((tax) => {
      const rate = tax.rates.find(
        (rate) => (rate.min || 0) < gains && (!rate.max || rate.max > gains)
      );
      const value = percentageOf(gains, rate?.rate || 0);
      return { tax, rate, value };
    })
    .map((t) => t.value)
    .reduce(total, 0);

  return incomeTax + capitalGainsTax;
};

const initialProjection = (data: DataType, year: number) => {
  let result: ProjectionType = {
    year,
    age: data.general.age,
    accounts: data.accounts
      .sort((a1, a2) => (a1.priority || 0) - (a2.priority || 0))
      .map((account) => {
        const investments = account.investments
          .sort((i1, i2) => (i1.priority || 0) - (i2.priority || 0))
          .map((investment) => {
            const { shares = 0, price = 0 } = investment;
            const value = shares * price;
            const dividends = percentageOf(value, investment.dividend);
            return { investment, value, dividends, shares, gains: 0 };
          });
        return {
          account,
          value:
            account.value || // if account has no value, sum investment values
            investments.map((i) => i.value).reduce(total, 0) ||
            0,
          dividends: account.qualified
            ? 0
            : (account.value &&
                account.dividend &&
                percentageOf(account.value, account.dividend)) ||
              investments.map((i) => i.dividends).reduce(total, 0),
          sales: 0,
          gains: 0,
          investments,
        };
      }),
    incomes: data.incomes.map((income) => ({
      income,
      value: (within(year, income.start, income.stop) && income.value) || 0,
    })),
    expenses: data.expenses.map((expense) => ({
      expense,
      value: (within(year, expense.start, expense.stop) && expense.value) || 0,
    })),
    assets: 0,
    dividends: 0,
    sales: 0,
    gains: 0,
    income: 0,
    tax: 0,
    expense: 0,
  };

  result.assets = result.accounts.map((a) => a.value).reduce(total, 0);
  result.dividends = result.accounts.map((a) => a.dividends).reduce(total, 0);
  result.income = result.incomes.map((i) => i.value).reduce(total, 0);
  result.expense = result.expenses.map((e) => e.value).reduce(total, 0);
  result.tax = calculateTax(result.income, result.gains, data.taxes);

  return result;
};

const accountPerformance = (prior: ProjectionType) =>
  prior.accounts.map((a) => {
    const { account, value: priorValue } = a;
    const { qualified, return: aReturn } = account;

    const investments = a.investments.map((i) => {
      const { investment, value: priorValue, shares } = i;
      const { dividend, return: iReturn } = investment;
      // dividends from the prior year's values
      const dividends = percentageOf(priorValue, dividend);
      // returns from the prior year's values plus
      // re-invest qualified dividends
      const value =
        incrementByPercentage(priorValue, iReturn) +
        (qualified ? dividends : 0);
      return {
        investment,
        value,
        // only inclue non-qualified dividends as income
        dividends: qualified ? 0 : dividends,
        shares, // carry over
        gains: 0,
      };
    });

    const dividends = investments.map((i) => i.dividends).reduce(total, 0);
    const investmentsValue = investments.map((i) => i.value).reduce(total, 0);

    // if the account has a value use that otherwise use investments value
    const value = account.value
      ? incrementByPercentage(priorValue, aReturn)
      : investmentsValue;

    return { account, value, dividends, sales: 0, gains: 0, investments };
  });

const adjustIncomesForInflation = (
  prior: ProjectionType,
  data: DataType,
  year: number
) =>
  prior.incomes.map((i) => {
    const income = i.income;
    let value = i.value;
    if (within(year, income.start, income.stop)) {
      // if we've started using an income already, increment it by inflation
      if (value) value = incrementByPercentage(value, data.general.inflation);
      // we haven't used it yet, start using it
      else value = income.value || 0;
    } else {
      // if this income is not in range of the current year, zero it
      value = 0;
    }
    return { income, value };
  });

const adjustExpensesForInflation = (
  prior: ProjectionType,
  data: DataType,
  year: number
) =>
  prior.expenses.map((e) => {
    const expense = e.expense;
    let value = e.value;
    if (within(year, expense.start, expense.stop)) {
      // if we've started using an expense already, increment it by inflation
      if (value) value = incrementByPercentage(value, data.general.inflation);
      // we haven't used it yet, start using it
      else value = expense.value || 0;
    } else {
      // if this expense is not in range of the current year, zero it
      value = 0;
    }
    return { expense, value };
  });

export const Projections = () => {
  const { data } = useContext(AppContext);
  const [expanded, setExpanded] = useState(true);

  const projections: ProjectionType[] = useMemo(() => {
    const startYear = new Date().getFullYear();
    const result = [];

    // initialize the first year based on current values
    let prior = initialProjection(data, startYear);

    // project future years
    while (prior.age < data.general.until) {
      const year = prior.year + 1;

      // calculate account and investment performance
      const accounts = accountPerformance(prior);

      const assets = accounts.map((a) => a.value).reduce(total, 0);
      // dividends here are non-qualified
      const dividends = accounts.map((a) => a.dividends || 0).reduce(total, 0);

      // adjust incomes and expenses for inflation
      const incomes = adjustIncomesForInflation(prior, data, year);
      const expenses = adjustExpensesForInflation(prior, data, year);

      // include non-qualified dividends in income
      const income = incomes.map((i) => i.value).reduce(total, 0) + dividends;
      const expense = expenses.map((e) => e.value).reduce(total, 0);

      // tracks selling assets to pay for expenses and taxes
      let sales = 0;
      let gains = 0;

      // determine the initial tax for the income
      // if we sell any stocks below, any capital gains will increase tax
      let tax = calculateTax(income, gains, data.taxes);

      if (income + sales < tax + expense) {
        let shortfall = tax + expense - (income + sales);

        // pull from assets, starting from lowest priority
        const orderedAccounts = accounts.slice(0);

        while (shortfall && orderedAccounts.length) {
          const acc = orderedAccounts.shift();
          if (acc) {
            if (acc.investments.length) {
              const orderedInvestments = acc.investments.slice(0);
              while (shortfall && orderedInvestments.length) {
                const inv = orderedInvestments.shift();
                if (inv && inv.value) {
                  const { basis = 0, shares = 0 } = inv.investment;
                  const minSale = Math.min(shortfall, inv.value);
                  // inv.value is what we expect it to be for this year
                  // based on investment returns.
                  // inv.shares is how many shares we have left.
                  const shareValue = inv.value / inv.shares;
                  // no fractional shares
                  const sharesSold = Math.ceil(minSale / shareValue);
                  const sales = shareValue * sharesSold;
                  const basisShareValue = Math.ceil(basis / shares);
                  const investmentGains = sales - basisShareValue * sharesSold;
                  inv.value -= sales;
                  inv.shares -= sharesSold;
                  inv.gains = investmentGains;
                  shortfall -= sales;
                  gains += investmentGains;
                  // re-calculate tax since we've increased gains
                  tax = calculateTax(income, gains, data.taxes);
                  // in case we could pay any additional tax from the same
                  // investment, re-evaluate it
                  // probably could be smarter about this
                  // if (shortfall) orderedInvestments.unshift(inv);
                }
              }
            } else {
              const sale = Math.min(shortfall, acc.value);
              acc.value -= sale;
              shortfall -= sale;
              acc.sales += sale;
              // TODO: calculate capital gains when no investments
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
        sales,
        gains,
        income,
        tax,
        expense,
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
              <th className="number">sales</th>
              <th className="number">capital gains</th>
              <th className="number">assets</th>
              {expanded &&
                data.accounts.sort().map((account) => [
                  <th key={account.id} className="number">
                    {account.name}
                  </th>,
                  account.investments.sort().map((investment) => (
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
                <td className="number">{humanDollars(projection.sales)}</td>
                <td className="number">{humanDollars(projection.gains)}</td>
                <td className="number">{humanDollars(projection.assets)}</td>
                {expanded &&
                  projection.accounts.map(
                    ({ account: { id }, value, investments }) => [
                      <td key={id} className="number">
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
