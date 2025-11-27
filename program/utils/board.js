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
    const SP_W = ["a3","b3","i3","j3"];
    const P_W = ["c3","d3","e3","f3","g3","h3"];
    const LG_W = ["a2","j2"];
    const N_W = ["b2","i2"];
    const B_W = ["c2","h2"];
    const A_W = ["d2","g2"];

    const backRank_W = {
      R: ["a1","j1"],
      M: ["d1"],
      Q: ["e1"],
      K: ["f1"],
      T: ["g1"]
    };

    // 放置白方棋子
    this.placeGroup(SP_W,  "SP", "W");
    this.placeGroup(P_W,   "P",  "W");
    this.placeGroup(LG_W,  "LG", "W");
    this.placeGroup(N_W,   "N",  "W");
    this.placeGroup(B_W,   "B",  "W");
    this.placeGroup(A_W,   "A",  "W");

    for (const [type, posArr] of Object.entries(backRank_W)) {
      this.placeGroup(posArr, type, "W");
    }

    // 放置黑方棋子（对称于白方）
    const transformCoord = (coord) => {
      const file = coord[0];
      const rank = parseInt(coord.slice(1));
      const mirroredRank = 11 - rank;
      return `${file}${mirroredRank}`;
    };
    
    // 黑方兵
    const SP_B = SP_W.map(transformCoord);
    const P_B = P_W.map(transformCoord);
    const LG_B = LG_W.map(transformCoord);
    const N_B = N_W.map(transformCoord);
    const B_B = B_W.map(transformCoord);
    const A_B = A_W.map(transformCoord);
    
    const backRank_B = {};
    for (const [type, posArr] of Object.entries(backRank_W)) {
      backRank_B[type] = posArr.map(transformCoord);
    }

    // 放置黑方棋子
    this.placeGroup(SP_B,  "SP", "B");
    this.placeGroup(P_B,   "P",  "B");
    this.placeGroup(LG_B,  "LG", "B");
    this.placeGroup(N_B,   "N",  "B");
    this.placeGroup(B_B,   "B",  "B");
    this.placeGroup(A_B,   "A",  "B");

    for (const [type, posArr] of Object.entries(backRank_B)) {
      this.placeGroup(posArr, type, "B");
    }
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

    // 记录上一步移动，用于过路兵等规则判断
    this.state.lastMove = {
      from: from,
      to: to,
      piece: { ...piece }
    };

    // 更新王位置
    if (piece.type === "K") {
      this.state.kingPos[piece.color] = to;
    }

    // 切换回合
    this.state.turn = this.state.turn === "W" ? "B" : "W";

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
  
  undoMove(snapshot) {
    // 使用快照恢复棋盘状态
    if (snapshot && snapshot.beforeState) {
      this.board = snapshot.beforeState.board;
      this.state = snapshot.beforeState.state;
    } else {
      this.undo();
    }
  }
}

module.exports = Board;