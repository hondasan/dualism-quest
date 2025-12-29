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
            SoundManager.playAttack
