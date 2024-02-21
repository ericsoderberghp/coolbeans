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
    until: formDataNumericValue(formData, "until"),
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
        inflation %
        <input
          name="inflation"
          className="percent"
          type="number"
          step="0.01"
          defaultValue={props.general.inflation}
        />
      </label>
      <label>
        age
        <input name="age" type="number" defaultValue={props.general.age} />
      </label>
      <label>
        until
        <input name="until" type="number" defaultValue={props.general.until} />
      </label>
      <footer>
        <span className="kind">Projection</span>
        <div className="controls">
          <button onClick={onCancel}>cancel</button>
          <button type="submit">save</button>
        </div>
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
      <table className="records">
        <thead>
          <tr>
            <th>inflation</th>
            <th>age</th>
            <th>until</th>
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
                <td key="until" className="number">
                  {data.general.until}
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
