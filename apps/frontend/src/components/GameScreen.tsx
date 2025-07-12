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
  const [questionState, setQuestionState] = useState<Room['gameData']['questionState']>('idle');
  const [activeAnswerPlayerId, setActiveAnswerPlayerId] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [playersScores, setPlayersScores] = useState<{ [playerId: string]: Player }>({});
  const [lastAnswerResult, setLastAnswerResult] = useState<{ playerId?: string; isCorrect: boolean; isFinal: boolean; correctAnswer?: string; } | null>(null);

  useEffect(() => {
    if (!socket) return;

    // 初期スコア設定
    setPlayersScores(room.players);

    // 新しい問題イベント
    socket.on('newQuestion', (payload: { question: Question; questionIndex: number; room: Room }) => {
      setCurrentQuestion(payload.question);
      setQuestionState('presenting');
      setActiveAnswerPlayerId(null);
      setChoices([]);
      setTimerRemaining(0);
      setLastAnswerResult(null);
      setPlayersScores(payload.room.players); // スコアもリセットされる可能性があるので更新
      console.log('[GameScreen] New question:', payload.question.text);
    });

    // 読み上げ開始イベント
    socket.on('readingStarted', (payload: { room: Room }) => {
      setQuestionState('reading');
      setPlayersScores(payload.room.players);
      console.log('[GameScreen] Reading started.');
    });

    // タイマー開始イベント
    socket.on('timerStarted', (payload: { room: Room; duration: number }) => {
      setQuestionState('timer_running');
      setTimerRemaining(payload.duration);
      setPlayersScores(payload.room.players);
      console.log('[GameScreen] Timer started for', payload.duration / 1000, 'seconds.');
    });

    // 早押し結果イベント
    socket.on('buzzerResult', (payload: { winnerId: string; room: Room }) => {
      setQuestionState('answering');
      setActiveAnswerPlayerId(payload.winnerId);
      setPlayersScores(payload.room.players);
      console.log('[GameScreen] Buzzer result. Winner:', payload.winnerId);
    });

    // 次の選択肢イベント
    socket.on('nextChoice', (payload: { choices: string[] }) => {
      setChoices(payload.choices);
      console.log('[GameScreen] Next choices:', payload.choices);
    });

    // 回答結果イベント
    socket.on('answerResult', (payload: { playerId?: string; isCorrect: boolean; isFinal: boolean; correctAnswer?: string; }) => {
      setLastAnswerResult(payload);
      if (payload.isFinal) {
        setQuestionState('result');
        setActiveAnswerPlayerId(null);
        setChoices([]);
      }
      console.log('[GameScreen] Answer result:', payload);
    });

    // スコア更新イベント
    socket.on('scoreUpdated', (payload: { players: Player[] }) => {
      const newScores: { [playerId: string]: Player } = {};
      payload.players.forEach(p => newScores[p.id] = p);
      setPlayersScores(newScores);
      console.log('[GameScreen] Scores updated:', newScores);
    });

    // ゲーム終了イベント
    socket.on('gameFinished', (payload: { room: Room }) => {
      
      setPlayersScores(payload.room.players);
      console.log('[GameScreen] Game finished.');
      // 必要に応じて、結果表示やロビーへの遷移などをここで処理
    });

    // 読み上げ一時停止イベント
    socket.on('pauseReading', () => {
      setQuestionState('paused');
      console.log('[GameScreen] Reading paused.');
    });

    // 読み上げ再開イベント
    socket.on('resumeReading', () => {
      setQuestionState('reading');
      console.log('[GameScreen] Reading resumed.');
    });

    // タイマー一時停止イベント
    socket.on('pauseTimer', () => {
      setQuestionState('paused');
      console.log('[GameScreen] Timer paused.');
    });

    // エラーイベント
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

  const handleTimerReady = () => {
    if (socket && questionState === 'reading') {
      socket.emit('timerReady', { roomId: room.id });
      console.log('[GameScreen] Timer ready sent.');
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
          <p className="question-text">{currentQuestion.text}</p>
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

      {/* 全員準備完了ボタン (reading状態のみ) */}
      {questionState === 'reading' && (
        <button onClick={handleTimerReady}>問題読み上げ完了</button>
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
