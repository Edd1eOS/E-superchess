const Board = require('../../utils/board.js');
const Rules = require('../../utils/rules.js');
const Recorder = require('../../utils/recorder.js');
const AI = require('../../utils/ai.js');

Page({

  data: {
    boardState: [],       // 用于界面渲染，修改初始值为数组而不是null
    turn: 'W',              // 当前回合
    drawOfferedBy: null,    // null / "W" / "B"
    gameMode: 'pvp',        // 'pvp' | 'pve'
    playerTypes: {          // 玩家类型: 'human' | 'ai'
      W: 'human',
      B: 'human'
    },
    aiLevels: {             // AI等级
      W: 1,
      B: 1
    },
    boardTheme: 'wood'      // 默认棋盘主题
  },

  onLoad(options) {
    this.board = new Board();
    this.rules = new Rules();
    this.recorder = new Recorder();
    
    // 从设置中读取棋盘主题
    const settings = wx.getStorageSync('settings');
    if (settings && settings.boardStyle) {
      this.setData({
        boardTheme: settings.boardStyle
      });
    }
    
    // 从设置中读取音效设置并初始化音频上下文
    this.initAudioContext(settings);
    
    // 解析游戏模式
    const mode = options.mode || 'pvp';
    this.setData({
      gameMode: mode
    });
    
    // 如果是PvE模式，设置玩家类型和AI等级
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
      
      // 初始化AI引擎
      this.ai = new AI();

      // 尝试为 Level3 初始化 TF.js 模型（如果在 AI 内已配置 modelUrl，此处可不传参）
      if (typeof this.ai.initLevel3 === 'function') {
        // 如果你更倾向在这里显式指定 URL，可以把实际地址填到参数里
        // 例如：this.ai.initLevel3('https://your-domain.com/path/to/model.json');
        this.ai.initLevel3();
      }
    }

    this.refreshUI();
    
    // 如果第一个玩家是AI，触发AI移动
    this.makeAIMoveIfNecessary();
  },

  // 初始化音频上下文
  initAudioContext(settings) {
    // 音效类型映射
    const soundTypes = [
      { label: "原木 Wooden", value: "wooden", file: "/program/assets(sucaiku)/sounds/wooden_move.mp3" },
      { label: "玻璃 Glass", value: "glass", file: "/program/assets(sucaiku)/sounds/glass_move.mp3" },
      { label: "喵 Meow", value: "meow", file: "/program/assets(sucaiku)/sounds/cat_meow.mp3" }
    ];
    
    // 销毁旧的音频上下文（如果有）
    if (this.audioCtx) {
      this.audioCtx.destroy();
    }
    
    // 创建新的音频上下文
    this.audioCtx = wx.createInnerAudioContext();
    
    // 获取音效设置
    const soundType = (settings && settings.soundType) || "wooden";
    const volume = (settings && settings.volume) || 70;
    
    // 设置当前音效文件
    const currentSound = soundTypes.find(sound => sound.value === soundType);
    if (currentSound) {
      this.audioCtx.src = currentSound.file;
    }
    
    // 设置音量
    this.audioCtx.volume = volume / 100;
  },

  // 播放走棋音效
  playMoveSound() {
    if (this.audioCtx) {
      // 重新设置音量（以防用户在游戏过程中更改了设置）
      const settings = wx.getStorageSync('settings');
      if (settings && settings.volume !== undefined) {
        this.audioCtx.volume = settings.volume / 100;
      }
      
      this.audioCtx.play();
    }
  },

  onUnload() {
    // 页面卸载时销毁音频上下文
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
      // 延迟一点时间让AI移动，增加真实感
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
    
    // 计算AI的下一步移动（Level3 为异步）
    let move = null;
    try {
      if (typeof this.ai.calculateNextMoveAsync === 'function') {
        move = await this.ai.calculateNextMoveAsync(this.board, aiLevel);
      } else {
        // 兼容旧版本：仅支持同步接口
        move = this.ai.calculateNextMove(this.board, aiLevel);
      }
    } catch (e) {
      console.error('AI move error:', e);
      wx.showToast({
        title: 'AI计算出错，使用简化引擎',
        icon: 'none'
      });
      // 回退到 Level2 简单规则
      move = this.ai.calculateNextMove(this.board, 2);
    }
    
    if (move) {
      // 自动执行AI移动
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
    
    // 检查是否需要升变
    const promotionNeeded = this.checkPromotionNeeded(from, to);
    if (promotionNeeded) {
      // AI默认升变为皇后
      this.handleAIProomotion(from, to);
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

    // 播放走棋音效
    this.playMoveSound();

    // 记录操作快照
    this.recorder.recordMove(snapshot);

    // 检查是否将军或将杀
    const nextTurn = this.board.state.turn; // 注意：movePiece后回合已经切换
    const movedPlayer = nextTurn === 'W' ? 'B' : 'W'; // 当前操作的玩家

    // 检查对方是否被将军
    if (this.rules.isCheck(this.board, nextTurn)) {
      // 检查是否将杀
      if (this.rules.isCheckmate(this.board, nextTurn)) {
        // 将杀，当前玩家获胜
        wx.showToast({
          title: `${movedPlayer === 'W' ? '白方' : '黑方'}获胜！`,
          icon: 'none'
        });

        // 跳转到游戏结束页面（带上 winner 与 reason）
        setTimeout(() => {
          wx.redirectTo({
            url: `../endgame/endgame?result=win&winner=${movedPlayer}&reason=checkmate`
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
    
    // 检查下一个玩家是否为AI
    this.makeAIMoveIfNecessary();
  },

  /* -----------------------------------------
   * AI升变处理
   * ----------------------------------------- */
  handleAIProomotion(from, to) {
    const piece = this.getPieceAt(from);
    
    // AI默认升变为皇后（最强棋子）
    const promotedType = 'Q';

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

    // 播放走棋音效
    this.playMoveSound();

    // 记录操作快照
    this.recorder.recordMove(snapshot);

    // 刷新界面
    this.refreshUI();
    
    // 检查下一个玩家是否为AI
    this.makeAIMoveIfNecessary();
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

    // 检查是否轮到人类玩家
    const currentPlayer = this.board.state.turn;
    if (this.data.gameMode === 'pve' && this.data.playerTypes[currentPlayer] === 'ai') {
      wx.showToast({
        title: '请等待AI行动',
        icon: 'none'
      });
      return;
    }

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

    // 播放走棋音效
    this.playMoveSound();

    // 记录操作快照
    this.recorder.recordMove(snapshot);

    // 检查是否将军或将杀
    const nextTurn = this.board.state.turn; // 注意：movePiece后回合已经切换
    const movedPlayer = nextTurn === 'W' ? 'B' : 'W'; // 当前操作的玩家

    // 检查对方是否被将军
    if (this.rules.isCheck(this.board, nextTurn)) {
      // 检查是否将杀
      if (this.rules.isCheckmate(this.board, nextTurn)) {
        // 将杀，当前玩家获胜
        wx.showToast({
          title: `${movedPlayer === 'W' ? '白方' : '黑方'}获胜！`,
          icon: 'none'
        });

        // 跳转到游戏结束页面（带上 winner 与 reason）
        setTimeout(() => {
          wx.redirectTo({
            url: `../endgame/endgame?result=win&winner=${movedPlayer}&reason=checkmate`
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
    
    // 检查下一个玩家是否为AI
    this.makeAIMoveIfNecessary();
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

        // 播放走棋音效
        this.playMoveSound();

        // 记录操作快照
        this.recorder.recordMove(snapshot);

        // 刷新界面
        this.refreshUI();
        
        // 检查下一个玩家是否为AI
        this.makeAIMoveIfNecessary();
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
   * - 直接判定和棋并跳转 endgame 显示0.5-0.5（不再等待对方接受）
   * ----------------------------------------- */
  onOfferDraw() {
    // 立即和棋并跳转结束页面，带上分数信息便于 endgame 显示
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
    // 认输时明确 reason=resign
    wx.redirectTo({
      url: '../endgame/endgame?result=win&winner=' + winner + '&reason=resign'
    });
  }
});