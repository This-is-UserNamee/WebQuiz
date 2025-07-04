import React from "react";
import styles from "./style.module.css";

const QuizView = ({
  quiz,
  totalQuestions,
  displayedQuestion,
  username,
  hasBuzzed,
  currentResponder,
  buzz,
  lockedSet,
  options,
  answer,
  message,
}) => {
  return (
    <div>
      <p>
        {quiz.index + 1}/{totalQuestions}問目: {displayedQuestion}
      </p>
      {/* 自身が回答中はボタンを非表示 */}
      {!(hasBuzzed && currentResponder === username) && (
        <button
          onClick={buzz}
          disabled={
            lockedSet.has(username) ||
            (currentResponder && currentResponder !== username)
          }
        >
          {lockedSet.has(username)
            ? "解答不可"
            : currentResponder
            ? "他の人が回答中…"
            : "早押し"}
        </button>
      )}
      {hasBuzzed && currentResponder === username && (
        <div>
          {options.map((opt) => (
            <button key={opt} onClick={() => answer(opt)}>
              {opt}
            </button>
          ))}
        </div>
      )}
      {message && <p>{message}</p>}
    </div>
  );
};

export default QuizView;
