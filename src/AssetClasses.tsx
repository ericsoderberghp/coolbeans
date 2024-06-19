import React, { useContext, useMemo } from "react";
import { AppContext } from "./AppContext";
import { humanMoney } from "./utils";

export const AssetClasses = () => {
  const { data, prices, showHelp, hideMoney } = useContext(AppContext);

  const assetClasses = useMemo(() => {
    const result: { [key: string]: number } = {};
    data.accounts.forEach((account) => {
      account.investments.forEach((investment) => {
        if (investment.assetClass && investment.shares) {
          if (!result[investment.assetClass]) result[investment.assetClass] = 0;
          const price =
            prices?.[investment.name]?.price || investment.price || 0;
          const value = price * investment.shares;
          result[investment.assetClass] += value;
        }
      });
    });
    return result;
  }, [data, prices]);

  const total = useMemo(
    () => Object.values(assetClasses).reduce((t, v) => t + v, 0),
    [assetClasses]
  );

  return (
    <section>
      <div className="contentContainer">
        <div className="content">
          <header>
            <h2>Asset Classes</h2>
          </header>
          <table className="records">
            <thead>
              <tr>
                <th>name</th>
                <th className="number">value</th>
                <th className="number">percent</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(assetClasses).map((key) => {
                const value = assetClasses[key];
                return (
                  <tr key={key}>
                    <th role="rowheader">{key}</th>
                    <td className="number">{humanMoney(value, hideMoney)}</td>
                    <td className="number">{`${
                      Math.round((value / total) * 1000) / 10
                    }%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {showHelp && (
          <aside className="help">
            <p>
              You can assign asset classes to your investments and then see how
              they are balanced here.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
};
