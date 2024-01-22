import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import { InvestmentType, DataType } from "./Types";

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
    account: formDataNumericValue(formData, "account"),
    name: formData.get("name") as string,
    shares: formDataNumericValue(formData, "shares"),
    basis: formDataNumericValue(formData, "basis"),
    price: formDataNumericValue(formData, "price"),
    dividend: formDataNumericValue(formData, "dividend"),
    return: formDataNumericValue(formData, "return"),
    priority: formDataNumericValue(formData, "priority"),
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
  const { data } = useContext(AppContext);

  return (
    <form onSubmit={onSubmit}>
      <label>
        account
        <select name="account" defaultValue={investment.account}>
          {data.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        name
        <input name="name" type="text" defaultValue={investment.name} />
      </label>
      <label>
        shares
        <input name="shares" type="number" defaultValue={investment.shares} />
      </label>
      <label>
        basis
        <input name="basis" type="number" defaultValue={investment.basis} />
      </label>
      <label>
        estimated return
        <span>
          <input
            name="return"
            className="percent"
            type="number"
            step="0.01"
            defaultValue={investment.return}
          />
          %
        </span>
      </label>
      <label>
        estimated dividend yield
        <span>
          <input
            className="percent"
            name="dividend"
            type="number"
            step="0.01"
            defaultValue={investment.dividend}
          />
          %
        </span>
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
        price
        <input name="price" type="number" defaultValue={investment.price} />
      </label>
      <footer>
        <button type="submit">save</button>
        <button onClick={onCancel}>cancel</button>
        {onDelete && <button onClick={onCancel}>delete</button>}
      </footer>
    </form>
  );
};

export const Investments = () => {
  const { data, updateData } = useContext(AppContext);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(0);

  const sortedInvestments = useMemo(
    () =>
      data.investments.sort(
        (i1, i2) => calculatedValue(i2) - calculatedValue(i1)
      ),
    [data]
  );

  const startAdding = () => setAdding(!adding);

  const startEditing = (id: number) => () => setEditing(id);

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const investment = formEventToInvestment(event);
      // set id
      investment.id =
        Math.max(
          0,
          ...nextData.investments.map(
            (investment: InvestmentType) => investment.id
          )
        ) + 1;
      nextData.investments.push(investment);
    });
    setAdding(false);
  };

  const update = (id: number) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const investment = formEventToInvestment(event);
      investment.id = id;
      const index = nextData.investments.findIndex(
        (investment: InvestmentType) => investment.id === id
      );
      nextData.investments.splice(index, 1, investment);
    });
    setEditing(0);
  };

  const delet = (id: number) => () => {
    updateData((nextData: DataType) => {
      nextData.investments = nextData.investments.filter(
        (investment: InvestmentType) => investment.id === id
      );
    });
  };

  return (
    <div>
      <header>
        <h2>Investments</h2>
      </header>
      <table className="records">
        <thead>
          <tr>
            <th>symbol</th>
            <th>value</th>
            <th>return</th>
            <th>dividend</th>
            <th>gains</th>
            <th>priority</th>
          </tr>
        </thead>
        <tbody>
          {sortedInvestments.map((investment) => {
            const key: number = investment.id;
            const value = calculatedValue(investment);
            return (
              <tr key={key}>
                {editing === key ? (
                  <td colSpan={4}>
                    <InvestmentForm
                      investment={investment}
                      onSubmit={update(key)}
                      onCancel={() => setEditing(0)}
                      onDelete={delet(key)}
                    />
                  </td>
                ) : (
                  [
                    <td key="name">{investment.name}</td>,
                    <td
                      key="value"
                      className="number"
                    >{`$${value.toLocaleString()}`}</td>,
                    <td key="return" className="number">
                      {investment.return || 0}%
                    </td>,
                    <td key="dividend" className="number">
                      {investment.dividend || 0}%
                    </td>,
                    <td key="gains" className="number">
                      {investment.basis
                        ? (value - investment.basis).toLocaleString()
                        : undefined}
                    </td>,
                    <td key="priority" className="number">
                      {investment.priority}
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
      {adding ? (
        <InvestmentForm onSubmit={add} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={startAdding}>add</button>
      )}
    </div>
  );
};
