import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { AppContext, initialData } from "./AppContext";
import { DataType } from "./Types";
import { Accounts } from "./Accounts";
import { Incomes } from "./Incomes";
import { Taxes } from "./Taxes";
import { RMDs } from "./RMDs";
import { Expenses } from "./Expenses";
import { Projections } from "./Projections";

const scheme = {
  dark: { background: "6%", foreground: "85%" },
  light: { background: "100%", foreground: "10%" },
};

function App() {
  const [data, setData] = useState(initialData);
  const [showHelp, setShowHelp] = useState(true);
  const [hideMoney, setHideMoney] = useState(false);

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
    let buffer = localStorage.getItem("retirementData");
    if (buffer) {
      const data = JSON.parse(buffer);
      // upgrades
      // convert account.qualified to account.kind = "IRA"
      // data.accounts.forEach((account: any) => {
      //   if (!account.kind) account.kind = account.qualified ? "IRA" : "brokerage";
      // })
      // add RMDs
      // if (!data.rmds) data.rmds = initialData.rmds;
      // set expense frequency to 1
      // data.expenses.forEach((expense: any) => {
      //   if (!expense.frequency) expense.frequency = 1;
      // });
      setData(data);
    }

    buffer = localStorage.getItem("showHelp");
    if (buffer) {
      setShowHelp(JSON.parse(buffer));
    }

    buffer = localStorage.getItem("hideMoney");
    if (buffer) {
      setHideMoney(JSON.parse(buffer));
    }
  }, []);

  const toggleHelp = useCallback(() => {
    setShowHelp((priorShowHelp: boolean) => {
      const nextShowHelp = !priorShowHelp;
      localStorage.setItem("showHelp", JSON.stringify(nextShowHelp));
      return nextShowHelp;
    });
  }, []);

  const toggleHideMoney = useCallback(() => {
    setHideMoney((priorHideMoney: boolean) => {
      const nextHideMoney = !priorHideMoney;
      localStorage.setItem("hideMoney", JSON.stringify(nextHideMoney));
      return nextHideMoney;
    });
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
    () => ({ data, showHelp, hideMoney, updateData }),
    [data, showHelp, hideMoney, updateData]
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
          <div className="controls">
            <button onClick={onExport}>export</button>
            <button onClick={onImportClick}>import</button>
            <button onClick={onReset}>reset</button>
            <button onClick={toggleHelp}>help</button>
            <button onClick={toggleHideMoney}>
              {hideMoney ? "show" : "hide"} $
            </button>
          </div>
        </header>

        {showHelp && (
          <section>
            <p className="help">
              A slightly more sophisticated financial planning tool than most
              online retirement calculators.
            </p>
          </section>
        )}

        <Expenses />
        <Incomes />
        <Accounts />
        <Taxes />
        <RMDs />
        <Projections />
      </main>
    </AppContext.Provider>
  );
}

export default App;
