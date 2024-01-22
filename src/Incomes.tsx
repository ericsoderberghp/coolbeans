import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { IncomeType, DataType } from "./Types";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const formEventToIncome = (
  event: React.FormEvent<HTMLFormElement>
): IncomeType => {
  const formData = new FormData(event.currentTarget);
  const result: IncomeType = {
    id: 0,
    name: formData.get("name") as string,
    value: formDataNumericValue(formData, "value"),
  };
  return result;
};

type IncomeFormProps = {
  income?: IncomeType;
  onCancel: React.MouseEventHandler<HTMLButtonElement>;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const IncomeForm = (props: IncomeFormProps) => {
  const {
    income = { id: 0, name: "" } as IncomeType,
    onCancel,
    onDelete,
    onSubmit,
  } = props;
  return (
    <form onSubmit={onSubmit}>
      <label>
        name
        <input name="name" type="text" defaultValue={income.name} />
      </label>
      <label>
        value
        <input name="value" type="number" defaultValue={income.value} />
      </label>
      <footer>
        <button type="submit">save</button>
        <button onClick={onCancel}>cancel</button>
        {onDelete && <button onClick={onCancel}>delete</button>}
      </footer>
    </form>
  );
};

export const Incomes = () => {
  const { data, updateData } = useContext(AppContext);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(0);

  const startAdding = () => setAdding(!adding);

  const startEditing = (id: number) => () => setEditing(id);

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const income = formEventToIncome(event);
      // set id
      income.id =
        Math.max(
          0,
          ...nextData.incomes.map((income: IncomeType) => income.id)
        ) + 1;
      nextData.incomes.push(income);
    });
    setAdding(false);
  };

  const update = (id: number) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const income = formEventToIncome(event);
      income.id = id;
      const index = nextData.incomes.findIndex(
        (income: IncomeType) => income.id === id
      );
      nextData.incomes.splice(index, 1, income);
    });
    setEditing(0);
  };

  const delet = (id: number) => () => {
    updateData((nextData: DataType) => {
      nextData.incomes = nextData.incomes.filter(
        (income: IncomeType) => income.id === id
      );
    });
  };

  return (
    <div>
      <header>
        <h2>Income</h2>
      </header>
      <table className="records">
        <tbody>
          {data.incomes.map((income) => {
            const key: number = income.id;
            return (
              <tr key={key}>
                {editing === key ? (
                  <td colSpan={4}>
                    <IncomeForm
                      income={income}
                      onSubmit={update(key)}
                      onCancel={() => setEditing(0)}
                      onDelete={delet(key)}
                    />
                  </td>
                ) : (
                  [
                    <td key="name">{income.name}</td>,
                    <td key="value" className="number">{`$${(
                      income.value || 0
                    ).toLocaleString()}`}</td>,
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
        <IncomeForm onSubmit={add} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={startAdding}>add</button>
      )}
    </div>
  );
};
