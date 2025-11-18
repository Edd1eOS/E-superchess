// board.js —— 棋盘核心状态管理模块
// ================================================
// 棋盘数据：10x10
// 每格内容：null 或 { type: "SP", color: "W" }
// ================================================

// 创建 10×10 空棋盘
function createEmptyBoard() {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => null)
  );
}

let board = createEmptyBoard();
let history = [];

let state = {
  turn: "W",         // 当前回合：W 白方，B 黑方
  enPassant: null,   // 过路兵
  castling: {        // 易位权利
    WK: true, WQ: true,
    BK: true, BQ: true
  },
  kingPos: {         // 王的位置
    W: "f1",
    B: "f10"
  }
};

// 坐标 "e4" 转为行列
function toRC(pos) {
  const file = pos[0].charCodeAt(0) - 97;   // a-j → 0-9
  const rank = 10 - parseInt(pos.slice(1)); // 1-10 → 9-0
  return { r: rank, c: file };
}

// 行列转坐标
function toPos(r, c) {
  return String.fromCharCode(97 + c) + (10 - r);
}

// 初始化棋子
function initBoard() {
  board = createEmptyBoard();

  // 兵（白方）
  const SP = ["a3","b3","i3","j3"];
  const IP = ["c3","d3","e3","f3","g3","h3"];
  const LG = ["a2","j2"];
  const N  = ["b2","i2"];
  const B  = ["c2","h2"];
  const A  = ["d2","g2"];

  const backRank = {
    R: ["a1","j1"],
    M: ["d1"],
    Q: ["e1"],
    K: ["f1"],
    T: ["g1"]
  };

  // 放置白方棋子
  placeGroup(SP,  "SP", "W");
  placeGroup(IP,  "IP", "W");
  placeGroup(LG,  "LG", "W");
  placeGroup(N,   "N",  "W");
  placeGroup(B,   "B",  "W");
  placeGroup(A,   "A",  "W");

  for (const [type, posArr] of Object.entries(backRank)) {
    placeGroup(posArr, type, "W");
  }

  // TODO：放置黑方（上下翻转 10-x）
}

// 用于放置多个棋子
function placeGroup(arr, type, color) {
  arr.forEach(pos => {
    const { r, c } = toRC(pos);
    board[r][c] = { type, color };
  });
}

// 获取棋盘（给前端渲染）
function getBoard() {
  return board;
}

// 移动棋子
function movePiece(from, to) {
  const { r: fr, c: fc } = toRC(from);
  const { r: tr, c: tc } = toRC(to);

  const piece = board[fr][fc];
  if (!piece) return false;

  // 保存历史快照
  history.push({
    board: JSON.parse(JSON.stringify(board)),
    state: JSON.parse(JSON.stringify(state))
  });

  // 执行移动
  board[fr][fc] = null; 
  board[tr][tc] = piece;

  // 更新王位置
  if (piece.type === "K") {
    state.kingPos[piece.color] = to;
  }

  return true;
}

// 撤销一步
function undo() {
  if (!history.length) return;

  const last = history.pop();
  board = last.board;
  state = last.state;
}

// 是否被将军（调用 rules.js）
function isCheck(color) {
  const king = state.kingPos[color];
  const legal = getLegalMoves(king, board, state);
  return legal.some(m => m.capturesKing);
}

export {
  initBoard,
  getBoard,
  movePiece,
  undo,
  isCheck,
  state
};