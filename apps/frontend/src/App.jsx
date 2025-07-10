import { useReducer, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "./constants/constants";
import { gameReducer, initialGameState } from "./reducers/gameReducer";
import { useSocketEvents } from "./hooks/useSocketEvents";
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
    lastAction,
    lastActionPayload,
  } = state;

  const charIndexRef = useRef(0);
  const questionRef = useRef("");
  const intervalRef = useRef(null);
  const nextTimeoutRef = useRef(null);

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

  // Socket.IOイベントリスナーの設定
  useSocketEvents(socket, dispatch, username, joined);

  // stateの変更を監視して副作用を実行
  useEffect(() => {
    switch (lastAction) {
      case SOCKET_EVENTS.SHOW_BANNER:
        clearInterval(intervalRef.current);
        clearTimeout(nextTimeoutRef.current);
        break;

      case SOCKET_EVENTS.START_QUIZ:
        if (lastActionPayload) {
          questionRef.current = lastActionPayload.question;
          startTypewriter(0);
        }
        break;

      case SOCKET_EVENTS.PAUSE_TYPEWRITER:
        clearInterval(intervalRef.current);
        break;

      case SOCKET_EVENTS.ANSWER_RESULT:
        if (lastActionPayload) {
          const { name, correct, answer } = lastActionPayload;
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
        }
        break;

      case SOCKET_EVENTS.RESUME_TYPEWRITER:
        startTypewriter(charIndexRef.current);
        break;

      default:
        break;
    }
  }, [lastAction, lastActionPayload, username, joined]);

  // 選択肢の生成：クイズまたは部分入力が変更されたときに実行
  useEffect(() => {
    if (!quiz) return;
    const idx = partial.length;
    const correctChar = quiz.answer[idx];
    const generatedOptions = generateRandomHiragana(4, correctChar);
    dispatch({ type: "SET_OPTIONS", payload: generatedOptions });
  }, [quiz, partial]);

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

  // ルームに参加していない場合はルーム作成画面
  if (!joined) {
    return (
      <CreateRoom {...state} createRoom={createRoom} joinRoom={joinRoom} />
    );
  }

  // ルームに参加しているがクイズが開始されていない場合はロビー画面
  if (!quiz) {
    return <Loby {...state} socket={socket} start={start} />;
  }

  // クイズ画面
  return <QuizView {...state} answer={answer} buzz={buzz} />;
}
