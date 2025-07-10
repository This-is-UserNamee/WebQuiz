import React from "react";
import styles from "./style.module.css";

const CreateRoom = ({ createRoom, joinRoom, rooms, message }) => {
  return (
    <div>
      <button onClick={createRoom}>ルーム作成</button>
      <ul>
        {rooms.map((r) => (
          <li key={r}>
            {r} <button onClick={() => joinRoom(r)}>参加</button>
          </li>
        ))}
      </ul>
      {message && <p>{message}</p>}
    </div>
  );
};

export default CreateRoom;
