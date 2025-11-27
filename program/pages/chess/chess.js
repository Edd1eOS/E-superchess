const Board = require('../../utils/board.js');
const Rules = require('../../utils/rules.js');
const Recorder = require('../../utils/recorder.js');

Page({

  data: {
    boardState: null,       // 用于界面渲染
    turn: 'white',          // 当前行棋方
    drawOfferedBy: null     // null / "white" / "black"
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

    // 刷新界面
    this.refreshUI();
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
   * - 双方协商行为，只在此页面处理
   * - 只有达成时才跳转 endgame
   * ----------------------------------------- */
  onOfferDraw() {
    const player = this.board.turn;

    // 如果对方之前已提出并且当前玩家接受求和
    if (this.data.drawOfferedBy && this.data.drawOfferedBy !== player) {
      // 达成和棋
      this.endGame("0.5-0.5", "agreement");
      return;
    }

    // 否则提出新的求和请求
    this.setData({ drawOfferedBy: player });

    wx.showToast({
      title: `${player} offers draw`,
      icon: "none"
    });
  },

  /* -----------------------------------------
   * 认输（SURRENDER）
   * - 立即结束对局
   * - 跳转 endgame
   * ----------------------------------------- */
  onSurrender() {

    const loser = this.board.turn;
    const winner = loser === "white" ? "black" : "white";

    const result = winner === "white" ? "1-0" : "0-1";

    this.endGame(result, "resign");
  },

  /* -----------------------------------------
   * 对局结算（唯一出口）
   * result: "1-0" / "0-1" / "0.5-0.5"
   * reason: "checkmate" / "resign" / "agreement" / "timeout"
   * ----------------------------------------- */
  endGame(result, reason) {
    wx.navigateTo({
      url: `/pages/endgame/endgame?result=${encodeURIComponent(result)}&reason=${encodeURIComponent(reason)}`
    });
  },

  /* -----------------------------------------
   * 返回主菜单
   * ----------------------------------------- */
  backToMenu() {
    wx.reLaunch({
      url: '/program/pages/menu/menu'
    });
  }

});