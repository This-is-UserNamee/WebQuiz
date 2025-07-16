export interface Player {
  id: string;       // Socket ID
  name: string;     // プレイヤー名
  score: number;    // 現在のスコア
}

export interface Question {
  id: string;
  text: string;
  answer_data: { char: string; choices: string[] }[];
}

export interface GameData {
  questions: Question[];
  currentQuestionIndex: number;
  questionState: 'idle' | 'presenting' | 'reading' | 'timer_running' | 'paused' | 'answering' | 'result';
  prePauseState: 'reading' | 'timer_running' | null;
  timerReadyPlayerIds: string[];
  answeredPlayerIds: string[];
  activeAnswer: { playerId: string; currentAnswerIndex: number; correctChars: string} | null;
  timeoutId: NodeJS.Timeout | null;
  timerStartTime: number;
  remainingTime: number;
}

export interface Room {
  id: string;
  hostId: string;
  state: 'waiting' | 'playing' | 'finished';
  players: { [playerId: string]: Player };
  gameData: GameData;
}
