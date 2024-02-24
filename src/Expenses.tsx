import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { ExpenseType, DataType } from "./Types";
import { humanDate } from "./utils";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const formEventToExpense = (
  event: React.FormEvent<HTMLFormElement>
): ExpenseType => {
  const formData = new FormData(event.currentTarget);
  const result: ExpenseType = {
    id: 0,
    name: formData.get("name") as string,
    value: formDataNumericValue(formData, "value"),
    start: formData.get("start") as string,
    stop: formData.get("stop") as string,
  };
  if (!result.start) delete result.start;
  if (!result.stop) delete result.stop;
  return result;
};

type ExpenseFormProps = {
  expense?: ExpenseType;
  onCancel: React.MouseEventHandler<HTMLButtonElement>;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const ExpenseForm = (props: ExpenseFormProps) => {
  const {
    expense = { id: 0, name: "" } as ExpenseType,
    onCancel,
    onDelete,
    onSubmit,
  } = props;
  return (
    <form onSubmit={onSubmit}>
      <label>
        name
        <input name="name" type="text" defaultValue={expense.name} />
      </label>
      <label>
        $ per year
        <input name="value" type="number" defaultValue={expense.value} />
      </label>
      <label>
        start
        <input name="start" type="date" defaultValue={expense.start} />
      </label>
      <label>
        stop
        <input name="stop" type="date" defaultValue={expense.stop} />
      </label>
      <footer>
        <span className="kind">Expense</span>
        <div className="controls">
          {onDelete && <button onClick={onDelete}>delete</button>}
          <button onClick={onCancel}>cancel</button>
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

export const Expenses = () => {
  const { data, updateData, showHelp } = useContext(AppContext);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(0);

  const startAdding = () => setAdding(!adding);

  const startEditing = (id: number) => () => setEditing(id);

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const expense = formEventToExpense(event);
      // set id
      expense.id =
        Math.max(
          0,
          ...nextData.expenses.map((expense: ExpenseType) => expense.id)
        ) + 1;
      nextData.expenses.push(expense);
    });
    setAdding(false);
  };

  const update = (id: number) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const expense = formEventToExpense(event);
      expense.id = id;
      const index = nextData.expenses.findIndex(
        (expense: ExpenseType) => expense.id === id
      );
      nextData.expenses.splice(index, 1, expense);
    });
    setEditing(0);
  };

  const delet = (id: number) => () => {
    updateData((nextData: DataType) => {
      nextData.expenses = nextData.expenses.filter(
        (expense: ExpenseType) => expense.id !== id
      );
    });
  };

  return (
    <section>
      <div className="contentContainer">
        <div className="content">
          <header>
            <h2>Expenses</h2>
          </header>

          {!!data.expenses.length && (
            <table className="records">
              <thead>
                <tr>
                  <th>name</th>
                  <th>per year</th>
                  <th>start</th>
                  <th>stop</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense) => {
                  const key: number = expense.id;
                  return (
                    <tr key={key}>
                      {editing === key ? (
                        <td colSpan={5}>
                          <ExpenseForm
                            expense={expense}
                            onSubmit={update(key)}
                            onCancel={() => setEditing(0)}
                            onDelete={delet(key)}
                          />
                        </td>
                      ) : (
                        [
                          <td key="name">{expense.name}</td>,
                          <td key="value" className="number">{`$${(
                            expense.value || 0
                          ).toLocaleString()}`}</td>,
                          <td key="start">{humanDate(expense.start)}</td>,
                          <td key="stop">{humanDate(expense.stop)}</td>,
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
          <footer>
            {adding ? (
              <ExpenseForm onSubmit={add} onCancel={() => setAdding(false)} />
            ) : (
              <button onClick={startAdding}>add expense</button>
            )}
          </footer>
        </div>

        {showHelp && (
          <aside className="help">
            <p>
              Add any expenses you are expecting as a per-year value. You can
              set dates on when an expense starts and stops. I'd suggest looking
              at past spending to determine future behavior.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
};
