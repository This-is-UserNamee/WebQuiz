import React, { useState, useEffect, useRef, useCallback } from 'react';

// ひらがなを生成するヘルパー関数 (正解の文字を含み、他はランダムな文字)
// アプリケーションロジックから独立しているため、コンポーネントの外に配置
const generateRandomHiragana = (count, correctChar) => {
  const hiraganaStart = 0x3042; // ひらがな 'あ' のUnicodeコードポイント
  const hiraganaEnd = 0x3093;    // ひらがな 'ん' のUnicodeコードポイント
  const allHiragana = [];
  for (let i = hiraganaStart; i <= hiraganaEnd; i++) {
    const char = String.fromCharCode(i);
    // 一般的に使われないひらがな（例: ゔ）を除外する
    if (!['ゔ', 'ゐ', 'ゑ'].includes(char)) { // 'ゐ', 'ゑ'も追加
      allHiragana.push(char);
    }
  }

  // 正解の文字を除く他のひらがな
  let availableHiragana = allHiragana.filter(char => char !== correctChar);

  // 利用可能なひらがなをシャッフル
  for (let i = availableHiragana.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableHiragana[i], availableHiragana[j]] = [availableHiragana[j], availableHiragana[i]];
  }

  // 正解の文字を含まないN-1個のランダムな文字を選択
  const wrongChoices = availableHiragana.slice(0, Math.min(count - 1, availableHiragana.length));
  const choices = [...wrongChoices, correctChar];

  // 選択肢全体の表示順をシャッフル
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
};

// アイソメトリックな早押しボタンコンポーネント
const IsometricButton = ({ onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled} // disabled prop を使用してボタンの活性/非活性を制御
      className={`isometric-button ${disabled ? 'disabled' : 'active'}`}
      aria-label="早押しボタン" // アクセシビリティのためにaria-labelを追加
    >
      {/* 土台の影 */}
      <div className="isometric-button-shadow"></div>

      {/* 土台 */}
      <div className="isometric-button-base">
        {/* 麻布風テクスチャの擬似要素 */}
        <div className="linen-texture-overlay"></div>
        <div className="isometric-button-base-border"></div> {/* 枠線 */}
      </div>

      {/* ボタン本体（上面） */}
      <div className={`isometric-button-top ${disabled ? 'pressed' : ''}`}>
        {/* ボタン本体（側面） - アイソメトリック感を出すための擬似要素 */}
        <div className={`isometric-button-side ${disabled ? 'pressed' : ''}`}></div>

        <div className="isometric-button-text-container">
          {/* フォントを「Noto Sans JP」に設定 */}
          <span className="button-text font-sans">
            早押し！
          </span>
        </div>
      </div>
    </button>
  );
};


