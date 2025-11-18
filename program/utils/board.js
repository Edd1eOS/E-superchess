// board.js —— 棋盘核心状态管理模块
// ================================================
// 棋盘数据：10x10
// 每格内容：null 或 { type: "SP", color: "W" }
// ================================================

class Board {
  constructor() {
    this.initBoard();
  }

  // 创建 10×10 空棋盘
  createEmptyBoard() {
    return Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => null)
    );
  }

  initBoard() {
    this.board = this.createEmptyBoard();
    this.history = [];
    
    this.state = {
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
    this.placeGroup(SP,  "SP", "W");
    this.placeGroup(IP,  "IP", "W");
    this.placeGroup(LG,  "LG", "W");
    this.placeGroup(N,   "N",  "W");
    this.placeGroup(B,   "B",  "W");
    this.placeGroup(A,   "A",  "W");

    for (const [type, posArr] of Object.entries(backRank)) {
      this.placeGroup(posArr, type, "W");
    }

    // TODO：放置黑方（上下翻转 10-x）
  }

  // 坐标 "e4" 转为行列
  toRC(pos) {
    const file = pos[0].charCodeAt(0) - 97;   // a-j → 0-9
    const rank = 10 - parseInt(pos.slice(1)); // 1-10 → 9-0
    return { r: rank, c: file };
  }

  // 行列转坐标
  toPos(r, c) {
    return String.fromCharCode(97 + c) + (10 - r);
  }

  // 用于放置多个棋子
  placeGroup(arr, type, color) {
    arr.forEach(pos => {
      const { r, c } = this.toRC(pos);
      this.board[r][c] = { type, color };
    });
  }

  // 获取棋盘（给前端渲染）
  getBoard() {
    return this.board;
  }

  exportForUI() {
    return this.getBoard();
  }

  // 移动棋子
  movePiece(from, to) {
    const { r: fr, c: fc } = this.toRC(from);
    const { r: tr, c: tc } = this.toRC(to);

    const piece = this.board[fr][fc];
    if (!piece) return false;

    // 保存历史快照
    this.history.push({
      board: JSON.parse(JSON.stringify(this.board)),
      state: JSON.parse(JSON.stringify(this.state))
    });

    // 执行移动
    this.board[fr][fc] = null; 
    this.board[tr][tc] = piece;

    // 更新王位置
    if (piece.type === "K") {
      this.state.kingPos[piece.color] = to;
    }

    return true;
  }

  // 撤销一步
  undo() {
    if (!this.history.length) return;

    const last = this.history.pop();
    this.board = last.board;
    this.state = last.state;
  }

  // 是否被将军（调用 rules.js）
  isCheck(color) {
    // 这里需要实现检查是否被将军的逻辑
    // 暂时返回false
    return false;
  }
  
  undoMove() {
    this.undo();
  }
}

module.exports = Board;