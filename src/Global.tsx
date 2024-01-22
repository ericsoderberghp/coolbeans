import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { GlobalType } from "./Types";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const formEventToGlobal = (
  event: React.FormEvent<HTMLFormElement>
): GlobalType => {
  const formData = new FormData(event.currentTarget);
  const result: GlobalType = {
    inflation: formDataNumericValue(formData, "inflation"),
    age: formDataNumericValue(formData, "age"),
    lifeExpectancy: formDataNumericValue(formData, "lifeExpectancy"),
  };
  return result;
};

type GlobalFormProps = {
  global: GlobalType;
  onCancel: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const GlobalForm = (props: GlobalFormProps) => {
  const { onCancel, onSubmit } = props;
  return (
    <form onSubmit={onSubmit}>
      <label>
        inflation
        <span>
          <input
            name="inflation"
            className="percent"
            type="number"
            step="0.01"
            defaultValue={props.global.inflation}
          />
          %
        </span>
      </label>
      <label>
        age
        <input name="age" type="number" defaultValue={props.global.age} />
      </label>
      <label>
        life expectancy
        <input
          name="lifeExpectancy"
          type="number"
          defaultValue={props.global.lifeExpectancy}
        />
      </label>
      <footer>
        <button type="submit">save</button>
        <button onClick={onCancel}>cancel</button>
      </footer>
    </form>
  );
};

export const Global = () => {
  const { data, updateData } = useContext(AppContext);
  const [editing, setEditing] = useState(false);

  const startEditing = () => setEditing(true);

  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      nextData.global = formEventToGlobal(event);
    });
    setEditing(false);
  };

  return (
    <div>
      <header>
        <h2>Global</h2>
      </header>
      <table className="records">
        <thead>
          <tr>
            <th>inflation</th>
            <th>age</th>
            <th>life expectancy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {editing ? (
              <td colSpan={4}>
                <GlobalForm
                  global={data.global}
                  onSubmit={update}
                  onCancel={() => setEditing(false)}
                />
              </td>
            ) : (
              [
                <td key="inflation" className="number">
                  {data.global.inflation}%
                </td>,
                <td key="age" className="number">
                  {data.global.age}
                </td>,
                <td key="lifeExpectancy" className="number">
                  {data.global.lifeExpectancy}
                </td>,
                <td key="controls">
                  <button onClick={startEditing}>edit</button>
                </td>,
              ]
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