// メインアプリケーションコンポーネント
const App = () => {
  // 問題と答えのデータ構造 (答えはひらがなで記述)
  const questions = useRef([
    {
      question: '578年に百済から招かれた金剛重光を祖に創業し、1400年以上にわたり寺社建築を請け負ってきた世界最古の企業とされる建設会社は何でしょう？',
      answer: 'こんごうぐみ',
    },
    {
      question: '翼を持ち、滑空ではなく自力で飛行できる唯一の哺乳類は何でしょう？',
      answer: 'こうもり',
    },
    {
      question: '短編『走れメロス』を1940年に発表した青森県出身の小説家は誰でしょう？',
      answer: 'だざいおさむ',
    },
    {
      question: '2020年12月、C型小惑星リュウグウの試料を入れたカプセルを豪州に着地させたJAXAの探査機は何でしょう？',
      answer: 'はやぶさに',
    },
    {
      question: '標高3776メートルで日本最高峰とされる成層火山は何でしょう？',
      answer: 'ふじさん',
    },
    {
      question: '周期表で原子番号1を示し、宇宙で最も豊富な元素は何でしょう？',
      answer: 'すいそ',
    },
    {
      question: '大気に巨大な赤い渦があり、太陽系最大の嵐を抱える惑星は何でしょう？',
      answer: 'もくせい',
    },
    {
      question: '1896年に近代オリンピック第1回大会が開催された都市はどこでしょう？',
      answer: 'あてね',
    },
    {
      question: 'およそ920万平方キロメートルの面積を持つ、世界最大の熱砂砂漠は何でしょう？',
      answer: 'さはらさばく',
    },
    {
      question: '1813年に『高慢と偏見』を刊行したイギリスの作家は誰でしょう？',
      answer: 'じぇーんおーすてん',
    },
    {
      question: '白鷺が羽ばたく姿になぞらえられることから「白鷺城」とも呼ばれる兵庫県の城は何でしょう？',
      answer: 'ひめじじょう',
    },
    {
      question: '1968年にスウェーデン国立銀行が創設し、アルフレッド・ノーベルを記念して授与される賞の部門は何でしょう？',
      answer: 'けいざいがくしょう',
    },
    {
      question: '開発者グイド・ヴァンロッサムがイギリスのコメディ番組『モンティ・パイソン』にちなみ命名したプログラミング言語は何でしょう？',
      answer: 'ぱいそん',
    },
    {
      question: '自然対数の底として約2.71828の値を持つ数学定数は何でしょう？',
      answer: 'いー',
    },
    {
      question: '1979年、大阪・梅田に世界で初めて開業した簡易宿泊施設の業態は何でしょう？',
      answer: 'かぷせるほてる',
    },
    {
      question: '1964年に開業し東京と新大阪を結んだ世界初の高速鉄道路線は何でしょう？',
      answer: 'とうかいどうしんかんせん',
    },
    {
      question: '1957年10月4日に打ち上げられ、人類初の人工衛星となった宇宙機は何でしょう？',
      answer: 'すぷーとにくいちごう',
    },
    {
      question: '織姫と彦星が年に一度天の川で出会うという伝承に基づき7月7日に行われる日本の星祭りは何でしょう？',
      answer: 'たなばた',
    },
    {
      question: '国際規格ISO 216で定められ、寸法が210ミリメートル×297ミリメートルの紙サイズは何でしょう？',
      answer: 'えーふぉー',
    },
    {
      question: '化学記号Auを持ち原子番号79で知られる貴金属元素は何でしょう？',
      answer: 'きん',
    },
    {
      question: '1969年7月20日、アポロ11号の月着陸船イーグルが「Tranquility Base」に降り立った際、その地点が位置する月面の“海”はどこでしょう？',
      answer: 'しずかのうみ',
    },
    {
      question: '電気受容器官を備え、哺乳類でありながら卵を産むという進化的に特異なオーストラリアの半水生生物は何でしょう？',
      answer: 'かものはし',
    },
    {
      question: '2021年12月25日にアリアン5ロケットで打ち上げられ、L2軌道から赤外線観測を行う次世代宇宙望遠鏡は何でしょう？',
      answer: 'じぇーむずうぇっぶすぺーすてれすこーぷ',
    },
    {
      question: '全長約6650キロメートルでアフリカ最長とされ、古代エジプト文明を支えた大河は何でしょう？',
      answer: 'ないるがわ',
    },
    {
      question: '標高5895メートルでアフリカ大陸最高峰にそびえるタンザニアの成層火山は何でしょう？',
      answer: 'きりまんじゃろ',
    },
    {
      question: '開発当初、米国防総省の言語統合計画で誕生し、19世紀の数学者ラブレース伯爵夫人の名を冠したプログラミング言語は何でしょう？',
      answer: 'えいだ',
    },
    {
      question: '1989年にCERNのティム・バーナーズ＝リーが提案し、HTTPやHTMLの基盤となった情報共有システムは何でしょう？',
      answer: 'わーるどうぁいどうぇぶ',
    },
    {
      question: '1921年に光電効果の研究でノーベル物理学賞を受賞した理論物理学者は誰でしょう？',
      answer: 'あいんしゅたいん',
    },
    {
      question: '樹齢千年を超える杉“屋久杉”で知られ、1993年に世界遺産となった鹿児島県の島はどこでしょう？',
      answer: 'やくしま',
    },
    {
      question: 'ドイツの物理学者にちなみ名付けられた、電気抵抗のSI単位は何でしょう？',
      answer: 'おーむ',
    },
    {
      question: '四つのヴァイオリン協奏曲『四季』を作曲したバロック期のイタリア人音楽家は誰でしょう？',
      answer: 'びばるでぃ',
    },
    {
      question: 'ひまわりを描いた連作で知られ、ポスト印象派を代表するオランダ出身の画家は誰でしょう？',
      answer: 'ふぁんごっほ',
    },
    {
      question: '氷と岩から成る壮大な環を持ち、“Ringed Planet”の異名を取る太陽系第六惑星は何でしょう？',
      answer: 'どせい',
    },
    {
      question: '1987年に採択され、オゾン層を破壊する物質の段階的削減を定めた国際条約は何でしょう？',
      answer: 'もんとりおーるしょうてい',
    },
    {
      question: '1994年にフェルマーの最終定理の証明を完成させた英国人数学者は誰でしょう？',
      answer: 'あんどりゅーわいるず',
    },
    {
      question: '五・七・五の音律で詠まれる、日本古来の定型短詩形は何でしょう？',
      answer: 'はいく',
    },
    {
      question: '中東で初めてFIFAワールドカップを開催した、2022年大会の開催国はどこでしょう？',
      answer: 'かたーる',
    },
    {
      question: '化学式C₆H₁₂O₆で“血糖”とも呼ばれる単糖は何でしょう？',
      answer: 'ぐるこーす',
    },
    {
      question: '1986年4月26日に爆発事故を起こしたチェルノブイリ原子力発電所で損壊したのは第何号炉でしょう？',
      answer: 'よんごうろ',
    },
    {
      question: '加齢による聴力喪失の中で交響曲第九番を完成させたドイツ出身の作曲家は誰でしょう？',
      answer: 'べーとーべん',
    },
    {
      question: '1872年に世界初の国立公園として制定され、間欠泉オールドフェイスフルで知られる米国の保護地域はどこでしょう？',
      answer: 'いえるすとーんこくりつこうえん',
    },
    {
      question: '2017年に第9代国連事務総長に就任し、2022年から2期目を務めるポルトガル出身の人物は誰でしょう？',
      answer: 'あんとにおぐてーれす',
    },
    {
      question: '1655年にホイヘンスが発見し、窒素主体の大気を持つ土星最大の衛星は何でしょう？',
      answer: 'たいたん',
    },
    {
      question: '1946年に完成し、汎用電子計算機の嚆矢とされる米国の大型コンピュータは何でしょう？',
      answer: 'えにあっく',
    },
    {
      question: '18世紀に建造され、ドイツ統一の象徴ともなるベルリン中心部の新古典主義門は何でしょう？',
      answer: 'ぶらんでんぶるくもん',
    },
    {
      question: '南米最大国で公用語として用いられている言語は何でしょう？',
      answer: 'ぽるとがるご',
    },
    {
      question: '紀元前2世紀頃から15世紀頃まで東西交易を担った“絹の道”と訳される歴史的通商路は何でしょう？',
      answer: 'しるくろーど',
    },
    {
      question: '松果体から夜間に分泌され、睡眠リズムを調節するホルモンは何でしょう？',
      answer: 'めらとにん',
    },
    {
      question: '1972年レイキャビクで行われ“世紀の対決”と呼ばれた世界チェス選手権の競技種目は何でしょう？',
      answer: 'ちぇす',
    },
    {
      question: '元素記号Agを持ち、全金属中で最高の電気伝導率を示す元素は何でしょう？',
      answer: 'ぎん',
    },
    {
      question: '漢字では“首爾”と書き、朝鮮半島の政治・経済の中心となる都市はどこでしょう？',
      answer: 'そる',
    },
    {
      question: '気体の水蒸気が冷却されて液体に変わる現象を日本語で何と呼ぶでしょう？',
      answer: 'ぎょうけつ',
    },
    {
      question: '2006年にジャック・ドーシーらが開発し、当初140文字制限で人気を博したマイクロブログサービスは何でしょう？',
      answer: 'ついったー',
    },
    {
      question: '西太平洋・マリアナ海溝南端に位置し、海底で最も深い地点として知られる場所はどこでしょう？',
      answer: 'ちゃれんじゃーでぃーぷ',
    },
    {
      question: '1889年のパリ万国博覧会に合わせて完成し、当時世界最高300メートル超の高さを誇った鉄塔は何でしょう？',
      answer: 'えふぇるとう',
    },
    {
      question: '古代ケルトのサウィン祭に起源を持ち、現在は10月31日に仮装や菓子配りで祝われる行事は何でしょう？',
      answer: 'はろうぃん',
    },
    {
      question: '聴覚障害の家族を持つ少女を描き、2022年のアカデミー賞作品賞を受賞した映画は何でしょう？',
      answer: 'こーだ',
    },
    {
      question: 'ナイル川デルタ近くに位置し、アフリカ最大都市とも言われるエジプトの首都はどこでしょう？',
      answer: 'かいろ',
    },
    {
      question: '常温で液体として存在し、比重13.5を超える重金属として体温計などに用いられてきた元素は何でしょう？',
      answer: 'すいぎん',
    },
    {
      question: '2006年の国際天文学連合総会で“矮小惑星”に再分類され、太陽系の第九惑星の座を失った天体は何でしょう？',
      answer: 'ぷるーと',
    },
  ]);

  // UIの状態を管理するstate変数
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // 現在の問題のインデックス
  const [displayedText, setDisplayedText] = useState(''); // 表示される問題文のテキスト
  const [charIndex, setCharIndex] = useState(0); // タイピングアニメーションの文字インデックス
  const [typingComplete, setTypingComplete] = useState(false); // タイピングが完了したかどうかの状態
  const [isBuzzing, setIsBuzzing] = useState(false); // 早押しボタンが押されたかどうかの状態
  const [showChoices, setShowChoices] = useState(false); // ひらがな四択を表示するかどうかの状態
  const [hiraganaChoices, setHiraganaChoices] = useState([]); // 生成されたひらがなの選択肢
  const [feedbackMessage, setFeedbackMessage] = useState(''); // 回答フィードバックメッセージ
  const [answerStage, setAnswerStage] = useState(0); // 多段階回答の現在のステージ
  const [answeredHiragana, setAnsweredHiragana] = useState([]); // 回答中に正解したひらがなを保存
  const [showQuestionIntro, setShowQuestionIntro] = useState(true); // 「問題！」表示の状態
  const [score, setScore] = useState(0); // ダミースコア

  // タイマー関連の定数
  const buzzTimeLimit = 5; // 早押しボタンを押すまでの時間制限 (秒)
  const choiceTimeLimit = 5; // 選択肢を選ぶまでの時間制限 (秒)

  const [remainingTime, setRemainingTime, ] = useState(buzzTimeLimit); // 残り時間 (数値表示用)
  const [showTimer, setShowTimer] = useState(false); // タイマーバーを表示するかどうか
  const [progressBarWidth, setProgressBarWidth] = useState(100); // プログレスバーの現在の幅

  // タイマーや自動遷移のsetTimeout/setInterval IDを保持するためのref
  const timerRef = useRef(null);
  const autoAdvanceTimerRef = useRef(null);
  const questionIntroTimerRef = useRef(null);

  // 利用可能な問題のインデックスを管理するRef
  const availableQuestionsIndexes = useRef([]);


  // 定数定義
  const AUTO_ADVANCE_DELAY_CORRECT = 3000; // 完全正解時：3秒
  const AUTO_ADVANCE_DELAY_INCORRECT_TIMEOUT = 2000; // 不正解・時間切れ時：2秒
  const QUESTION_INTRO_DELAY = 1000; // 「問題！」表示時間：1秒

  // 現在の問題のデータと期待されるひらがな
  const currentQuestion = questions.current[currentQuestionIndex];
  const fullQuestion = currentQuestion ? currentQuestion.question : '';
  const expectedHiragana = currentQuestion ? currentQuestion.answer[answerStage] : '';

  // 問題をランダムに選択し、全ての状態をリセットする関数
  const resetTyping = useCallback(() => {
    // 既存のタイマーやタイムアウトを全てクリア
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (questionIntroTimerRef.current) clearTimeout(questionIntroTimerRef.current);

    timerRef.current = null;
    autoAdvanceTimerRef.current = null;
    questionIntroTimerRef.current = null;

    // 利用可能な問題がなくなったら、新しいラウンドを開始
    if (availableQuestionsIndexes.current.length === 0) {
      // 全ての問題のインデックスでプールをリセット
      availableQuestionsIndexes.current = Array.from({ length: questions.current.length }, (_, i) => i);
      // プール全体をシャッフル
      for (let i = availableQuestionsIndexes.current.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableQuestionsIndexes.current[i], availableQuestionsIndexes.current[j]] = [availableQuestionsIndexes.current[j], availableQuestionsIndexes.current[i]];
      }
    }

    // 利用可能なプールからランダムな問題を選択
    const randomIndexInAvailablePool = Math.floor(Math.random() * availableQuestionsIndexes.current.length);
    const newQuestionIndex = availableQuestionsIndexes.current[randomIndexInAvailablePool];

    // 選択された問題をプールから削除 (使用済みとしてマーク)
    availableQuestionsIndexes.current.splice(randomIndexInAvailablePool, 1);

    setCurrentQuestionIndex(newQuestionIndex);

    // 全てのUI状態を初期値にリセット
    setDisplayedText('');
    setCharIndex(0);
    setTypingComplete(false);
    setIsBuzzing(false);
    setShowChoices(false);
    setHiraganaChoices([]);
    setFeedbackMessage('');
    setAnswerStage(0);
    setAnsweredHiragana([]); // 正解したひらがなをリセット
    setShowTimer(false);
    setRemainingTime(buzzTimeLimit); // 初期化時に早押しタイマーの制限時間を設定
    setProgressBarWidth(100);
    setShowQuestionIntro(true); // 新しい問題が始まる前に「問題！」を表示
  }, [buzzTimeLimit]);

  // コンポーネントがマウントされたときに最初の問題を設定
  useEffect(() => {
    resetTyping();
  }, [resetTyping]); // resetTypingがuseCallbackでメモ化されているため依存配列に追加

  // useEffect: 問題導入（「問題！」）の表示制御
  useEffect(() => {
    if (showQuestionIntro) {
      questionIntroTimerRef.current = setTimeout(() => {
        setShowQuestionIntro(false); // 「問題！」表示を終了
      }, QUESTION_INTRO_DELAY);

      return () => {
        if (questionIntroTimerRef.current) {
          clearTimeout(questionIntroTimerRef.current);
          questionIntroTimerRef.current = null;
        }
      };
    }
  }, [showQuestionIntro]);


  // useEffect: タイピングアニメーションの制御
  useEffect(() => {
    let typingTimer;
    // fullQuestionが確定しており、「問題！」表示中でなく、早押しされておらず、タイピングが完了していない場合のみ実行
    if (fullQuestion && !showQuestionIntro && !isBuzzing && !typingComplete && charIndex < fullQuestion.length) {
      typingTimer = setTimeout(() => {
        setDisplayedText((prev) => prev + fullQuestion.charAt(charIndex));
        setCharIndex((prev) => prev + 1);
      }, 100);
    } else if (fullQuestion && !showQuestionIntro && !isBuzzing && charIndex >= fullQuestion.length) {
      // タイプが自然に完了した場合
      setTypingComplete(true);
    }
    return () => clearTimeout(typingTimer);
  }, [charIndex, fullQuestion, isBuzzing, typingComplete, showQuestionIntro]);

  // useEffect: タイマーの制御 (早押しフェーズと選択肢フェーズの両方)
  // answerStageを依存配列に追加することで、各文字選択時にタイマーがリセットされるようにする
  useEffect(() => {
    let countdownInterval;
    let startAnimationTimeout;
    let currentPhaseTimeLimit;
    let timerActive = false;

    // 早押しフェーズの条件
    if (typingComplete && !isBuzzing && !showChoices && !feedbackMessage && !showQuestionIntro) {
      currentPhaseTimeLimit = buzzTimeLimit;
      timerActive = true;
    }
    // 選択肢選択フェーズの条件
    else if (isBuzzing && showChoices && !feedbackMessage && !showQuestionIntro) {
      currentPhaseTimeLimit = choiceTimeLimit;
      timerActive = true;
    }

    if (timerActive) {
      // タイマーがアクティブになる、または再起動される際に時間をリセット
      setRemainingTime(currentPhaseTimeLimit);
      setProgressBarWidth(100);
      setShowTimer(true);

      // 既存のタイマーがあればクリアして重複を防ぐ
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // プログレスバーのアニメーションを開始するためのわずかな遅延
      // これにより、progressBarWidthが100%に設定された後、すぐに0%へアニメーションを開始できる
      startAnimationTimeout = setTimeout(() => {
        setProgressBarWidth(0); // プログレスバーを0%幅へアニメーションさせる
      }, 50);

      countdownInterval = setInterval(() => {
        setRemainingTime(prevTime => {
          if (prevTime <= 1) { // 残り時間が1秒以下になったらタイマーを停止
            clearInterval(countdownInterval);
            timerRef.current = null;
            setFeedbackMessage('❌'); // 時間切れメッセージ
            setShowChoices(false);
            setIsBuzzing(false); // 早押し状態を解除
            setShowTimer(false);

            // 時間切れ後、自動で次の問題へ
            autoAdvanceTimerRef.current = setTimeout(() => {
              resetTyping();
            }, AUTO_ADVANCE_DELAY_INCORRECT_TIMEOUT);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      timerRef.current = countdownInterval; // インターバルIDをrefに保存

    } else {
      // タイマーがアクティブでない場合、既存のタイマーを停止・非表示に
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (startAnimationTimeout) {
        clearTimeout(startAnimationTimeout);
      }
      setShowTimer(false);
      setProgressBarWidth(100); // 次回のためにリセット
      setRemainingTime(0); // 表示をリセット
    }

    // クリーンアップ関数
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (startAnimationTimeout) clearTimeout(startAnimationTimeout);
    };
  }, [
    typingComplete,
    isBuzzing,
    showChoices,
    feedbackMessage,
    showQuestionIntro,
    buzzTimeLimit,
    choiceTimeLimit,
    resetTyping,
    answerStage // ここにanswerStageを追加しました
  ]);


  // useEffect: 早押し後の選択肢表示を制御
  useEffect(() => {
    // 早押しされ、タイプが完了しており、選択肢がまだ表示されていない、かつ期待されるひらがなが有効な場合
    if (isBuzzing && typingComplete && !showChoices && expectedHiragana) {
      setShowChoices(true); // 選択肢を表示
      // 現在の回答ステージに応じた選択肢を生成
      setHiraganaChoices(generateRandomHiragana(4, expectedHiragana));
    }
  }, [isBuzzing, typingComplete, showChoices, answerStage, expectedHiragana]);


  // 早押しボタンが押されたときのハンドラー
  const handleBuzz = useCallback(() => {
    // 既に早押し済み、選択肢表示中、フィードバック表示中、「問題！」表示中の場合は無視
    // disabled propでボタン自体がクリック不可になっているはずだが、念のため二重チェック
    if (isBuzzing || showChoices || feedbackMessage || showQuestionIntro) return;

    // タイプライター表示を完了状態にする
    setTypingComplete(true);
    // 早押し状態をtrueにする（タイマー停止と選択肢表示をトリガー）
    setIsBuzzing(true);
  }, [isBuzzing, showChoices, feedbackMessage, showQuestionIntro]);

  // ひらがな選択肢がクリックされたときのハンドラー
  const handleChoiceClick = useCallback((choice) => {
    // 選択肢がクリックされたら、現在のタイマーをクリア
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setShowTimer(false); // タイマーを一時的に非表示にし、次の表示でアニメーションをリセットする
      setProgressBarWidth(100); // プログレスバーをリセット
    }

    if (choice === expectedHiragana) {
      // 正解の場合
      if (answerStage + 1 < currentQuestion.answer.length) {
        // まだ次の文字がある場合（途中の正解）
        setAnsweredHiragana(prev => [...prev, expectedHiragana]); // 正解したひらがなを追加
        setAnswerStage(prev => prev + 1); // 次の文字へ進む
        // 次の文字の選択肢を再生成 (このstate更新でタイマーのuseEffectが再評価され、新しい選択肢タイマーが開始される)
        if (currentQuestion.answer[answerStage + 1]) {
          setHiraganaChoices(generateRandomHiragana(4, currentQuestion.answer[answerStage + 1]));
        } else {
          setHiraganaChoices([]); // 想定外のケース
        }
        // タイマーを再び表示するために、少し遅延させてtrueに設定
        // answerStageの更新によってuseEffectが再トリガーされるが、念のため
        setTimeout(() => setShowTimer(true), 10);
      } else {
        // 最後の文字も正解した場合（完全正解）
        setFeedbackMessage('⭕️'); // 正解メッセージ
        setShowChoices(false); // 選択肢を非表示
        setIsBuzzing(false); // 早押し状態を解除
        setScore(prev => prev + 10); // スコア加算

        // 完全正解後、自動で次の問題へ
        autoAdvanceTimerRef.current = setTimeout(() => {
          resetTyping();
        }, AUTO_ADVANCE_DELAY_CORRECT);
      }
    } else {
      // 不正解の場合
      setFeedbackMessage('❌'); // 不正解メッセージ
      setShowChoices(false); // 選択肢を非表示
      setAnswerStage(0); // 回答ステージをリセット
      setIsBuzzing(false); // 早押し状態を解除

      // 不正解後、自動で次の問題へ
      autoAdvanceTimerRef.current = setTimeout(() => {
        resetTyping();
      }, AUTO_ADVANCE_DELAY_INCORRECT_TIMEOUT);
    }
  }, [answerStage, currentQuestion, expectedHiragana, resetTyping]);

  return (
    <div className="app-container">
      {/* Header Section */}
      <div className="header-section">
        {/* Left Score */}
        <div className="score-display score-left">
          <span className="score-label font-inter">スコア</span>
          <span className="score-value font-inter">{score}</span>
        </div>

        {/* Center Q display */}
        <h1 className="question-number font-inter">
          Q{currentQuestionIndex + 1}
        </h1>

        {/* Right dummy score and user icon */}
        <div className="score-display score-right">
          <span className="score-label font-inter">スコア</span>
          <span className="score-value font-inter">{score}</span>
          {/* Dummy user icon (from image) */}
          <img src="https://placehold.co/40x40/FF7F50/FFFFFF?text=User" alt="User Icon" className="user-icon" />
        </div>
      </div>

      {/* Main Content Area */}
      {/* paddingを調整し、スクロールを不要にするために高さを最適化 */}
      <div className="main-content-area">

        {/* Question Display Area */}
        <div className="question-display-area">
          {showQuestionIntro ? (
            <p className="question-intro font-sans">
              問題！
            </p>
          ) : (
            <p className="question-text font-sans">
              {displayedText}
              {/* タイピング中、かつ早押しされていない、かつ回答選択肢もフィードバックも表示されていない場合にのみカーソルを表示 */}
              {(!typingComplete && !isBuzzing && !showChoices && !feedbackMessage) && <span className="typing-cursor font-light">|</span>}
            </p>
          )}
        </div>

        {/* 回答受付タイマーの表示領域 */}
        <div className="timer-container">
          {/* 選択肢表示中は秒数、それ以外はプログレスバーを表示 */}
          {(isBuzzing && showChoices && showTimer) ? (
            <div className="numerical-timer-display font-inter">
              {remainingTime} 秒
            </div>
          ) : (
            <div
              className={`timer-bar-background ${showTimer ? 'visible' : 'hidden'}`}
            >
              <div
                className="timer-progress-bar"
                style={{
                  transform: `scaleX(${progressBarWidth / 100})`,
                  transitionDuration: `${(isBuzzing && showChoices) ? choiceTimeLimit : buzzTimeLimit}s`, // 現在のフェーズに応じてdurationを設定
                }}
              ></div>
            </div>
          )}
        </div>

        {/* 回答フィードバックメッセージと正解の表示 */}
        {feedbackMessage && (
          <div className="feedback-message-container">
            <p className={`feedback-icon font-sans ${feedbackMessage === '⭕️' ? 'correct' : 'incorrect'}`}>
              {feedbackMessage}
            </p>
            <p className="correct-answer-text font-sans">
              正解は「{currentQuestion.answer}」でした！
            </p>
          </div>
        )}

        {/* 早押しボタンの表示。フィードバック、早押し済み、選択肢表示中、「問題！」表示中は非表示 */}
        {(!feedbackMessage && !isBuzzing && !showChoices && !showQuestionIntro) && (
          <div className="buzz-button-container">
            <IsometricButton
              onClick={handleBuzz}
              disabled={false} // ここでは常に有効（表示条件で制御するため）
            />
          </div>
        )}

        {/* 早押し後にひらがな選択肢を表示 */}
        {showChoices && (
          <div className="choices-container">
            <p className="choices-prompt font-sans">
              {answeredHiragana.join('')}
              <br /> {/* ここに改行タグを追加しました */}
              {answerStage + 1}文字目を選択してください
            </p>
            <div className="choices-grid">
              {hiraganaChoices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleChoiceClick(choice)}
                  className="choice-button font-sans"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CSS Styles */}
      <style>{`
        /* Google Fonts Inter (UI要素向け) */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        .font-inter {
          font-family: 'Inter', sans-serif;
        }
        /* Google Fonts Noto Sans JP (問題文・選択肢向けUDフォント) */
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
        .font-sans {
          font-family: 'Noto Sans JP', sans-serif;
        }

        /* Global styles to prevent body scrolling */
        html, body, #root {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          min-width: 0;
          min-height: 0;
        }

        /* Overall Container */
        .app-container {
          height: 100vh;
          background: linear-gradient(to bottom right, #efffef, #fffdef);
          font-family: 'Noto Sans JP', sans-serif;
          color: #333;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px; /* Reduced padding */
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
        }

        /* Header Section */
        .header-section {
          width: 100%;
          max-width: 1152px;
          background-color: #1a202c;
          color: #fff;
          padding: 24px;
          border-bottom-left-radius: 48px;
          border-bottom-right-radius: 48px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          margin-bottom: 16px; /* Reduced margin */
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 4px solid #d97706;
          flex-shrink: 0;
        }

        /* Score Display */
        .score-display {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 24px;
          background-color: #2d3748;
          padding: 12px 20px;
          border-radius: 9999px;
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
        }
        .score-label {
          font-weight: 600;
          color: #e2e8f0;
        }
        .score-value {
          color: #fffbeb;
          font-weight: 700;
        }

        /* Question Number Display */
        .question-number {
          font-size: 36px;
          font-weight: 700;
          color: #fffbeb;
          letter-spacing: 0.05em;
          text-align: center;
        }

        /* User Icon */
        .user-icon {
          border-radius: 9999px;
          width: 40px;
          height: 40px;
          object-fit: cover;
          border: 2px solid #fffbeb;
        }

        /* Main Content Area */
        .main-content-area {
          padding: 20px; /* Reduced padding */
          border-radius: 48px;
          max-width: 1152px;
          width: 100%;
          text-align: center;
          margin-top: 16px; /* Reduced margin */
          flex-grow: 1;
          flex-shrink: 1;
          overflow-y: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
          min-height: 0;
        }

        /* Question Display Area */
        .question-display-area {
          position: relative;
          background-color: #f7fafc;
          padding: 32px;
          border-radius: 12px;
          height: 250px; /* Fixed height for question area */
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-bottom: 8px;
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
          width: 100%;
          overflow-y: auto;
          flex-shrink: 0;
        }
        .question-intro {
          font-size: 48px;
          font-weight: 700;
          color: #92400e;
          animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          text-align: left;
          width: 100%;
        }
        .question-text {
          font-size: clamp(1.2rem, 3vw, 28px);
          color: #4a5568;
          line-height: 1.625;
          text-align: left;
          width: 100%;
          word-break: break-all;
          overflow-wrap: break-word;
        }
        .typing-cursor {
          animation: blink 0.75s step-end infinite;
          font-weight: 300;
        }

        /* Timer Container */
        .timer-container {
          width: 100%;
          height: 24px; /* Maintain height for consistent layout */
          margin-bottom: 8px;
          flex-shrink: 0;
          display: flex; /* Flexbox for centering numerical timer */
          justify-content: center; /* Center the numerical timer horizontally */
          align-items: center; /* Center the numerical timer vertically */
        }
        .timer-bar-background {
          width: 100%;
          background-color: #edf2f7;
          border-radius: 9999px;
          height: 100%;
          overflow: hidden;
          transition: opacity 0.3s ease-in-out;
        }
        .timer-bar-background.hidden {
            opacity: 0;
            visibility: hidden;
        }
        .timer-bar-background.visible {
            opacity: 1;
            visibility: visible;
        }
        .timer-progress-bar {
          background-color: #ef4444;
          height: 100%;
          border-radius: 9999px;
          transform-origin: left;
          transition-property: transform;
          transition-timing-function: linear;
        }
        /* Numerical timer specific style */
        .numerical-timer-display {
          font-size: 20px;
          font-weight: 600;
          color: #333;
        }


        /* Feedback Message */
        .feedback-message-container {
          margin-top: 8px;
          flex-shrink: 0;
        }
        .feedback-icon {
          font-size: 80px;
          font-weight: 800;
          margin-bottom: 16px;
        }
        .feedback-icon.correct {
          color: #38a169;
        }
        .feedback-icon.incorrect {
          color: #e53e3e;
        }
        .correct-answer-text {
          font-size: 28px;
          color: #4a5568;
        }

        /* Buzz Button Container */
        .buzz-button-container {
          margin-top: 8px;
          flex-shrink: 0;
        }

        /* Isometric Button Styles */
        .isometric-button {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          transition: transform 0.1s ease-out;
        }
        .isometric-button.active:active {
          transform: translateY(4px);
        }
        .isometric-button.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .isometric-button-shadow {
          position: absolute;
          width: 256px;
          height: 64px;
          border-radius: 48px;
          background-color: #2d3748;
          transform: rotateX(45deg) translateY(64px);
          filter: blur(8px);
          opacity: 0.3;
        }

        .isometric-button-base {
          position: relative;
          width: 256px;
          height: 64px;
          background-color: #fffbeb;
          border-radius: 48px;
          transform: skewX(-15deg) translateX(16px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .linen-texture-overlay {
          position: absolute;
          inset: 0;
          border-radius: 48px;
          overflow: hidden;
          pointer-events: none;
          background-image: url('https://placehold.co/100x100/DCC7AA/594020?text=%E9%BA%B3%E5%B8%83');
          background-repeat: repeat;
          opacity: 0.5;
          mix-blend-mode: multiply;
        }
        .isometric-button-base-border {
          position: absolute;
          inset: 0;
          border: 4px solid #fde68a;
          border-radius: 48px;
        }

        .isometric-button-top {
          position: relative;
          width: 192px;
          height: 48px;
          border-radius: 9999px;
          background-color: #dc2626;
          transform: translateY(-64px);
          transition: all 0.1s ease-out;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .isometric-button-top.pressed {
          background-color: #b91c1c;
          transform: translateY(0);
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
        }

        .isometric-button-side {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background-color: #991b1b;
          transform: translateY(16px) translateX(8px) skewX(-15deg) skewY(5deg);
          filter: blur(1px);
          opacity: 0.8;
          z-index: -1;
        }
        .isometric-button-side.pressed {
          background-color: #7f1d1d;
        }

        .isometric-button-text-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .button-text {
          font-size: 36px;
          font-weight: 800;
          color: #fffbeb;
        }


        /* 選択肢コンテナ */
        .choices-container {
          margin-top: 4px; /* Adjusted margin: 8px -> 4px */
          width: 100%;
          max-width: 768px;
          flex-shrink: 0;
        }
        .choices-prompt {
          font-size: clamp(1rem, 2.5vw, 24px);
          font-weight: 600;
          margin-bottom: 16px;
        }
        .choices-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px; /* Reduced gap */
        }
        .choice-button {
          background-color: #047857;
          color: #fffbeb;
          font-weight: 800;
          /* Modified padding and font-size for smaller buttons */
          padding: clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px);
          border-radius: 9999px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease-in-out;
          font-size: clamp(0.9rem, 3vw, 28px);
          text-decoration: none;
          border: none;
          cursor: pointer;
        }
        .choice-button:hover {
          background-color: #065f46;
          transform: scale(1.05);
        }
        .choice-button:focus {
          outline: none;
          box-shadow: 0 0 0 4px rgba(134, 239, 172, 0.5);
        }

        /* アニメーションキーフレーム */
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 0.75s step-end infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
