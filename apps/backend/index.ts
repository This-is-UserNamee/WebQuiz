// ===================================================================================
// モジュールインポート
// ===================================================================================
import http = require('http');
import { Server, Socket } from "socket.io";
import fs = require('fs');

// ===================================================================================
// 型定義 (Interfaces)
// ===================================================================================

// プレイヤーの状態を表すインターフェース
interface Player {
  id: string;       // Socket ID
  name: string;     // プレイヤー名
  score: number;    // 現在のスコア
}

// 1つの問題のデータ構造
interface Question {
  id: string;
  text: string;
  answer_data: { char: string; choices: string[] }[];
}

// ゲーム進行中の状態を管理するインターフェース
interface GameData {
  questions: Question[];
  currentQuestionIndex: number;
  questionState: 'idle' | 'presenting' | 'reading' | 'timer_running' | 'paused' | 'answering' | 'result';
  prePauseState: 'reading' | 'timer_running' | null;
  timerReadyPlayerIds: string[];
  answeredPlayerIds: string[];
  activeAnswer: { playerId: string; currentAnswerIndex: number; } | null;
  timeoutId: NodeJS.Timeout | null;
  timerStartTime: number;
  remainingTime: number;
}

// 1つのルームの状態を表すインターフェース
interface Room {
  id: string;
  hostId: string;
  state: 'waiting' | 'playing' | 'finished';
  players: { [playerId: string]: Player };
  gameData: GameData;
}

// サーバー全体の状態を表すインターフェース
interface AppState {
  players: { [socketId: string]: { name: string } };
  rooms: { [roomId: string]: Room };
}


// ===================================================================================
// 初期設定・データ読み込み
// ===================================================================================

// questions.jsonから問題データを同期的に読み込む
let questions: Question[] = [];
try {
  const data = fs.readFileSync('./questions.json', 'utf8');
  questions = JSON.parse(data);
  console.log(`[INFO] ${questions.length}件の問題を正常にロードしました。`);
} catch (err) {
  console.error('[ERROR] questions.json の読み込みに失敗しました。', err);
  process.exit(1); // エラーが発生した場合、サーバーを停止
}

// ===================================================================================
// HTTPサーバー & Socket.IOサーバーのセットアップ
// ===================================================================================

// HTTPサーバーを作成
const httpServer = http.createServer((_req: http.IncomingMessage, res: http.ServerResponse) => {
  // CORS (Cross-Origin Resource Sharing) ヘッダーを設定し、異なるオリジンからのリクエストを許可
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
  res.end("WebQuiz Backend is running.");
});

// Socket.IOサーバーをHTTPサーバーにアタッチ
const io = new Server(httpServer, {
  cors: {
    origin: "*", // すべてのオリジンからの接続を許可 (開発用途)
    methods: ["GET", "POST"]
  }
});

// ===================================================================================
// グローバル状態管理
// ===================================================================================

// サーバー全体でアプリケーションの状態を保持するオブジェクト
const state: AppState = {
  players: {}, // { socket.id: { name: "プレイヤー名" } }
  rooms: {}    // { roomId: Roomオブジェクト }
};

// ===================================================================================
// Socket.IO接続処理
// ===================================================================================

