import React, { useContext, useRef, useState } from "react";
import { AppContext } from "./AppContext";
import { TaxType, DataType } from "./Types";
import { Rates } from "./Rates";
import { useCancelOnEsc } from "./utils";

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
  onCancel: () => void;
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
  useCancelOnEsc(onCancel);
  return (
    <form onSubmit={onSubmit}>
      <header>
        <span className="kind">Tax</span>
        <div className="controls">
          <button type="button" onClick={onCancel}>cancel</button>
        </div>
      </header>
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
        <div className="controls">
          {onDelete && <button type="button" onClick={onDelete}>delete</button>}
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

type TaxProps = {
  tax: TaxType;
  onEdit: () => void;
};

export const Tax = (props: TaxProps) => {
  const { tax, onEdit } = props;

  return (
    <li>
      <header key="header">
        <h3>{tax.name}</h3>
        {tax.kind === "gains" ? "capital gains" : tax.kind}
        <button onClick={onEdit}>edit</button>
      </header>
      <Rates key="rates" taxId={tax.id} />
    </li>
  );
};

export const Taxes = () => {
  const { data, updateData, showHelp } = useContext(AppContext);
  const [show, setShow] = useState(false);
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
      const tax = formEventToTax(event);
      // set id
      tax.id = Math.max(0, ...nextData.taxes.map((tax: TaxType) => tax.id)) + 1;
      nextData.taxes.push(tax);
    });
    stopAdding();
  };

  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const nextTax = formEventToTax(event);
      nextTax.id = editId;
      const index = nextData.taxes.findIndex((tax: TaxType) => tax.id === editId);
      nextTax.rates = nextData.taxes[index].rates;
      nextData.taxes.splice(index, 1, nextTax);
    });
    stopEditing();
  };

  const delet = () => {
    updateData((nextData: DataType) => {
      nextData.taxes = nextData.taxes.filter((tax: TaxType) => tax.id !== editId);
    });
    stopEditing();
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
                <Tax tax={tax} onEdit={() => startEditing(tax.id)} />
              ))}
            </ul>,
            <footer key="footer">
              <button onClick={() => startAdding()}>add tax</button>
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

        <dialog ref={addRef}>
          <TaxForm onSubmit={add} onCancel={() => stopAdding()} />
        </dialog>
        <dialog ref={editRef}>
          <TaxForm
            tax={data.taxes.find((t) => t.id === editId)}
            onSubmit={update}
            onCancel={() => stopEditing()}
            onDelete={delet}
          />
        </dialog>
      </div>
    </section>
  );
};
