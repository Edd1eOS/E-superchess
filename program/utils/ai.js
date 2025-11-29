const Rules = require('./rules.js');

class AI {
  constructor() {
    // AI 初始化
    this.rules = new Rules();
  }

  // AI 计算下一步移动
  calculateNextMove(board, level = 1) {
    // 在这里添加AI等级，并分配到相应的计算法则
    if (level === 1) {
      return this.calculateLevel1Move(board);
    } else if (level === 2) {
      // 调用2级AI，使用minimax算法，搜索深度为2
      return this.calculateLevel2Move(board, 2);
    }
    // 其他级别待实现
    return null;
  }

  /**
   * 1级AI：简单策略
   * - 优先吃子
   * - 如果没有可吃的子，则随机走合法步
   */
  calculateLevel1Move(board) {
    const legalMoves = this.getLegalMoves(board);
    
    // 寻找能吃子的移动
    const captureMoves = legalMoves.filter(move => move.isCapture);
    
    if (captureMoves.length > 0) {
      // 如果有吃子机会，从中随机选择一个
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    
    // 没有可吃的子，随机选择一个合法移动
    if (legalMoves.length > 0) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
    
    // 没有合法移动
    return null;
  }

  /**
   * 2级AI：使用minimax算法
   * - 采用minimax算法，搜索深度为2层
   * - 能够预见对手的反应，做出更优的决策
   */
  calculateLevel2Move(board, depth = 2) {
    // 调用minimax算法，获取最佳移动
    const result = this.minimax(board, depth, -Infinity, Infinity, true);
    return result.move;
  }

  /**
   * Minimax算法实现（带Alpha-Beta剪枝优化）
   * @param {Object} board - 当前棋盘状态
   * @param {Number} depth - 搜索深度
   * @param {Number} alpha - Alpha值，用于剪枝优化
   * @param {Number} beta - Beta值，用于剪枝优化
   * @param {Boolean} maximizingPlayer - 是否为最大化玩家（当前AI是否为自己走棋）
   * @returns {Object} 包含最佳移动和评估分数的对象
   */
  minimax(board, depth, alpha, beta, maximizingPlayer) {
    // 基本情况：如果达到最大搜索深度，或者游戏结束，则返回当前局面的评估分数
    if (depth === 0) {
      return { score: this.evaluateBoard(board) };
    }

    // 获取所有合法移动
    const legalMoves = this.getLegalMoves(board);
    
    // 如果没有合法移动，说明游戏可能已经结束
    if (legalMoves.length === 0) {
      // 如果是最大化玩家（AI自己）且没有移动，说明被将杀了，返回极小值
      // 如果是最小化玩家（对手）且没有移动，说明对手被将杀了，返回极大值
      return { score: maximizingPlayer ? -10000 : 10000 };
    }

    let bestMove = null;
    
    // 如果是最大化玩家（轮到AI走棋）
    if (maximizingPlayer) {
      let maxEval = -Infinity;
      
      // 遍历所有合法移动
      for (const move of legalMoves) {
        // 在当前棋盘上模拟执行这个移动
        const newBoard = this.makeMoveOnBoard(board, move);
        
        // 递归调用minimax，深度减1，轮到对手（最小化玩家）走棋
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, false);
        
        // 如果评估分数更好，则更新最佳分数和最佳移动
        if (evaluation.score > maxEval) {
          maxEval = evaluation.score;
          bestMove = move;
        }
        
        // 更新alpha值
        alpha = Math.max(alpha, evaluation.score);
        
        // Alpha-Beta剪枝：如果alpha >= beta，说明这条分支不可能产生更好的结果，剪掉
        if (beta <= alpha) {
          break;
        }
      }
      
      // 返回最佳移动和最大评估分数
      return { move: bestMove, score: maxEval };
    } else {
      // 如果是最小化玩家（轮到对手走棋）
      let minEval = Infinity;
      
      // 遍历所有合法移动
      for (const move of legalMoves) {
        // 在当前棋盘上模拟执行这个移动
        const newBoard = this.makeMoveOnBoard(board, move);
        
        // 递归调用minimax，深度减1，轮到AI（最大化玩家）走棋
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, true);
        
        // 如果评估分数更小，则更新最小分数和最佳移动
        if (evaluation.score < minEval) {
          minEval = evaluation.score;
          bestMove = move;
        }
        
        // 更新beta值
        beta = Math.min(beta, evaluation.score);
        
        // Alpha-Beta剪枝：如果beta <= alpha，说明这条分支不可能产生更好的结果，剪掉
        if (beta <= alpha) {
          break;
        }
      }
      
      // 返回最佳移动和最小评估分数
      return { move: bestMove, score: minEval };
    }
  }

  /**
   * 评估当前棋盘局面的价值
   * @param {Object} board - 棋盘状态
   * @returns {Number} 棋盘局面的评估分数
   */
  evaluateBoard(board) {
    let score = 0;
    
    // 定义棋子价值表（可根据需要调整）
    const pieceValues = {
      'A': 100,   // Assassin 刺客
      'Q': 90,    // Queen 后
      'M': 80,    // Marshall 马歇尔
      'T': 70,    // Templar 圣殿骑士
      'R': 50,    // Rook 车
      'B': 30,    // Bishop 象
      'N': 30,    // Knight 马
      'P': 10,    // Pawn 兵
      'SP': 10,   // Spearman 长矛兵
      'LG': 10    // Lineguard 线卫
    };
    
    // 遍历整个棋盘，计算双方棋子总价值差
    for (let r = 0; r < board.board.length; r++) {
      for (let c = 0; c < board.board[r].length; c++) {
        const piece = board.board[r][c];
        if (piece) {
          // 获取棋子价值
          const value = pieceValues[piece.type] || 0;
          
          // 如果是当前AI玩家的棋子，加分；否则减分
          if (piece.color === board.state.turn) {
            score += value;
          } else {
            score -= value;
          }
        }
      }
    }
    
    return score;
  }

  /**
   * 在棋盘上模拟执行移动
   * @param {Object} board - 棋盘状态
   * @param {Object} move - 要执行的移动
   * @returns {Object} 执行移动后的新棋盘状态
   */
  makeMoveOnBoard(board, move) {
    // 克隆当前棋盘状态，避免修改原始棋盘
    const newBoard = this.rules.cloneBoard(board);
    
    // 执行移动
    this.rules.executeMove(newBoard, move.from, move.to);
    
    return newBoard;
  }

  /**
   * 获取所有合法的移动
   */
  getLegalMoves(board) {
    const moves = [];
    const turn = board.state.turn;
    
    // 遍历整个棋盘
    for (let r = 0; r < board.board.length; r++) {
      for (let c = 0; c < board.board[r].length; c++) {
        const piece = board.board[r][c];
        if (piece && piece.color === turn) {
          const fromPos = this.rules.toPos(r, c);
          
          // 检查可以移动到的所有位置
          for (let tr = 0; tr < board.board.length; tr++) {
            for (let tc = 0; tc < board.board[tr].length; tc++) {
              const toPos = this.rules.toPos(tr, tc);
              
              // 检查移动是否合法（考虑将军状态）
              if (this.rules.isValidMoveConsideringCheck(board, fromPos, toPos, turn)) {
                const targetPiece = board.board[tr][tc];
                moves.push({
                  from: fromPos,
                  to: toPos,
                  piece: piece,
                  capturedPiece: targetPiece,
                  isCapture: !!targetPiece
                });
              }
            }
          }
        }
      }
    }
    
    return moves;
  }
}

module.exports = AI;