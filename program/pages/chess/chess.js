const Board = require('../../utils/board.js');
const Rules = require('../../utils/rules.js');
const Recorder = require('../../utils/recorder.js');

Page({

  data: {
    boardState: [],       // 用于界面渲染，修改初始值为数组而不是null
    turn: 'W',              // 当前回合
    drawOfferedBy: null     // null / "W" / "B"
  },

  onLoad(options) {
    this.board = new Board();
    this.rules = new Rules();
    this.recorder = new Recorder();

    this.refreshUI();
  },

  /* -----------------------------------------
   * UI 刷新
   * ----------------------------------------- */
  refreshUI() {
    this.setData({
      boardState: this.board.exportForUI(),
      turn: this.board.state.turn,
      drawOfferedBy: this.data.drawOfferedBy
    });
  },

  /* -----------------------------------------
   * 棋盘点击事件处理
   * ----------------------------------------- */
  onCellTap(e) {
    const { coord } = e.detail || {};
    console.log('Cell tapped:', coord);
    // 在这里把 coord 传给棋盘逻辑：例如 this.board.handleClickByCoord(coord)
  },

  // 处理棋子移动
  onMove(e) {
    const { from, to } = e.detail;
    console.log(`Moving from ${from} to ${to}`);

    // 检查移动是否合法
    if (!this.rules.isValidMove(this.board, from, to, this.board.state.turn)) {
      wx.showToast({
        title: 'Invalid move!',
        icon: 'none'
      });
      return;
    }

    // 创建一个临时棋盘来测试这个移动
    const testBoard = this.rules.cloneBoard(this.board);

    // 执行移动
    this.rules.executeMove(testBoard, from, to);

    // 检查移动后是否自己被将军
    if (this.rules.isCheck(testBoard, this.board.state.turn)) {
      wx.showToast({
        title: '不能送将',
        icon: 'none'
      });
      return;
    }

    // 检查是否需要升变
    const promotionNeeded = this.checkPromotionNeeded(from, to);
    if (promotionNeeded) {
      this.handlePromotion(from, to);
      return;
    }

    // 创建移动前的状态快照用于悔棋和复盘
    const snapshot = {
      from: from,
      to: to,
      piece: this.getPieceAt(from),
      capturedPiece: this.getPieceAt(to),
      beforeState: JSON.parse(JSON.stringify(this.board))
    };

    // 执行移动
    this.board.movePiece(from, to);

    // 记录操作快照
    this.recorder.recordMove(snapshot);

    // 检查是否将军或将杀
    const nextTurn = this.board.state.turn; // 注意：movePiece后回合已经切换
    const currentPlayer = nextTurn === 'W' ? 'B' : 'W'; // 当前操作的玩家

    // 检查对方是否被将军
    if (this.rules.isCheck(this.board, nextTurn)) {
      // 检查是否将杀
      if (this.rules.isCheckmate(this.board, nextTurn)) {
        // 将杀，当前玩家获胜
        wx.showToast({
          title: `${currentPlayer === 'W' ? '白方' : '黑方'}获胜！`,
          icon: 'none'
        });

        // 跳转到游戏结束页面
        setTimeout(() => {
          wx.redirectTo({
            url: `../endgame/endgame?result=win&winner=${currentPlayer}`
          });
        }, 1500);
      } else {
        // 仅将军
        wx.showToast({
          title: '将军！',
          icon: 'none'
        });
      }
    }

    // 刷新界面
    this.refreshUI();
  },

  // 检查是否需要升变
  checkPromotionNeeded(from, to) {
    const { r: fromR, c: fromC } = this.board.toRC(from);
    const { r: toR, c: toC } = this.board.toRC(to);
    const piece = this.board.board[fromR][fromC];

    // 只有 P、SP、LG 三种兵类棋子可以升变
    if (!piece || !['P', 'SP', 'LG'].includes(piece.type)) {
      return false;
    }

    // 白方到第1行 (r=0)，黑方到第10行 (r=9) 需要升变
    const isWhite = piece.color === 'W';
    return (isWhite && toR === 0) || (!isWhite && toR === 9);
  },

  // 处理升变
  handlePromotion(from, to) {
    const piece = this.getPieceAt(from);

    // 显示选择框让用户选择升变棋子
    wx.showActionSheet({
      itemList: ['Queen(Q)', 'Marshall(M)', 'Templar(T)', 'Rook(R)', 'Bishop(B)', 'Knight(N)'],
      itemColor: "#000000",
      success: (res) => {
        const selectedIndex = res.tapIndex;
        const promotionPieces = ['Q', 'M', 'T', 'R', 'B', 'N'];
        const promotedType = promotionPieces[selectedIndex];

        // 创建移动前的状态快照用于悔棋和复盘
        const snapshot = {
          from: from,
          to: to,
          piece: this.getPieceAt(from),
          capturedPiece: this.getPieceAt(to),
          beforeState: JSON.parse(JSON.stringify(this.board)),
          promotedType: promotedType // 记录升变类型
        };

        // 执行移动并升变
        this.board.movePiece(from, to);

        // 修改目标位置的棋子为升变后的棋子
        const { r: toR, c: toC } = this.board.toRC(to);
        this.board.board[toR][toC] = { type: promotedType, color: piece.color };

        // 记录操作快照
        this.recorder.recordMove(snapshot);

        // 刷新界面
        this.refreshUI();
      },
      fail: (res) => {
        console.log('用户取消选择');
      }
    });
  },

  // 获取指定位置的棋子
  getPieceAt(coord) {
    const { r, c } = this.board.toRC(coord);
    return this.board.board[r][c];
  },

  /* -----------------------------------------
   * 悔棋（UNDO）
   * - 不跳转页面
   * - 不影响对局状态完整性
   * ----------------------------------------- */
  onUndo() {
    if (!this.recorder.canUndo()) {
      wx.showToast({ title: "Nothing to undo", icon: "none" });
      return;
    }

    const move = this.recorder.undo();
    this.board.undoMove(move);

    this.refreshUI();
  },

  /* -----------------------------------------
   * 求和（OFFER DRAW）
   * - 直接判定和棋并跳转 endgame 显示 0.5-0.5（不再等待对方接受）
   * ----------------------------------------- */
  onOfferDraw() {
    // 立即和棋并跳转结束页面，带上分数信息便于 endgame 显示
    wx.showToast({
      title: '和棋（0.5-0.5）',
      icon: 'none'
    });
    setTimeout(() => {
      wx.redirectTo({
        url: '../endgame/endgame?result=draw&score=0.5-0.5'
      });
    }, 300);
  },

  /* -----------------------------------------
   * 额外绑定：处理页面上可能触发的事件名
   * onSurrender - 兼容某些组件/模板的 tap 事件
   * backToMenu  - 返回上一页/主菜单，避免事件未绑定导致的错误
   * ----------------------------------------- */
  onSurrender() {
    // 同认输逻辑
    this.onResign();
  },

  backToMenu() {
    // 优先返回上一页，若需要可替换为跳转到具体菜单页
    wx.navigateBack({ delta: 1 });
  },

  /* -----------------------------------------
   * 认输（RESIGN）
   * - 单方面决定，立即跳转 endgame
   * ----------------------------------------- */
  onResign() {
    const winner = this.board.state.turn === 'W' ? 'B' : 'W';
    wx.redirectTo({
      url: '../endgame/endgame?result=win&winner=' + winner
    });
  }
});