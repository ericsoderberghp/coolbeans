import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import { AccountType, DataType } from "./Types";
import { Investments } from "./Investments";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const formEventToAccount = (
  event: React.FormEvent<HTMLFormElement>
): AccountType => {
  const formData = new FormData(event.currentTarget);
  const result: AccountType = {
    id: 0,
    name: formData.get("name") as string,
    qualified: !!formData.get("qualified"),
    value: formDataNumericValue(formData, "value"),
    return: formDataNumericValue(formData, "return"),
    dividend: formDataNumericValue(formData, "dividend"),
    priority: formDataNumericValue(formData, "priority"),
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
  onCancel: React.MouseEventHandler<HTMLButtonElement>;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const AccountForm = (props: AccountFormProps) => {
  const {
    account = { id: 0, name: "" } as AccountType,
    onCancel,
    onDelete,
    onSubmit,
  } = props;
  return (
    <form onSubmit={onSubmit}>
      <label>
        name
        <input name="name" type="text" defaultValue={account.name} />
      </label>
      <label>
        value
        <input name="value" type="number" defaultValue={account.value} />
      </label>
      <label>
        qualified
        <input
          name="qualified"
          type="checkbox"
          defaultChecked={account.qualified}
        />
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
      <label>
        priority
        <input name="priority" type="number" defaultValue={account.priority} />
      </label>
      <footer>
        <span className="kind">Account</span>
        <div className="controls">
          {onDelete && <button onClick={onDelete}>delete</button>}
          <button onClick={onCancel}>cancel</button>
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

type AccountProps = {
  account: AccountType;
};

export const Account = (props: AccountProps) => {
  const { account } = props;
  const id = account.id;
  const { updateData } = useContext(AppContext);
  const [editing, setEditing] = useState(false);
  const [showInvestments, setShowInvestments] = useState(
    !!account.investments.length
  );

  const investmentsValue = account.investments.reduce(
    (tot, inv) => ((inv.shares || 0) * (inv.price || 0) || 0) + tot,
    0
  );

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
        <td colSpan={5}>
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
          <td key="value" className="number">{`$${(
            (account.value || 0) + investmentsValue
          ).toLocaleString()}`}</td>,
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
        <td colSpan={6}>
          <Investments account={account} />
        </td>
      </tr>
    ) : null,
  ];
};

export const Accounts = () => {
  const { data, updateData } = useContext(AppContext);
  const [adding, setAdding] = useState(false);

  const sortedAccounts = useMemo(
    () =>
      data.accounts.sort((a1, a2) => (a1.priority || 0) - (a2.priority || 0)),
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
      <header>
        <h2>Accounts</h2>
      </header>
      {!!data.accounts.length && (
        <table className="records">
          <thead>
            <tr>
              <th>name</th>
              <th className="number">value</th>
              <th className="number">return</th>
              <th className="number">dividend</th>
              <th className="number">priority</th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((account) => (
              <Account key={account.id} account={account} />
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
    </section>
  );
};
