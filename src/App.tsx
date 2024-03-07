import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { AppContext, initialData } from "./AppContext";
import { DataType, PricesType } from "./Types";
import { Accounts } from "./Accounts";
import { AssetClasses } from "./AssetClasses";
import { Incomes } from "./Incomes";
import { Taxes } from "./Taxes";
import { RMDs } from "./RMDs";
import { Expenses } from "./Expenses";
import { Projections } from "./Projections";

const API_ROOT = "https://api.twelvedata.com";
const API_KEY = process.env.REACT_APP_TDKEY;

const scheme = {
  dark: { background: "6%", foreground: "85%" },
  light: { background: "100%", foreground: "10%" },
};

function App() {
  const [data, setData] = useState(initialData);
  const [showHelp, setShowHelp] = useState(true);
  const [hideMoney, setHideMoney] = useState(false);
  const [pendingSymbols, setPendingSymbols] = useState<string[]>([]);
  const [prices, setPrices] = useState<PricesType>({});

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
    let buffer =
      localStorage.getItem("data") || localStorage.getItem("retirementData");
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

      buffer = localStorage.getItem("prices");
      if (buffer) {
        const storedPrices = JSON.parse(buffer);
        // remove any prices from before today
        const date = new Date().toISOString().split("T")[0];
        Object.keys(storedPrices).forEach((key) => {
          if (storedPrices[key].date !== date) delete storedPrices[key];
        });
        setPrices(storedPrices);
      }
    }

    buffer = localStorage.getItem("showHelp");
    if (buffer) setShowHelp(JSON.parse(buffer));

    buffer = localStorage.getItem("hideMoney");
    if (buffer) setHideMoney(JSON.parse(buffer));
  }, []);

  // retrieve pending stock prices
  useEffect(() => {
    if (pendingSymbols.length) {
      setPendingSymbols([]);
      pendingSymbols.forEach(async (symbol) => {
        const url = `${API_ROOT}/eod?apikey=${API_KEY}&symbol=${symbol}`;
        const response = await fetch(url);
        const result = await response.json();
        // if the symbol isn't found, a 404 error is returned
        // store this as a 0 value so we don't keep asking for it
        if (result.status !== "error" || result.code !== 429) {
          // store the price
          const date = new Date().toISOString().split("T")[0];
          setPrices((prevPrices) => {
            const nextPrices = { ...prevPrices };
            const price =
              result.status === "error" ? 0 : parseFloat(result.close);
            nextPrices[symbol] = { price, date };
            localStorage.setItem("prices", JSON.stringify(nextPrices));
            return nextPrices;
          });
        }
        // throttle our requests so we don't bump into the 12data API threshold
        // which is 8 requests per minute, or roughly one every 7.5 seconds.
        await new Promise((res) => setTimeout(res, 8000));
      });
    }
  }, [pendingSymbols]);

  const checkPrices = useCallback(() => {
    // merge all symbols from across all account investments
    const symbols: string[] = [
      ...new Set(
        data.accounts
          .map((acc) => acc.investments)
          .flat()
          .map((inv) => inv.name)
          // skip any symbols that aren't upper case, like "cash"
          .filter((name) => name && name.toUpperCase() === name)
      ),
    ];

    // remove any will already have prices for
    const symbolsWithoutPrices = symbols.filter(
      (symbol) => !prices.hasOwnProperty(symbol)
    );

    if (symbolsWithoutPrices.length) setPendingSymbols(symbolsWithoutPrices);
  }, [data, prices]);

  // check if we need to retrieve stock prices when data or prices change
  // or the user returns to the page
  useEffect(() => {
    const change = () => {
      if (!document.hidden) checkPrices();
    };
    document.addEventListener("visibilitychange", change);
    checkPrices();
    return () => document.removeEventListener("visibilitychange", change);
  }, [checkPrices]);

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
      localStorage.setItem("data", JSON.stringify(nextData));
      setData(nextData);
    },
    [data]
  );

  const appContextValue = useMemo(
    () => ({ data, showHelp, hideMoney, updateData, prices }),
    [data, showHelp, hideMoney, updateData, prices]
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
        localStorage.setItem("data", JSON.stringify(nextData));
        setData(nextData);
      }
    };
    input.click();
  };

  const onReset = () => {
    localStorage.setItem("data", JSON.stringify(initialData));
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
              online retirement calculators. All of your data is kept
              exclusively in your browser.
            </p>
          </section>
        )}

        <Expenses />
        <Incomes />
        <Accounts />
        <AssetClasses />
        <Taxes />
        <RMDs />
        <Projections />
      </main>
    </AppContext.Provider>
  );
}

export default App;
