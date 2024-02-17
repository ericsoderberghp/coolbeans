import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { TaxType, DataType } from "./Types";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const formEventToTax = (event: React.FormEvent<HTMLFormElement>): TaxType => {
  const formData = new FormData(event.currentTarget);
  const result: TaxType = {
    id: 0,
    name: formData.get("name") as string,
    rate: formDataNumericValue(formData, "rate"),
    min: formDataNumericValue(formData, "min"),
    max: formDataNumericValue(formData, "max"),
  };
  if (!result.min) delete result.min;
  if (!result.max) delete result.max;
  return result;
};

type TaxFormProps = {
  tax?: TaxType;
  onCancel: React.MouseEventHandler<HTMLButtonElement>;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const TaxForm = (props: TaxFormProps) => {
  const {
    tax = { id: 0, name: "" } as TaxType,
    onCancel,
    onDelete,
    onSubmit,
  } = props;
  return (
    <form onSubmit={onSubmit}>
      <label>
        name
        <input name="name" type="text" defaultValue={tax.name} />
      </label>
      <label>
        rate
        <span>
          <input
            name="rate"
            className="percent"
            type="number"
            step="0.01"
            defaultValue={tax.rate}
          />
          %
        </span>
      </label>
      <label>
        min
        <input name="min" type="number" defaultValue={tax.min} />
      </label>
      <label>
        max
        <input name="max" type="number" defaultValue={tax.max} />
      </label>
      <footer>
        <button type="submit">save</button>
        <button onClick={onCancel}>cancel</button>
        {onDelete && <button onClick={onCancel}>delete</button>}
      </footer>
    </form>
  );
};

export const Taxes = () => {
  const { data, updateData } = useContext(AppContext);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(0);

  const startAdding = () => setAdding(!adding);

  const startEditing = (id: number) => () => setEditing(id);

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const tax = formEventToTax(event);
      // set id
      tax.id = Math.max(0, ...nextData.taxes.map((tax: TaxType) => tax.id)) + 1;
      nextData.taxes.push(tax);
    });
    setAdding(false);
  };

  const update = (id: number) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const tax = formEventToTax(event);
      tax.id = id;
      const index = nextData.taxes.findIndex((tax: TaxType) => tax.id === id);
      nextData.taxes.splice(index, 1, tax);
    });
    setEditing(0);
  };

  const delet = (id: number) => () => {
    updateData((nextData: DataType) => {
      nextData.taxes = nextData.taxes.filter((tax: TaxType) => tax.id === id);
    });
  };

  return (
    <div>
      <header>
        <h2>Taxes</h2>
      </header>
      {!!data.taxes.length && (
        <table className="records">
          <thead>
            <tr>
              <th>name</th>
              <th className="number">rate</th>
              <th className="number">min</th>
              <th className="number">max</th>
            </tr>
          </thead>
          <tbody>
            {data.taxes.map((tax) => {
              const key: number = tax.id;
              const forName = data.taxes.filter((t) => t.name === tax.name);
              const nameCount = forName.length;
              return (
                <tr key={key}>
                  {editing === key ? (
                    <td colSpan={4}>
                      <TaxForm
                        tax={tax}
                        onSubmit={update(key)}
                        onCancel={() => setEditing(0)}
                        onDelete={delet(key)}
                      />
                    </td>
                  ) : (
                    [
                      forName[0].id === tax.id ? (
                        <td key="name" rowSpan={nameCount}>
                          {tax.name}
                        </td>
                      ) : null,
                      <td key="return" className="number">
                        {tax.rate || 0}%
                      </td>,
                      <td key="min" className="number">
                        ${(tax.min || 0).toLocaleString()}
                      </td>,
                      <td key="max" className="number">
                        ${(tax.max || 0).toLocaleString()}
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
        <TaxForm onSubmit={add} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={startAdding}>add</button>
      )}
    </div>
  );
};
