import React, { useContext, useMemo, useRef, useState } from "react";
import { AppContext } from "./AppContext";
import { ExpenseType, DataType } from "./Types";
import { humanDate, humanMoney, useCancelOnEsc } from "./utils";

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
    frequency: formDataNumericValue(formData, "frequency"),
    start: formData.get("start") as string,
    stop: formData.get("stop") as string,
  };
  if (!result.start) delete result.start;
  if (!result.stop) delete result.stop;
  if (!result.frequency) result.frequency = 1;
  return result;
};

type ExpenseFormProps = {
  expense?: ExpenseType;
  onCancel: () => void;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const ExpenseForm = (props: ExpenseFormProps) => {
  const {
    expense = { id: 0, name: "", frequency: 1 } as ExpenseType,
    onCancel,
    onDelete,
    onSubmit,
  } = props;
  useCancelOnEsc(onCancel);
  return (
    <form method="dialog" onSubmit={onSubmit}>
      <header>
        <span className="kind">Expense</span>
        <div className="controls">
          <button type="button" onClick={onCancel}>cancel</button>
        </div>
      </header>
      <label>
        name
        <input name="name" type="text" defaultValue={expense.name} />
      </label>
      <label>
        amount
        <input name="value" type="number" defaultValue={expense.value} />
      </label>
      <label>
        every X years
        <input
          name="frequency"
          type="number"
          defaultValue={expense.frequency}
        />
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
        <div className="controls">
          {onDelete && <button type="button" onClick={onDelete}>delete</button>}
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

const humanFrequency = (frequency: number): string | undefined => {
  if (frequency === 1) return "yearly";
  if (frequency > 1) return `every ${frequency} years`;
};

export const Expenses = () => {
  const { data, updateData, showHelp, hideMoney } = useContext(AppContext);
  const [editId, setEditId] = useState(0);
  const addRef = useRef<HTMLDialogElement>(null);
  const editRef = useRef<HTMLDialogElement>(null);

  const startAdding = () => addRef.current?.showModal();

  const stopAdding = () => addRef.current?.close();

  const startEditing = (id: number) => {
    setEditId(id);
    editRef.current?.showModal();
  }

  const stopEditing = () => {
    setEditId(0);
    editRef.current?.close();
  }

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
    stopAdding();
  };

  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const expense = formEventToExpense(event);
      expense.id = editId;
      const index = nextData.expenses.findIndex(
        (expense: ExpenseType) => expense.id === editId
      );
      nextData.expenses.splice(index, 1, expense);
    });
    stopEditing();
  };

  const delet = () => {
    updateData((nextData: DataType) => {
      nextData.expenses = nextData.expenses.filter(
        (expense: ExpenseType) => expense.id !== editId
      );
    });
    stopEditing();
  };

  const expenses = useMemo(() =>
    data.expenses.sort((e1, e2) => {
      if (e1.start && !e2.start) return 1;
      if (e2.start && !e1.start) return -1;
      if (!e1.start && !e2.start) return e1.value - e2.value;
      return (e1.start as string).localeCompare(e2.start as string);
    }), [data]);

  return (
    <section>
      <div className="contentContainer">
        <div className="content">
          <header>
            <h2>Expenses</h2>
          </header>

          {!!expenses.length && (
            <table className="records">
              <thead>
                <tr>
                  <th>name</th>
                  <th className="number">amount</th>
                  <th>frequency</th>
                  <th>start</th>
                  <th>stop</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <th key="name" role="rowheader">{expense.name}</th>
                    <td key="value" className="number">
                      {humanMoney(expense.value || 0, hideMoney)}
                    </td>
                    <td key="frequency">
                      {humanFrequency(expense.frequency)}
                    </td>
                    <td key="start">{humanDate(expense.start)}</td>
                    <td key="stop">{humanDate(expense.stop)}</td>
                    <td key="controls">
                      <button onClick={() => startEditing(expense.id)}>edit</button>
                    </td>
                  </tr>
                )
                )}
              </tbody>
            </table>
          )}
          <footer>
            <button onClick={startAdding}>add expense</button>
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

        <dialog ref={addRef}>
          <ExpenseForm onSubmit={add} onCancel={() => stopAdding()} />
        </dialog>
        <dialog ref={editRef}>
          {editId && (
            <ExpenseForm
              expense={expenses.find((e) => e.id === editId)}
              onSubmit={update}
              onCancel={() => stopEditing()}
              onDelete={delet}
            />
          )}
        </dialog>
      </div>
    </section>
  );
};
