import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { TaxType, DataType } from "./Types";
import { Rates } from "./Rates";

const formEventToTax = (event: React.FormEvent<HTMLFormElement>): TaxType => {
  const formData = new FormData(event.currentTarget);
  const result: TaxType = {
    id: 0,
    name: formData.get("name") as string,
    kind: formData.get("kind") as "income" | "gains",
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
    tax = { id: 0, name: "", kind: "income" } as TaxType,
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
        kind
        <ul className="options">
          <label>
            <input
              name="kind"
              type="radio"
              value="income"
              defaultChecked={tax.kind === "income"}
            />
            income
          </label>
          <label>
            <input
              name="kind"
              type="radio"
              value="gains"
              defaultChecked={tax.kind === "gains"}
            />
            capital gains
          </label>
        </ul>
      </label>
      <footer>
        <span className="kind">Tax</span>
        <div className="controls">
          {onDelete && <button onClick={onDelete}>delete</button>}
          <button onClick={onCancel}>cancel</button>
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

type TaxProps = {
  tax: TaxType;
};

export const Tax = (props: TaxProps) => {
  const { tax } = props;
  const id = tax.id;
  const { updateData } = useContext(AppContext);
  const [editing, setEditing] = useState(false);

  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const nextTax = formEventToTax(event);
      nextTax.id = id;
      nextTax.rates = tax.rates;
      const index = nextData.taxes.findIndex((tax: TaxType) => tax.id === id);
      nextData.taxes.splice(index, 1, nextTax);
    });
    setEditing(false);
  };

  const delet = () => {
    updateData((nextData: DataType) => {
      nextData.taxes = nextData.taxes.filter((tax: TaxType) => tax.id !== id);
    });
  };

  return (
    <li>
      {editing ? (
        <TaxForm
          tax={tax}
          onSubmit={update}
          onCancel={() => setEditing(false)}
          onDelete={delet}
        />
      ) : (
        [
          <header key="header">
            <h3>{tax.name}</h3>
            {tax.kind === "gains" ? "capital gains" : tax.kind}
            <button onClick={() => setEditing(true)}>edit</button>
          </header>,
          <Rates key="rates" taxId={tax.id} />,
        ]
      )}
    </li>
  );
};

export const Taxes = () => {
  const { data, updateData, showHelp } = useContext(AppContext);
  const [show, setShow] = useState(false);
  const [adding, setAdding] = useState(false);

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

  return (
    <section>
      <div className="contentContainer">
        <div className="content">
          <header>
            <h2>Taxes</h2>
            <button onClick={() => setShow(!show)}>
              {show ? "hide" : "show"}
            </button>
          </header>
          {show && [
            <ul key="list">
              {data.taxes.map((tax) => (
                <Tax tax={tax} />
              ))}
            </ul>,
            <footer key="footer">
              {adding ? (
                <TaxForm onSubmit={add} onCancel={() => setAdding(false)} />
              ) : (
                <button onClick={() => setAdding(true)}>add tax</button>
              )}
            </footer>,
          ]}
        </div>

        {showHelp && (
          <aside className="help">
            <p>
              Taxes are pre-entered for the United States federal income and
              capital gains taxes as well as California state income taxes.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
};
