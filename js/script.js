/**
 * QUEST of DUALISM - Ver 17.0 (Dramatic Boss Battle)
 */

// Game State
let currentFloor = 0; // 階層 (B1F...) ハイスコア対象
let playerLevel = 1;  // 強さ
let bestRecord = { floor: 0, items: [], alias: "なし" }; // Changed level to floor
let statsRecord = { 
    totalAttempts: 0, totalClears: 0, trueClears: 0, totalChoices: 0, totalSuccesses: 0,
    collectedItems: [], collectedAliases: [] 
}; 
let gameSettings = { isPixelMode: true }; 

let predeterminedFate = null; 
let choiceStats = { yes: 0, no: 0 };
let currentMonster = null;
let isGameClear = false;
let isTrueClear = false;
let isProcessing = false;

// Auto Mode
let isAutoMode = false;
let autoTimeout = null;

// Player Stats
let playerStats = {
    hp: 20, maxHp: 20,
    mp: 5, maxMp: 5,
    atk: 10,
    items: []
};

// --- Sound Manager ---
const SoundManager = {
    ctx: null,
    muted: false,
    init: function() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
        }
        if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume(); }
    },
    toggleMute: function() {
        this.muted = !this.muted;
        const btn = document.querySelector('.sound-toggle');
        btn.innerText = this.muted ? "🔇" : "🔊";
        if(!this.muted) this.init();
    },
    playTone: function(freq, type, duration, startTime = 0, vol = 0.1) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    },
    playNoise: function(duration, vol = 0.1) {
        if (this.muted || !this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    },
    playAttack: function() { this.init(); this.playNoise(0.1, 0.2); this.playTone(100, 'square', 0.1, 0, 0.1); },
    playDamage: function() { this.init(); this.playTone(150, 'sawtooth', 0.3, 0, 0.2); this.playTone(100, 'sawtooth', 0.3, 0.1, 0.2); },
    playLevelUp: function() { this.init(); const t = 0.08; this.playTone(523.25, 'square', 0.2, 0); this.playTone(659.25, 'square', 0.2, t); this.playTone(783.99, 'square', 0.2, t*2); this.playTone(1046.50, 'square', 0.4, t*3); },
    playClear: function() { this.init(); const t = 0.12; const v = 0.15; const notes = [523.25, 659.25, 783.99, 1046.50, 0, 783.99, 1046.50]; notes.forEach((freq, i) => { if(freq > 0) this.playTone(freq, 'square', 0.3, i * t, v); }); },
    playGameOver: function() { this.init(); this.playTone(300, 'triangle', 0.5, 0, 0.2); this.playTone(250, 'triangle', 0.5, 0.4, 0.2); this.playTone(200, 'triangle', 1.0, 0.8, 0.2); },
    playTrueClear: function() { 
        this.init(); 
        const base = 220; 
        for(let i=0; i<30; i++) {
            const freq = base * (1 + Math.random()*4);
            this.playTone(freq, 'sawtooth', 0.1, i*0.05, 0.1);
        }
    },
    playRevive: function() {
        this.init();
        this.playTone(400, 'sine', 0.5, 0, 0.2);
        this.playTone(800, 'sine', 1.0, 0.5, 0.2);
    },
    playFakeClear: function() {
        this.init();
        // Broken Fanfare
        const t = 0.1;
        this.playTone(523.25, 'square', 0.2, 0); 
        this.playTone(659.25, 'square', 0.2, t); 
        setTimeout(() => {
            this.playNoise(0.5, 0.3); // Crash
        }, 300);
    }
};

// --- Data Lists ---
const weaponNames = [
    "ひのきのぼう", "こんぼう", "どうのつるぎ", "てつのやり", 
    "はがねのつるぎ", "まどうしのつえ", "パルチザン", "はじゃのつるぎ", 
    "ほのおのつるぎ", "こおりのやいば", "ドラゴンキラー", "あくまのオノ",
    "らいじんのけん", "ひかりのつるぎ", "ゆうしゃのつるぎ", "でんせつのぶき",
    "エクスカリバー", "ラグナロク", "グングニル", "ムラマサ", 
    "ロンギヌス", "ゲイボルグ", "クサナギ", "竹槍", "フライパン", 
    "ハリセン", "ピコピコハンマー", "ビームサーベル", "ねぎ", "イージスのたて",
    "錆びた短剣", "ガラスの剣", "ボーンクラブ", "ミスリルソード", "オリハルコンダガー", "魔剣グラム", "聖剣デュランダル", "神槍ブリューナク", "方天画戟", "青龍刀",
    "ヌンチャク", "ブーメラン", "ヨーヨー", "タロットカード", "水晶玉", "辞書", "定規", "モップ", "チェーンソー", "冷凍マグロ",
    "光線銃", "ロケットランチャー", "手榴弾", "モーニングスター", "バトルアックス", "ウォーハンマー", "ランス", "ハルバード", "トライデント", "クロスボウ",
    "ショートボウ", "ロングボウ", "アーバレスト", "くない", "手裏剣", "まきびし", "忍者刀", "くない", "十手", "鎖鎌",
    "バールのようなもの", "金属バット", "スコップ", "ツルハシ", "ノコギリ", "かなづち", "ドライバー", "スパナ", "パイプレンチ", "ドリル",
    "ギター", "マイク", "ドラムスティック", "指揮棒", "筆", "万年筆", "そろばん", "電卓", "スマホ", "タブレット",
    "ミョルニル", "レーヴァテイン", "アロンダイト", "カラドボルグ", "バルムンク", "天叢雲剣", "布都御魂", "七支刀", "妖刀村正", "斬鉄剣",
    "如意棒", "芭蕉扇", "金砕棒", "薙刀", "くない（毒）", "まきびし（鉄）", "手裏剣（爆）", "火縄銃", "大砲", "戦車",
    "ライトセーバー（赤）", "ライトセーバー（青）", "ビームライフル", "ハイパーバズーカ", "パイルバンカー", "ドリルランス", "ロケットパンチ", "有線式サイコミュ", "ファンネル",
    "聖なる手榴弾", "黄金の銃", "銀の弾丸", "ヴァンパイアキラー", "ドラゴンバスター", "ゴッドスレイヤー", "ワールドエンド", "カオスブレイカー", "ソウルエッジ", "ソウルキャリバー",
    "勇者の剣（模造刀）", "伝説の剣（プラスチック）", "エクスカリバー（カリバー）", "ただの棒", "ものすごく硬いパン", "腐った魚", "生きたタコ", "熱々のピザ",
    "辞書（鈍器）", "六法全書", "フライパン（テフロン）", "中華鍋", "おたま", "泡立て器", "包丁", "サバイバルナイフ", "カッターナイフ",
    "枕", "布団たたき", "掃除機", "アイロン", "洗濯機", "冷蔵庫", "電子レンジ", "テレビ", "パソコン",
    "隕石", "ブラックホール", "ビッグバン", "超新星", "銀河", "宇宙", "虚無", "希望", "絶望", "愛"
];

