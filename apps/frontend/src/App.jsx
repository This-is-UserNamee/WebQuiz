import { useReducer, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "./constants/constants";
import { gameReducer, initialGameState } from "./reducers/gameReducer";
import CreateRoom from "./components/CreateRoom";
import QuizView from "./components/QuizView";
import Loby from "./components/Loby";
import Result from "./components/Result";
import Register from "./components/Register";

const socket = io("http://localhost:5001");

// ひらがなを生成するヘルパー関数
const generateRandomHiragana = (count, correctChar) => {
  const start = 0x3042;
  const end = 0x3093;
  const all = [];
  for (let i = start; i <= end; i++) {
    const c = String.fromCharCode(i);
    if (!["ゔ", "ゐ", "ゑ"].includes(c)) all.push(c);
  }
  const avail = all.filter((c) => c !== correctChar);
  for (let i = avail.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [avail[i], avail[j]] = [avail[j], avail[i]];
  }
  const wrong = avail.slice(0, count - 1);
  const choices = [...wrong, correctChar];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
};

export default function RoomManager() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const {
    username,
    registered,
    rooms,
    joined,
    creator,
    quiz,
    displayedQuestion,
    message,
    gameEnded,
    scores,
    totalQuestions,
    ranking,
    hasBuzzed,
    currentResponder,
    lockedSet,
    partial,
    options,
    correctInfo,
  } = state;

  const charIndexRef = useRef(0);
  const questionRef = useRef("");
  const intervalRef = useRef(null);
  const nextTimeoutRef = useRef(null);

  // Socket.IOイベントリスナーの設定
  useEffect(() => {
    // ルーム一覧の取得
    socket.on(SOCKET_EVENTS.ROOMS_LIST, (rooms) => {
      dispatch({ type: SOCKET_EVENTS.ROOMS_LIST, payload: rooms });
    });

    // エラーメッセージの受信
    socket.on(SOCKET_EVENTS.ERROR_MESSAGE, (message) => {
      dispatch({ type: SOCKET_EVENTS.ERROR_MESSAGE, payload: message });
    });

    // ルーム作成成功時の処理
    socket.on(SOCKET_EVENTS.ROOM_CREATED, (id) => {
      dispatch({ type: SOCKET_EVENTS.ROOM_CREATED, payload: id });
      dispatch({ type: "SET_CREATOR", payload: socket.id });
    });

    // ルーム参加成功時の処理
    socket.on(SOCKET_EVENTS.JOINED_ROOM, (id) => {
      dispatch({ type: SOCKET_EVENTS.JOINED_ROOM, payload: id });
    });

    // ユーザー参加通知
    socket.on(SOCKET_EVENTS.USER_JOINED, (names) => {
      dispatch({ type: SOCKET_EVENTS.USER_JOINED, payload: { names } });
    });

    // バナー表示時の処理
    socket.on(SOCKET_EVENTS.SHOW_BANNER, ({ message: banner }) => {
      clearInterval(intervalRef.current);
      clearTimeout(nextTimeoutRef.current);
      dispatch({
        type: SOCKET_EVENTS.SHOW_BANNER,
        payload: { message: banner },
      });
    });

    // クイズ開始時の処理
    socket.on(SOCKET_EVENTS.START_QUIZ, (data) => {
      dispatch({ type: SOCKET_EVENTS.START_QUIZ, payload: data });
      questionRef.current = data.question;
      startTypewriter(0);
    });

    // タイプライター効果の一時停止
    socket.on(SOCKET_EVENTS.PAUSE_TYPEWRITER, () => {
      clearInterval(intervalRef.current);
      dispatch({ type: SOCKET_EVENTS.PAUSE_TYPEWRITER });
    });

    // 早押しボタンが押された時の処理
    socket.on(SOCKET_EVENTS.BUZZED, (name) => {
      dispatch({
        type: SOCKET_EVENTS.BUZZED,
        payload: { name, hasBuzzed: name === username },
      });
    });

    // 部分的な回答フィードバック
    socket.on(SOCKET_EVENTS.PARTIAL_FEEDBACK, ({ partial }) => {
      dispatch({ type: SOCKET_EVENTS.PARTIAL_FEEDBACK, payload: { partial } });
    });

    // 回答結果の処理
    socket.on(SOCKET_EVENTS.ANSWER_RESULT, ({ name, correct, answer }) => {
      dispatch({
        type: SOCKET_EVENTS.ANSWER_RESULT,
        payload: { name, correct, answer },
      });

      if (correct) {
        clearTimeout(nextTimeoutRef.current);
        nextTimeoutRef.current = setTimeout(() => {
          dispatch({
            type: "SET_CORRECT_INFO",
            payload: { show: false, name: "", answer: "" },
          });
          socket.emit(SOCKET_EVENTS.NEXT_QUESTION, joined);
        }, 3000);
      } else if (name === username) {
        socket.emit(SOCKET_EVENTS.REQUEST_RESUME, joined);
      }
    });

    // タイプライター効果の再開
    socket.on(SOCKET_EVENTS.RESUME_TYPEWRITER, () => {
      dispatch({ type: SOCKET_EVENTS.RESUME_TYPEWRITER });
      startTypewriter(charIndexRef.current);
    });

    // クイズ終了時の処理
    socket.on(SOCKET_EVENTS.QUIZ_ENDED, (data) => {
      dispatch({ type: SOCKET_EVENTS.QUIZ_ENDED, payload: data });
    });

    // 初期化：ルーム一覧を取得
    socket.emit(SOCKET_EVENTS.GET_ROOMS);
    // クリーンアップ：コンポーネントのアンマウント時にリスナーを削除
    return () => socket.removeAllListeners();
  }, [username]);

  // 選択肢の生成：クイズまたは部分入力が変更されたときに実行
  useEffect(() => {
    if (!quiz) return;
    const idx = partial.length;
    const correctChar = quiz.answer[idx];
    const generatedOptions = generateRandomHiragana(4, correctChar);
    dispatch({ type: "SET_OPTIONS", payload: generatedOptions });
  }, [quiz, partial]);

  const startTypewriter = (startIndex) => {
    clearInterval(intervalRef.current);
    const text = questionRef.current;
    charIndexRef.current = startIndex;
    dispatch({
      type: "SET_DISPLAYED_QUESTION",
      payload: text.slice(0, startIndex),
    });
    intervalRef.current = setInterval(() => {
      const idx = charIndexRef.current;
      if (idx >= text.length) return clearInterval(intervalRef.current);
      dispatch({
        type: "SET_DISPLAYED_QUESTION",
        payload: text.slice(0, idx + 1),
      });
      charIndexRef.current = idx + 1;
    }, 100);
  };

  const register = () => {
    if (!username.trim()) return;
    socket.emit(SOCKET_EVENTS.SET_NAME, username.trim());
    dispatch({ type: "SET_REGISTERED", payload: true });
    socket.emit(SOCKET_EVENTS.GET_ROOMS);
  };
  const createRoom = () => socket.emit(SOCKET_EVENTS.CREATE_ROOM);
  const joinRoom = (id) => socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: id });
  const start = () => socket.emit(SOCKET_EVENTS.BEGIN_QUIZ, joined);
  const buzz = () => socket.emit(SOCKET_EVENTS.BUZZ, joined);
  const answer = (opt) => {
    if (hasBuzzed && currentResponder === username)
      socket.emit(SOCKET_EVENTS.SUBMIT_CHAR, { roomId: joined, char: opt });
  };
  const reset = () => {
    socket.emit(SOCKET_EVENTS.GET_ROOMS);
    dispatch({ type: "RESET_GAME" });
  };

  // バナー表示中
  if (message === "問題！") {
    return (
      <div className="banner">
        <h1>問題！</h1>
      </div>
    );
  }
  // 正解オーバーレイ
  if (correctInfo.show) {
    return (
      <div className="overlay">
        <p>
          {correctInfo.name} が正解！答え: {correctInfo.answer}
        </p>
      </div>
    );
  }

  // 登録画面
  if (!registered)
    return (
      <Register
        {...state}
        onChange={(e) => {
          dispatch({ type: "SET_USERNAME", payload: e.target.value });
        }}
        register={register}
      />
    );

  // リザルト画面
  if (gameEnded) return <Result {...state} reset={reset} />;

  // クイズ画面
  return (
    <div>
      {!joined ? (
        <CreateRoom {...state} createRoom={createRoom} joinRoom={joinRoom} />
      ) : (
        <div>
          {!quiz ? (
            <Loby {...state} socket={socket} start={start} />
          ) : (
            <QuizView {...state} answer={answer} buzz={buzz} />
          )}
        </div>
      )}
    </div>
  );
}
