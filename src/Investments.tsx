import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import { AccountType, InvestmentType, DataType } from "./Types";
import { humanMoney } from "./utils";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const calculatedValue = (investment?: InvestmentType) =>
  (investment && (investment.shares || 0) * (investment.price || 0)) || 0;

const formEventToInvestment = (
  event: React.FormEvent<HTMLFormElement>
): InvestmentType => {
  const formData = new FormData(event.currentTarget);
  const result: InvestmentType = {
    id: 0,
    name: formData.get("name") as string,
    shares: formDataNumericValue(formData, "shares"),
    basis: formDataNumericValue(formData, "basis"),
    price: formDataNumericValue(formData, "price"),
    dividend: formDataNumericValue(formData, "dividend"),
    return: formDataNumericValue(formData, "return"),
    priority: formDataNumericValue(formData, "priority"),
    deposit: !!formData.get("deposit"),
  };
  if (!result.shares) delete result.shares;
  if (!result.basis) delete result.basis;
  if (!result.price) delete result.price;
  if (!result.dividend) delete result.dividend;
  if (!result.return) delete result.return;
  if (!result.priority) delete result.priority;
  return result;
};

type InvestmentFormProps = {
  investment?: InvestmentType;
  onCancel: React.MouseEventHandler<HTMLButtonElement>;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const InvestmentForm = (props: InvestmentFormProps) => {
  const {
    investment = { id: 0, name: "" } as InvestmentType,
    onCancel,
    onDelete,
    onSubmit,
  } = props;

  return (
    <form onSubmit={onSubmit}>
      <label>
        symbol
        <input name="name" type="text" defaultValue={investment.name} />
      </label>
      <label>
        shares
        <input name="shares" type="number" defaultValue={investment.shares} />
      </label>
      <label>
        basis
        <input
          name="basis"
          type="number"
          step="0.01"
          defaultValue={investment.basis}
        />
      </label>
      <label>
        return %
        <input
          name="return"
          className="percent"
          type="number"
          step="0.01"
          defaultValue={investment.return}
        />
      </label>
      <label>
        dividend yield %
        <input
          className="percent"
          name="dividend"
          type="number"
          step="0.01"
          defaultValue={investment.dividend}
        />
      </label>
      <label>
        priority
        <input
          name="priority"
          type="number"
          defaultValue={investment.priority}
        />
      </label>
      <label>
        deposit
        <input
          name="deposit"
          type="checkbox"
          defaultChecked={investment.deposit}
        />
      </label>
      <label>
        price
        <input
          name="price"
          type="number"
          step="0.01"
          defaultValue={investment.price}
        />
      </label>
      <footer>
        <span className="kind">Investment</span>
        <div className="controls">
          {onDelete && <button onClick={onDelete}>delete</button>}
          <button onClick={onCancel}>cancel</button>
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

const getAccount = (data: DataType, id: number) => {
  const account = data.accounts.find(
    (account: AccountType) => account.id === id
  );
  if (!account) throw new TypeError("missing account");
  return account;
};

type InvestmentProps = {
  account: AccountType;
  assets: number;
  investment: InvestmentType;
};

export const Investment = (props: InvestmentProps) => {
  const { account, assets, investment } = props;
  const id = investment.id;
  const accountId = account.id;
  const { updateData, hideMoney } = useContext(AppContext);
  const [editing, setEditing] = useState(false);

  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const account = getAccount(nextData, accountId);
      const investment = formEventToInvestment(event);
      investment.id = id;
      const index = account.investments.findIndex(
        (investment: InvestmentType) => investment.id === id
      );
      account.investments.splice(index, 1, investment);
    });
    setEditing(false);
  };

  const delet = () => {
    updateData((nextData: DataType) => {
      const account = getAccount(nextData, accountId);
      account.investments = account.investments.filter(
        (investment: InvestmentType) => investment.id !== id
      );
    });
  };

  const value = calculatedValue(investment);
  return (
    <tr>
      {editing ? (
        <td colSpan={8}>
          <InvestmentForm
            investment={investment}
            onSubmit={update}
            onCancel={() => setEditing(false)}
            onDelete={delet}
          />
        </td>
      ) : (
        [
          <td key="symbol">{investment.name}</td>,
          <td key="value" className="number">
            {humanMoney(value, hideMoney)}
          </td>,
          <td key="percent" className="number">
            {`${Math.round((value / assets) * 1000) / 10}%`}
          </td>,
          <td key="return" className="number">
            {investment.return || 0}%
          </td>,
          <td key="dividend" className="number">
            {investment.dividend || 0}%
          </td>,
          <td key="gains" className="number">
            {humanMoney(
              investment.basis ? value - investment.basis : undefined,
              hideMoney
            )}
          </td>,
          <td key="priority" className="number">
            {investment.priority}
          </td>,
          <td key="controls">
            <button onClick={() => setEditing(true)}>edit</button>
          </td>,
        ]
      )}
    </tr>
  );
};

type InvestmentsProps = {
  account: AccountType;
  assets: number;
};

export const Investments = (props: InvestmentsProps) => {
  const { account, assets } = props;
  const accountId = account.id;
  const { updateData } = useContext(AppContext);
  const [adding, setAdding] = useState(false);

  const sortedInvestments = useMemo(
    () =>
      account.investments.sort(
        (i1, i2) => (i1.priority || 0) - (i2.priority || 0)
      ),
    [account]
  );

  const totalValue = account.investments.reduce(
    (tot, inv) => ((inv.shares || 0) * (inv.price || 0) || 0) + tot,
    0
  );

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const account = getAccount(nextData, accountId);
      const investment = formEventToInvestment(event);
      // set id
      investment.id =
        Math.max(
          0,
          ...account.investments.map(
            (investment: InvestmentType) => investment.id
          )
        ) + 1;
      account.investments.push(investment);
    });
    setAdding(false);
  };

  return (
    <div className="subSection">
      {!!account.investments.length && (
        <table className="records">
          <thead>
            <tr>
              <th>symbol</th>
              <th className="number">value</th>
              <th className="number">% of assets</th>
              <th className="number">return</th>
              <th className="number">dividend</th>
              <th className="number">gains</th>
              <th className="number">priority</th>
            </tr>
          </thead>
          <tbody>
            {sortedInvestments.map((investment) => (
              <Investment
                key={investment.id}
                account={account}
                investment={investment}
                assets={assets}
              />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              <td className="total">{`$${totalValue.toLocaleString()}`}</td>
            </tr>
          </tfoot>
        </table>
      )}
      <footer>
        {adding ? (
          <InvestmentForm onSubmit={add} onCancel={() => setAdding(false)} />
        ) : (
          <button onClick={() => setAdding(true)}>add investment</button>
        )}
      </footer>
    </div>
  );
};