io.on('connection', (socket) => {
  console.log(`[CONNECT] クライアントが接続しました: ${socket.id}`);

  // --- 接続切断イベント ---
  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] クライアントが切断しました: ${socket.id}`);
    handlePlayerDisconnect(socket.id);
  });

  // --- プレイヤー登録イベント ---
  socket.on('registerPlayer', ({ playerName }) => {
    // 入力値の検証
    if (!playerName || playerName.trim().length === 0 || playerName.length > 15) {
      return socket.emit('errorOccurred', { code: 'INVALID_NAME', message: 'プレイヤー名が無効です。1～15文字で入力してください。' });
    }
    // プレイヤー情報を保存
    state.players[socket.id] = { name: playerName };
    console.log(`[REGISTER] プレイヤー '${playerName}' (${socket.id}) が登録されました。`);
    // 登録成功を本人に通知
    socket.emit('playerRegistered', { playerId: socket.id, playerName: playerName });
    // プレイヤー登録後、現在のルームリストをそのクライアントに送信
    const roomList = Object.values(state.rooms).map(room => ({
      id: room.id,
      playerCount: Object.keys(room.players).length,
      state: room.state
    }));
    socket.emit('roomListUpdate', roomList);
  });

  // --- ルーム作成イベント ---
  socket.on('createRoom', () => {
    if (!state.players[socket.id]) {
      return socket.emit('errorOccurred', { code: 'NOT_REGISTERED', message: 'プレイヤーが登録されていません。' });
    }
    const roomId = generateRoomId();
    const player: Player = { id: socket.id, name: state.players[socket.id].name, score: 0 };
    // 新しいルームオブジェクトを生成
    const room: Room = {
      id: roomId,
      hostId: socket.id,
      state: 'waiting', // waiting, playing, finished
      players: { [socket.id]: player },
      gameData: {
        questions: [],
        currentQuestionIndex: 0,
        questionState: 'idle', // idle, presenting, reading, timer_running, paused, answering, result
        prePauseState: null, // 中断前の状態を保持
        timerReadyPlayerIds: [], // タイマー開始準備完了者リスト
        answeredPlayerIds: [], // その問題で既に間違えた人リスト
        activeAnswer: null, // 現在の回答権を持つプレイヤー情報
        timeoutId: null, // setTimeoutのID
        timerStartTime: 0, // タイマー開始時刻 (Date.now())
        remainingTime: 0 // タイマーの残り時間 (ミリ秒)
      }
    };
    state.rooms[roomId] = room;
    console.log(`[ROOM_CREATE] プレイヤー '${player.name}' がルーム [${roomId}] を作成しました。`);
    socket.join(roomId); // Socket.IOのルーム機能に参加
    socket.emit('joinedRoom', { room: room, playerId: socket.id }); // 本人にルーム情報を送信
    broadcastRoomList(); // 全員にルーム一覧を更新
  });

  // --- ルーム参加イベント ---
  socket.on('joinRoom', ({ roomId }) => {
    if (!state.players[socket.id]) {
      return socket.emit('errorOccurred', { code: 'NOT_REGISTERED', message: 'プレイヤーが登録されていません。' });
    }
    const room = state.rooms[roomId];
    if (!room) {
      return socket.emit('errorOccurred', { code: 'ROOM_NOT_FOUND', message: 'ルームが見つかりません。' });
    }
    if (room.state !== 'waiting') {
      return socket.emit('errorOccurred', { code: 'ALREADY_PLAYING', message: 'ゲームはすでに開始されています。' });
    }
    const MAX_PLAYERS = 8;
    if (Object.keys(room.players).length >= MAX_PLAYERS) {
      return socket.emit('errorOccurred', { code: 'ROOM_FULL', message: 'このルームは満員です。' });
    }
    const player = { id: socket.id, name: state.players[socket.id].name, score: 0 };
    room.players[socket.id] = player;
    console.log(`[ROOM_JOIN] プレイヤー '${player.name}' がルーム [${roomId}] に参加しました。`);
    socket.join(roomId);
    socket.emit('joinedRoom', { room: room, playerId: socket.id });
    io.to(roomId).emit('roomUpdated', { room: room }); // ルーム内の全員に更新を通知
    console.log(`[DEBUG_BACKEND] Sending roomUpdated for room ${roomId} to clients in room:`, Array.from(io.sockets.adapter.rooms.get(roomId) || []));
    broadcastRoomList();
  });

  // --- ルーム退出イベント ---
  socket.on('leaveRoom', ({ roomId }) => {
    handlePlayerLeave(socket.id, roomId);
  });

  // --- ゲーム開始イベント ---
  socket.on('startGame', ({ roomId }) => {
    const room = state.rooms[roomId];
    if (!room || !room.players[socket.id]) return;
    if (room.hostId !== socket.id) {
      return socket.emit('errorOccurred', { code: 'NOT_HOST', message: 'ホストではありません。' });
    }
    room.state = 'playing';
    // 問題リストをシャッフルして設定
    room.gameData.questions = [...questions].sort(() => Math.random() - 0.5);
    console.log(`[GAME_START] ルーム [${roomId}] でゲームが開始されました。`);
    io.to(roomId).emit('gameStarted', { room: room });
    broadcastRoomList();
    // 最初の問題のライフサイクルを開始
    startQuestionLifecycle(roomId);
  });

  // --- タイマー開始準備完了イベント ---
  socket.on('timerReady', ({ roomId }) => {
    const room = state.rooms[roomId];
    // 読み上げ中でなければ無効
    if (!room || !room.players[socket.id] || room.gameData.questionState !== 'reading') return;
    // 準備完了リストに追加
    if (!room.gameData.timerReadyPlayerIds.includes(socket.id)) {
      room.gameData.timerReadyPlayerIds.push(socket.id);
    }
    // 全員の準備が整ったかチェック
    const activePlayerCount = Object.keys(room.players).length;
    if (room.gameData.timerReadyPlayerIds.length === activePlayerCount) {
      room.gameData.questionState = 'timer_running';
      console.log(`[TIMER_READY] 全員準備完了。ルーム [${roomId}] でタイマーフェーズに移行します。`);
      startTimer(roomId, 10000); // 10秒タイマーを開始
    }
  });

  // --- 早押しイベント ---
  socket.on('buzz', ({ roomId }) => {
    const room = state.rooms[roomId];
    const currentState = room?.gameData.questionState;
    // 早押し可能か検証 (読上中 or タイマー作動中か、回答権を持つ人がいないか)
    if (!room || !room.players[socket.id] || (currentState !== 'reading' && currentState !== 'timer_running') || room.gameData.activeAnswer !== null || room.gameData.answeredPlayerIds.includes(socket.id)) return;

    // 中断処理のために、現在がどのフェーズだったかを保存
    room.gameData.prePauseState = currentState;

    // フェーズに応じて中断処理を実行
    if (currentState === 'reading') {
      io.to(roomId).emit('pauseReading', { room: room });
      console.log(`[PAUSE] ルーム [${roomId}] の読み上げを中断しました。`);
    } else if (currentState === 'timer_running') {
      if (room.gameData.timeoutId) {
        clearTimeout(room.gameData.timeoutId);
        const timeElapsed = Date.now() - room.gameData.timerStartTime;
        room.gameData.remainingTime -= timeElapsed;
      }
      io.to(roomId).emit('pauseTimer', { room: room });
      console.log(`[PAUSE] ルーム [${roomId}] のタイマーを中断しました。`);
    }

    // 回答権を付与し、状態を「回答中」に変更
    room.gameData.questionState = 'answering';
    room.gameData.activeAnswer = { playerId: socket.id, currentAnswerIndex: 0 };
    console.log(`[BUZZ] プレイヤー '${state.players[socket.id].name}' が回答権を獲得。`);
    io.to(roomId).emit('buzzerResult', { winnerId: socket.id, room: room });

    // 回答者に最初の選択肢を送信
    const currentQuestion = room.gameData.questions[room.gameData.currentQuestionIndex];
    const firstChoice = currentQuestion.answer_data[0].choices;
    socket.emit('nextChoice', { choices: firstChoice });
  });

  // --- 回答提出イベント ---
  socket.on('submitCharacter', ({ roomId, selectedChar }) => {
    const room = state.rooms[roomId];
    // 不正なリクエストは無視
    if (!room || !room.players[socket.id] || !room.gameData.activeAnswer || room.gameData.activeAnswer.playerId !== socket.id) return;

    const { activeAnswer, currentQuestionIndex, questions } = room.gameData;
    const currentQuestion = questions[currentQuestionIndex];
    const correctChar = currentQuestion.answer_data[activeAnswer.currentAnswerIndex].char;
    const isCorrect = selectedChar === correctChar;

    if (isCorrect) {
      // 正解の場合
      activeAnswer.currentAnswerIndex++;
      if (activeAnswer.currentAnswerIndex === currentQuestion.answer_data.length) {
        // 全問正解 (完答)
        console.log(`[CORRECT] プレイヤー '${state.players[socket.id].name}' が完答しました。`);
        const correctAnswer = currentQuestion.answer_data.map(d => d.char).join('');
        io.to(roomId).emit('answerResult', { playerId: socket.id, isCorrect: true, isFinal: true, correctAnswer: correctAnswer });
        // スコア加算と更新通知
        room.players[socket.id].score += 10;
        io.to(roomId).emit('scoreUpdated', { players: Object.values(room.players) });
        // 次の問題へ
        room.gameData.currentQuestionIndex++;
        setTimeout(() => startQuestionLifecycle(roomId), 3000);
      } else {
        // 次の文字の選択肢を送信
        const nextChoice = currentQuestion.answer_data[activeAnswer.currentAnswerIndex].choices;
        socket.emit('nextChoice', { choices: nextChoice });
      }
    } else {
      // 不正解の場合
      console.log(`[INCORRECT] プレイヤー '${state.players[socket.id].name}' が誤答しました。`);
      io.to(roomId).emit('answerResult', { playerId: socket.id, isCorrect: false, isFinal: false });

      room.gameData.activeAnswer = null; // 回答権をリセット
      if (!room.gameData.answeredPlayerIds.includes(socket.id)) {
        room.gameData.answeredPlayerIds.push(socket.id);
        console.log(`[ANSWERED] プレイヤー '${state.players[socket.id].name}' が解答権を失いました。`);
      }

      // 全員が誤答したかチェック
      const activePlayerCount = Object.keys(room.players).length;
      if (room.gameData.answeredPlayerIds.length >= activePlayerCount) {
        console.log(`[ALL_INCORRECT] 全員が誤答しました。問題 [${currentQuestion.id}] を終了します。`);
        if (room.gameData.timeoutId) clearTimeout(room.gameData.timeoutId);
        io.to(roomId).emit('answerResult', { isCorrect: false, isFinal: true });
        room.gameData.currentQuestionIndex++;
        setTimeout(() => startQuestionLifecycle(roomId), 3000);
        return; // 復帰処理は行わず終了
      }

      // 中断状態から復帰
      const prePauseState = room.gameData.prePauseState;
      room.gameData.prePauseState = null;

      if (prePauseState === 'reading') {
        room.gameData.questionState = 'reading';
        io.to(roomId).emit('resumeReading', { room: room });
        console.log(`[RESUME] 読み上げを再開します。`);
      } else if (prePauseState === 'timer_running') {
        room.gameData.questionState = 'timer_running';
        console.log(`[RESUME] タイマーを残り${room.gameData.remainingTime}msで再開します。`);
        startTimer(roomId, room.gameData.remainingTime);
      }
    }
  });
});

// ===================================================================================
// ヘルパー関数 & ゲーム進行管理
// ===================================================================================

/** プレイヤーの切断を処理する */
const handlePlayerDisconnect = (socketId: string) => {
  const roomId = Object.keys(state.rooms).find(roomId => state.rooms[roomId].players[socketId]);
  if (roomId) {
    handlePlayerLeave(socketId, roomId, true);
  }
  delete state.players[socketId];
  broadcastRoomList();
};

/** プレイヤーの退出・切断を処理する */
const handlePlayerLeave = (socketId: string, roomId: string, isDisconnect = false) => {
  const room = state.rooms[roomId];
  if (!room || !room.players[socketId]) return;

  const playerName = state.players[socketId]?.name || '不明なプレイヤー';
  const action = isDisconnect ? '切断' : '退出';
  console.log(`[LEAVE] プレイヤー '${playerName}' がルーム [${roomId}] から${action}しました。`);

  if (room.hostId === socketId) {
    // ホストが退出した場合、ルームを解散
    console.log(`[ROOM_CLOSE] ホストの${action}により、ルーム [${roomId}] を解散します。`);
    io.to(roomId).emit('roomClosed', { roomId: roomId, reason: `ホストが${action}しました。` });

    Object.keys(room.players).forEach(playerId => {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) playerSocket.leave(roomId);
    });
    delete state.rooms[roomId];
  } else {
    // ゲストが退出した場合
    delete room.players[socketId];
    if (!isDisconnect) {
      const playerSocket = io.sockets.sockets.get(socketId);
      if (playerSocket) playerSocket.leave(roomId);
    }
    io.to(roomId).emit('roomUpdated', { room: room });
  }
  broadcastRoomList();
};

/** 全クライアントに最新のルーム一覧をブロードキャストする */
const broadcastRoomList = () => {
  const roomList = Object.values(state.rooms).map(room => ({
    id: room.id,
    playerCount: Object.keys(room.players).length,
    state: room.state
  }));
  io.emit('roomListUpdate', roomList);
};

/** ランダムな5文字のルームIDを生成する */
const generateRoomId = (): string => Math.random().toString(36).substring(2, 7);

/** クイズ1問のライフサイクルを開始・進行させる */
const startQuestionLifecycle = (roomId: string) => {
  console.log(`[QUESTION_LIFECYCLE] ルーム [${roomId}] の問題ライフサイクルを開始します。`);
  const room = state.rooms[roomId];
  if (!room) return;

  // 全問題が終了したかチェック
  if (room.gameData.currentQuestionIndex >= room.gameData.questions.length) {
    console.log(`[GAME_FINISH] ルーム [${roomId}] の全問題が終了しました。`);
    room.state = 'finished';
    io.to(roomId).emit('gameFinished', { room: room });
    // 10秒後に待機状態に戻る
    setTimeout(() => {
      const room = state.rooms[roomId];
      if (room) {
        room.state = 'waiting';
        room.gameData.currentQuestionIndex = 0;
        Object.values(room.players).forEach(p => p.score = 0);
        io.to(roomId).emit('roomUpdated', { room: room });
        broadcastRoomList();
        console.log(`[ROOM_RESET] ルーム [${roomId}] が待機状態に戻りました。`);
      }
    }, 10000);
    return;
  }

  // 次の問題のための状態リセット
  room.gameData.questionState = 'presenting';
  room.gameData.prePauseState = null;
  room.gameData.answeredPlayerIds = [];
  room.gameData.timerReadyPlayerIds = [];
  room.gameData.activeAnswer = null;
  room.gameData.remainingTime = 0;
  if (room.gameData.timeoutId) clearTimeout(room.gameData.timeoutId);

  setTimeout(() => {
    const room = state.rooms[roomId];
    const currentQuestion = room.gameData.questions[room.gameData.currentQuestionIndex];
    io.to(roomId).emit('newQuestion', { question: currentQuestion, questionIndex: room.gameData.currentQuestionIndex, room: room });
    console.log(`[QUESTION] ルーム [${roomId}] で問題 ${room.gameData.currentQuestionIndex + 1} を提示`);
  }, 1000); // 1秒後に問題を提示

  // 3秒の「タメ」の後、読み上げフェーズへ
  setTimeout(() => {
    const room = state.rooms[roomId];
    if (!room) return;
    room.gameData.questionState = 'reading';
    io.to(roomId).emit('readingStarted', { room: room });
    console.log(`[READING] ルーム [${roomId}] で問題読み上げ開始`);
  }, 3000);
};

/** 回答制限時間タイマーを開始または再開する */
const startTimer = (roomId: string, duration: number) => {
  const room = state.rooms[roomId];
  if (!room) return;

  room.gameData.timerStartTime = Date.now();
  room.gameData.remainingTime = duration;

  io.to(roomId).emit('timerStarted', { room: room, duration: duration });
  console.log(`[TIMER_START] ルーム [${roomId}] で ${duration / 1000}秒 のタイマーを開始`);

  room.gameData.timeoutId = setTimeout(() => {
    const room = state.rooms[roomId];
    if (!room || room.gameData.questionState !== 'timer_running') return;

    console.log(`[TIMEOUT] ルーム [${roomId}] で時間切れになりました。`);
    io.to(roomId).emit('answerResult', { isCorrect: false, isFinal: true });

    room.gameData.currentQuestionIndex++;
    setTimeout(() => startQuestionLifecycle(roomId), 3000);
  }, duration);
};

// ===================================================================================
// サーバー起動
// ===================================================================================
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[INFO] サーバーがポート ${PORT} で起動しました`);
});