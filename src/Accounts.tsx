import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import { AccountType, AccountKindType, DataType } from "./Types";
import { Investments, investmentValue } from "./Investments";
import { humanMoney, useCancelOnEsc } from "./utils";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const formEventToAccount = (
  event: React.FormEvent<HTMLFormElement>
): AccountType => {
  const formData = new FormData(event.currentTarget);
  const result: AccountType = {
    id: 0,
    name: formData.get("name") as string,
    kind: formData.get("kind") as AccountKindType,
    value: formDataNumericValue(formData, "value"),
    return: formDataNumericValue(formData, "return"),
    dividend: formDataNumericValue(formData, "dividend"),
    priority: formDataNumericValue(formData, "priority"),
    deposit: !!formData.get("deposit"),
    investments: [],
  };
  if (!result.value) delete result.value;
  if (!result.return) delete result.return;
  if (!result.dividend) delete result.dividend;
  if (!result.priority) delete result.priority;
  return result;
};

type AccountFormProps = {
  account?: AccountType;
  onCancel: () => void;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const AccountForm = (props: AccountFormProps) => {
  const { showHelp } = useContext(AppContext);
  const {
    account = { id: 0, name: "" } as AccountType,
    onCancel,
    onDelete,
    onSubmit,
  } = props;
  useCancelOnEsc(onCancel);

  return (
    <form onSubmit={onSubmit}>
      <label>
        name
        <input name="name" type="text" defaultValue={account.name} />
      </label>
      <label>
        <div>
          <span>kind</span>
          {showHelp && (
            <p className="help">
              determines how any dividends are re-invested and how taxes are
              handled at withdrawl
            </p>
          )}
        </div>
        <select name="kind" defaultValue={account.kind}>
          <option>IRA</option>
          <option>401k</option>
          <option>Roth IRA</option>
          <option>VUL</option>
          <option>brokerage</option>
          <option>pension</option>
        </select>
      </label>
      <label>
        <div>
          <span>priority</span>
          {showHelp && (
            <p className="help">
              assets will be sold from accounts in priority order
            </p>
          )}
        </div>
        <input name="priority" type="number" defaultValue={account.priority} />
      </label>
      <label>
        <div>
          <span>deposit</span>
          {showHelp && (
            <p className="help">
              whether excess income should be deposited in this account
            </p>
          )}
        </div>
        <input
          name="deposit"
          type="checkbox"
          defaultChecked={account.deposit}
        />
      </label>
      {showHelp && (
        <p className="help">
          If you don't want to model individual investments, set the following
          at the account level.
        </p>
      )}
      <label>
        value
        <input name="value" type="number" defaultValue={account.value} />
      </label>
      <label>
        return %
        <input
          className="percent"
          name="return"
          type="number"
          step="0.01"
          defaultValue={account.return}
        />
      </label>
      <label>
        dividend yield %
        <input
          className="percent"
          name="dividend"
          type="number"
          step="0.01"
          defaultValue={account.dividend}
        />
      </label>
      <footer>
        <span className="kind">Account</span>
        <div className="controls">
          {onDelete && <button type="button" onClick={onDelete}>delete</button>}
          <button type="button" onClick={onCancel}>cancel</button>
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

type AccountProps = {
  account: AccountType;
  assets: number;
};

export const Account = (props: AccountProps) => {
  const { account, assets } = props;
  const id = account.id;
  const { updateData, hideMoney, prices } = useContext(AppContext);
  const [editing, setEditing] = useState(false);
  const [showInvestments, setShowInvestments] = useState(
    !!account.investments.length
  );

  const investmentsValue = account.investments.reduce(
    (tot, inv) => investmentValue(inv, prices) + tot,
    0
  );

  const value = (account.value || 0) + investmentsValue;

  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const nextAccount = formEventToAccount(event);
      nextAccount.id = id;
      nextAccount.investments = account.investments;
      const index = nextData.accounts.findIndex((account) => account.id === id);
      nextData.accounts.splice(index, 1, nextAccount);
    });
    setEditing(false);
  };

  const delet = () => {
    updateData((nextData: DataType) => {
      nextData.accounts = nextData.accounts.filter(
        (account) => account.id !== id
      );
    });
  };

  return [
    <tr key={id}>
      {editing ? (
        <td colSpan={8}>
          <AccountForm
            account={account}
            onSubmit={update}
            onCancel={() => setEditing(false)}
            onDelete={delet}
          />
        </td>
      ) : (
        [
          <td key="name">{account.name}</td>,
          <td key="kind">{account.kind}</td>,
          <td key="value" className="number">
            {humanMoney(value, hideMoney)}
          </td>,
          <td key="percent" className="number">
            {`${Math.round((value / assets) * 100)}%`}
          </td>,
          <td key="return" className="number">
            {account.return && `${account.return}%`}
          </td>,
          <td key="dividend" className="number">
            {account.dividend && `${account.dividend}%`}
          </td>,
          <td key="priority" className="number">
            {account.priority}
          </td>,
          <td key="controls" className="controls">
            <button onClick={() => setEditing(true)}>edit</button>
            <button onClick={() => setShowInvestments(!showInvestments)}>
              investments
            </button>
          </td>,
        ]
      )}
    </tr>,
    showInvestments ? (
      <tr key="investments">
        <td colSpan={8}>
          <Investments account={account} assets={assets} />
        </td>
      </tr>
    ) : null,
  ];
};

export const Accounts = () => {
  const { data, updateData, showHelp, hideMoney } = useContext(AppContext);
  const [adding, setAdding] = useState(false);

  const sortedAccounts = useMemo(
    () =>
      data.accounts.sort((a1, a2) => (a1.priority || 0) - (a2.priority || 0)),
    [data]
  );

  const assets = useMemo(
    () =>
      data.accounts.reduce(
        (tot, acc) =>
          (acc.value ||
            acc.investments.reduce(
              (tot2, inv) => ((inv.shares || 0) * (inv.price || 0) || 0) + tot2,
              0
            ) ||
            0) + tot,
        0
      ),
    [data]
  );

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const account = formEventToAccount(event);
      // set id
      account.id =
        Math.max(0, ...nextData.accounts.map((account) => account.id)) + 1;
      nextData.accounts.push(account);
    });
    setAdding(false);
  };

  return (
    <section>
      <div className="contentContainer">
        <div className="content">
          <header>
            <h2>Accounts</h2>
            <span>{humanMoney(assets || 0, hideMoney)}</span>
          </header>
          {!!data.accounts.length && (
            <table className="records">
              <thead>
                <tr>
                  <th>name</th>
                  <th>kind</th>
                  <th className="number">value</th>
                  <th className="number">% of assets</th>
                  <th className="number">return</th>
                  <th className="number">dividend</th>
                  <th className="number">priority</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedAccounts.map((account) => (
                  <Account key={account.id} account={account} assets={assets} />
                ))}
              </tbody>
            </table>
          )}
          <footer>
            {adding ? (
              <AccountForm onSubmit={add} onCancel={() => setAdding(false)} />
            ) : (
              <button onClick={() => setAdding(true)}>add account</button>
            )}
          </footer>
        </div>

        {showHelp && (
          <aside className="help">
            <p>
              Add any accounts you are using for assets. You can provide a
              current value and expected overall return. The priority indicates
              which accounts to withdraw from when income doesn't cover
              expenses. You can also enter individual investments within
              accounts for finer grained tracking of shares, expected dividends,
              and expected returns.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
};