const itemNames = [
    "やくそう", "どくけしそう", "せいすい", "ちからのたね", "まもりのたね", "すばやさのたね", "いのちのきのみ", "ふしぎなきのみ", "エルフののみぐすり", "せかいじゅのは",
    "けんじゃのいし", "エリクサー", "ラストエリクサー", "おにぎり", "サンドイッチ", "ポーション", "ハイポーション", "フェニックスの尾", "きんののべぼう", "ガラクタ",
    "石ころ", "空き缶", "ボロ布", "ただの紙切れ", "ラブレター", "宝の地図", "身代わり人形", "煙玉", "兵糧丸", "激辛カレー",
    "ステーキ", "ハンバーガー", "ピザ", "寿司", "ラーメン", "うどん", "そば", "パスタ", "オムライス", "グラタン",
    "ショートケーキ", "プリン", "ゼリー", "アイスクリーム", "チョコレート", "キャンディ", "クッキー", "ドーナツ", "マカロン", "タピオカ",
    "ダイヤモンド", "ルビー", "サファイア", "エメラルド", "トパーズ", "アメジスト", "オパール", "ガーネット", "アクアマリン", "ペリドット",
    "鉄鉱石", "銅鉱石", "銀鉱石", "金鉱石", "ミスリル鉱石", "オリハルコン鉱石", "アダマンタイト", "ダークマター", "賢者の石のかけら", "星の砂",
    "ドラゴンの鱗", "ユニコーンの角", "グリフォンの羽", "スライムの体液", "ゴブリンの腰布", "オークの牙", "吸血鬼の灰", "悪魔のしっぽ", "天使の輪", "神の涙"
];

const rareItems = [
    "しあわせのくつ", "メタルの剣", "幸運のコイン", "プラチナチケット", "はぐれのさとり", "メタルキングの盾"
];

const allItemsList = [...weaponNames, ...itemNames, ...rareItems].sort();

