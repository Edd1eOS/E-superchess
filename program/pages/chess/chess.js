const Board = require('../../utils/board.js');
const Rules = require('../../utils/rules.js');
const Recorder = require('../../utils/recorder.js');
const AI = require('../../utils/ai.js');

Page({

  data: {
    boardState: [],
    turn: 'W',
    drawOfferedBy: null,
    gameMode: 'pvp',
    playerTypes: {
      W: 'human',
      B: 'human'
    },
    aiLevels: {
      W: 1,
      B: 1
    },
    boardTheme: 'wood'
  },

  onLoad(options) {
    this.board = new Board();
    this.rules = new Rules();
    this.recorder = new Recorder();
    
    const settings = wx.getStorageSync('settings');
    if (settings && settings.boardStyle) {
      this.setData({
        boardTheme: settings.boardStyle
      });
    }
    
    this.initAudioContext(settings);
    
    const mode = options.mode || 'pvp';
    this.setData({
      gameMode: mode
    });
    
    if (mode === 'pve') {
      const playerTypes = {
        W: options.whiteType || 'human',
        B: options.blackType || 'ai'
      };
      
      const aiLevels = {
        W: parseInt(options.whiteLevel) || 1,
        B: parseInt(options.blackLevel) || 1
      };
      
      this.setData({
        playerTypes,
        aiLevels
      });
      
      this.ai = new AI();

      if (typeof this.ai.initLevel3 === 'function') {
        this.ai.initLevel3();
      }
    }

    this.refreshUI();
    
    this.makeAIMoveIfNecessary();
  },

  initAudioContext(settings) {
    const soundTypes = [
      { label: "原木 Wooden", value: "wooden", file: "/program/assets(sucaiku)/sounds/wooden_move.mp3" },
      { label: "玻璃 Glass", value: "glass", file: "/program/assets(sucaiku)/sounds/glass_move.mp3" },
      { label: "喵 Meow", value: "meow", file: "/program/assets(sucaiku)/sounds/cat_meow.mp3" }
    ];
    
    if (this.audioCtx) {
      this.audioCtx.destroy();
    }
    
    this.audioCtx = wx.createInnerAudioContext();
    
    const soundType = (settings && settings.soundType) || "wooden";
    const volume = (settings && settings.volume) || 70;
    
    const currentSound = soundTypes.find(sound => sound.value === soundType);
    if (currentSound) {
      this.audioCtx.src = currentSound.file;
    }
    
    this.audioCtx.volume = volume / 100;
  },

  playMoveSound() {
    if (this.audioCtx) {
      const settings = wx.getStorageSync('settings');
      if (settings && settings.volume !== undefined) {
        this.audioCtx.volume = settings.volume / 100;
      }
      
      this.audioCtx.play();
    }
  },

  onUnload() {
    if (this.audioCtx) {
      this.audioCtx.destroy();
    }
  },

  /* -----------------------------------------
   * UI 刷新
   * ----------------------------------------- */
  refreshUI() {
    this.setData({
      boardState: this.board.exportForUI(),
      turn: this.board.state.turn,
      drawOfferedBy: this.data.drawOfferedBy,
      boardTheme: this.data.boardTheme
    });
  },

  /* -----------------------------------------
   * 检查是否需要AI行动
   * ----------------------------------------- */
  makeAIMoveIfNecessary() {
    const currentPlayer = this.board.state.turn;
    if (this.data.gameMode === 'pve' && this.data.playerTypes[currentPlayer] === 'ai') {
      setTimeout(() => {
        this.makeAIMove();
      }, 1000);
    }
  },

  /* -----------------------------------------
   * AI移动
   * ----------------------------------------- */
  async makeAIMove() {
    const currentPlayer = this.board.state.turn;
    const aiLevel = this.data.aiLevels[currentPlayer];
    
    let move = null;
    try {
      if (typeof this.ai.calculateNextMoveAsync === 'function') {
        move = await this.ai.calculateNextMoveAsync(this.board, aiLevel);
      } else {
        move = this.ai.calculateNextMove(this.board, aiLevel);
      }
    } catch (e) {
      wx.showToast({
        title: 'AI计算出错，使用简化引擎',
        icon: 'none'
      });
      move = this.ai.calculateNextMove(this.board, 2);
    }
    
    if (move) {
      this.autoExecuteMove(move);
    } else {
      wx.showToast({
        title: 'AI无法找到合法移动',
        icon: 'none'
      });
    }
  },

  /* -----------------------------------------
   * 自动执行移动
   * ----------------------------------------- */
  autoExecuteMove(move) {
    const { from, to } = move;
    
    const promotionNeeded = this.checkPromotionNeeded(from, to);
    if (promotionNeeded) {
      this.handleAIProomotion(from, to);
      return;
    }

    const snapshot = {
      from: from,
      to: to,
      piece: this.getPieceAt(from),
      capturedPiece: this.getPieceAt(to),
      beforeState: JSON.parse(JSON.stringify(this.board))
    };

    this.board.movePiece(from, to);

    this.playMoveSound();

    this.recorder.recordMove(snapshot);

    const nextTurn = this.board.state.turn;
    const movedPlayer = nextTurn === 'W' ? 'B' : 'W';

    if (this.rules.isCheck(this.board, nextTurn)) {
      if (this.rules.isCheckmate(this.board, nextTurn)) {
        wx.showToast({
          title: `${movedPlayer === 'W' ? '白方' : '黑方'}获胜！`,
          icon: 'none'
        });

        setTimeout(() => {
          wx.redirectTo({
            url: `../endgame/endgame?result=win&winner=${movedPlayer}&reason=checkmate`
          });
        }, 1500);
      } else {
        wx.showToast({
          title: '将军！',
          icon: 'none'
        });
      }
    }

    this.refreshUI();
    
    this.makeAIMoveIfNecessary();
  },

  /* -----------------------------------------
   * AI升变处理
   * ----------------------------------------- */
  handleAIProomotion(from, to) {
    const piece = this.getPieceAt(from);
    
    const promotedType = 'Q';

    const snapshot = {
      from: from,
      to: to,
      piece: this.getPieceAt(from),
      capturedPiece: this.getPieceAt(to),
      beforeState: JSON.parse(JSON.stringify(this.board)),
      promotedType: promotedType
    };

    this.board.movePiece(from, to);

    const { r: toR, c: toC } = this.board.toRC(to);
    this.board.board[toR][toC] = { type: promotedType, color: piece.color };

    this.playMoveSound();

    this.recorder.recordMove(snapshot);

    this.refreshUI();
    
    this.makeAIMoveIfNecessary();
  },

  /* -----------------------------------------
   * 棋盘点击事件处理
   * ----------------------------------------- */
  onCellTap(e) {
    const { coord } = e.detail || {};
  },

  onMove(e) {
    const { from, to } = e.detail;

    const currentPlayer = this.board.state.turn;
    if (this.data.gameMode === 'pve' && this.data.playerTypes[currentPlayer] === 'ai') {
      wx.showToast({
        title: '请等待AI行动',
        icon: 'none'
      });
      return;
    }

    if (!this.rules.isValidMove(this.board, from, to, this.board.state.turn)) {
      wx.showToast({
        title: 'Invalid move!',
        icon: 'none'
      });
      return;
    }

    const testBoard = this.rules.cloneBoard(this.board);

    this.rules.executeMove(testBoard, from, to);

    if (this.rules.isCheck(testBoard, this.board.state.turn)) {
      wx.showToast({
        title: '不能送将',
        icon: 'none'
      });
      return;
    }

    const promotionNeeded = this.checkPromotionNeeded(from, to);
    if (promotionNeeded) {
      this.handlePromotion(from, to);
      return;
    }

    const snapshot = {
      from: from,
      to: to,
      piece: this.getPieceAt(from),
      capturedPiece: this.getPieceAt(to),
      beforeState: JSON.parse(JSON.stringify(this.board))
    };

    this.board.movePiece(from, to);

    this.playMoveSound();

    this.recorder.recordMove(snapshot);

    const nextTurn = this.board.state.turn;
    const movedPlayer = nextTurn === 'W' ? 'B' : 'W';

    if (this.rules.isCheck(this.board, nextTurn)) {
      if (this.rules.isCheckmate(this.board, nextTurn)) {
        wx.showToast({
          title: `${movedPlayer === 'W' ? '白方' : '黑方'}获胜！`,
          icon: 'none'
        });

        setTimeout(() => {
          wx.redirectTo({
            url: `../endgame/endgame?result=win&winner=${movedPlayer}&reason=checkmate`
          });
        }, 1500);
      } else {
        wx.showToast({
          title: '将军！',
          icon: 'none'
        });
      }
    }

    this.refreshUI();
    
    this.makeAIMoveIfNecessary();
  },

  checkPromotionNeeded(from, to) {
    const { r: fromR, c: fromC } = this.board.toRC(from);
    const { r: toR, c: toC } = this.board.toRC(to);
    const piece = this.board.board[fromR][fromC];

    if (!piece || !['P', 'SP', 'LG'].includes(piece.type)) {
      return false;
    }

    const isWhite = piece.color === 'W';
    return (isWhite && toR === 0) || (!isWhite && toR === 9);
  },

  handlePromotion(from, to) {
    const piece = this.getPieceAt(from);

    wx.showActionSheet({
      itemList: ['Queen(Q)', 'Marshall(M)', 'Templar(T)', 'Rook(R)', 'Bishop(B)', 'Knight(N)'],
      itemColor: "#000000",
      success: (res) => {
        const selectedIndex = res.tapIndex;
        const promotionPieces = ['Q', 'M', 'T', 'R', 'B', 'N'];
        const promotedType = promotionPieces[selectedIndex];

        const snapshot = {
          from: from,
          to: to,
          piece: this.getPieceAt(from),
          capturedPiece: this.getPieceAt(to),
          beforeState: JSON.parse(JSON.stringify(this.board)),
          promotedType: promotedType
        };

        this.board.movePiece(from, to);

        const { r: toR, c: toC } = this.board.toRC(to);
        this.board.board[toR][toC] = { type: promotedType, color: piece.color };

        this.playMoveSound();

        this.recorder.recordMove(snapshot);

        this.refreshUI();
        
        this.makeAIMoveIfNecessary();
      },
      fail: () => {}
    });
  },

  // 获取指定位置的棋子
  getPieceAt(coord) {
    const { r, c } = this.board.toRC(coord);
    return this.board.board[r][c];
  },

  /* -----------------------------------------
   * 悔棋（UNDO）
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
   * ----------------------------------------- */
  onOfferDraw() {
    wx.showToast({
      title: '和棋（0.5-0.5）',
      icon: 'none'
    });
    setTimeout(() => {
      wx.redirectTo({
        url: '../endgame/endgame?result=draw&score=0.5-0.5&reason=agreement'
      });
    }, 300);
  },

  /* -----------------------------------------
   * 额外绑定
   * ----------------------------------------- */
  onSurrender() {
    this.onResign();
  },

  backToMenu() {
    wx.navigateBack({ delta: 1 });
  },

  /* -----------------------------------------
   * 认输（RESIGN）
   * ----------------------------------------- */
  onResign() {
    const winner = this.board.state.turn === 'W' ? 'B' : 'W';
    wx.redirectTo({
      url: '../endgame/endgame?result=win&winner=' + winner + '&reason=resign'
    });
  }
});