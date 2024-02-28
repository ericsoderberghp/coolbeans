import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { RMDType, DataType } from "./Types";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const formEventToIncome = (
  event: React.FormEvent<HTMLFormElement>
): RMDType => {
  const formData = new FormData(event.currentTarget);
  const result: RMDType = {
    id: 0,
    age: formDataNumericValue(formData, "age"),
    distribution: formDataNumericValue(formData, "distribution"),
  };
  return result;
};

type RMDFormProps = {
  rmd?: RMDType;
  onCancel: React.MouseEventHandler<HTMLButtonElement>;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const RMDForm = (props: RMDFormProps) => {
  const {
    rmd = { id: 0, age: 73 } as RMDType,
    onCancel,
    onDelete,
    onSubmit,
  } = props;
  return (
    <form onSubmit={onSubmit}>
      <label>
        age
        <input name="age" type="number" defaultValue={rmd.age} />
      </label>
      <label>
        distribution
        <input
          name="distribution"
          type="number"
          defaultValue={rmd.distribution}
        />
      </label>
      <footer>
        <span className="kind">RMD</span>
        <div className="controls">
          {onDelete && <button onClick={onDelete}>delete</button>}
          <button onClick={onCancel}>cancel</button>
          <button type="submit">save</button>
        </div>
      </footer>
    </form>
  );
};

export const RMDs = () => {
  const { data, updateData, showHelp } = useContext(AppContext);
  const [show, setShow] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(0);

  const startAdding = () => setAdding(!adding);

  const startEditing = (id: number) => () => setEditing(id);

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const rmd = formEventToIncome(event);
      // set id
      rmd.id = Math.max(0, ...nextData.rmds.map((rmd: RMDType) => rmd.id)) + 1;
      nextData.rmds.push(rmd);
    });
    setAdding(false);
  };

  const update = (id: number) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      const rmd = formEventToIncome(event);
      rmd.id = id;
      const index = nextData.rmds.findIndex((rmd: RMDType) => rmd.id === id);
      nextData.rmds.splice(index, 1, rmd);
    });
    setEditing(0);
  };

  const delet = (id: number) => () => {
    updateData((nextData: DataType) => {
      nextData.rmds = nextData.rmds.filter((rmd: RMDType) => rmd.id !== id);
    });
  };

  return (
    <section>
      <div className="contentContainer">
        <div className="content">
          <header>
            <h2>Required Minimum Distributions (RMDs)</h2>
            <button onClick={() => setShow(!show)}>
              {show ? "hide" : "show"}
            </button>
          </header>

          {show && [
            !!data.rmds.length && (
              <table className="records">
                <thead>
                  <tr>
                    <th className="number">age</th>
                    <th className="number">distribution</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.rmds.map((rmd) => {
                    const key: number = rmd.id;
                    return (
                      <tr key={key}>
                        {editing === key ? (
                          <td colSpan={3}>
                            <RMDForm
                              rmd={rmd}
                              onSubmit={update(key)}
                              onCancel={() => setEditing(0)}
                              onDelete={delet(key)}
                            />
                          </td>
                        ) : (
                          [
                            <td key="age" className="number">
                              {rmd.age}
                            </td>,
                            <td key="distrubtion" className="number">
                              {(rmd.distribution || 0).toLocaleString()}
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
            ),
            <footer>
              {adding ? (
                <RMDForm onSubmit={add} onCancel={() => setAdding(false)} />
              ) : (
                <button onClick={startAdding}>add RMD</button>
              )}
            </footer>,
          ]}
        </div>

        {showHelp && (
          <aside className="help">
            <p>
              This data comes from the IRS Table III for Required Minimum
              Distributions. You shouldn't need to edit it but it's here for you
              to check.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
};