const monsterDefs = {
    slime: { id: "slime", name: "スライム", color: "#4488ff", pixels: [{x:5,y:5,w:6,h:1}, {x:3,y:6,w:10,h:1}, {x:2,y:7,w:12,h:1}, {x:1,y:8,w:14,h:4}, {x:2,y:12,w:12,h:1}, {x:4,y:9,w:1,h:1,c:"#000"}, {x:11,y:9,w:1,h:1,c:"#000"}] },
    goblin: { id: "goblin", name: "ゴブリン", color: "#4caf50", pixels: [{x:4,y:3,w:8,h:5}, {x:2,y:4,w:2,h:3}, {x:12,y:4,w:2,h:3}, {x:5,y:5,w:1,h:1,c:"#000"}, {x:10,y:5,w:1,h:1,c:"#000"}, {x:6,y:7,w:4,h:1,c:"#000"}, {x:4,y:8,w:8,h:6}, {x:2,y:9,w:2,h:3}, {x:12,y:9,w:2,h:3}] },
    bat: { id: "bat", name: "コウモリ", color: "#aa44ff", pixels: [{x:1,y:4,w:2,h:3}, {x:3,y:6,w:1,h:2}, {x:4,y:7,w:1,h:2}, {x:5,y:8,w:1,h:1}, {x:13,y:4,w:2,h:3}, {x:12,y:6,w:1,h:2}, {x:11,y:7,w:1,h:2}, {x:10,y:8,w:1,h:1}, {x:6,y:6,w:4,h:4}, {x:7,y:7,w:1,h:1,c:"#fff"}, {x:9,y:7,w:1,h:1,c:"#fff"}] },
    wolf: { id: "wolf", name: "ウルフ", color: "#9e9e9e", pixels: [{x:2,y:5,w:4,h:4}, {x:6,y:6,w:8,h:5}, {x:6,y:11,w:2,h:3}, {x:12,y:11,w:2,h:3}, {x:3,y:6,w:1,h:1,c:"#fff"}, {x:14,y:7,w:2,h:2}] },
    orc: { id: "orc", name: "オーク", color: "#795548", pixels: [{x:4,y:2,w:8,h:6}, {x:3,y:4,w:1,h:2}, {x:12,y:4,w:1,h:2}, {x:5,y:9,w:6,h:5}, {x:5,y:5,w:1,h:1,c:"#000"}, {x:10,y:5,w:1,h:1,c:"#000"}, {x:6,y:7,w:1,h:2,c:"#fff"}, {x:9,y:7,w:1,h:2,c:"#fff"}] },
    skeleton: { id: "skeleton", name: "ガイコツ", color: "#e0e0e0", pixels: [{x:5,y:2,w:6,h:1}, {x:4,y:3,w:8,h:1}, {x:3,y:4,w:10,h:4}, {x:5,y:5,w:2,h:2,c:"#000"}, {x:9,y:5,w:2,h:2,c:"#000"}, {x:7,y:9,w:2,h:1,c:"#000"}, {x:4,y:10,w:8,h:1}, {x:5,y:11,w:6,h:1}, {x:5,y:12,w:1,h:2}, {x:7,y:12,w:1,h:2}, {x:9,y:12,w:1,h:2}] },
    golem: { id: "golem", name: "ゴーレム", color: "#c19a6b", pixels: [{x:4,y:1,w:8,h:5}, {x:5,y:3,w:1,h:1,c:"#f00"}, {x:10,y:3,w:1,h:1,c:"#f00"}, {x:2,y:6,w:12,h:6}, {x:1,y:7,w:1,h:4}, {x:14,y:7,w:1,h:4}, {x:4,y:12,w:3,h:3}, {x:9,y:12,w:3,h:3}] },
    chimera: { id: "chimera", name: "キメラ", color: "#e91e63", pixels: [{x:6,y:2,w:4,h:4}, {x:4,y:6,w:8,h:5}, {x:1,y:4,w:3,h:6}, {x:12,y:4,w:3,h:6}, {x:7,y:3,w:1,h:1,c:"#000"}, {x:5,y:11,w:2,h:3}, {x:9,y:11,w:2,h:3}] },
    dragon: { id: "dragon", name: "ドラゴン", color: "#44ff44", pixels: [{x:2,y:8,w:12,h:6}, {x:4,y:4,w:4,h:4}, {x:3,y:3,w:1,h:2}, {x:8,y:3,w:1,h:3}, {x:5,y:5,w:1,h:1,c:"#000"}, {x:0,y:7,w:3,h:3}, {x:12,y:6,w:4,h:3}, {x:3,y:10,w:10,h:3,c:"#ffffaa"}] },
    reaper: { id: "reaper", name: "しにがみ", color: "#607d8b", pixels: [{x:6,y:2,w:4,h:4}, {x:5,y:6,w:6,h:8}, {x:12,y:3,w:1,h:10,c:"#aaa"}, {x:11,y:3,w:3,h:1,c:"#aaa"}, {x:4,y:8,w:8,h:0}, {x:7,y:3,w:1,h:1,c:"#000"}, {x:8,y:3,w:1,h:1,c:"#000"}, {x:3,y:6,w:2,h:6, c:"#444"}] },
    demon: { id: "demon", name: "まおう", color: "#8800ff", pixels: [{x:6,y:1,w:4,h:2}, {x:4,y:3,w:8,h:9}, {x:2,y:4,w:2,h:6}, {x:12,y:4,w:2,h:6}, {x:6,y:5,w:1,h:2,c:"#f00"}, {x:9,y:5,w:1,h:2,c:"#f00"}, {x:0,y:2,w:2,h:8}, {x:14,y:2,w:2,h:8}] },
    true_demon: { id: "true_demon", name: "真・魔王", color: "#000", pixels: [{x:6,y:1,w:4,h:2}, {x:4,y:3,w:8,h:9}, {x:2,y:4,w:2,h:6}, {x:12,y:4,w:2,h:6}, {x:6,y:5,w:1,h:2,c:"#f00"}, {x:9,y:5,w:1,h:2,c:"#f00"}, {x:0,y:2,w:2,h:8}, {x:14,y:2,w:2,h:8}, {x:7,y:0,w:2,h:1,c:"#ffd700"}] },
    // Metal Slime added
    metal_slime: { id: "metal_slime", name: "メタルスライム", color: "#c0c0c0", pixels: [{x:5,y:5,w:6,h:1}, {x:3,y:6,w:10,h:1}, {x:2,y:7,w:12,h:1}, {x:1,y:8,w:14,h:4}, {x:2,y:12,w:12,h:1}, {x:4,y:9,w:1,h:1,c:"#000"}, {x:11,y:9,w:1,h:1,c:"#000"}] }
};

const monsters = [
    Object.assign({}, monsterDefs.slime),    // Lv1
    Object.assign({}, monsterDefs.goblin),   // Lv2
    Object.assign({}, monsterDefs.bat),      // Lv3
    Object.assign({}, monsterDefs.wolf),     // Lv4
    Object.assign({}, monsterDefs.orc),      // Lv5
    Object.assign({}, monsterDefs.skeleton), // Lv6
    Object.assign({}, monsterDefs.golem),    // Lv7
    Object.assign({}, monsterDefs.chimera),  // Lv8
    Object.assign({}, monsterDefs.dragon),   // Lv9
    Object.assign({}, monsterDefs.reaper),   // Lv10
    Object.assign({}, monsterDefs.dragon, {id: "red_dragon", name: "レッドドラゴン", color: "#ff4444"}), // Lv11
    Object.assign({}, monsterDefs.reaper, {id: "strong_reaper", name: "しにがみ(強)", color: "#9c27b0"}), // Lv12
    Object.assign({}, monsterDefs.demon)     // Lv13
];

const questions = [
    "わたしは　かみサマを　しんじるか？", "おまえは　ゆうしゃ　なのか？", "このせかいは　げんじつ　か？",
    "パンは　すきか？", "うしろに　だれか　いるか？", "じかんは　むげん　か？",
    "おなかは　すいたか？", "ボタンを　おす　かくごは　あるか？", "きょうは　いい　てんきか？",
    "おまえに　ともだちは　いるか？", "この　たたかいは　たのしいか？", "うまれかわりたいか？",
    "ここは　じごく　か？", "おまえの　なまえは　あるか？", "せかいを　すくう　きは　あるか？",
    "まだ　あきらめない　つもりか？", "ねむく　ないか？", "まほうは　つかえるか？",
    "やみは　こわいか？", "ねこは　すきか？", "おかねは　ほしいか？",
    "えいえんの　いのちは　ほしいか？", "おまえは　ロボットか？", "こころは　あるか？",
    "あしたは　くると　おもうか？", "かこに　もどりたいか？", "うそを　ついたことは　あるか？",
    "ひみつは　あるか？", "たたかうか？", "にげるか？",
    "なきそうに　なったことは　あるか？", "わらったことは　あるか？", "だれかを　あいしているか？",
    "ひとりぼっちは　さびしいか？", "よるは　くらいか？", "あさは　まぶしいか？",
    "たいようは　あついか？", "みずは　つめたいか？", "ゆきは　しろいか？",
    "とりは　うたうか？", "みちは　つづくか？", "ゴールは　あるか？",
    "いまは　いつだ？", "おまえは　だれだ？", "リンゴは　あかいか？",
    "すべては　ゆめか？", "めを　さましたいか？", "まだ　ねていたいか？",
    "おなかが　いたいか？", "あたまが　いたいか？", "げんき　か？",
    "つかれたか？", "やすみたいか？", "もっと　あそびたいか？",
    "おまえは　いきて　いるか？", "わたしを　たおせるか？"
];

