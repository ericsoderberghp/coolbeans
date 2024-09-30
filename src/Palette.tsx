import React from "react";

export const Palette = () => {
  return (
    <section className="palette">
      <div className="contentContainer">
        <div className="content">
          <header>
            <h2>Palette</h2>
          </header>
          <table>
            <thead>
              <tr>
                <th>id</th>
                <th className="number">value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th role="rowheader">item 1</th>
                <td>25</td>
                <td>
                  <button >edit</button>
                </td>
              </tr>
              <tr>
                <td>
                  <form>
                    <label>
                      label
                      <input />
                    </label>
                    <footer>
                      <span className="kind">Form</span>
                      <div className="controls">
                        <button type="button" >cancel</button>
                        <button type="submit">save</button>
                      </div>
                    </footer>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
          <footer>
            <button >add item</button>
          </footer>
        </div>
      </div>
    </section>
  );
};
