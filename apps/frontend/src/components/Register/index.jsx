import React from "react";
import styles from "./style.module.css";

const Register = ({ username, onChange, register }) => {
  return (
    <div>
      <input
        value={username}
        onChange={(e) => onChange(e)}
        placeholder="ユーザー名を入力"
      />
      <button onClick={register}>登録</button>
    </div>
  );
};

export default Register;