window.onload = () => {
    loadData();
    updateVisualBtn();
    startLevel(1);
};

// --- Auto Mode Control ---
function toggleAutoMode() {
    isAutoMode = !isAutoMode;
    const btn = document.getElementById('auto-btn');
    
    if(isAutoMode) {
        btn.innerText = "AUTO ON";
        btn.classList.add('active');
        SoundManager.init(); // Ensure audio context on click
        processAutoTurn();
    } else {
        btn.innerText = "AUTO OFF";
        btn.classList.remove('active');
        if(autoTimeout) clearTimeout(autoTimeout);
    }
}

// --- Visual Mode Control ---
function toggleVisualMode() {
    gameSettings.isPixelMode = !gameSettings.isPixelMode;
    updateVisualBtn();
    saveSettings();
    
    if (currentMonster && !document.getElementById('overlay').classList.contains('active')) {
        renderMonsterVisual(currentMonster);
    }
}

function updateVisualBtn() {
    const btn = document.getElementById('visual-btn');
    btn.innerText = gameSettings.isPixelMode ? "DOT" : "IMG";
}

function processAutoTurn() {
    if(!isAutoMode || isProcessing) return;

    const overlay = document.getElementById('overlay');
    if(overlay.classList.contains('active')) return;

    // 最終ステージ(Lv13)なら強制停止
    if (currentFloor === 13) {
        isAutoMode = false;
        document.getElementById('auto-btn').innerText = "AUTO OFF";
        document.getElementById('auto-btn').classList.remove('active');
        log("★最終決戦！ オートモードを かいじょしました。", false, 'system');
        return;
    }

    if(bestRecord.floor > 0 && currentFloor === bestRecord.floor) {
        isAutoMode = false;
        document.getElementById('auto-btn').innerText = "AUTO OFF";
        document.getElementById('auto-btn').classList.remove('active');
        log("★ハイスコアとうたつ！ オートモードを かいじょしました。", false, 'system');
        return;
    }

    const choice = Math.random() < 0.5 ? 'left' : 'right';
    
    const btnId = choice === 'left' ? 'btn-yes' : 'btn-no';
    const btn = document.getElementById(btnId);
    btn.style.color = '#ffff00';
    setTimeout(() => btn.style.color = '#fff', 100);

    makeChoice(choice);
}

// --- Help & Bestiary Control ---
function openHelp() {
    document.getElementById('help-overlay').classList.add('active');
}
function closeHelp() {
    document.getElementById('help-overlay').classList.remove('active');
}

// --- Core Game Logic ---

function startLevel(lvl) {
    currentFloor = lvl;
    determineFate();
    spawnMonster();
    updateUI();
    isProcessing = false;
    
    if(lvl === 1) {
        playerLevel = 1; // Reset Player Level on new game
        statsRecord.totalAttempts++;
        saveData(); 
        
        log(`[B${lvl}F] ${currentMonster.name}が あらわれた！`);
        document.getElementById('message-window').innerText = `${currentMonster.name}「${getRandomQuestion()}」`;
        
        if(isAutoMode) {
            autoTimeout = setTimeout(processAutoTurn, 500);
        }
    }
}

function determineFate() {
    const roll = Math.random();
    predeterminedFate = roll < 0.5 ? 'left' : 'right';
    console.log(`[DEBUG] Next Fate: ${predeterminedFate === 'left' ? 'YES' : 'NO'}`);
}

function spawnMonster() {
    const idx = currentFloor - 1;
    
    // True Demon Chance at Level 13
    if (currentFloor === 13 && Math.random() < 0.1) {
        currentMonster = Object.assign({}, monsterDefs.true_demon);
        document.body.classList.add('true-demon-mode');
        log("！！！　しんの　まおうが　あらわれた　！！！", false, 'true-boss');
    } 
    // Metal Slime Chance (Not last floor)
    else if (currentFloor < 13 && Math.random() < 0.033) { // 1/30
        currentMonster = Object.assign({}, monsterDefs.metal_slime);
        log("！　メタルスライムが　あらわれた　！", false, 'metal');
    }
    // Regular Monster
    else if (idx < monsters.length) {
        currentMonster = monsters[idx];
    } else {
        currentMonster = monsters[monsters.length - 1];
    }

    renderMonsterVisual(currentMonster);
}

function renderMonsterVisual(monster) {
    const container = document.getElementById('monster-visual');
    container.innerHTML = '';
    container.className = ''; 
    
    if(monster.id === 'true_demon') {
        container.className = 'true-demon-visual';
    } else if (monster.id === 'metal_slime') {
        container.className = 'metal-visual';
    }

    if (gameSettings.isPixelMode) {
        container.innerHTML = generateMonsterSVG(monster);
        return;
    }

    const imgPath = `img/${monster.id}.png`;
    const img = document.createElement('img');
    img.src = imgPath;
    img.alt = monster.name;
    
    img.onerror = function() {
        this.remove();
        container.innerHTML = generateMonsterSVG(monster);
    };

    container.appendChild(img);
}

function getRandomQuestion() {
    return questions[Math.floor(Math.random() * questions.length)];
}

function makeChoice(choice) {
    if(isProcessing) return; 
    isProcessing = true;
    SoundManager.init();

    statsRecord.totalChoices++;
    saveData();

    if (choice === 'left') choiceStats.yes++;
    else choiceStats.no++;
    const isCorrect = (choice === predeterminedFate);
    
    log(`▶ ${choice === 'left' ? 'はい' : 'いいえ'}`);

    if (isCorrect) {
        handleSuccess();
    } else {
        handleFailure();
    }
}

function handleSuccess() {
    // Lv13の場合、ドラマチック演出分岐
    if (currentFloor === 13) {
            handleBossBattleDrama(true);
    } else {
            executeSuccess();
    }
}

