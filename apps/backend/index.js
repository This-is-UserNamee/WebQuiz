const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const questionsPath = path.join(__dirname, 'questions.json');
let questions = [];
try {
  const data = fs.readFileSync(questionsPath, 'utf-8');
  questions = JSON.parse(data);
} catch (err) {
  console.error(`Failed to load questions from ${questionsPath}:`, err);
  process.exit(1);
}

// rooms: Map<roomId, { creator, members, order, current, locked, scores, started, buzzed, responder, partial }>
const rooms = new Map();

// サンプル問題集（答えはひらがな）
// const questions = [
//   { question: '日本の首都はどこですか？', answer: 'とうきょう' },
//   { question: '化学式 H2O は何の物質ですか？', answer: 'みず' },
// ];

function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }

io.on('connection', socket => {
  // ユーザー名設定
  socket.on('setName', name => {
    socket.data.username = name;
    console.log(`${name} is connected`);
  });

  // ルーム作成
  socket.on('createRoom', () => {
    const username = socket.data.username || 'Anonymous';
    const roomId = uuidv4();
    const order = shuffle(questions.map((_, idx) => idx));
    const members = new Map([[socket.id, username]]);
    const scores = new Map([[socket.id, 0]]);

    rooms.set(roomId, {
      creator: socket.id,
      members,
      order,
      current: 0,
      locked: new Set(),
      scores,
      started: false,
      buzzed: false,
      responder: null,
      partial: {}
    });

    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    io.emit('roomsList', Array.from(rooms.keys()));
    io.to(roomId).emit('userJoined', Array.from(members.values()));
    console.log(`${roomId} was created by ${username}`);
  });

  // ルーム一覧取得
  socket.on('getRooms', () => {
    socket.emit('roomsList', Array.from(rooms.keys()));
  });

  // ルーム参加
  socket.on('joinRoom', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('errorMessage', 'ルームが存在しません');
    if (room.started) return socket.emit('errorMessage', 'クイズは既に開始されています');

    const username = socket.data.username || 'Anonymous';
    room.members.set(socket.id, username);
    room.scores.set(socket.id, 0);
    socket.join(roomId);

    socket.emit('joinedRoom', roomId);
    io.to(roomId).emit('userJoined', Array.from(room.members.values()));
    console.log(`${username} joined ${roomId}`);
  });

  // クイズ開始
  socket.on('beginQuiz', roomId => {
    const room = rooms.get(roomId);
    if (!room || room.creator !== socket.id) return;

    room.started = true;
    room.buzzed = false;
    room.responder = null;
    room.locked.clear();
    room.partial = {};

    const idx = room.order[room.current];
    io.to(roomId).emit('startQuiz', {
      index: room.current,
      total: room.order.length,
      question: questions[idx].question,
      answer: questions[idx].answer
    });
  });

  // ブザー
  socket.on('buzz', roomId => {
    const room = rooms.get(roomId);
    if (!room || !room.started || room.locked.has(socket.id) || room.buzzed) return;

    room.buzzed = true;
    room.responder = socket.id;
    const name = room.members.get(socket.id);
    // タイプライター表示を一時停止
    io.to(roomId).emit('pauseTypewriter');
    io.to(roomId).emit('buzzed', name);
  });

  // 文字選択
  socket.on('submitChar', ({ roomId, char }) => {
    const room = rooms.get(roomId);
    if (!room || socket.id !== room.responder) return;
    const idx = room.order[room.current];
    const correctAnswer = questions[idx].answer;

    room.partial[socket.id] = (room.partial[socket.id] || '') + char;
    const partial = room.partial[socket.id];
    const name = room.members.get(socket.id);

    io.to(roomId).emit('charChosen', { name, char });

    if (correctAnswer.startsWith(partial)) {
      if (partial === correctAnswer) {
        socket.emit('answerFeedback', { correct: true });
        io.to(roomId).emit('answerResult', { name, correct: true });
        room.scores.set(socket.id, (room.scores.get(socket.id) || 0) + 1);
        // 次の問題へ
        room.current++;
        room.locked.clear();
        room.buzzed = false;
        room.responder = null;
        room.partial = {};  // 解答途中文字列をクリア
        if (room.current < room.order.length) {
          const nextIdx = room.order[room.current];
          io.to(roomId).emit('startQuiz', {
            index: room.current,
            total: room.order.length,
            question: questions[nextIdx].question,
            answer: questions[nextIdx].answer
          });
        } else {
          // 終了処理
          const ranking = Array.from(room.scores.entries())
            .map(([id, score]) => ({ name: room.members.get(id), score }))
            .sort((a, b) => b.score - a.score);
          io.to(roomId).emit('quizEnded', ranking);
          rooms.delete(roomId);
          io.emit('roomsList', Array.from(rooms.keys()));
        }
      } else {
        socket.emit('partialFeedback', { partial });
        io.to(roomId).emit('partialFeedback', { partial });
      }
    } else {
      // 不正解
      socket.emit('answerFeedback', { correct: false });
      io.to(roomId).emit('answerResult', { name, correct: false });
      room.locked.add(socket.id);
      room.buzzed = false;
      room.responder = null;
      if (room.locked.size >= room.members.size) {
        // 全員不正解で次の問題
        room.current++;
        room.locked.clear();
        room.partial = {};  // 解答途中文字列をクリア
        if (room.current < room.order.length) {
          const nextIdx = room.order[room.current];
          io.to(roomId).emit('startQuiz', {
            index: room.current,
            total: room.order.length,
            question: questions[nextIdx].question,
            answer: questions[nextIdx].answer
          });
        } else {
          const ranking = Array.from(room.scores.entries())
            .map(([id, score]) => ({ name: room.members.get(id), score }))
            .sort((a, b) => b.score - a.score);
          io.to(roomId).emit('quizEnded', ranking);
          rooms.delete(roomId);
          io.emit('roomsList', Array.from(rooms.keys()));
        }
      } else {
        io.to(roomId).emit('resumeTypewriter');
      }
    }
  });

  

  // 切断
  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      if (room.members.delete(socket.id)) {
        room.scores.delete(socket.id);
        room.locked.delete(socket.id);
        io.to(roomId).emit('userLeft', Array.from(room.members.values()));
        if (room.creator === socket.id) {
          rooms.delete(roomId);
          io.emit('roomsList', Array.from(rooms.keys()));
        }
      }
    });
  });
});

server.listen(process.env.PORT || 5001, () => console.log('Server running'));
