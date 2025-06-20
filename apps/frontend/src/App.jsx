import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

export default function RoomManager() {
  const [rooms, setRooms] = useState([]);
  const [joinInput, setJoinInput] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(null);
  const [creator, setCreator] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [gameEnded, setGameEnded] = useState(false);

  // 初回レンダリングのみイベント登録
  useEffect(() => {
    socket.on('roomsList', list => setRooms(list));
    socket.on('roomCreated', ({ roomId, creator }) => {
      setJoinedRoom(roomId);
      setCreator(creator);
      setError('');
    });
    socket.on('joinedRoom', ({ roomId, creator }) => {
      setJoinedRoom(roomId);
      setCreator(creator);
      setError('');
    });
    socket.on('errorMessage', msg => setError(msg));

    socket.on('startQuiz', quizData => {
      setQuiz(quizData);
      if (quizData.index === 0) {
        setResults([]);
      }
    });
    socket.on('answerResult', res => {
      setResults(prev => [...prev, res]);
    });
    socket.on('quizEnded', () => {
      setQuiz(null);
      setGameEnded(true);
    });
    socket.on('roomDeleted', rmId => {
      if (joinedRoom === rmId) {
        resetState();
      }
    });

    socket.emit('getRooms');
    return () => socket.off();
  }, []);

  // 状態リセット
  const resetState = () => {
    setJoinedRoom(null);
    setQuiz(null);
    setGameEnded(false);
    setResults([]);
    setCreator(null);
  };

  // UI操作ハンドラ
  const handleCreate = () => socket.emit('createRoom');
  const handleDelete = id => socket.emit('deleteRoom', id);
  const handleJoin = () => socket.emit('joinRoom', joinInput.trim());
  const handleStartQuiz = () => socket.emit('beginQuiz', joinedRoom);
  const handleAnswer = opt => {
    socket.emit('submitAnswer', { roomId: joinedRoom, answer: opt });
  };

  // 得点集計
  const computeScores = () => {
    const scoreMap = {};
    results.forEach(r => {
      if (!scoreMap[r.userId]) scoreMap[r.userId] = 0;
      if (r.correct) scoreMap[r.userId]++;
    });
    return Object.entries(scoreMap)
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);
  };

  // 描画
  return (
    <div>
      {!joinedRoom && !gameEnded && (
        <div>
          <h3>ルーム管理</h3>
          <button onClick={handleCreate}>ルーム作成</button>
          <ul>
            {rooms.map(id => (
              <li key={id}>
                {id}
                <button onClick={() => handleDelete(id)}>削除</button>
              </li>
            ))}
          </ul>

          <h3>参加</h3>
          <input
            value={joinInput}
            onChange={e => setJoinInput(e.target.value)}
            placeholder="Room ID"
          />
          <button onClick={handleJoin}>参加</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}

      {joinedRoom && !quiz && !gameEnded && (
        <div>
          <p>参加中のルーム: {joinedRoom}</p>
          {creator === socket.id && <button onClick={handleStartQuiz}>クイズ開始</button>}
        </div>
      )}

      {quiz && (
        <div>
          <h4>問題 {quiz.index+1} / {quiz.total}: {quiz.question}</h4>
          <ul>
            {quiz.options.map(opt => (
              <li key={opt}>
                <button onClick={() => handleAnswer(opt)}>{opt}</button>
              </li>
            ))}
          </ul>
          <h5>回答結果</h5>
          <ul>
            {results.map((r, i) => (
              <li key={i}>{r.userId}: {r.answer} {r.correct ? '✔️' : '❌'}</li>
            ))}
          </ul>
        </div>
      )}

      {gameEnded && (
        <div>
          <h3>リザルト</h3>
          <ul>
            {computeScores().map((p, i) => (
              <li key={i}>{i+1}. {p.userId}: {p.score} 点</li>
            ))}
          </ul>
          <button onClick={resetState}>トップに戻る</button>
        </div>
      )}
    </div>
  );
}