function handleFailure() {
    // Lv13の場合、ドラマチック演出分岐
    if (currentFloor === 13) {
            handleBossBattleDrama(false);
    } else {
            executeFailure();
    }
}

// Drama logic for Boss Battle
function handleBossBattleDrama(isActuallyCorrect) {
    const roll = Math.random();
    const msgWin = document.getElementById('message-window');
    
    if (isActuallyCorrect) {
        // 正解ルート（最終的に勝つ）
        if (roll < 0.3) {
            // パターンB: 逆転勝利 (30%)
            SoundManager.playDamage();
            const vis = document.getElementById('monster-visual');
            vis.classList.add('anim-attack');
            msgWin.innerText = `${currentMonster.name}の こうげき！ ゆうしゃは しんでしまった...`;
            log(`ゆうしゃは しんでしまった...`, true);
            
            setTimeout(() => {
                SoundManager.playRevive();
                document.body.style.backgroundColor = '#fff';
                setTimeout(() => document.body.style.backgroundColor = 'var(--bg-color)', 200);
                
                msgWin.innerText = "しかし ゆうしゃは よみがえった！";
                log("しかし ゆうしゃは よみがえった！", false, 'success');
                
                setTimeout(() => {
                    msgWin.innerText = "ゆうしゃの さいごの いちげき！";
                    executeSuccess();
                }, 1500);
            }, 1500);
            
        } else if (roll < 0.6) {
            // パターンC: 競り合い勝利 (30%)
            SoundManager.playAttack();
            const vis = document.getElementById('monster-visual');
            vis.classList.add('anim-clash');
            msgWin.innerText = "はげしい つばぜりあいが つづいている！";
            log("はげしい つばぜりあいが つづいている！", false, 'system');
            
            setTimeout(() => {
                msgWin.innerText = "ゆうしゃが おしきった！";
                vis.classList.remove('anim-clash');
                executeSuccess();
            }, 1500);
        } else {
            // パターンA: 通常勝利 (40%)
            executeSuccess();
        }
    } else {
        // 不正解ルート（最終的に負ける）
        if (roll < 0.3) {
            // パターンD: 絶望敗北 (30%)
            SoundManager.playAttack();
            const vis = document.getElementById('monster-visual');
            vis.classList.add('anim-damage');
            vis.classList.add('anim-shake');
            msgWin.innerText = `${currentMonster.name}を たおした！`;
            log(`${currentMonster.name}を たおした！`, false, 'success');
            
            // Fake clear sound
            SoundManager.playFakeClear();
            
            setTimeout(() => {
                vis.classList.remove('anim-damage');
                vis.classList.add('anim-show'); // Re-appear
                msgWin.innerText = `${currentMonster.name}「...と おもったか？」`;
                log(`${currentMonster.name}「...と おもったか？」`, true);
                
                setTimeout(() => {
                    executeFailure();
                }, 1500);
            }, 1500);

        } else if (roll < 0.5) {
            // パターンE: 命乞い (20%)
            msgWin.innerText = `${currentMonster.name}「わかった。せかいの はんぶんを やろう」`;
            log(`${currentMonster.name}は いのちごいを してきた！`, false, 'system');
            
            setTimeout(() => {
                msgWin.innerText = "ゆうしゃが ゆだんした すきに こうげきしてきた！";
                executeFailure();
            }, 2000);
            
        } else {
            // 通常敗北
            executeFailure();
        }
    }
}

// Real Success Logic
function executeSuccess() {
    SoundManager.playAttack(); 

    statsRecord.totalSuccesses++;
    saveData();

    const vis = document.getElementById('monster-visual');
    vis.classList.add('anim-damage');
    vis.classList.add('anim-shake');
    
    log(`${currentMonster.name}に ${playerStats.atk}の ダメージ！`);
    log(`${currentMonster.name}を たおした！`, false, 'success');

    let levelGain = 1;
    if (currentMonster.id === 'metal_slime') {
        levelGain = 5;
    }
    levelUp(levelGain);

    const nextDelay = isAutoMode ? 400 : 800; 

    if (currentFloor === 13) {
        if (currentMonster.id === 'true_demon') {
            statsRecord.trueClears = (statsRecord.trueClears || 0) + 1;
            isTrueClear = true;
        }
        
        // 真・魔王未討伐時の通常魔王撃破時演出
        if (currentMonster.id === 'demon' && statsRecord.trueClears === 0) {
                setTimeout(showDemonLastWords, 1000);
                return; 
        }

        statsRecord.totalClears++; 
        saveData();
        setTimeout(() => {
            showGameClear();
        }, 1000);
    } else {
        setTimeout(() => {
            currentFloor++;
            determineFate();
            spawnMonster();
            
            log(`[B${currentFloor}F] ${currentMonster.name}が あらわれた！`);
            document.getElementById('message-window').innerText = `${currentMonster.name}「${getRandomQuestion()}」`;
            updateUI();
            
            isProcessing = false;
            if(isAutoMode) {
                autoTimeout = setTimeout(processAutoTurn, 400);
            }
        }, nextDelay);
    }
}

function showDemonLastWords() {
    const msgWin = document.getElementById('message-window');
    const vis = document.getElementById('monster-visual');
    
    // 演出開始
    vis.classList.add('anim-talk');
    msgWin.innerHTML = `${currentMonster.name}「グフッ……　わたしをたおすとは……」`;
    
    setTimeout(() => {
        vis.classList.add('anim-talk');
        msgWin.innerHTML = `${currentMonster.name}「だが　しんのきょうふは　これからだ……」`;
        
        setTimeout(() => {
            vis.classList.add('anim-talk');
            msgWin.innerHTML = `${currentMonster.name}「このせかいには　まだ　あいつが　いる……」`;
            
            setTimeout(() => {
                statsRecord.totalClears++; 
                saveData();
                showGameClear();
            }, 2500);
        }, 2500);
    }, 2500);
}

