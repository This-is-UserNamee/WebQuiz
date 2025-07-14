import React from "react";
import { Room } from "../util/types";

const Result = ({ room }: { room: Room }) => {
  const players = Object.values(room.players).sort((a, b) => b.score - a.score);
  return (
    <div>
      <h1>Game Result</h1>
      {players.map((p, i) => {
        return (
          <div key={p.id}>
            <h3>
              {i + 1}. {p.name}
            </h3>
            <p>Score: {p.score}</p>
          </div>
        );
      })}
    </div>
  );
};

export default Result;
