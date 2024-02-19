import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import { AccountType, DataType } from "./Types";

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
    priority: formDataNumericValue(formData, "priority"),
    investments: [],
  };
  if (!result.value) delete result.value;
  if (!result.return) delete result.return;
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
        estimated return
        <span>
          <input
            className="percent"
            name="return"
            type="number"
            step="0.01"
            defaultValue={account.return}
          />
          %
        </span>
      </label>
      <label>
        priority
        <input name="priority" type="number" defaultValue={account.priority} />
      </label>
      <footer>
        <button type="submit">save</button>
        <button onClick={onCancel}>cancel</button>
        {onDelete && <button onClick={onCancel}>delete</button>}
      </footer>
    </form>
  );
};

export const Accounts = () => {
  const { data, updateData } = useContext(AppContext);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(0);

  const sortedAccounts = useMemo(
    () =>
      data.accounts.sort(
        (a1, a2) => (a1.priority || 0) - (a2.priority || 0)
      ),
    [data]
  );

  const startAdding = () => setAdding(!adding);

  const startEditing = (id: number) => () => setEditing(id);

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const account = formEventToAccount(event);
      // set id
      account.id =
        Math.max(
          0,
          ...nextData.accounts.map((account: AccountType) => account.id)
        ) + 1;
      nextData.accounts.push(account);
    });
    setAdding(false);
  };

  const update = (id: number) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const account = formEventToAccount(event);
      account.id = id;
      const index = nextData.accounts.findIndex(
        (account: AccountType) => account.id === id
      );
      nextData.accounts.splice(index, 1, account);
    });
    setEditing(0);
  };

  const delet = (id: number) => () => {
    updateData((nextData: DataType) => {
      nextData.accounts = nextData.accounts.filter(
        (account: AccountType) => account.id === id
      );
    });
  };

  return (
    <div>
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
            <th className="number">priority</th>
          </tr>
        </thead>
        <tbody>
          {sortedAccounts.map((account) => {
            const key: number = account.id;
            const investmentsValue = account.investments
              .reduce(
                (tot, inv) => ((inv.shares || 0) * (inv.price || 0) || 0) + tot,
                0
              );
            return (
              <tr key={key}>
                {editing === key ? (
                  <td colSpan={4}>
                    <AccountForm
                      account={account}
                      onSubmit={update(key)}
                      onCancel={() => setEditing(0)}
                      onDelete={delet(key)}
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
                    <td key="priority" className="number">
                      {account.priority}
                    </td>,
                    <td key="controls">
                      <button onClick={startEditing(key)}>edit</button>
                    </td>,
                  ]
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
      {adding ? (
        <AccountForm onSubmit={add} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={startAdding}>add</button>
      )}
    </div>
  );
};
