import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { AppContext, initialData } from "./AppContext";
import { DataType } from "./Types";
import { Accounts } from "./Accounts";
import { Incomes } from "./Incomes";
import { Taxes } from "./Taxes";
import { Expenses } from "./Expenses";
import { Projections } from "./Projections";

const scheme = {
  dark: { background: "6%", foreground: "85%" },
  light: { background: "100%", foreground: "10%" },
};

function App() {
  const [data, setData] = useState(initialData);

  // set color mode based on browser color scheme
  useEffect(() => {
    const setDarkScheme = (dark: boolean) => {
      const mode = dark ? "dark" : "light";
      document.documentElement.style.setProperty(
        "--background-lightness",
        scheme[mode].background
      );
      document.documentElement.style.setProperty(
        "--foreground-lightness",
        scheme[mode].foreground
      );
    };
    setDarkScheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => setDarkScheme(event.matches));
  }, []);

  // load saved data initially
  useEffect(() => {
    const buffer = localStorage.getItem("retirementData");
    if (buffer) {
      const data = JSON.parse(buffer);
      // upgrades
      // data.taxes = initialData.taxes;
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

  const onImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (event: any) => {
      if (event?.target?.files?.length === 1) {
        const text = await new Response(event.target.files[0]).text();
        const nextData = JSON.parse(text);
        localStorage.setItem("retirementData", JSON.stringify(nextData));
        setData(nextData);
      }
    };
    input.click();
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
          <button onClick={onImportClick}>import</button>
          <button onClick={onReset}>reset</button>
        </header>

        <Expenses />
        <Incomes />
        <Accounts />
        <Taxes />
        <Projections />
      </main>
    </AppContext.Provider>
  );
}

export default App;
