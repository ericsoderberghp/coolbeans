import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { AppContext, initialData } from "./AppContext";
import { DataType } from "./Types";
import { General } from "./General";
import { Accounts } from "./Accounts";
import { Investments } from "./Investments";
import { Incomes } from "./Incomes";
import { Taxes } from "./Taxes";
import { Expenses } from "./Expenses";
import { Projections } from "./Projections";

function App() {
  const [data, setData] = useState(initialData);

  // load saved data initially
  useEffect(() => {
    const buffer = localStorage.getItem("retirementData");
    if (buffer) {
      const data = JSON.parse(buffer);
      // upgrades
      if (!data.general) {
        data.general = data.global;
        delete data.global;
      }
      // if (!data.global)
      //   data.global = { inflation: 0.04, age: 55, lifeExpectancy: 95 };
      // if (!data.taxes) data.taxes = [];
      setData(data);
    }
  }, []);

  const updateData = useCallback(
    (func: (d: DataType) => void) => {
      const nextData = JSON.parse(JSON.stringify(data));
      func(nextData);
      localStorage.setItem("retirementData", JSON.stringify(nextData));
      setData(nextData);
    },
    [data]
  );

  const appContextValue = useMemo(
    () => ({ data, updateData }),
    [data, updateData]
  );

  const onExport = () => {
    // see https://blog.logrocket.com/programmatically-downloading-files-browser/
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "beans";
    const clickHandler = () => {
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.removeEventListener("click", clickHandler);
      }, 150);
    };
    a.addEventListener("click", clickHandler, false);
    a.click();
  };

  const onImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event?.target?.files?.length === 1) {
      const text = await new Response(event.target.files[0]).text();
      const nextData = JSON.parse(text);
      localStorage.setItem("retirementData", JSON.stringify(nextData));
      setData(nextData);
    }
  };

  const onReset = () => {
    localStorage.setItem("retirementData", JSON.stringify(initialData));
    setData(initialData);
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <main>
        <header>
          <h1>Cool Beans</h1>
          <button onClick={onExport}>export</button>
          <input type="file" accept="application/json" onChange={onImport} />
          <button onClick={onReset}>reset</button>
        </header>

        <General />
        <Expenses />
        <Accounts />
        <Investments />
        <Incomes />
        <Taxes />
        <Projections />
        
      </main>
    </AppContext.Provider>
  );
}

export default App;
