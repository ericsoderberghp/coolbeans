import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import {
  AccountType,
  DataType,
  ExpenseType,
  IncomeType,
  InvestmentType,
  TaxType,
  PricesType,
} from "./Types";
import { General } from "./General";
import { humanMoney } from "./utils";

type ProjectionAccountType = {
  account: AccountType;
  value: number;
  // unsoldValue is used to estimate gains on non-qualified accounts
  // without individual assets
  unsoldValue: number;
  // for non-qualified accounts
  dividends: number;
  // sales of investments or value for accounts without individual assets
  sales: number;
  // qualified account sales counted as income
  income: number;
  // capital gains associate of sales from non-qualified accounts
  gains: number;
  investments: {
    investment: InvestmentType;
    // adjusted based on sales
    shares: number;
    // generally price * shares
    value: number;
    // for non-qualified accounts
    dividends: number;
    // value of sales of shares
    sales: number;
    // qualified account sales counted as income
    income: number;
    // capital gains associate of sales from non-qualified accounts
    gains: number;
  }[];
};

type ProjectionTransactionType = {
  name: string;
  kind: "bought" | "sold";
  shares?: number;
  value: number;
};

type ProjectionType = {
  year: number;
  age: number;
  accounts: ProjectionAccountType[];
  incomes: {
    income: IncomeType;
    value: number;
  }[];
  expenses: {
    expense: ExpenseType;
    value: number;
  }[];
  // sum of values in accounts
  assets: number;
  // non-qualified dividend income
  dividends: number;
  // value of assets sold, includes both qualified distribution income and
  // capital gains
  sales: number;
  // non-qualified capital gains from sales of assets
  gains: number;
  // sum of income plus non capital gains sales
  income: number;
  // tax on both income and gains
  tax: number;
  // sum of expenses
  expense: number;
  // track individual stock sales
  transactions: ProjectionTransactionType[];
};

const percentageOf = (value: number, percentage: number = 0) =>
  (value * percentage) / 100;

const incrementByPercentage = (value: number, percentage: number = 0) =>
  value + (value * percentage) / 100;

const within = (
  year: number,
  frequency: number,
  start?: string,
  stop?: string
) => {
  const midYear = `${year}-07-01`;
  const startYear = start ? Number(start.split("-")[0]) : 0;
  if (start && start > midYear) return false;
  if (stop && stop < midYear) return false;
  if (startYear && (year - startYear) % frequency !== 0) return false;
  return true;
};

const total = (tot: number, value: number) => tot + value;

const shouldReinvestDividends = (account: AccountType) =>
  account.kind === "IRA" || account.kind === "Roth IRA";

const shouldClaimGainsWhenSelling = (account: AccountType) =>
  account.kind === "brokerage";

const shouldClaimIncomeWhenSelling = (account: AccountType) =>
  account.kind === "IRA" ||
  account.kind === "Roth IRA" ||
  account.kind === "pension";

const shouldTakeRequiredDistributions = (account: AccountType) =>
  account.kind === "IRA" || account.kind === "401k";

// calculates the tax on both the income and capital gains
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

// build the projection for the first year we are tracking
const initialProjection = (data: DataType, year: number, prices: PricesType) => {
  let result: ProjectionType = {
    year,
    age: data.general.age,
    accounts: data.accounts
      .sort((a1, a2) => (a1.priority || 0) - (a2.priority || 0))
      .map((account) => {
        const investments = account.investments
          .sort((i1, i2) => (i1.priority || 0) - (i2.priority || 0))
          .map((investment) => {
            const { shares = 0 } = investment;
            const price = prices?.[investment.name]?.price || investment.price || 0;
            const value = shares * price;
            const dividends = percentageOf(value, investment.dividend);
            return {
              investment,
              value,
              dividends,
              shares,
              sales: 0,
              income: 0,
              gains: 0,
            };
          });
        const value =
          account.value || // if account has no value, sum investment values
          investments.map((i) => i.value).reduce(total, 0) ||
          0;
        return {
          account,
          value,
          unsoldValue: value, // used to estimate gains when no investments
          dividends: shouldReinvestDividends(account)
            ? 0
            : (account.value &&
                account.dividend &&
                percentageOf(account.value, account.dividend)) ||
              investments.map((i) => i.dividends).reduce(total, 0),
          sales: 0,
          income: 0,
          gains: 0,
          investments,
        };
      }),
    incomes: data.incomes.map((income) => ({
      income,
      value: (within(year, 1, income.start, income.stop) && income.value) || 0,
    })),
    expenses: data.expenses.map((expense) => ({
      expense,
      value: expense.value,
    })),
    assets: 0,
    dividends: 0,
    sales: 0,
    gains: 0,
    income: 0,
    tax: 0,
    expense: 0,
    transactions: [],
  };

  result.assets = result.accounts.map((a) => a.value).reduce(total, 0);
  result.dividends = result.accounts.map((a) => a.dividends).reduce(total, 0);
  result.income = result.incomes.map((i) => i.value).reduce(total, 0);
  result.expense = result.expenses.map((e) => e.value).reduce(total, 0);
  result.tax = calculateTax(result.income, result.gains, data.taxes);

  return result;
};

