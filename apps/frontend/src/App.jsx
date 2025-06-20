import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

// ひらがなを生成するヘルパー関数
const generateRandomHiragana = (count, correctChar) => {
  const start = 0x3042;
  const end = 0x3093;
  const all = [];
  for (let i = start; i <= end; i++) {
    const c = String.fromCharCode(i);
    if (!['ゔ', 'ゐ', 'ゑ'].includes(c)) all.push(c);
  }
  const avail = all.filter(c => c !== correctChar);
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
  const [username, setUsername] = useState('');
  const [registered, setRegistered] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [joined, setJoined] = useState(null);
  const [creator, setCreator] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [message, setMessage] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const [scores, setScores] = useState({});
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [ranking, setRanking] = useState([]);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [currentResponder, setCurrentResponder] = useState(null);
  const [lockedSet, setLockedSet] = useState(new Set());
  const [partial, setPartial] = useState('');
  const [options, setOptions] = useState([]);

  const [correctInfo, setCorrectInfo] = useState({ show: false, name: '', answer: '' });


  const charIndexRef = useRef(0);
  const questionRef = useRef('');
  const intervalRef = useRef(null);

  useEffect(() => {
    socket.on('roomsList', setRooms);
    socket.on('errorMessage', setMessage);

    socket.on('roomCreated', id => {
      setJoined(id);
      setCreator(socket.id);
      resetGameState();
    });
    socket.on('joinedRoom', id => {
      setJoined(id);
      resetGameState();
      setMessage('');
    });
    socket.on('userJoined', names => setMessage(names.join('、') + ' が参加しました'));

    socket.on('startQuiz', data => {
      // 新問開始時に状態リセット
      setQuiz(data);
      setTotalQuestions(data.total);
      setPartial('');
      setMessage('');
      setCurrentResponder(null);
      setHasBuzzed(false);
      setLockedSet(new Set());

      questionRef.current = data.question;
      // タイプライター表示開始
      startTypewriter(0);
    });

    socket.on('pauseTypewriter', () => {
      clearInterval(intervalRef.current);
    });

    socket.on('buzzed', name => {
      setCurrentResponder(name);
      setMessage(`${name} が回答中`);
      setHasBuzzed(name === username);
    });

    socket.on('charChosen', ({ name, char }) => {
      //setMessage(`${name} が「${char}」を選択`);
    });

    socket.on('partialFeedback_every', ({ partial }) => {
      setMessage(`${partial}`);
    });

    socket.on('partialFeedback', ({ partial }) => {
      setPartial(partial);
      setMessage(`${partial}`);
    });

    socket.on('answerResult', ({ name, correct }) => {
      // スコア更新
      setScores(prev => ({ ...prev, [name]: (prev[name] || 0) + (correct ? 1 : 0) }));

      if (name === username) {
        if (correct) {
          setCorrectInfo({ show: true, name, answer: quiz.answer });
          clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setCorrectInfo({ show: false, name: '', answer: '' });
          socket.emit('nextQuestion', joined);
        }, 3000);
          setMessage('完全正解！');
          // 次の問題では再度早押し可能に
          setHasBuzzed(false);
        } else {
          setMessage('不正解でした');
          setLockedSet(prev => new Set(prev).add(username));
          // 不正解時のみタイプライター再開を要求
          socket.emit('requestResume', joined);
        }
      }
    });

    socket.on('resumeTypewriter', () => {
      setHasBuzzed(false);
      setCurrentResponder(null);
      setMessage('');
      setPartial('');
      startTypewriter(charIndexRef.current);
    });

    socket.on('quizEnded', data => {
      setQuiz(null);
      setRanking(data);
      setGameEnded(true);
    });

    socket.emit('getRooms');
    return () => socket.removeAllListeners();
  }, [username]);

  useEffect(() => {
    if (!quiz) return;
    const idx = partial.length;
    const correctChar = quiz.answer[idx];
    setOptions(generateRandomHiragana(4, correctChar));
  }, [quiz, partial]);

  const handleChar = c => {
    socket.emit('submitChar', { roomId: joined, char: c });
  };

  const startTypewriter = startIndex => {
    clearInterval(intervalRef.current);
    const text = questionRef.current;
    charIndexRef.current = startIndex;
    setDisplayedQuestion(text.slice(0, startIndex));
    intervalRef.current = setInterval(() => {
      const idx = charIndexRef.current;
      if (idx >= text.length) return clearInterval(intervalRef.current);
      setDisplayedQuestion(prev => prev + text.charAt(idx));
      charIndexRef.current = idx + 1;
    }, 100);
  };

  const register = () => {
    if (!username.trim()) return;
    socket.emit('setName', username.trim());
    setRegistered(true);
    socket.emit('getRooms');
  };
  const create = () => socket.emit('createRoom');
  const joinRoom = id => socket.emit('joinRoom', { roomId: id });
  const start = () => socket.emit('beginQuiz', joined);
  const buzz = () => socket.emit('buzz', joined);
  const answer = opt => { if (hasBuzzed && currentResponder === username) handleChar(opt); };
  const reset = () => { socket.emit('getRooms'); setJoined(null); setCreator(null); resetGameState(); };

  function resetGameState() {
    setQuiz(null);
    setMessage('');
    setGameEnded(false);
    setScores({});
    setTotalQuestions(0);
    setRanking([]);
    setHasBuzzed(false);
    setCurrentResponder(null);
    setLockedSet(new Set());
    setDisplayedQuestion('');
    setPartial('');
    setOptions([]);
    clearInterval(intervalRef.current);
  }

  // 描画
  if (!registered) {
    return (
      <div>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="ユーザー名を入力" />
        <button onClick={register}>登録</button>
      </div>
    );
  }

  return (
    <div>
      {!joined && !gameEnded && (
        <div>
          <button onClick={create}>ルーム作成</button>
          <ul>{rooms.map(r => (
            <li key={r}>{r} <button onClick={() => joinRoom(r)}>参加</button></li>
          ))}</ul>
          {message && <p>{message}</p>}
        </div>
      )}

      {joined && !quiz && !gameEnded && (
        <div>
          <p>ルーム: {joined}</p>
          {creator === socket.id && <button onClick={start}>開始</button>}
        </div>
      )}

      {quiz && !gameEnded && (
        <div>
          <p>{quiz.index + 1}/{totalQuestions}問目: {displayedQuestion}</p>
          <button
            onClick={buzz}
            disabled={hasBuzzed || lockedSet.has(username) || (currentResponder && currentResponder !== username)}
          >
            {lockedSet.has(username)
              ? '解答不可'
              : hasBuzzed
                ? '待機中…'
                : currentResponder
                  ? '他の人が回答中…'
                  : '早押し'}
          </button>
          {hasBuzzed && currentResponder === username && (
            <div>{options.map(opt => (
              <button key={opt} onClick={() => answer(opt)}>{opt}</button>
            ))}</div>
          )}
          {message && <p>{message}</p>}
          {correctInfo.show && (
            <div className="overlay">
              <p>{correctInfo.name} が正解！答え: {correctInfo.answer}</p>
            </div>
          )}
        </div>
      )}

      {gameEnded && (
        <div>
          <h3>リザルト</h3>
          <ol>{ranking.map(p => <li key={p.name}>{p.name}: {p.score}点</li>)}</ol>
          <button onClick={reset}>トップに戻る</button>
        </div>
      )}
    </div>
  );
}
