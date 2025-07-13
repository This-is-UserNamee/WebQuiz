import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Room, Question, Player } from '../types';

interface GameScreenProps {
  socket: Socket | null;
  room: Room;
  playerId: string;
}

const GameScreen: React.FC<GameScreenProps> = ({ socket, room, playerId }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  console.log('[GameScreen] Rendering with room:', room);
  const [questionState, setQuestionState] = useState<Room['gameData']['questionState']>(room.gameData.questionState || 'idle');
  const [activeAnswerPlayerId, setActiveAnswerPlayerId] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [playersScores, setPlayersScores] = useState<{ [playerId: string]: Player }>({});
  const [lastAnswerResult, setLastAnswerResult] = useState<{ playerId?: string; isCorrect: boolean; isFinal: boolean; correctAnswer?: string; } | null>(null);
  // フェーズ1: 問題読み上げ表示とtimerReadyイベントの自動送信
  // displayedQuestionText: 問題文の読み上げアニメーションで現在表示されているテキスト
  const [displayedQuestionText, setDisplayedQuestionText] = useState<string>('');
  // readingIndex: 問題文の読み上げアニメーションで現在何文字目まで表示したかを示すインデックス
  const [readingIndex, setReadingIndex] = useState<number>(0);

  // roomオブジェクトの変更を監視し、questionStateなどを同期
  // フェーズ1: questionStateの同期強化
  // room.gameData.questionState, currentQuestion, activeAnswerPlayerId, playersScores, timerRemaining
  // をroomオブジェクトの変更に合わせて更新し、UIがバックエンドの状態に追従するようにする。
  useEffect(() => {
    setQuestionState(room.gameData.questionState);
    setCurrentQuestion(room.gameData.questions[room.gameData.currentQuestionIndex] || null);
    setActiveAnswerPlayerId(room.gameData.activeAnswer?.playerId || null);
    setPlayersScores(room.players);
    if (room.gameData.questionState === 'timer_running' && room.gameData.remainingTime > 0) {
      setTimerRemaining(room.gameData.remainingTime);
    }
  }, [room]);

  // 読み上げアニメーションとtimerReady送信
  // フェーズ1: 問題読み上げアニメーションの実装と自動timerReady送信
  // questionStateが'reading'の場合、currentQuestion.textを一文字ずつ表示し、
  // 全て表示し終えたら自動的にtimerReadyイベントをサーバーに送信する。
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    const READING_SPEED = 100; // 1文字表示する間隔（ミリ秒）

    if (questionState === 'reading' && currentQuestion && readingIndex < currentQuestion.text.length) {
      interval = setInterval(() => {
        setReadingIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          if (currentQuestion) {
            setDisplayedQuestionText(currentQuestion.text.substring(0, nextIndex));
          }

          if (currentQuestion && nextIndex >= currentQuestion.text.length) {
            clearInterval(interval);
            if (socket) {
              socket.emit('timerReady', { roomId: room.id });
              console.log('[GameScreen] Reading complete, sent timerReady.');
            }
          }
          return nextIndex;
        });
      }, READING_SPEED);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [questionState, currentQuestion, readingIndex, socket, room.id]);

  // Socket.IOイベントハンドリング
  useEffect(() => {
    if (!socket) return;

    socket.on('newQuestion', (payload: { question: Question; questionIndex: number; room: Room }) => {
      setCurrentQuestion(payload.question);
      setQuestionState('presenting');
      setActiveAnswerPlayerId(null);
      setChoices([]);
      setTimerRemaining(0);
      setLastAnswerResult(null);
      setPlayersScores(payload.room.players);
      // フェーズ1: 新しい問題が来た際に読み上げ関連のstateをリセット
      setDisplayedQuestionText(''); // 表示中の問題文をリセット
      setReadingIndex(0); // 読み上げ進行度をリセット
      console.log('[GameScreen] New question:', payload.question.text);
    });

    socket.on('readingStarted', (payload: { room: Room }) => {
      setQuestionState('reading');
      setPlayersScores(payload.room.players);
      console.log('[GameScreen] Reading started.');
    });

    socket.on('timerStarted', (payload: { room: Room; duration: number }) => {
      setQuestionState('timer_running');
      setTimerRemaining(payload.duration);
      setPlayersScores(payload.room.players);
      console.log('[GameScreen] Timer started for', payload.duration / 1000, 'seconds.');
    });

    socket.on('buzzerResult', (payload: { winnerId: string; room: Room }) => {
      setQuestionState('answering');
      setActiveAnswerPlayerId(payload.winnerId);
      setPlayersScores(payload.room.players);
      console.log('[GameScreen] Buzzer result. Winner:', payload.winnerId);
    });

    socket.on('nextChoice', (payload: { choices: string[] }) => {
      setChoices(payload.choices);
      console.log('[GameScreen] Next choices:', payload.choices);
    });

    socket.on('answerResult', (payload: { playerId?: string; isCorrect: boolean; isFinal: boolean; correctAnswer?: string; }) => {
      setLastAnswerResult(payload);
      if (payload.isFinal) {
        setQuestionState('result');
        setActiveAnswerPlayerId(null);
        setChoices([]);
      }
      console.log('[GameScreen] Answer result:', payload);
    });

    socket.on('scoreUpdated', (payload: { players: Player[] }) => {
      const newScores: { [playerId: string]: Player } = {};
      payload.players.forEach(p => newScores[p.id] = p);
      setPlayersScores(newScores);
      console.log('[GameScreen] Scores updated:', newScores);
    });

    socket.on('gameFinished', (payload: { room: Room }) => {
      setPlayersScores(payload.room.players);
      console.log('[GameScreen] Game finished.');
    });

    socket.on('pauseReading', () => {
      setQuestionState('paused');
      console.log('[GameScreen] Reading paused.');
    });

    socket.on('resumeReading', () => {
      setQuestionState('reading');
      console.log('[GameScreen] Reading resumed.');
    });

    socket.on('pauseTimer', () => {
      setQuestionState('paused');
      console.log('[GameScreen] Timer paused.');
    });

    socket.on('errorOccurred', ({ message }) => {
      console.error('[GameScreen] Error:', message);
      alert(`Error: ${message}`);
    });

    return () => {
      socket.off('newQuestion');
      socket.off('readingStarted');
      socket.off('timerStarted');
      socket.off('buzzerResult');
      socket.off('nextChoice');
      socket.off('answerResult');
      socket.off('scoreUpdated');
      socket.off('gameFinished');
      socket.off('pauseReading');
      socket.off('resumeReading');
      socket.off('pauseTimer');
      socket.off('errorOccurred');
    };
  }, [socket, room]);

  // タイマーのカウントダウン表示
  useEffect(() => {
    if (questionState === 'timer_running' && timerRemaining > 0) {
      const timer = setInterval(() => {
        setTimerRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [questionState, timerRemaining]);

  const handleBuzz = () => {
    if (socket && (questionState === 'reading' || questionState === 'timer_running')) {
      socket.emit('buzz', { roomId: room.id });
      console.log('[GameScreen] Buzz!');
    }
  };

  const handleSubmitCharacter = (char: string) => {
    if (socket && questionState === 'answering' && activeAnswerPlayerId === playerId) {
      socket.emit('submitCharacter', { roomId: room.id, selectedChar: char });
      console.log('[GameScreen] Submitted character:', char);
    }
  };

  return (
    <div className="game-screen">
      <h2>Game in Room: {room.id}</h2>
      <p>Question State: {questionState}</p>

      {/* プレイヤーとスコアの表示 */}
      <div className="players-score">
        <h3>Players:</h3>
        <ul>
          {Object.values(playersScores).map(player => (
            <li key={player.id}>
              {player.name} {player.id === playerId ? '(You)' : ''}: {player.score} points
            </li>
          ))}
        </ul>
      </div>

      {/* 問題表示エリア */}
      {currentQuestion && (
        <div className="question-area">
          <h3>Question {room.gameData.currentQuestionIndex + 1}:</h3>
          {/* フェーズ1: questionStateに応じて問題表示を切り替える */}
          {questionState === 'presenting' ? (
            <p className="question-text">次の問題が始まります...</p>
          ) : (
            <p className="question-text">{displayedQuestionText}</p>
          )}
        </div>
      )}

      {/* 早押しボタン */}
      {(questionState === 'reading' || questionState === 'timer_running') && activeAnswerPlayerId === null && (
        <button onClick={handleBuzz}>早押し！</button>
      )}

      {/* タイマー表示 */}
      {questionState === 'timer_running' && (
        <p>Time Remaining: {Math.ceil(timerRemaining / 1000)}s</p>
      )}

      {/* 回答権表示 */}
      {activeAnswerPlayerId && (
        <p>
          {playersScores[activeAnswerPlayerId]?.name || 'Unknown Player'} が回答権を持っています。
          {activeAnswerPlayerId === playerId && (
            <span> (あなたの番です)</span>
          )}
        </p>
      )}

      {/* 選択肢表示 */}
      {questionState === 'answering' && activeAnswerPlayerId === playerId && choices.length > 0 && (
        <div className="choices-area">
          {choices.map((char, index) => (
            <button key={index} onClick={() => handleSubmitCharacter(char)}>
              {char}
            </button>
          ))}
        </div>
      )}

      {/* 回答結果表示 */}
      {lastAnswerResult && (
        <div className="answer-result">
          {lastAnswerResult.isCorrect ? (
            <p style={{ color: 'green' }}>正解！</p>
          ) : (
            <p style={{ color: 'red' }}>不正解！</p>
          )}
          {lastAnswerResult.isFinal && lastAnswerResult.correctAnswer && (
            <p>正解は: {lastAnswerResult.correctAnswer}</p>
          )}
        </div>
      )}

      {/* ゲーム終了時の表示 */}
      {room.state === 'finished' && (
        <div>
          <h3>ゲーム終了！</h3>
          <p>最終スコア:</p>
          <ul>
            {Object.values(playersScores).sort((a, b) => b.score - a.score).map(player => (
              <li key={player.id}>{player.name}: {player.score} points</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