// take prior year accounts, calculate investment performance, and return
// new accounts for the next year
const accountPerformance = (prior: ProjectionType) =>
  prior.accounts.map((a) => {
    const { account, value: priorValue, unsoldValue: priorUnsoldValue } = a;
    const { return: aReturn } = account;

    const investments = a.investments.map((i) => {
      const { investment, value: priorValue, shares: priorShares } = i;
      const { dividend, return: iReturn } = investment;
      // dividends from the prior year's value
      const dividends = percentageOf(priorValue, dividend);
      // returns from the prior year's value plus
      // re-invest qualified dividends
      const value =
        incrementByPercentage(priorValue, iReturn) +
        (shouldReinvestDividends(account) ? dividends : 0);
      // If the investment has a $1 price, assume it is a cash/money investment
      // where re-invested dividends mean an increase in shares, to preserve
      // a NAV of $1.
      // Otherwise, carry over from prior year. We will decrement for this
      // year if and when we sell
      let shares =
        investment.price === 1 && shouldReinvestDividends(account)
          ? Math.round(value)
          : priorShares;
      return {
        investment,
        value,
        dividends: shouldReinvestDividends(account) ? 0 : dividends,
        shares,
        sales: 0,
        income: 0,
        gains: 0,
      };
    });

    const dividends = investments.map((i) => i.dividends).reduce(total, 0);
    const investmentsValue = investments.map((i) => i.value).reduce(total, 0);

    // if the account has a value use that otherwise use investments value
    const value = account.value
      ? incrementByPercentage(priorValue, aReturn)
      : investmentsValue;
    const unsoldValue = account.value
      ? incrementByPercentage(priorUnsoldValue, aReturn)
      : 0;

    return {
      account,
      value,
      unsoldValue,
      dividends,
      sales: 0,
      income: 0,
      gains: 0,
      investments,
    };
  });

