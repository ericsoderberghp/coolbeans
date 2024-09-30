import React, { useContext, useMemo, useRef, useState } from "react";
import { AppContext } from "./AppContext";
import { IncomeType, DataType } from "./Types";
import { humanDate, humanMoney, useCancelOnEsc } from "./utils";

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
    start: formData.get("start") as string,
    stop: formData.get("stop") as string,
  };
  return result;
};

type IncomeFormProps = {
  income?: IncomeType;
  onCancel: () => void;
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
  useCancelOnEsc(onCancel);
  return (
    <form method="dialog" onSubmit={onSubmit}>
      <header>
        <span className="kind">Income</span>
        <div className="controls">
          <button type="button" onClick={onCancel}>cancel</button>
        </div>
      </header>
      <label>
        name
        <input name="name" type="text" defaultValue={income.name} />
      </label>
      <label>
        $ per year
        <input name="value" type="number" defaultValue={income.value} />
      </label>
      <label>
        start
        <input name="start" type="date" defaultValue={income.start} />
      </label>
      <label>
        stop
        <input name="stop" type="date" defaultValue={income.stop} />
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

export const Incomes = () => {
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
      const income = formEventToIncome(event);
      // set id
      income.id =
        Math.max(
          0,
          ...nextData.incomes.map((income: IncomeType) => income.id)
        ) + 1;
      nextData.incomes.push(income);
    });
    stopAdding();
  };

  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const income = formEventToIncome(event);
      income.id = editId;
      const index = nextData.incomes.findIndex(
        (income: IncomeType) => income.id === editId
      );
      nextData.incomes.splice(index, 1, income);
    });
    stopEditing();
  };

  const delet = () => {
    updateData((nextData: DataType) => {
      nextData.incomes = nextData.incomes.filter(
        (income: IncomeType) => income.id !== editId
      );
    });
    stopEditing();
  };

  const incomes = useMemo(() =>
    data.incomes.sort((i1, i2) => {
      if (i1.start && !i2.start) return 1;
      if (i2.start && !i1.start) return -1;
      if (!i1.start && !i2.start) return i1.value - i2.value;
      return (i1.start as string).localeCompare(i2.start as string);
    }), [data]);

  return (
    <section>
      <div className="contentContainer">
        <div className="content">
          <header>
            <h2>Income</h2>
          </header>

          {!!data.incomes.length && (
            <table className="records">
              <thead>
                <tr>
                  <th>name</th>
                  <th>per year</th>
                  <th>start</th>
                  <th>stop</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => (
                  <tr key={income.id}>
                    <th key="name" role="rowheader">{income.name}</th>
                    <td key="value" className="number">
                      {humanMoney(income.value || 0, hideMoney)}
                    </td>
                    <td key="start">{humanDate(income.start)}</td>
                    <td key="stop">{humanDate(income.stop)}</td>
                    <td key="controls">
                      <button onClick={() => startEditing(income.id)}>edit</button>
                    </td>
                  </tr>
                )
                )}
              </tbody>
            </table>
          )}
          <footer>
            <button onClick={startAdding}>add income</button>
          </footer>
        </div>

        {showHelp && (
          <aside className="help">
            <p>
              Add any income you are expecting as a per-year value. You can set
              dates on when a source of income starts and stops. For example,
              you might add one for Social Security starting at the year you
              start to claim.
            </p>
          </aside>
        )}

        <dialog ref={addRef}>
          <IncomeForm onSubmit={add} onCancel={() => stopAdding()} />
        </dialog>
        <dialog ref={editRef}>
          {editId && (
            <IncomeForm
              income={incomes.find((i) => i.id === editId)}
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
