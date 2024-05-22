import React, { useContext, useMemo, useState } from "react";
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
    <form onSubmit={onSubmit}>
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
        <span className="kind">Income</span>
        <div className="controls">
          {onDelete && <button type="button" onClick={onDelete}>delete</button>}
          <button type="button" onClick={onCancel}>cancel</button>
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

export const Incomes = () => {
  const { data, updateData, showHelp, hideMoney } = useContext(AppContext);
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
        (income: IncomeType) => income.id !== id
      );
    });
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
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => {
                  const key: number = income.id;
                  return (
                    <tr key={key}>
                      {editing === key ? (
                        <td colSpan={5}>
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
                          <td key="value" className="number">
                            {humanMoney(income.value || 0, hideMoney)}
                          </td>,
                          <td key="start">{humanDate(income.start)}</td>,
                          <td key="stop">{humanDate(income.stop)}</td>,
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
              <IncomeForm onSubmit={add} onCancel={() => setAdding(false)} />
            ) : (
              <button onClick={startAdding}>add income</button>
            )}
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
      </div>
    </section>
  );
};