function levelUp(gain = 1) {
    let totalHpUp = 0;
    let totalAtkUp = 0;

    for(let i=0; i<gain; i++) {
        playerLevel++;
        const hpUp = Math.floor(Math.random() * 5) + 1;
        const mpUp = Math.floor(Math.random() * 3);
        const atkUp = Math.floor(Math.random() * 2) + 1;

        playerStats.maxHp += hpUp;
        playerStats.hp = playerStats.maxHp; 
        playerStats.maxMp += mpUp;
        playerStats.mp = playerStats.maxMp;
        playerStats.atk += atkUp;
        
        totalHpUp += hpUp;
        totalAtkUp += atkUp;
    }
    playerStats.hp = playerStats.maxHp; 
    playerStats.mp = playerStats.maxMp;

    setTimeout(() => SoundManager.playLevelUp(), 200); 
    log(`レベルが${gain}あがった！ (HP+${totalHpUp}, 攻+${totalAtkUp})`, false, 'levelup');

    if (Math.random() < 0.3) {
        dropItem();
    }
}

function dropItem(forceRare = false) {
    let itemName = "";
    let isRare = false;

    if (forceRare) {
        const randIndex = Math.floor(Math.random() * rareItems.length);
        itemName = rareItems[randIndex];
        isRare = true;
    } else if (Math.random() < 0.3) {
        const maxIdx = weaponNames.length - 1;
        const tier = Math.min(maxIdx, Math.floor((currentFloor / 13) * maxIdx));
        const range = 15; 
        const randIndex = Math.max(0, Math.min(maxIdx, tier - 5 + Math.floor(Math.random() * range)));
        itemName = weaponNames[randIndex];
    } else {
        itemName = itemNames[Math.floor(Math.random() * itemNames.length)];
    }
    
    playerStats.items.push(itemName);
    const dropMsg = isRare ? `★レア！ ${itemName}を おとした！` : `${itemName}を おとした！`;
    log(`${currentMonster.name}は ${dropMsg}`, false, 'item');
}

// Real Failure Logic
function executeFailure() {
    SoundManager.playDamage(); 

    const vis = document.getElementById('monster-visual');
    vis.classList.add('anim-attack');

    document.getElementById('message-window').innerText = `${currentMonster.name}の こうげき！`;
    log(`ミス！ ゆうしゃは ${playerStats.maxHp}の ダメージをうけた！`, true);
    playerStats.hp = 0;
    updateUI();

    checkHighScore(); 

    const failDelay = isAutoMode ? 500 : 1000;
    setTimeout(() => {
        showGameOver(false);
    }, failDelay);
}

function showGameClear() {
    if (isTrueClear) {
        SoundManager.playTrueClear();
    } else {
        SoundManager.playClear(); 
    }

    isGameClear = true;
    
    if(isAutoMode) {
        isAutoMode = false;
        document.getElementById('auto-btn').classList.remove('active');
        document.getElementById('auto-btn').innerText = "AUTO OFF";
        log("★ゲームクリア！ オートモードを かいじょしました。", false, 'system');
    }

    const vis = document.getElementById('monster-visual');
    if (isTrueClear) {
        vis.classList.add('anim-true-clear');
    } else {
        vis.classList.add('anim-clear');
    }
    
    const demonName = isTrueClear ? "真・魔王" : "まおう";
    log(`おめでとう！ ${demonName}を たおした！`, false, 'success');
    
    checkHighScore(); 

    setTimeout(() => {
        showGameOver(true);
    }, 1500);
}

function checkHighScore() {
    let isNewRecord = false;
    // Compare Floors now
    if (currentFloor > bestRecord.floor) {
        isNewRecord = true;
    } else if (currentFloor === bestRecord.floor) {
        if (playerStats.items.length > bestRecord.items.length) {
            isNewRecord = true;
        }
    }
    if (isNewRecord) {
        bestRecord = {
            floor: currentFloor,
            hp: playerStats.maxHp,
            mp: playerStats.maxMp,
            atk: playerStats.atk,
            items: [...playerStats.items],
            alias: generateAlias(currentFloor, choiceStats)
        };
        saveData();
        return true;
    }
    return false;
}

function showGameOver(isClear) {
    if(!isClear) SoundManager.playGameOver(); 

    const overlay = document.getElementById('overlay');
    const title = document.getElementById('overlay-title');
    const kingMsg = document.getElementById('king-msg'); 
    
    const alias = generateAlias(currentFloor, choiceStats);
    document.getElementById('alias-val').innerText = alias;
    document.getElementById('true-fate-display').innerText = isClear ? "運命を超越した" : (predeterminedFate === 'left' ? 'はい' : 'いいえ');
    
    // Add to Collections
    addToCollection(playerStats.items, alias);

    overlay.classList.remove('clear-mode', 'true-clear-mode');

    if (isClear) {
        // ドラゴンクエスト風テキストに変更
        document.getElementById('true-fate-display').parentElement.style.display = 'none';
        
        if (isTrueClear) {
            overlay.classList.add('true-clear-mode');
            title.innerText = "しんの　へいわが　おとずれた！";
            kingMsg.innerHTML = "みごとだ！　すべての　げんきょうを　うちたおすとは！<br>そなたこそ　まことの　ゆうしゃだ！";
        } else {
            overlay.classList.add('clear-mode');
            title.innerText = "せかいに　へいわが　もどった！";
            kingMsg.innerHTML = "よくぞ　まおうを　たおした！<br>そなたの　かつやくは　えいえんに　かたりつがれるだろう！";
        }
    } else {
        title.innerText = "ぜんめつ　した……";
        kingMsg.innerText = "しんでしまうとは なさけない……"; 
        document.getElementById('true-fate-display').parentElement.style.display = 'block';
    }

    const isNew = (bestRecord.floor === currentFloor && bestRecord.hp === playerStats.maxHp && bestRecord.alias === alias);
    document.getElementById('new-record-badge').style.display = isNew ? 'inline-block' : 'none';

    document.getElementById('res-floor').innerText = "B" + currentFloor + "F";
    document.getElementById('res-lvl').innerText = playerLevel;
    document.getElementById('res-hp').innerText = playerStats.maxHp;
    document.getElementById('res-mp').innerText = playerStats.maxMp;
    document.getElementById('res-atk').innerText = playerStats.atk;
    
    document.getElementById('stat-attempts').innerText = statsRecord.totalAttempts;
    const trueClearsText = statsRecord.trueClears ? ` (真:${statsRecord.trueClears})` : "";
    document.getElementById('stat-clears').innerHTML = `${statsRecord.totalClears}<small>${trueClearsText}</small>`;
    document.getElementById('stat-choices').innerText = statsRecord.totalChoices;
    
    let rate = 0;
    if (statsRecord.totalChoices > 0) {
        rate = (statsRecord.totalSuccesses / statsRecord.totalChoices) * 100;
    }
    document.getElementById('stat-rate').innerText = rate.toFixed(1) + "%";
    
    const lootContainer = document.getElementById('loot-list');
    lootContainer.innerHTML = '';
    if (playerStats.items.length === 0) {
        lootContainer.innerHTML = '<div style="color:#888;">なし</div>';
    } else {
        playerStats.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'loot-item';
            div.innerText = item;
            lootContainer.appendChild(div);
        });
    }

    overlay.classList.add('active');
    document.querySelector('.choices-container').querySelectorAll('button').forEach(b => b.disabled = true);

    // Auto Retry
    if(isAutoMode && !isGameClear) {
        autoTimeout = setTimeout(() => {
            resetGame();
        }, 1000);
    }
}