// take prior year's incomes, return new incomes with values
// adjusted for inflation
const adjustIncomesForInflation = (
  prior: ProjectionType,
  data: DataType,
  year: number
) =>
  prior.incomes.map((i) => {
    const income = i.income;
    let value = i.value;
    if (within(year, 1, income.start, income.stop)) {
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

// take prior year's expenses, return new expenses with values
// adjusted for inflation
const adjustExpensesForInflation = (
  prior: ProjectionType,
  data: DataType,
  year: number
) =>
  prior.expenses.map((e) => {
    const expense = e.expense;
    // we don't check within() here because we want the expense to compound
    // with inflation
    const value = incrementByPercentage(e.value, data.general.inflation);
    return { expense, value };
  });

// sell assets in the specified account
const sellAssets = (
  amount: number,
  acc: ProjectionAccountType,
  projection: ProjectionType
): number => {
  let amountStillNeeded = amount;

  if (acc.investments.length) {
    // this account has investments, sell something from them
    const investments = acc.investments.slice(0);
    while (amountStillNeeded > 0 && investments.length) {
      const inv = investments.shift();
      if (inv && inv.value) {
        const { basis = 0, shares = 0 } = inv.investment;
        const minSale = Math.min(amountStillNeeded, inv.value);
        // inv.value is this year's value based on investment returns.
        // inv.shares is how many shares we have left.
        const shareValue = inv.value / inv.shares;
        // no fractional shares
        const sharesSold = Math.ceil(minSale / shareValue);
        const sale = shareValue * sharesSold;
        inv.value -= sale;
        inv.shares -= sharesSold;
        inv.sales += sale;
        acc.sales += sale;
        projection.sales += sale;
        amountStillNeeded -= sale;

        projection.transactions.push({
          name: inv.investment.name,
          kind: "sold",
          shares: sharesSold,
          value: sale,
        });

        if (shouldClaimIncomeWhenSelling(acc.account)) {
          // for qualified accounts, withdrawing is income
          projection.income += sale;
        } else if (shouldClaimGainsWhenSelling(acc.account)) {
          const basisShareValue = Math.ceil(basis / shares);
          const investmentGains = sale - basisShareValue * sharesSold;
          inv.gains = investmentGains;
          projection.gains += investmentGains;
        }
      }
    }
  } else {
    // no investments for this account, just reduce account value
    if (acc.value) {
      const sale = Math.min(amountStillNeeded, acc.value);
      acc.value -= sale;
      acc.sales += sale;
      projection.sales += sale;
      amountStillNeeded -= sale;

      projection.transactions.push({
        name: acc.account.name,
        kind: "sold",
        value: sale,
      });

      if (shouldClaimIncomeWhenSelling(acc.account)) {
        // for qualified accounts, withdrawing is income
        projection.income += sale;
      } else if (shouldClaimGainsWhenSelling(acc.account)) {
        // estimate gains for non-qualified accounts without investments
        // how much has this account grown up to now?
        const increase = acc.unsoldValue - (acc.account.value || 0);
        // percent of original assets in the account
        const percent = sale / acc.unsoldValue;
        projection.gains += increase * percent;
      }
    }
  }

  return amountStillNeeded;
};

// calculate any require minimum distributions for this year
// from qualified accounts
const takeRequiredDistributions = (
  projection: ProjectionType,
  data: DataType
) => {
  if (projection.age > 72) {
    projection.accounts.forEach((acc) => {
      const { account } = acc;
      if (shouldTakeRequiredDistributions(account)) {
        const rmd = data.rmds.find((rmd) => rmd.age === projection.age);
        if (rmd) {
          // RMD distribution is calculated by dividing the current value by
          // the distribution number for this age
          const distribution = acc.value / rmd.distribution;
          sellAssets(distribution, acc, projection);
        }
      }
    });
  }
};

type TrendProps = {
  current?: number;
  prior?: number;
  prePrior?: number;
};

const Trend = (props: TrendProps) => {
  const { current, prior, prePrior } = props;
  if (current && prior && prePrior) {
    if (current > prior && prior < prePrior)
      // switch to increasing
      return (
        <svg className="trend up" viewBox="0 0 16 16">
          <path d="M8,14 L8,1 L1,8 M14,8 L8,1" />
        </svg>
      );
    else if (current < prior && prior > prePrior)
      // switch to decreasing
      return (
        <svg className="trend down" viewBox="0 0 16 16">
          <path d="M8,1 L8,14 L14,8 M1,8 L8,14" />
        </svg>
      );
  }
  return null;
};

export const Projections = () => {
  const { data, showHelp, hideMoney, prices } = useContext(AppContext);
  const [expanded, setExpanded] = useState(true);

  // const projections: ProjectionType[] = [];
  const projections: ProjectionType[] = useMemo(() => {
    const startYear = new Date().getFullYear();

    // initialize the first year based on current values
    let prior = initialProjection(data, startYear, prices);
    const result = [];

    // project future years
    while (prior.age < data.general.until) {
      const year = prior.year + 1;

      const current: ProjectionType = {
        year,
        age: prior.age + 1,
        // calculate account and investment performance
        accounts: accountPerformance(prior),
        incomes: adjustIncomesForInflation(prior, data, year),
        expenses: adjustExpensesForInflation(prior, data, year),
        assets: 0,
        // dividends here are non-qualified
        dividends: 0,
        sales: 0,
        gains: 0,
        income: 0,
        tax: 0,
        expense: 0,
        transactions: [],
      };

      current.dividends = current.accounts
        .map((a) => a.dividends || 0)
        .reduce(total, 0);

      // take any required distributions, this could change account value and sales
      takeRequiredDistributions(current, data);

      current.assets = current.accounts.map((a) => a.value).reduce(total, 0);

      // include non-qualified dividends in income
      // if we withdraw from qualified accounts, that will count as income
      current.income =
        current.incomes.map((i) => i.value).reduce(total, 0) +
        current.dividends;
      current.expense = current.expenses
        .filter((e) =>
          within(year, e.expense.frequency, e.expense.start, e.expense.stop)
        )
        .map((e) => e.value)
        .reduce(total, 0);

      // tracks selling assets to pay for expenses and taxes,
      // may have already sold some due to required minimum distributions
      current.sales = current.accounts
        .map((a) => a.sales || 0)
        .reduce(total, 0);

      // determine the initial tax for the income
      // if we sell any stocks, any capital gains will increase tax
      current.tax = calculateTax(current.income, current.gains, data.taxes);

      const delta =
        current.income + current.sales - (current.tax + current.expense);
      if (delta < 0) {
        let shortfall = Math.abs(delta);
        // pull from assets, starting from lowest priority
        const orderedAccounts = current.accounts.slice(0);

        while (shortfall > 0 && orderedAccounts.length) {
          const acc = orderedAccounts.shift();
          if (acc) {
            shortfall = sellAssets(shortfall, acc, current);
            // re-calculate tax since we may have increased gains or income
            current.tax = calculateTax(
              current.income,
              current.gains,
              data.taxes
            );
          }
        }
      } else if (delta > 0) {
        // deposit surplus income
        const surplus = delta;
        // stick it in a cash investment
        const acc = current.accounts.find((a) => a.account.deposit);
        if (acc) {
          const inv = acc.investments.find((i) => i.investment.deposit);
          if (inv) {
            if (inv.investment.price === 1) inv.shares += surplus;
            inv.value += surplus;
            acc.value += surplus;
            current.transactions.push({
              name: inv.investment.name,
              kind: "bought",
              value: surplus,
            });
          }
        }
      }

      result.push(current);
      prior = current;
    }

    return result;
  }, [data, prices]);

  return (
    <section>
      <div className="contentContainer">
        <div className="content">
          <header>
            <h2>Projections</h2>
            <button onClick={() => setExpanded(!expanded)}>
              {expanded ? "collapse" : "expand"}
            </button>
          </header>
          <General />
        </div>

        {showHelp && (
          <aside className="help">
            <p>
              Projections show where you stand each year. Income and expenses
              are updated based on inflation each year. Accounts and investments
              return dividends and are updated based on their expected return.
              IRA accounts automatically re-invest dividends. Brokerage accounts
              return dividends as income. Selling from IRA and pension accounts
              are handled as regular income. Selling from other accounts are
              handled as capital gains. Taxes are applied to sales.
            </p>
          </aside>
        )}
      </div>
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
            {projections.map((projection, index) => [
              <tr key={projection.year}>
                <th scope="row" className="number">
                  {projection.year}
                </th>
                <td className="number">{projection.age}</td>
                <td className="number">
                  <Trend
                    current={projection.expense}
                    prior={projections[index - 1]?.expense}
                    prePrior={projections[index - 2]?.expense}
                  />
                  {humanMoney(projection.expense, hideMoney)}
                </td>
                {expanded &&
                  data.expenses.length > 1 &&
                  projection.expenses.map(({ expense, value }) => (
                    <td key={expense.id} className="number">
                      {within(
                        projection.year,
                        expense.frequency,
                        expense.start,
                        expense.stop
                      ) && humanMoney(value, hideMoney)}
                    </td>
                  ))}
                <td className="number">
                  {humanMoney(projection.tax, hideMoney)}
                </td>
                <td className="number">
                  {humanMoney(projection.income, hideMoney)}
                </td>
                {expanded &&
                  projection.incomes.map(({ income: { id }, value }) => (
                    <td key={id} className="number">
                      {humanMoney(value, hideMoney)}
                    </td>
                  ))}
                <td className="number">
                  {humanMoney(projection.dividends, hideMoney)}
                </td>
                <td className="number">
                  {humanMoney(projection.sales, hideMoney)}
                </td>
                <td className="number">
                  {humanMoney(projection.gains, hideMoney)}
                </td>
                <td className="number">
                  <Trend
                    current={projection.assets}
                    prior={projections[index - 1]?.assets}
                    prePrior={projections[index - 2]?.assets}
                  />
                  {humanMoney(projection.assets, hideMoney)}
                </td>
                {expanded &&
                  projection.accounts.map(
                    ({ account: { id }, value, investments }) => [
                      <td key={id} className="number">
                        {humanMoney(value, hideMoney)}
                      </td>,
                      investments.map(({ investment: { id }, value }) => (
                        <td key={id} className="number">
                          {humanMoney(value, hideMoney)}
                        </td>
                      )),
                    ]
                  )}
              </tr>,
              expanded && projection.transactions && (
                <tr key={projection.year + "-t"} className="transactions">
                  <td></td>
                  <td colSpan={20}>
                    <table>
                      <tbody>
                        {projection.transactions.map((t) => (
                          <tr key={t.name} className="transactions">
                            <td>{t.kind}</td>
                            <td>{t.name}</td>
                            <td className="number">
                              {hideMoney ? "***" : t.shares}
                            </td>
                            <td className="number">
                              {humanMoney(t.value, hideMoney)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ),
            ])}
          </tbody>
        </table>
      </div>
    </section>
  );
};
