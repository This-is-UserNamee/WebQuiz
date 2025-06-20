const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// rooms: Map<roomId, { creator: socket.id, members: Set<socket.id>, questionOrder: number[], current: number }>
const rooms = new Map();

// サンプル問題集
const questions = [
  { question: '日本の首都はどこですか？', options: ['東京', '大阪', '京都', '名古屋'], answer: '東京' },
  { question: '化学式 H2O は何の物質ですか？', options: ['水', '酸素', '二酸化炭素', 'エタン'], answer: '水' },
  // 他の問題を追加
];

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // ルーム作成
  socket.on('createRoom', () => {
    const roomId = uuidv4();
    const order = shuffle(questions.map((_, idx) => idx));
    rooms.set(roomId, { creator: socket.id, members: new Set([socket.id]), questionOrder: order, current: 0 });
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, creator: socket.id });
    io.emit('roomsList', Array.from(rooms.keys()));
  });

  // ルーム一覧取得
  socket.on('getRooms', () => socket.emit('roomsList', Array.from(rooms.keys())));

  // ルーム削除
  socket.on('deleteRoom', (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.creator === socket.id) {
      rooms.delete(roomId);
      io.emit('roomsList', Array.from(rooms.keys()));
      io.to(roomId).emit('roomDeleted', roomId);
    } else {
      socket.emit('errorMessage', 'ルーム作成者のみルームを削除できます。');
    }
  });

  // ルーム参加
  socket.on('joinRoom', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('errorMessage', `Room ${roomId} does not exist.`);
    room.members.add(socket.id);
    socket.join(roomId);
    socket.emit('joinedRoom', { roomId, creator: room.creator });
    io.to(roomId).emit('userJoined', { roomId, userId: socket.id });
  });

  // クイズ開始（ルーム作成者のみ）
  socket.on('beginQuiz', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('errorMessage', `Room ${roomId} does not exist.`);
    if (room.creator !== socket.id) return socket.emit('errorMessage', 'クイズを開始できるのはルーム作成者のみです。');
    const qIndex = room.questionOrder[room.current];
    io.to(roomId).emit('startQuiz', { index: room.current, total: room.questionOrder.length, ...questions[qIndex] });
  });

  // 解答受付
  socket.on('submitAnswer', ({ roomId, answer }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const qIndex = room.questionOrder[room.current];
    const correct = questions[qIndex].answer === answer;
    io.to(roomId).emit('answerResult', { userId: socket.id, answer, correct });
    room.current++;
    if (room.current < room.questionOrder.length) {
      const nextIndex = room.questionOrder[room.current];
      io.to(roomId).emit('startQuiz', { index: room.current, total: room.questionOrder.length, ...questions[nextIndex] });
    } else {
      io.to(roomId).emit('quizEnded');
      rooms.delete(roomId);
      io.emit('roomsList', Array.from(rooms.keys()));
    }
  });

  // 切断時処理
  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      if (room.members.has(socket.id)) {
        room.members.delete(socket.id);
        io.to(roomId).emit('userLeft', { roomId, userId: socket.id });
        if (room.creator === socket.id) {
          rooms.delete(roomId);
          io.emit('roomsList', Array.from(rooms.keys()));
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
