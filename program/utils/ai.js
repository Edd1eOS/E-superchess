/**
 * AI 引擎管理：
 * - Level 1：随机合法走子
 * - Level 2：随机合法 + 不送子
 * - Level 3：MCTS + DNN (TF.js)
 */
const Rules = require('./rules.js');
const MCTS = require('./mcts.js');

class AI {
  constructor() {
    this.rules = new Rules();
    this.aiColor = null; 
    
    // 统一的棋子价值表 (用于判断送子风险)
    this.pieceValues = {
      'A': 1000, 'Q': 900, 'M': 800, 'T': 700, 
      'R': 500, 'B': 300, 'N': 300, 'P': 100, 
      'SP': 100, 'LG': 100
    };

    // Level3 相关资源（模型 + MCTS），按需懒加载
    // TODO: 将下面的 modelUrl 替换为你自己部署的 TF.js model.json 实际地址
    this.level3 = {
      initialized: false,
      model: null,
      mcts: null,
      modelUrl: 'http://192.168.1.23:8000/model.json'
    };
  }

  // --- 公共接口方法 ---

  /**
   * 同步接口：仅支持 Level1 / Level2（兼容旧逻辑）
   */
  calculateNextMove(board, level = 2) {
    this.aiColor = board.state.turn; // 确定 AI 当前的回合颜色
    
    if (level === 1) {
      // 1级AI：随机合法移动
      return this.calculateLevel1Move(board);
    } else if (level >= 2) {
      // 2级AI：随机合法 + 不送子 (固定规则)
      return this.calculateLevel2Move_Fixed(board); 
    }
    return null;
  }

  /**
   * 异步接口：支持 Level1 / Level2 / Level3
   * - Level1 / Level2 直接复用同步逻辑
   * - Level3 使用 TF.js + MCTS（异步）
   */
  async calculateNextMoveAsync(board, level = 2) {
    this.aiColor = board.state.turn;

    if (level === 1) {
      return this.calculateLevel1Move(board);
    }
    if (level === 2) {
      return this.calculateLevel2Move_Fixed(board);
    }
    if (level === 3) {
      return await this.calculateLevel3Move_Fixed(board);
    }
    return null;
  }

