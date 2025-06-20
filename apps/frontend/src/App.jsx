import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Socket.IOクライアントの初期化
const socket = io('http://localhost:5001');

export default function RoomManager() {
  // --- State管理 ---
  const [rooms, setRooms] = useState([]);               // 利用可能なルームID一覧
  const [joined, setJoined] = useState(null);           // 現在参加中のルームID
  const [creator, setCreator] = useState(null);         // ルーム作成者のソケットID
  const [quiz, setQuiz] = useState(null);               // 現在の問題データ
  const [displayedQuestion, setDisplayedQuestion] = useState(''); // タイプライターで表示中の文字列
  const [message, setMessage] = useState('');           // UIに表示するメッセージ
  const [gameEnded, setGameEnded] = useState(false);    // ゲーム終了フラグ
  const [scores, setScores] = useState({});             // 各ユーザーのスコアマップ
  const [totalQuestions, setTotalQuestions] = useState(0); // 全問題数
  const [ranking, setRanking] = useState([]);           // ランキング配列
  const [hasBuzzed, setHasBuzzed] = useState(false);    // 早押し済みフラグ
  const [currentResponder, setCurrentResponder] = useState(null); // 現在の回答者ID
  const [lockedSet, setLockedSet] = useState(new Set()); // 不正解者のID集合

  // --- Ref管理（再レンダー不要な可変値） ---
  const charIndexRef = useRef(0);      // タイプライターの文字インデックス
  const questionRef = useRef('');      // 現在の問題文を保持
  const intervalRef = useRef(null);    // タイプライター用タイマー

  /**
   * タイプライター表示: 指定位置(startIndex)から1文字ずつ追加表示
   * @param {number} startIndex - 再開／開始位置
   */
  const startTypewriter = startIndex => {
    clearInterval(intervalRef.current);
    const question = questionRef.current;
    charIndexRef.current = startIndex;
    setDisplayedQuestion(question.slice(0, startIndex));
    intervalRef.current = setInterval(() => {
      const idx = charIndexRef.current;
      if (idx >= question.length) {
        clearInterval(intervalRef.current);
        return;
      }
      setDisplayedQuestion(prev => prev + question.charAt(idx));
      charIndexRef.current = idx + 1;
    }, 100);
  };

  /**
   * Socket.IOイベントの登録
   * マウント時に一度だけ実行
   */
  useEffect(() => {
    socket.on('roomsList', setRooms);
    socket.on('errorMessage', setMessage);

    socket.on('roomCreated', id => {
      setJoined(id);
      setCreator(socket.id);
      resetGameState(); // 新規ルーム作成時に状態初期化
    });

    socket.on('joinedRoom', id => {
      setJoined(id);
      setQuiz(null);
      setMessage('');
    });

    socket.on('startQuiz', data => {
      setQuiz(data);
      questionRef.current = data.question;  // 問題文をRefに保持
      setMessage('');
      setHasBuzzed(false);
      setCurrentResponder(null);
      setLockedSet(new Set());
      if (data.index === 0) {
        setTotalQuestions(data.total);
        setScores({});
      }
      startTypewriter(0); // 問題開始: 先頭から表示
    });

    socket.on('buzzed', userId => {
      clearInterval(intervalRef.current);
      setHasBuzzed(true);
      setCurrentResponder(userId);
    });

    socket.on('resumeTypewriter', () => {
      setHasBuzzed(false);
      setCurrentResponder(null);
      setMessage('');
      startTypewriter(charIndexRef.current); // 停止位置から再開
    });

    socket.on('answerResult', ({ userId, correct }) => {
      // スコア更新
      setScores(prev => ({
        ...prev,
        [userId]: (prev[userId] || 0) + (correct ? 1 : 0)
      }));
      if (userId === socket.id) {
        if (!correct) {
          setLockedSet(prev => new Set(prev).add(socket.id));
          setMessage('不正解！再開します');
          socket.emit('requestResume', joined);
        } else {
          setMessage('正解！次の問題へ');
        }
      }
    });

    socket.on('quizEnded', data => {
      setQuiz(null);
      setRanking(data);
      setGameEnded(true);
    });

    socket.emit('getRooms');

    return () => {
      socket.removeAllListeners();
      clearInterval(intervalRef.current);
    };
  }, []);

  // --- UI操作用関数 ---
  const create = () => socket.emit('createRoom');
  const joinRoom = id => socket.emit('joinRoom', id);
  const start = () => socket.emit('beginQuiz', joined);
  const buzz = () => socket.emit('buzz', joined);
  const answer = opt => {
    if (hasBuzzed && currentResponder === socket.id) {
      socket.emit('submitAnswer', { roomId: joined, answer: opt });
    }
  };

  /**
   * ゲーム状態をリセット
   */
  const reset = () => {
    socket.emit('getRooms');
    setJoined(null);
    resetGameState();
    setCreator(null);
  };

  function resetGameState() {
    setQuiz(null);
    setMessage('');
    setGameEnded(false);
    setScores({});
    setTotalQuestions(0);
    setRanking([]);
    clearInterval(intervalRef.current);
    setDisplayedQuestion('');
    setHasBuzzed(false);
    setCurrentResponder(null);
    setLockedSet(new Set());
    charIndexRef.current = 0;
    questionRef.current = '';
  }

  /**
   * 結果ソート: ランキングがあれば優先、それ以外はスコア順にソート
   */
  const sortedResults = ranking.length
    ? ranking
    : Object.entries(scores)
        .map(([u, s]) => ({ userId: u, score: s }))
        .sort((a, b) => b.score - a.score);

  // --- 描画 ---
  return (
    <div>
      {/* ロビー画面 */}
      {!joined && !gameEnded && (
        <div>
          <button onClick={create}>ルーム作成</button>
          <ul>
            {rooms.map(r => (
              <li key={r}>
                {r}{' '}
                <button onClick={() => joinRoom(r)} disabled={message !== ''}>
                  {message ? '参加不可' : '参加'}
                </button>
              </li>
            ))}
          </ul>
          {message && <p>{message}</p>}
        </div>
      )}

      {/* 開始前画面 */}
      {joined && !quiz && !gameEnded && (
        <div>
          <p>ルーム: {joined}</p>
          {creator === socket.id && <button onClick={start}>開始</button>}
        </div>
      )}

      {/* クイズ進行中画面 */}
      {quiz && !gameEnded && (
        <div>
          <p>{quiz.index + 1}/{totalQuestions} 問目: {displayedQuestion}</p>
          <button onClick={buzz} disabled={hasBuzzed || lockedSet.has(socket.id)}>
            {lockedSet.has(socket.id)
              ? '解答不可'
              : hasBuzzed
              ? '待機中…'
              : '早押し'}
          </button>
          {hasBuzzed && currentResponder === socket.id && (
            <div>
              {quiz.options.map(opt => (
                <button key={opt} onClick={() => answer(opt)}>{opt}</button>
              ))}
            </div>
          )}
          {message && <p>{message}</p>}
        </div>
      )}

      {/* 終了画面 */}
      {gameEnded && (
        <div>
          <h3>リザルト</h3>
          <ol>{sortedResults.map(p => <li key={p.userId}>{p.userId}: {p.score} 点</li>)}</ol>
          <button onClick={reset}>トップに戻る</button>
        </div>
      )}
    </div>
  );
}
