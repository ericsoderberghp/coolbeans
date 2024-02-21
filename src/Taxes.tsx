import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { TaxType, DataType } from "./Types";
import { Rates } from "./Rates";

const formEventToTax = (event: React.FormEvent<HTMLFormElement>): TaxType => {
  const formData = new FormData(event.currentTarget);
  const result: TaxType = {
    id: 0,
    name: formData.get("name") as string,
    rates: [],
  };
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
    <div className="form">
      <header>
        <span className="kind">Tax</span>
        <div className="controls">
          {onDelete && <button onClick={onCancel}>delete</button>}
          <button onClick={onCancel}>cancel</button>
        </div>
      </header>
      <form onSubmit={onSubmit}>
        <label>
          name
          <input name="name" type="text" defaultValue={tax.name} />
        </label>
        <footer>
          <span />
          <button type="submit">save</button>
        </footer>
      </form>
      {tax.id && <Rates taxId={tax.id} />}
    </div>
  );
};

export const Taxes = () => {
  const { data, updateData } = useContext(AppContext);
  const [addingTax, setAddingTax] = useState(false);
  const [editingTax, setEditingTax] = useState(0);

  const startAddingTax = () => setAddingTax(!addingTax);
  const startEditingTax = (id: number) => () => setEditingTax(id);

  const addTax = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const tax = formEventToTax(event);
      // set id
      tax.id = Math.max(0, ...nextData.taxes.map((tax: TaxType) => tax.id)) + 1;
      nextData.taxes.push(tax);
    });
    setAddingTax(false);
  };

  const updateTax =
    (id: number) => (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      updateData((nextData) => {
        const tax = formEventToTax(event);
        tax.id = id;
        const index = nextData.taxes.findIndex((tax: TaxType) => tax.id === id);
        nextData.taxes.splice(index, 1, tax);
      });
      setEditingTax(0);
    };

  const deleteTax = (id: number) => () => {
    updateData((nextData: DataType) => {
      nextData.taxes = nextData.taxes.filter((tax: TaxType) => tax.id === id);
    });
  };

  return (
    <section>
      <header>
        <h2>Taxes</h2>
      </header>
      <ul>
        {!!data.taxes.length &&
          data.taxes.map((tax) => {
            const key: number = tax.id;
            return (
              <li key={key}>
                {editingTax === key ? (
                  <TaxForm
                    tax={tax}
                    onSubmit={updateTax(key)}
                    onCancel={() => setEditingTax(0)}
                    onDelete={deleteTax(key)}
                  />
                ) : (
                  <header key="header">
                    <span>{tax.name}</span>
                    <button onClick={startEditingTax(key)}>edit</button>
                  </header>
                )}
              </li>
            );
          })}
      </ul>
      <footer>
        {addingTax ? (
          <TaxForm onSubmit={addTax} onCancel={() => setAddingTax(false)} />
        ) : (
          <button onClick={startAddingTax}>add tax</button>
        )}
      </footer>
    </section>
  );
};