  // 1级AI：随机合法移动
  calculateLevel1Move(board) {
    const legalMoves = this.getLegalMovesOptimized(board);
    if (legalMoves.length === 0) return null;
    
    const captureMoves = legalMoves.filter(move => move.capturedPiece);
    
    if (captureMoves.length > 0) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  // --- 2级AI核心算法：不送子规则 ---

  calculateLevel2Move_Fixed(board) {
    const allMoves = this.getLegalMovesOptimized(board);
    if (allMoves.length === 0) return null;

    // 筛选出安全的移动
    const safeMoves = allMoves.filter(move => this.isMoveSafe(board, move));

    // 如果找到安全移动，则使用安全移动集，否则使用所有移动集 (防止卡死)
    const movesToUse = safeMoves.length > 0 ? safeMoves : allMoves;
    
    // 1. 优先在 movesToUse 中寻找能吃子的移动
    const captures = movesToUse.filter(m => m.capturedPiece);

    if (captures.length > 0) {
        // 优先返回一个随机的安全吃子移动
        return captures[Math.floor(Math.random() * captures.length)];
    }
    
    // 2. 否则，返回一个随机的安全移动
    return movesToUse[Math.floor(Math.random() * movesToUse.length)];
  }

  /**
   * 判断一个移动是否安全 (是否会导致己方高价值棋子立即被吃)
   * 逻辑：模拟移动 -> 切换到对手回合 -> 检查对手是否有大于等于 300 分的捕获机会
   * @param {Object} board - 当前棋盘
   * @param {Object} move - 待检查的移动
   * @returns {boolean} - true 如果安全，false 如果不安全
   */
  isMoveSafe(board, move) {
    // 1. 模拟移动并切换回合到对手
    const tempBoard = this.makeMoveAndSwitchTurn(board, move);
    
    // 2. 获取对手的所有合法移动
    // 注意：这里调用 getLegalMovesOptimized 已经是在对手的回合了
    const opponentMoves = this.getLegalMovesOptimized(tempBoard);

    for (const oppMove of opponentMoves) {
        if (oppMove.capturedPiece) {
            const capturedValue = this.pieceValues[oppMove.capturedPiece.type] || 0;
            // 检查对手是否能立即捕获价值 300 分或更高的棋子 (B, N, R, Q, A...)
            if (capturedValue >= 300) { 
                return false; // 危险！对手可以立即吃掉高价值子
            }
        }
    }
    return true; // 安全

  }

  // --- 3级ai（从ml_pytorch/checkpoint中调用pth训练结果模型）

  /**
   * Level3 初始化：加载 TF.js 模型并构建 MCTS
   * - modelUrl: TF.js GraphModel 的 model.json 访问地址
   *   （建议你把由 .pth 转换后的 TF.js 模型部署到静态服务器或云存储，再把访问 URL 填写到这里）
   */
  async initLevel3(modelUrl) {
    if (this.level3.initialized) return;

    // 如果没有显式传入 modelUrl，可以在这里设置一个默认值
    this.level3.modelUrl = modelUrl || this.level3.modelUrl;
    if (!this.level3.modelUrl) {
      console.warn('Level3: 未配置 modelUrl，请在 initLevel3(modelUrl) 中传入 TF.js 模型地址');
      return;
    }

    // 注意：在微信小程序中通常通过插件提供 tf 对象
    // 1）推荐方式：const tf = requirePlugin('tfjsPlugin');
    // 2）也可以在 app.js 中手动挂到 wx.tf / globalThis.tf 供全局使用
    // 这里优先尝试插件，然后再通过全局 / wx.tf 获取 TF.js，避免与本地变量同名导致 typeof 抛错
    let tfjs = null;
    // 优先从小程序插件获取
    if (typeof requirePlugin === 'function') {
      try {
        const pluginTf = requirePlugin('tfjsPlugin');
        if (pluginTf) {
          tfjs = pluginTf;
        }
      } catch (e) {
        console.warn('Level3: requirePlugin("tfjsPlugin") 失败，请确认已在 app.json 中正确配置 tfjs 插件：', e);
      }
    }

    // 其次尝试从 wx.tf / 全局对象获取
    if (!tfjs && typeof wx !== 'undefined' && wx.tf) {
      tfjs = wx.tf;
    } else if (!tfjs && typeof globalThis !== 'undefined' && globalThis.tf) {
      tfjs = globalThis.tf;
    } else if (!tfjs && typeof window !== 'undefined' && window.tf) {
      tfjs = window.tf;
    } else if (!tfjs && typeof global !== 'undefined' && global.tf) {
      tfjs = global.tf;
    }

    if (!tfjs) {
      console.warn('Level3: 未找到 TF.js 对象，请确认已正确引入 @tensorflow/tfjs / tfjs-wechat 插件，并暴露为全局 tf 或 wx.tf');
      return;
    }

    // 1. 异步加载 GraphModel
    this.level3.model = await tfjs.loadGraphModel(this.level3.modelUrl);

    // 2. 使用 MCTS 包裹策略-价值函数
    this.level3.mcts = new MCTS({
      numSimulations: 1500, // Level3 搜索次数
      getLegalMoves: (b) => this.getLegalMovesOptimized(b),
      applyMove: (b, move) => this.makeMoveAndSwitchTurn(b, move),
      policyValueFn: async (b, legalMoves) => {
        return await this._level3PolicyValue(tfjs, b, legalMoves);
      },
      cPuct: 1.5
    });

    this.level3.initialized = true;
  }

  /**
   * Level3 主流程：TF.js + MCTS 选择一步走子
   */
  async calculateLevel3Move_Fixed(board){
    // 懒加载初始化：第一次调用时再去加载模型
    if (!this.level3.initialized) {
      // 你可以在这里设置默认模型地址，也可以在外部先调用 initLevel3(modelUrl)
      // 例如：this.level3.modelUrl = 'https://your-host/path/to/model.json';
      await this.initLevel3();
    }

    if (!this.level3.initialized || !this.level3.mcts) {
      console.warn('Level3: 初始化失败，退回到 Level2 逻辑');
      return this.calculateLevel2Move_Fixed(board);
    }

    // 使用 MCTS 搜索得到最佳走子
    const move = await this.level3.mcts.getBestMove(board);
    return move || this.calculateLevel2Move_Fixed(board);
  }

  /**
   * 策略-价值网络封装：
   * - 输入：棋盘状态 + 当前所有合法走子
   * - 输出：与 legalMoves 对齐的策略概率数组 policy[]，以及标量价值 value
   *
   * 注意：这里的编码方式、模型输出格式需要与你在 Python 中训练 / 转换时保持一致。
   */
  async _level3PolicyValue(tf, board, legalMoves) {
    // 1. 将棋盘状态编码为张量（注意：模型期望 NCHW 格式 [N, C, H, W]）
    const inputTensor = this._encodeBoardToTensor(tf, board);

    // 2. 调用模型进行前向推理
    // 这里假设模型输出为 [policyTensor, valueTensor]
    const outputs = this.level3.model.predict(inputTensor);
    const policyTensor = Array.isArray(outputs) ? outputs[0] : outputs;
    const valueTensor = Array.isArray(outputs) ? outputs[1] : null;

    const policyFlat = await policyTensor.data();
    let value = 0;
    if (valueTensor) {
      const valueData = await valueTensor.data();
      value = valueData[0];
    }

    // 3. 将全局动作空间的策略向量映射到当前合法走子集合
    const boardSize = board.board.length; // 例如 10x10
    const actionSize = boardSize * boardSize * boardSize * boardSize; // from(ij) -> to(kl)

    const policy = new Array(legalMoves.length).fill(1 / legalMoves.length);

    if (policyFlat.length === actionSize) {
      for (let i = 0; i < legalMoves.length; i++) {
        const mv = legalMoves[i];
        const fromRC = this.rules.toRC(mv.from);
        const toRC = this.rules.toRC(mv.to);
        const fromIndex = fromRC.r * boardSize + fromRC.c;
        const toIndex = toRC.r * boardSize + toRC.c;
        const actionIndex = fromIndex * boardSize * boardSize + toIndex;
        policy[i] = policyFlat[actionIndex] || 0;
      }
    } else {
      // 这里做一次提示，方便你排查模型输出维度与动作编码是否一致
      console.warn(
        `Level3: 模型策略向量长度 (${policyFlat.length}) 与预期动作空间 (${actionSize}) 不一致，将退回到均匀分布。` +
        ' 请检查训练端的动作编码规则与当前 JS 实现是否一致（棋盘大小 / from-to 编码）。'
      );
    }

    // 4. 归一化策略
    let sumP = policy.reduce((a, b) => a + b, 0);
    if (sumP <= 0) {
      // 若网络输出全 0，则使用均匀分布
      const uniform = 1 / legalMoves.length;
      for (let i = 0; i < policy.length; i++) policy[i] = uniform;
    } else {
      for (let i = 0; i < policy.length; i++) policy[i] /= sumP;
    }

    // 5. 释放张量
    tf.dispose([inputTensor, policyTensor, valueTensor].filter(Boolean));

    return { policy, value };
  }

  /**
   * 将 JS 棋盘状态编码为网络输入张量（与 Python 端 DataPipeline.board2tensor 对齐）
   * - 通道数：CONFIG.num_channels（当前为 3）
   * - 使用与 ml_pytorch/4_pipeline.py 中 _get_channel_for_piece 相同的映射规则：
   *   piece_types = ['P','N','B','R','Q','K','SP','T','M','A','LG']
   *   白子通道：type_index % num_channels
   *   黑子通道：(type_index + len(piece_types)) % num_channels
   */
  _encodeBoardToTensor(tf, board) {
    const boardSize = board.board.length; // 例如 10
    const H = boardSize;
    const W = boardSize;
    const C = 3; // 与 CONFIG.num_channels / DataPipeline 保持一致（model.json 里是 [N, 3, 10, 10]）

    // 使用 NCHW: [1, C, H, W] 作为 TF.js 输入，以与转换后的 GraphModel 完全对齐
    const data = new Float32Array(C * H * W);

    // 与 Python DataPipeline 中的 piece_types 保持一致
    const pieceTypes = ['P', 'N', 'B', 'R', 'Q', 'K', 'SP', 'T', 'M', 'A', 'LG'];
    const numChannels = C;

    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const piece = board.board[r][c];
        if (!piece) {
          continue;
        }

        const pieceType = piece.type || '';
        const pieceColor = piece.color || '';

        const typeIndex = pieceTypes.indexOf(pieceType);
        if (typeIndex === -1) {
          continue;
        }

        let channel;
        if (pieceColor === 'W') {
          channel = typeIndex % numChannels;
        } else {
          channel = (typeIndex + pieceTypes.length) % numChannels;
        }

        if (channel >= 0 && channel < C) {
          // NCHW 下索引：[channel, r, c]
          const idx = channel * (H * W) + r * W + c;
          data[idx] = 1.0;
        }
      }
    }

