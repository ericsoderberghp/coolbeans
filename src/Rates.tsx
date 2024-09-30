import React, { useContext, useRef, useState } from "react";
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
      <header>
        <span className="kind">Rate</span>
        <div className="controls">
          <button type="button" onClick={onCancel}>cancel</button>
        </div>
      </header>
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
        <div className="controls">
          {onDelete && <button type="button" onClick={onDelete}>delete</button>}
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
  const tax = getTax(data, taxId);
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
      const tax = getTax(nextData, taxId);
      const rate = formEventToRate(event);
      // set id
      rate.id = Math.max(0, ...tax.rates.map((rate: RateType) => rate.id)) + 1;
      tax.rates.push(rate);
    });
    stopAdding();
  };

  const update =
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      updateData((nextData) => {
        const tax = getTax(nextData, taxId);
        const rate = formEventToRate(event);
        rate.id = editId;
        const index = tax.rates.findIndex((rate: RateType) => rate.id === editId);
        tax.rates.splice(index, 1, rate);
      });
      stopEditing();
    };

  const delet = () => {
    updateData((nextData: DataType) => {
      const tax = getTax(nextData, taxId);
      tax.rates = tax.rates.filter((rate: RateType) => rate.id !== editId);
    });
    stopEditing();
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
          {tax.rates.map((rate) => (
            <tr key={rate.id}>
              <td key="return" className="number">
                {rate.rate || 0}%
              </td>
              <td key="min" className="number">
                {humanMoney(rate.min)}
              </td>
              <td key="max" className="number">
                {humanMoney(rate.max)}
              </td>
              <td key="controls">
                <button onClick={() => startEditing(rate.id)}>edit</button>
              </td>
            </tr>
          )
          )}
        </tbody>
      </table>
      <footer>
        <button key="add" onClick={() => startAdding()}>
          add rate
        </button>
      </footer>

      <dialog ref={addRef}>
        <RateForm onSubmit={add} onCancel={() => stopAdding()} />
      </dialog>
      <dialog ref={editRef}>
        <RateForm
          rate={tax.rates.find((r) => r.id === editId)}
          onSubmit={update}
          onCancel={() => stopEditing()}
          onDelete={delet}
        />
      </dialog>
    </div>
  );
};
