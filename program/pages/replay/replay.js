const app = getApp();
import Chess from '../../utils/chess.js';  // 你自建的棋类核心逻辑

Page({

  data: {
    currentStep: 0,   // 当前步数
    maxStep: 0,       // 总步数
    moves: [],        // 对局的招法列表
  },

  onLoad(options) {
    // 从上一个页面接收到棋谱 JSON
    const replayData = JSON.parse(options.data);

    this.chess = new Chess();
    this.ctx = null;

    this.setData({
      moves: replayData.moves,
      maxStep: replayData.moves.length
    });
  },

  onReady() {
    const query = wx.createSelectorQuery();
    query.select('#chessboard')
      .fields({ node: true, size: true })
      .exec(res => {
        const canvas = res[0].node;
        this.ctx = canvas.getContext('2d');

        this.canvasWidth = res[0].width;
        this.canvasHeight = res[0].height;

        // 初始渲染为开局
        this.renderPosition(0);
      });
  },

  /* ---------------------------------
   * 核心：按照 step 重建局面
   * --------------------------------- */
  renderPosition(step) {
    this.chess.reset();

    for (let i = 0; i < step; i++) {
      this.chess.move(this.data.moves[i]);
    }

    this.drawBoard();
    this.drawPieces();
  },

  /* ---------------------------------
   * 画棋盘
   * --------------------------------- */
  drawBoard() {
    const ctx = this.ctx;
    const grid = this.canvasWidth / 8;

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#EEE' : '#888';
        ctx.fillRect(x * grid, y * grid, grid, grid);
      }
    }
  },

  /* ---------------------------------
   * 画棋子
   * --------------------------------- */
  drawPieces() {
    const ctx = this.ctx;
    const grid = this.canvasWidth / 8;
    const board = this.chess.board();

    board.forEach((row, y) => {
      row.forEach((piece, x) => {
        if (!piece) return;

        ctx.fillStyle = piece.color === 'w' ? 'white' : 'black';
        ctx.font = `${grid * 0.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(piece.type.toUpperCase(), x * grid + grid/2, y * grid + grid/2);
      });
    });
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
  }

});