    const inputTensor = tf.tensor4d(data, [1, C, H, W]);
    return inputTensor;
  }

  // --- 辅助方法 (从 MCTS 版本保留) ---
  
  /**
   * 优化后的合法移动生成 (依赖 Rules.js)
   */
  getLegalMovesOptimized(board) {
    const moves = [];
    const turn = board.state.turn;
    const size = board.board.length;
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const piece = board.board[r][c];
        if (piece && piece.color === turn) {
          const fromPos = this.rules.toPos(r, c);
          
          for (let tr = 0; tr < size; tr++) {
            for (let tc = 0; tc < size; tc++) {
              const toPos = this.rules.toPos(tr, tc);
              
              if (this.rules.isValidMoveConsideringCheck(board, fromPos, toPos, turn)) {
                moves.push({
                  from: fromPos,
                  to: toPos,
                  piece: piece,
                  capturedPiece: board.board[tr][tc],
                  isCapture: !!board.board[tr][tc]
                });
              }
            }
          }
        }
      }
    }
    return moves;
  }
  
  /**
   * 在棋盘上模拟执行移动并切换回合 (依赖 Rules.js)
   */
  makeMoveAndSwitchTurn(board, move) {
    // 1. 克隆当前棋盘状态
    const newBoard = this.rules.cloneBoard(board);
    
    // 2. 执行移动
    this.rules.executeMove(newBoard, move.from, move.to);
    
    // 3. 切换回合
    newBoard.state.turn = board.state.turn === 'W' ? 'B' : 'W';
    
    return newBoard;
  }
}

module.exports = AI;
