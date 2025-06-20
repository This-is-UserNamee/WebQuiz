// server.js – 対戦早押しクイズ Web アプリ (Node.js + Express + Socket.IO)
// 実行: npm install express socket.io cors && node server.js

import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";

// ------------------------------
// 定数定義
// ------------------------------

const PORT = process.env.PORT || 5001;

const STATES = {
  IDLE: "IDLE", // ルーム未生成
  LOBBY_OPEN: "LOBBY_OPEN", // 参加者待機中
  GAME_INIT: "GAME_INIT", // 初期化
  QUESTION_READY: "QUESTION_READY", // 読み込み猶予
  BUZZ_OPEN: "BUZZ_OPEN", // 早押し受付
  PLAYER_BUZZED: "PLAYER_BUZZED", // 押した人確定
  ANSWER_EVAL: "ANSWER_EVAL", // 判定中
  SCORE_UPDATE: "SCORE_UPDATE", // スコア更新
  NEXT_DECIDE: "NEXT_DECIDE", // 次へ
  GAME_FINISH: "GAME_FINISH", // 終了
  TERMINATED: "TERMINATED" // 強制終了
};

// タイマー秒数 (ms)
const TIMERS = {
  READY: 3_000, // 問題読み込み猶予
  BUZZ: 7_000, // 押下受付時間
  ANSWER: 5_000 // 解答入力時間
};

// サンプル問題
const QUESTIONS = [
  {
    id: 1,
    question: "What is the capital of France?",
    answers: [
      { text: "Paris", correct: true },
      { text: "Berlin", correct: false },
      { text: "London", correct: false },
      { text: "Madrid", correct: false }
    ]
  },
  {
    id: 2,
    question: "What is the chemical symbol for water?",
    answers: [
      { text: "H2O", correct: true },
      { text: "CO2", correct: false },
      { text: "O2", correct: false },
      { text: "Na", correct: false }
    ]
  }
];

// ------------------------------
// QuizRoom クラス
// ------------------------------

class QuizRoom {
  constructor(io) {
    this.io = io;
    this.players = new Map(); // socket.id → { name, score }
    this.state = STATES.IDLE;
    this.currentQuestionIndex = -1;
    this.currentBuzzer = null; // socket.id
    this.questions = shuffleArray(QUESTIONS.slice());
    // タイマー把握用
    this.timers = {
      ready: null,
      buzz: null,
      answer: null
    };
  }

  /*============================
   * ユーティリティ
   *============================*/
  emitAll(event, payload = {}) {
    this.io.emit(event, payload);
  }

  transition(newState) {
    console.log(`%c[STATE] ${this.state} → ${newState}`, "color:cyan");
    this.state = newState;
    this.emitAll("stateChange", { state: newState });
  }

  clearAllTimers() {
    Object.values(this.timers).forEach((h) => h && clearTimeout(h));
    this.timers = { ready: null, buzz: null, answer: null };
  }

  /*============================
   * プレイヤー関連
   *============================*/
  addPlayer(socket, name) {
    if (this.state !== STATES.IDLE && this.state !== STATES.LOBBY_OPEN) {
      socket.emit("joinRejected", { reason: "Game already started." });
      return;
    }
    this.players.set(socket.id, { name, score: 0 });
    socket.emit("joinAccepted", { id: socket.id });
    this.emitAll("playerList", Array.from(this.players.values()));

    // 状態遷移
    if (this.state === STATES.IDLE) {
      this.transition(STATES.LOBBY_OPEN);
    }
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.emitAll("playerList", Array.from(this.players.values()));
  }

  /*============================
   * ゲーム開始
   *============================*/
  startGame() {
    if (this.state !== STATES.LOBBY_OPEN) return;
    if (this.players.size === 0) return;
    // 初期化
    this.currentQuestionIndex = -1;
    this.players.forEach((p) => (p.score = 0));
    this.transition(STATES.GAME_INIT);

    // 3秒後に最初の問題へ
    setTimeout(() => this.nextQuestion(), 3_000);
  }

