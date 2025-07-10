import React from "react";
import styles from "./style.module.css";

const Result = ({ ranking, reset }) => {
  return (
    <div>
      <h3>リザルト</h3>
      <ol>
        {ranking.map((p) => (
          <li key={p.name}>
            {p.name}: {p.score}点
          </li>
        ))}
      </ol>
      <button onClick={reset}>トップに戻る</button>
    </div>
  );
};

export default Result;
