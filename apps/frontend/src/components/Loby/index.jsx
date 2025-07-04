import React from "react";
import styles from "./style.module.css";

const Loby = ({ joined, creator, socket, start }) => {
  return (
    <div>
      <p>ルーム: {joined}</p>
      {creator === socket.id && <button onClick={start}>開始</button>}
    </div>
  );
};

export default Loby;