function resetGame() {
    currentFloor = 0;
    playerLevel = 1;
    choiceStats = { yes: 0, no: 0 };
    isGameClear = false;
    isTrueClear = false;
    document.body.classList.remove('true-demon-mode');
    
    playerStats = {
        hp: 20, maxHp: 20,
        mp: 5, maxMp: 5,
        atk: 10,
        items: []
    };

    document.getElementById('overlay').classList.remove('active');
    document.getElementById('overlay').classList.remove('clear-mode');
    document.getElementById('log-container').innerHTML = '';
    document.querySelector('.choices-container').querySelectorAll('button').forEach(b => b.disabled = false);
    log("ぼうけんの きろくを リセットしました。");
    
    startLevel(1);
}

function clearData() {
    if(confirm("ほんとうに きろくを すべて けしますか？\n（ページが リロード されます）")) {
        localStorage.removeItem('abyss_rpg_save_v1');
        localStorage.removeItem('abyss_rpg_stats_v1');
        localStorage.removeItem('abyss_rpg_settings_v1'); 
        alert("きろくは まっしょう されました。");
        location.reload(); 
    }
}

function generateMonsterSVG(data) {
    let rects = "";
    data.pixels.forEach(p => {
        const color = p.c ? p.c : data.color;
        rects += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${color}" />`;
    });
    return `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="pixel-art">${rects}</svg>`;
}

function log(msg, isFail = false, type = 'normal') {
    const container = document.getElementById('log-container');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    if (isFail) entry.classList.add('fail');
    if (type === 'success') entry.classList.add('success');
    if (type === 'item') entry.classList.add('item');
    if (type === 'levelup') entry.classList.add('levelup');
    if (type === 'system') entry.classList.add('system');
    if (type === 'true-boss') entry.classList.add('true-boss');
    if (type === 'metal') entry.classList.add('metal');
    
    entry.innerHTML = msg; // innerHTML to allow tags in msg
    container.prepend(entry);
}

function updateUI() {
    document.getElementById('floor-val').innerText = "B" + currentFloor + "F";
    document.getElementById('level-val').innerText = playerLevel;
    document.getElementById('hp-val').innerText = playerStats.hp;
    document.getElementById('mp-val').innerText = playerStats.mp;
    document.getElementById('atk-val').innerText = playerStats.atk;
    document.getElementById('hs-val-sm').innerText = "B" + bestRecord.floor + "F";
    
    const prob = Math.pow(2, currentFloor);
    let probStr = prob > 999999999 ? "測定不能" : prob.toLocaleString();
    document.getElementById('prob-val').innerText = probStr;
}

// --- Expanded Alias System ---
function generateAlias(lvl, stats) {
    const total = stats.yes + stats.no;
    if (lvl <= 1) return "瞬殺されし者";
    
    const yesRatio = total > 0 ? stats.yes / total : 0;
    
    // Random Prefixes (Massive List)
    const randomPrefixes = [
        "疾風の", "怒涛の", "奇跡の", "不屈の", "孤高の", "漆黒の", "白銀の", "愛の", "悲しみの", 
        "週末の", "放課後の", "異世界の", "転生した", "最強の", "最弱の", "逆襲の", "覚醒した",
        "迷子の", "腹ペコの", "寝不足の", "伝説の", "うわさの", "ただの", "期待の", "見習い", "永遠の",
        "地獄の", "天国の", "虚無の", "約束の", "始まりの", "終わりの", "量産型", "高性能", "ポンコツ",
        "にわか", "ガチ勢", "課金", "無課金", "ログイン勢", "引退した", "復帰した", "自称", "公認",
        "選ばれし", "呪われた", "祝福された", "忘れられた", "名もなき", "通りすがりの"
    ];
    
    // Random Suffixes (Massive List)
    const randomSuffixes = [
        "旅人", "戦士", "勇者", "魔王", "神", "ニート", "学生", "社長", "アイドル", "猫", "犬", 
        "スライム", "ドラゴン", "概念", "システム", "バグ", "プログラム", "AI", "アンドロイド", "サイボーグ",
        "魔法使い", "僧侶", "盗賊", "武闘家", "賢者", "遊び人", "商人", "吟遊詩人", "踊り子", "海賊",
        "サムライ", "忍者", "ガンナー", "ランサー", "ライダー", "バーサーカー", "キャスター", "アサシン", "セイバー", "アーチャー",
        "救世主", "破壊者", "創造主", "観測者", "支配者", "超越者", "守護者", "調停者", "反逆者", "復讐者",
        "おじさん", "おばさん", "お兄さん", "お姉さん", "少年", "少女", "赤ちゃん", "老人", "幽霊", "ゾンビ"
    ];

    // Deterministic base prefix (Play Style)
    let basePrefix = "";
    if (yesRatio === 1.0) basePrefix = "全肯定の";
    else if (yesRatio === 0.0) basePrefix = "全否定の";
    else if (yesRatio > 0.8) basePrefix = "イエスマンな";
    else if (yesRatio < 0.2) basePrefix = "疑い深き";
    else if (yesRatio > 0.6) basePrefix = "素直な";
    else if (yesRatio < 0.4) basePrefix = "偏屈な";
    else if (Math.abs(stats.yes - stats.no) <= 1) basePrefix = "中立なる";
    else basePrefix = "気まぐれな";

    // Determine final prefix
    let prefix = basePrefix;
    // 50% chance to use random flavor prefix instead
    if (Math.random() > 0.5) {
        prefix = randomPrefixes[Math.floor(Math.random() * randomPrefixes.length)];
    }

    // Determine Suffix based on level tier + random
    let suffix = "";
    const tier = Math.floor(lvl / 2); // 0 to 6+
    
    // Create a subset of suffixes appropriate for level
    let suffixPool = [];
    if (tier <= 2) {
        suffixPool = randomSuffixes.slice(0, 15); // Basic jobs/misc
    } else if (tier <= 5) {
        suffixPool = randomSuffixes.slice(15, 40); // Advanced jobs
    } else {
        suffixPool = randomSuffixes.slice(40); // Epic/Godly titles
    }
    
    // Add a chance to pick ANY suffix for chaos
    if(Math.random() < 0.1) suffixPool = randomSuffixes;
    
    suffix = suffixPool[Math.floor(Math.random() * suffixPool.length)];

    // Special Overrides (Fixed Titles for specific feats)
    if (isTrueClear) return "因果律の破壊者";
    if (lvl === 13) return "運命の超越者";
    if (lvl === 7 && yesRatio === 1.0) return "ラッキーセブン";
    if (lvl > 10 && playerStats.items.includes("ねぎ")) return "ねぎの使い手";
    if (playerStats.items.length > 8 && lvl < 8) return "買い物上手";
    if (lvl === 1 && Math.random() < 0.01) return "出落ち";

    return prefix + suffix;
}

