const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// rooms: Map<roomId, { creator, members, order, current, locked, scores, started, buzzed, responder }>
const rooms = new Map();

// サンプル問題集
const questions = [
  { question: '日本の首都はどこですか？', options: ['東京', '大阪', '京都', '名古屋'], answer: '東京' },
  { question: '化学式 H2O は何の物質ですか？', options: ['水', '酸素', '二酸化炭素', 'エタン'], answer: '水' },
];

function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }

io.on('connection', socket => {
  // ルーム作成
  socket.on('createRoom', () => {
    const roomId = uuidv4();
    const order = shuffle(questions.map((_, idx) => idx));
    const members = new Set([socket.id]);
    const scores = new Map([[socket.id, 0]]);
    rooms.set(roomId, {
      creator: socket.id,
      members,
      order,
      current: 0,
      locked: new Set(), // 不正解者を追跡
      scores,
      started: false,
      buzzed: false,
      responder: null
    });
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    io.emit('roomsList', Array.from(rooms.keys()));
  });

  socket.on('getRooms', () => socket.emit('roomsList', Array.from(rooms.keys())));

  socket.on('deleteRoom', roomId => {
    const room = rooms.get(roomId);
    if (room?.creator === socket.id) {
      rooms.delete(roomId);
      io.emit('roomsList', Array.from(rooms.keys()));
      io.to(roomId).emit('roomDeleted', roomId);
    }
  });

  socket.on('joinRoom', roomId => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('errorMessage', 'ルームが存在しません');
    if (room.started) return socket.emit('errorMessage', 'クイズは既に開始されています');
    room.members.add(socket.id);
    room.scores.set(socket.id, 0);
    socket.join(roomId);
    socket.emit('joinedRoom', roomId);
    io.to(roomId).emit('userJoined', Array.from(room.members));
  });

  socket.on('beginQuiz', roomId => {
    const room = rooms.get(roomId);
    if (!room || room.creator !== socket.id) return;
    room.started = true;
    room.buzzed = false;
    room.responder = null;
    room.locked.clear();
    const idx = room.order[room.current];
    io.to(roomId).emit('startQuiz', { index: room.current, total: room.order.length, ...questions[idx] });
  });

  // 早押し
  socket.on('buzz', roomId => {
    const room = rooms.get(roomId);
    // 一度不正解になった人はロックされるため再押し不可
    if (!room || room.locked.has(socket.id) || room.buzzed) return;
    room.buzzed = true;
    room.responder = socket.id;
    io.to(roomId).emit('buzzed', socket.id);
  });

  // 解答後の再開 or 次の問題判定
  socket.on('requestResume', roomId => {
    const room = rooms.get(roomId);
    if (!room || socket.id !== room.responder) return;

    room.locked.add(socket.id);
    room.buzzed = false;
    room.responder = null;

    if (room.locked.size >= room.members.size) {
      room.current++;
      room.locked.clear();
      if (room.current < room.order.length) {
        const nextIdx = room.order[room.current];
        io.to(roomId).emit('startQuiz', { index: room.current, total: room.order.length, ...questions[nextIdx] });
      } else {
        const ranking = Array.from(room.scores.entries())
          .map(([userId, score]) => ({ userId, score }))
          .sort((a, b) => b.score - a.score);
        io.to(roomId).emit('quizEnded', ranking);
        rooms.delete(roomId);
        io.emit('roomsList', Array.from(rooms.keys()));
      }
    } else {
      io.to(roomId).emit('resumeTypewriter');
    }
  });

  socket.on('submitAnswer', ({ roomId, answer }) => {
    const room = rooms.get(roomId);
    if (!room || socket.id !== room.responder) return;
    const idx = room.order[room.current];
    const correct = questions[idx].answer === answer;
    io.to(roomId).emit('answerResult', { userId: socket.id, correct });

    if (correct) {
      room.scores.set(socket.id, (room.scores.get(socket.id) || 0) + 1);
      room.current++;
      room.locked.clear();
      room.buzzed = false;
      room.responder = null;

      if (room.current < room.order.length) {
        const nextIdx = room.order[room.current];
        io.to(roomId).emit('startQuiz', { index: room.current, total: room.order.length, ...questions[nextIdx] });
      } else {
        const ranking = Array.from(room.scores.entries())
          .map(([userId, score]) => ({ userId, score }))
          .sort((a, b) => b.score - a.score);
        io.to(roomId).emit('quizEnded', ranking);
        rooms.delete(roomId);
        io.emit('roomsList', Array.from(rooms.keys()));
      }
    } else {
      room.locked.add(socket.id);
      room.buzzed = false;
      room.responder = null;

      if (room.locked.size >= room.members.size) {
        room.current++;
        room.locked.clear();
        if (room.current < room.order.length) {
          const nextIdx = room.order[room.current];
          io.to(roomId).emit('startQuiz', { index: room.current, total: room.order.length, ...questions[nextIdx] });
        } else {
          const ranking = Array.from(room.scores.entries())
            .map(([userId, score]) => ({ userId, score }))
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

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      if (room.members.delete(socket.id)) {
        room.scores.delete(socket.id);
        room.locked.delete(socket.id);
        if (room.responder === socket.id) {
          room.buzzed = false;
          room.responder = null;
          if (room.locked.size >= room.members.size) {
            room.current++;
            room.locked.clear();
            if (room.current < room.order.length) {
              const nextIdx = room.order[room.current];
              io.to(roomId).emit('startQuiz', { index: room.current, total: room.order.length, ...questions[nextIdx] });
            } else {
              const ranking = Array.from(room.scores.entries())
                .map(([userId, score]) => ({ userId, score }))
                .sort((a, b) => b.score - a.score);
              io.to(roomId).emit('quizEnded', ranking);
              rooms.delete(roomId);
              io.emit('roomsList', Array.from(rooms.keys()));
            }
          } else {
            io.to(roomId).emit('resumeTypewriter');
          }
        }
        io.to(roomId).emit('userLeft', Array.from(room.members));
        if (room.creator === socket.id) {
          rooms.delete(roomId);
          io.emit('roomsList', Array.from(rooms.keys()));
        }
      }
    });
  });
});

server.listen(process.env.PORT || 5001);
