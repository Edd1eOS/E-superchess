const app = getApp();
const Board = require('../../utils/board.js'); // 棋盘核心逻辑

Page({

  data: {
    currentStep: 0,   // 当前步数
    maxStep: 0,       // 总步数
    moves: [],        // 对局的招法列表
    boardState: null, // 棋盘状态
  },

  onLoad(options) {
    // 从上一个页面接收到棋谱 JSON
    let replayData = null;
    
    // 添加错误处理，确保options.data存在且为有效JSON
    try {
      if (options.data) {
        replayData = JSON.parse(options.data);
      } else {
        // 如果没有传递data参数，则使用默认空数据
        replayData = {
          moves: []
        };
        console.warn('No replay data provided, using empty moves array');
      }
    } catch (e) {
      console.error('Failed to parse replay data:', e);
      replayData = {
        moves: []
      };
    }

    this.chess = new Board();
    
    this.setData({
      moves: replayData.moves,
      maxStep: replayData.moves.length,
      boardState: this.chess.exportForUI()
    });
  },

  onReady() {
    // 初始渲染为开局
    this.renderPosition(0);
  },

  /* ---------------------------------
   * 核心：按照 step 重建局面
   * --------------------------------- */
  renderPosition(step) {
    // 确保chess对象已正确初始化
    if (!this.chess) {
      console.error('Chess object not initialized');
      return;
    }
    
    // 重置棋盘
    if (typeof this.chess.initBoard === 'function') {
      this.chess.initBoard();
    } else {
      console.error('Chess object does not have initBoard method');
      return;
    }

    // 执行指定步数的移动
    for (let i = 0; i < step; i++) {
      // 确保move方法存在
      if (typeof this.chess.movePiece === 'function' && this.data.moves[i]) {
        // 假设moves[i]包含from和to属性
        const move = this.data.moves[i];
        if (move.from && move.to) {
          this.chess.movePiece(move.from, move.to);
        }
      }
    }

    // 更新UI
    this.setData({
      boardState: this.chess.exportForUI()
    });
  },

  /* ---------------------------------
   * 棋盘点击事件处理
   * --------------------------------- */
  onCellTap(e) {
    const { x, y, chessCoordinate } = e.detail || {};
    console.log('Cell tapped:', x, y, chessCoordinate);
    // 复盘页面不需要处理点击事件
  },

  /* ---------------------------------
   * 控制按钮逻辑
   * --------------------------------- */
  stepBack() {
    if (this.data.currentStep > 0) {
      this.setData({ currentStep: this.data.currentStep - 1 });
      this.renderPosition(this.data.currentStep);
    }
  },

  stepForward() {
    if (this.data.currentStep < this.data.maxStep) {
      this.setData({ currentStep: this.data.currentStep + 1 });
      this.renderPosition(this.data.currentStep);
    }
  },

  toStart() {
    this.setData({ currentStep: 0 });
    this.renderPosition(0);
  },

  toEnd() {
    this.setData({ currentStep: this.data.maxStep });
    this.renderPosition(this.data.maxStep);
  },

  // 返回按钮功能
  back() {
    wx.navigateBack();
  },

  /* ---------------------------------
   * 进度条逻辑
   * --------------------------------- */
  onSliderChanging(e) {
    // 视觉预览用，不更新 currentStep
    this.renderPosition(e.detail.value);
  },

  onSliderChange(e) {
    this.setData({ currentStep: e.detail.value });
    this.renderPosition(e.detail.value);
  },

  backToMenu() {
    wx.reLaunch({
      url: '/program/pages/menu/menu'
    });
  }

});