// --- Bestiary / Collection ---

function addToCollection(newItems, newAlias) {
    if(!statsRecord.collectedItems) statsRecord.collectedItems = [];
    if(!statsRecord.collectedAliases) statsRecord.collectedAliases = [];
    
    newItems.forEach(item => {
        if(!statsRecord.collectedItems.includes(item)) {
            statsRecord.collectedItems.push(item);
        }
    });
    
    if(newAlias && !statsRecord.collectedAliases.includes(newAlias)) {
        statsRecord.collectedAliases.push(newAlias);
    }
    saveData();
}

function openBestiary() {
    document.getElementById('bestiary-overlay').classList.add('active');
    switchBestiaryTab('items');
}

function closeBestiary() {
    document.getElementById('bestiary-overlay').classList.remove('active');
}

function switchBestiaryTab(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    // Very simple tab switching logic relying on order or text
    if(tab === 'items') tabs[0].classList.add('active');
    else tabs[1].classList.add('active');

    renderBestiaryContent(tab);
}

function renderBestiaryContent(tab) {
    const container = document.getElementById('bestiary-content');
    container.innerHTML = '';
    
    const collected = tab === 'items' ? (statsRecord.collectedItems || []) : (statsRecord.collectedAliases || []);
    const allList = tab === 'items' ? allItemsList : collected; // Aliases don't have a fixed "All List" easily, so just show collected
    
    const listEl = document.createElement('div');
    listEl.className = 'collection-list';

    if(tab === 'items') {
        // Show completion rate for items
        const rate = Math.floor((collected.length / allItemsList.length) * 100);
        document.getElementById('collection-rate').innerText = rate + "%";

        allList.forEach(item => {
            const el = document.createElement('div');
            el.className = 'collection-item';
            if(collected.includes(item)) {
                el.innerText = item;
                el.classList.add('unlocked');
            } else {
                el.innerText = "？？？？";
            }
            listEl.appendChild(el);
        });
    } else {
        // Aliases: just list collected
        document.getElementById('collection-rate').innerText = collected.length + "種";
        
        // Show most recent first
        [...collected].reverse().forEach(alias => {
            const el = document.createElement('div');
            el.className = 'collection-item alias-item unlocked';
            el.innerText = alias;
            listEl.appendChild(el);
        });
        if(collected.length === 0) {
            const el = document.createElement('div');
            el.className = 'collection-item alias-item';
            el.innerText = "まだ称号を獲得していません";
            listEl.appendChild(el);
        }
    }
    
    container.appendChild(listEl);
}

// --- Settings Management ---
function saveSettings() {
    localStorage.setItem('abyss_rpg_settings_v1', JSON.stringify(gameSettings));
}

function loadSettings() {
    const raw = localStorage.getItem('abyss_rpg_settings_v1');
    if(raw) {
        gameSettings = JSON.parse(raw);
    }
}

function saveData() {
    localStorage.setItem('abyss_rpg_save_v1', JSON.stringify(bestRecord));
    localStorage.setItem('abyss_rpg_stats_v1', JSON.stringify(statsRecord));
}

function loadData() {
    const raw = localStorage.getItem('abyss_rpg_save_v1');
    if(raw) {
        bestRecord = JSON.parse(raw);
        // Migrate old level record to floor if needed
        if(bestRecord.level && !bestRecord.floor) {
            bestRecord.floor = bestRecord.level;
        }
    } else {
        bestRecord = { floor: 0, items: [], alias: "なし" };
    }
    
    const statsRaw = localStorage.getItem('abyss_rpg_stats_v1');
    if(statsRaw) {
        const loaded = JSON.parse(statsRaw);
        statsRecord = {
            totalAttempts: loaded.totalAttempts || 0,
            totalClears: loaded.totalClears || 0,
            trueClears: loaded.trueClears || 0, // Load true clears
            totalChoices: loaded.totalChoices || 0,
            totalSuccesses: loaded.totalSuccesses || 0,
            collectedItems: loaded.collectedItems || [],
            collectedAliases: loaded.collectedAliases || []
        };
    } else {
        statsRecord = { totalAttempts: 0, totalClears: 0, trueClears: 0, totalChoices: 0, totalSuccesses: 0, collectedItems: [], collectedAliases: [] };
    }
    
    loadSettings(); 
}
