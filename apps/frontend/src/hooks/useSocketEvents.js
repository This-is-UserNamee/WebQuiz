import { useEffect } from "react";
import { SOCKET_EVENTS } from "../constants/constants";

export function useSocketEvents(socket, dispatch, username, joined) {
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
      dispatch({
        type: SOCKET_EVENTS.SHOW_BANNER,
        payload: { message: banner },
      });
    });

    // クイズ開始時の処理
    socket.on(SOCKET_EVENTS.START_QUIZ, (data) => {
      dispatch({ type: SOCKET_EVENTS.START_QUIZ, payload: data });
    });

    // タイプライター効果の一時停止
    socket.on(SOCKET_EVENTS.PAUSE_TYPEWRITER, () => {
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
    });

    // タイプライター効果の再開
    socket.on(SOCKET_EVENTS.RESUME_TYPEWRITER, () => {
      dispatch({ type: SOCKET_EVENTS.RESUME_TYPEWRITER });
    });

    // クイズ終了時の処理
    socket.on(SOCKET_EVENTS.QUIZ_ENDED, (data) => {
      dispatch({ type: SOCKET_EVENTS.QUIZ_ENDED, payload: data });
    });

    // 初期化：ルーム一覧を取得
    socket.emit(SOCKET_EVENTS.GET_ROOMS);

    // クリーンアップ：コンポーネントのアンマウント時にリスナーを削除
    return () => socket.removeAllListeners();
  }, [username, joined, socket, dispatch]);
}
