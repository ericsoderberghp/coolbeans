import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { GeneralType } from "./Types";

const formDataNumericValue = (formData: FormData, name: string) =>
  parseFloat((formData.get(name) as string) ?? "");

const formEventToGeneral = (
  event: React.FormEvent<HTMLFormElement>
): GeneralType => {
  const formData = new FormData(event.currentTarget);
  const result: GeneralType = {
    inflation: formDataNumericValue(formData, "inflation"),
    age: formDataNumericValue(formData, "age"),
    lifeExpectancy: formDataNumericValue(formData, "lifeExpectancy"),
  };
  return result;
};

type GeneralFormProps = {
  general: GeneralType;
  onCancel: React.MouseEventHandler<HTMLButtonElement>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

const GeneralForm = (props: GeneralFormProps) => {
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
            defaultValue={props.general.inflation}
          />
          %
        </span>
      </label>
      <label>
        age
        <input name="age" type="number" defaultValue={props.general.age} />
      </label>
      <label>
        life expectancy
        <input
          name="lifeExpectancy"
          type="number"
          defaultValue={props.general.lifeExpectancy}
        />
      </label>
      <footer>
        <button type="submit">save</button>
        <button onClick={onCancel}>cancel</button>
      </footer>
    </form>
  );
};

export const General = () => {
  const { data, updateData } = useContext(AppContext);
  const [editing, setEditing] = useState(false);

  const startEditing = () => setEditing(true);

  const update = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((nextData) => {
      nextData.general = formEventToGeneral(event);
    });
    setEditing(false);
  };

  return (
    <div>
      <header>
        <h2>General</h2>
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
                <GeneralForm
                  general={data.general}
                  onSubmit={update}
                  onCancel={() => setEditing(false)}
                />
              </td>
            ) : (
              [
                <td key="inflation" className="number">
                  {data.general.inflation}%
                </td>,
                <td key="age" className="number">
                  {data.general.age}
                </td>,
                <td key="lifeExpectancy" className="number">
                  {data.general.lifeExpectancy}
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
