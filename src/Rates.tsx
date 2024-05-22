import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { TaxType, RateType, DataType } from "./Types";
import { humanMoney, useCancelOnEsc } from "./utils";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const formEventToRate = (event: React.FormEvent<HTMLFormElement>): RateType => {
  const formData = new FormData(event.currentTarget);
  const result: RateType = {
    id: 0,
    rate: formDataNumericValue(formData, "rate"),
    min: formDataNumericValue(formData, "min"),
    max: formDataNumericValue(formData, "max"),
  };
  if (!result.min) delete result.min;
  if (!result.max) delete result.max;
  return result;
};

type RateFormProps = {
  rate?: RateType;
  onCancel: () => void;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const RateForm = (props: RateFormProps) => {
  const { rate = { id: 0 } as RateType, onCancel, onDelete, onSubmit } = props;
  useCancelOnEsc(onCancel);
  return (
    <form onSubmit={onSubmit}>
      <label>
        rate %
        <input
          name="rate"
          className="percent"
          type="number"
          step="0.01"
          defaultValue={rate.rate}
        />
      </label>
      <label>
        min
        <input name="min" type="number" defaultValue={rate.min} />
      </label>
      <label>
        max
        <input name="max" type="number" defaultValue={rate.max} />
      </label>
      <footer>
        <span className="kind">Rate</span>
        <div className="controls">
          {onDelete && <button type="button" onClick={onDelete}>delete</button>}
          <button type="button" onClick={onCancel}>cancel</button>
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

const getTax = (data: DataType, id: number) => {
  const tax = data.taxes.find((tax: TaxType) => tax.id === id);
  if (!tax) throw new TypeError("missing tax");
  return tax;
};

type RatesProps = {
  taxId: number;
};

export const Rates = (props: RatesProps) => {
  const { taxId } = props;
  const { data, updateData } = useContext(AppContext);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(0);
  const tax = getTax(data, taxId);

  const startAdding = () => () => setAdding(true);
  const startEditing = (id: number) => () => setEditing(id);

  const addRate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const tax = getTax(nextData, taxId);
      const rate = formEventToRate(event);
      // set id
      rate.id = Math.max(0, ...tax.rates.map((rate: RateType) => rate.id)) + 1;
      tax.rates.push(rate);
    });
    setAdding(false);
  };

  const updateRate =
    (id: number) => (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      updateData((nextData) => {
        const tax = getTax(nextData, taxId);
        const rate = formEventToRate(event);
        rate.id = id;
        const index = tax.rates.findIndex((rate: RateType) => rate.id === id);
        tax.rates.splice(index, 1, rate);
      });
      setEditing(0);
    };

  const deleteRate = (id: number) => () => {
    updateData((nextData: DataType) => {
      const tax = getTax(nextData, taxId);
      tax.rates = tax.rates.filter((rate: RateType) => rate.id !== id);
    });
  };

  return (
    <div className="subSection">
      <table key="rate" className="records">
        <thead>
          <tr>
            <th className="number">rate</th>
            <th className="number">min</th>
            <th className="number">max</th>
          </tr>
        </thead>
        <tbody>
          {tax.rates.map((rate) => {
            const key: number = rate.id;
            return (
              <tr key={key}>
                {editing === key ? (
                  <td colSpan={4}>
                    <RateForm
                      rate={rate}
                      onSubmit={updateRate(key)}
                      onCancel={() => setEditing(0)}
                      onDelete={deleteRate(key)}
                    />
                  </td>
                ) : (
                  [
                    <td key="return" className="number">
                      {rate.rate || 0}%
                    </td>,
                    <td key="min" className="number">
                      {humanMoney(rate.min)}
                    </td>,
                    <td key="max" className="number">
                      {humanMoney(rate.max)}
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
      <footer>
        {adding ? (
          <RateForm
            key="add"
            onSubmit={addRate}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button key="add" onClick={startAdding()}>
            add rate
          </button>
        )}
      </footer>
    </div>
  );
};