  /*============================
   * 問題進行
   *============================*/
  nextQuestion() {
    this.clearAllTimers();
    this.currentQuestionIndex++;

    if (this.currentQuestionIndex >= this.questions.length) {
      this.transition(STATES.GAME_FINISH);
      this.emitAll("gameResult", this.buildScoreBoard());
      return;
    }

    this.currentBuzzer = null;
    const q = this.questions[this.currentQuestionIndex];
    this.transition(STATES.QUESTION_READY);
    this.emitAll("question", {
      id: q.id,
      question: q.question,
      answers: q.answers.map(({ text }) => text) // 正解情報は隠す
    });

    // READY → BUZZ_OPEN
    this.timers.ready = setTimeout(() => this.openBuzz(), TIMERS.READY);
  }

  openBuzz() {
    if (this.state !== STATES.QUESTION_READY) return;
    this.transition(STATES.BUZZ_OPEN);
    this.emitAll("buzzOpen");

    this.timers.buzz = setTimeout(() => this.handleBuzzTimeout(), TIMERS.BUZZ);
  }

  handleBuzz(socket) {
    if (this.state !== STATES.BUZZ_OPEN) {
      socket.emit("buzzRejected");
      return;
    }
    // 先着 1 名
    this.currentBuzzer = socket.id;
    this.transition(STATES.PLAYER_BUZZED);
    this.emitAll("playerBuzzed", { playerId: socket.id });

    // 解答タイマー
    this.timers.answer = setTimeout(() => this.handleAnswerTimeout(), TIMERS.ANSWER);
  }

  handleAnswer(socket, answer) {
    if (this.state !== STATES.PLAYER_BUZZED) return;
    if (socket.id !== this.currentBuzzer) return;

    this.evaluateAnswer(socket, answer);
  }

  handleBuzzTimeout() {
    if (this.state !== STATES.BUZZ_OPEN) return;
    this.transition(STATES.SCORE_UPDATE);
    // 誰も押さなかった: スコア変動なし
    this.emitAll("scoreUpdate", this.buildScoreBoard());
    this.transition(STATES.NEXT_DECIDE);
    this.nextQuestion();
  }

  handleAnswerTimeout() {
    if (this.state !== STATES.PLAYER_BUZZED) return;
    const buzzer = this.players.get(this.currentBuzzer);
    buzzer.score -= 1; // ペナルティ
    this.emitAll("answerResult", { correct: false, playerId: this.currentBuzzer });
    this.transition(STATES.SCORE_UPDATE);
    this.emitAll("scoreUpdate", this.buildScoreBoard());
    this.transition(STATES.NEXT_DECIDE);
    this.nextQuestion();
  }

  evaluateAnswer(socket, answer) {
    const q = this.questions[this.currentQuestionIndex];
    const correctObj = q.answers.find((a) => a.correct);
    const isCorrect = correctObj.text.toLowerCase() === answer.trim().toLowerCase();
    const player = this.players.get(socket.id);
    if (!player) return;

    if (isCorrect) {
      player.score += 1;
    } else {
      player.score -= 1;
    }

    this.emitAll("answerResult", { correct: isCorrect, playerId: socket.id });

    this.transition(STATES.SCORE_UPDATE);
    this.emitAll("scoreUpdate", this.buildScoreBoard());
    this.transition(STATES.NEXT_DECIDE);
    this.nextQuestion();
  }

  buildScoreBoard() {
    return Array.from(this.players.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      score: p.score
    }));
  }
}

// ------------------------------
// サーバーセットアップ
// ------------------------------

const app = express();
app.use(cors());
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// クイズルームは 1 つだけ (マルチルーム化する場合は Map で管理)
const room = new QuizRoom(io);

io.on("connection", (socket) => {
  console.log(`[IO] Connected: ${socket.id}`);

  // 加入
  socket.on("join", ({ name }) => {
    room.addPlayer(socket, name ?? `Player_${socket.id.substring(0, 4)}`);
  });

  // ゲーム開始要求 (ホスト想定)
  socket.on("startGame", () => {
    room.startGame();
  });

  // 押下
  socket.on("buzz", () => {
    room.handleBuzz(socket);
  });

  // 回答
  socket.on("answer", ({ answer }) => {
    room.handleAnswer(socket, answer);
  });

  socket.on("disconnect", () => {
    console.log(`[IO] Disconnected: ${socket.id}`);
    room.removePlayer(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Quiz server listening on http://localhost:${PORT}`);
});

// ------------------------------
// 補助関数
// ------------------------------

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
