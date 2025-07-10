import { SOCKET_EVENTS } from "../constants/constants";

// ゲームの状態を管理するリデューサー
export function gameReducer(state, action) {
  switch (action.type) {
    case SOCKET_EVENTS.ROOMS_LIST:
      return {
        ...state,
        rooms: action.payload,
      };

    case SOCKET_EVENTS.ERROR_MESSAGE:
      return {
        ...state,
        message: action.payload,
      };

    case SOCKET_EVENTS.ROOM_CREATED:
      return {
        ...state,
        ...resetGameState(),
        creator: action.payload,
        joined: action.payload,
      };

    case SOCKET_EVENTS.JOINED_ROOM:
      return {
        ...state,
        ...resetGameState(),
        joined: action.payload,
      };

    case SOCKET_EVENTS.USER_JOINED:
      return {
        ...state,
        message: `${action.payload.names.join("、")} が参加しました`,
      };

    case SOCKET_EVENTS.SHOW_BANNER:
      return {
        ...state,
        displayedQuestion: "",
        message: action.payload.message,
        lastAction: SOCKET_EVENTS.SHOW_BANNER,
        lastActionPayload: action.payload,
      };

    case SOCKET_EVENTS.START_QUIZ:
      return {
        ...state,
        quiz: action.payload,
        totalQuestions: action.payload.total,
        partial: "",
        message: "",
        currentResponder: null,
        hasBuzzed: false,
        lockedSet: new Set(),
        correctInfo: { show: false, name: "", answer: "" },
        lastAction: SOCKET_EVENTS.START_QUIZ,
        lastActionPayload: action.payload,
      };

    case SOCKET_EVENTS.PAUSE_TYPEWRITER:
      return {
        ...state,
        lastAction: SOCKET_EVENTS.PAUSE_TYPEWRITER,
        lastActionPayload: action.payload,
      };

    case SOCKET_EVENTS.BUZZED:
      return {
        ...state,
        currentResponder: action.payload.name,
        message: `${action.payload.name} が回答中`,
        hasBuzzed: action.payload.hasBuzzed,
      };

    case SOCKET_EVENTS.PARTIAL_FEEDBACK:
      return {
        ...state,
        partial: action.payload.partial,
        message: action.payload.partial,
      };

    case SOCKET_EVENTS.ANSWER_RESULT:
      const { name, correct, answer } = action.payload;
      const newScores = {
        ...state.scores,
        [name]: (state.scores[name] || 0) + (correct ? 1 : 0),
      };

      if (correct) {
        return {
          ...state,
          scores: newScores,
          message: "",
          displayedQuestion: "",
          correctInfo: { show: true, name, answer },
          lastAction: SOCKET_EVENTS.ANSWER_RESULT,
          lastActionPayload: action.payload,
        };
      } else if (name === state.username) {
        return {
          ...state,
          scores: newScores,
          message: "不正解でした",
          lockedSet: new Set(state.lockedSet).add(state.username),
          lastAction: SOCKET_EVENTS.ANSWER_RESULT,
          lastActionPayload: action.payload,
        };
      }
      return {
        ...state,
        scores: newScores,
        lastAction: SOCKET_EVENTS.ANSWER_RESULT,
        lastActionPayload: action.payload,
      };

    // case SOCKET_EVENTS.NEXT_QUESTION:

    // case SOCKET_EVENTS.REQUEST_RESUME:

    case SOCKET_EVENTS.RESUME_TYPEWRITER:
      return {
        ...state,
        hasBuzzed: false,
        currentResponder: null,
        message: "",
        partial: "",
        lastAction: SOCKET_EVENTS.RESUME_TYPEWRITER,
        lastActionPayload: action.payload,
      };

    case SOCKET_EVENTS.QUIZ_ENDED:
      return {
        ...state,
        quiz: null,
        ranking: action.payload,
        gameEnded: true,
      };

    case "SET_USERNAME":
      return {
        ...state,
        username: action.payload,
      };

    case "SET_REGISTERED":
      return {
        ...state,
        registered: action.payload,
      };

    case "SET_CREATOR":
      return {
        ...state,
        creator: action.payload,
      };

    case "SET_DISPLAYED_QUESTION":
      return {
        ...state,
        displayedQuestion: action.payload,
      };

    case "SET_OPTIONS":
      return {
        ...state,
        options: action.payload,
      };

    case "SET_CORRECT_INFO":
      return {
        ...state,
        correctInfo: action.payload,
      };

    case "RESET_GAME":
      return {
        ...state,
        joined: null,
        creator: null,
        ...resetGameState(),
      };

    default:
      return state;
  }
}

// リセット時に初期化しない状態を保持する関数
function resetGameState() {
  return {
    quiz: null,
    displayedQuestion: "",
    message: "",
    gameEnded: false,
    scores: {},
    totalQuestions: 0,
    ranking: [],
    hasBuzzed: false,
    currentResponder: null,
    lockedSet: new Set(),
    partial: "",
    options: [],
    correctInfo: { show: false, name: "", answer: "" },
    lastAction: null,
    lastActionPayload: null,
  };
}

export const initialGameState = {
  username: "",
  registered: false,
  rooms: [],
  joined: null,
  creator: null,
  quiz: null,
  displayedQuestion: "",
  message: "",
  gameEnded: false,
  scores: {},
  totalQuestions: 0,
  ranking: [],
  hasBuzzed: false,
  currentResponder: null,
  lockedSet: new Set(),
  partial: "",
  options: [],
  correctInfo: { show: false, name: "", answer: "" },
  // アクションタイプ追跡用
  lastAction: null,
  lastActionPayload: null,
};
