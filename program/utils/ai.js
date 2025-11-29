const Rules = require('./rules.js'); // 假设 Rules.js 已有高效的移动计算方法

class AI {
  constructor() {
    // AI 初始化
    this.rules = new Rules();
    // 假设 AI 始终是最大化玩家，颜色将在 calculateNextMove 中确定
    this.aiColor = null; 
    
    // 统一的棋子价值表
    this.pieceValues = {
      'A': 1000,  // Assassin (提高价值，鼓励保留)
      'Q': 900,   // Queen 
      'M': 800,   // Marshall 
      'T': 700,   // Templar 
      'R': 500,   // Rook 
      'B': 300,   // Bishop 
      'N': 300,   // Knight 
      'P': 100,   // Pawn 
      'SP': 100,  // Spearman 
      'LG': 100   // Lineguard
    };
    
    // Minimax 剪枝中使用的极大极小值
    this.MATE_SCORE = 1000000;
  }

  // --- 公共接口方法 ---

  // AI 计算下一步移动
  calculateNextMove(board, level = 1) {
    this.aiColor = board.state.turn; // 确定 AI 当前的回合颜色
    
    if (level === 1) {
      return this.calculateLevel1Move(board);
    } else if (level === 2) {
      // 深度可以根据性能调整，2是基础
      return this.calculateLevel2Move(board, 2); 
    }
    return null;
  }

  // 1级AI：简单策略 (逻辑不变，保持高效)
  calculateLevel1Move(board) {
    const legalMoves = this.getLegalMovesOptimized(board);
    
    // 寻找能吃子的移动
    const captureMoves = legalMoves.filter(move => move.capturedPiece);
    
    if (captureMoves.length > 0) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    
    if (legalMoves.length > 0) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
    
    return null;
  }

  // 2级AI：使用minimax算法
  calculateLevel2Move(board, depth = 2) {
    // 调用 minimax 算法，获取最佳移动
    const result = this.minimax(board, depth, -Infinity, Infinity, true);
    return result.move;
  }

  // --- Minimax 核心算法 ---

  /**
   * Minimax算法实现（带Alpha-Beta剪枝优化）
   */
  minimax(board, depth, alpha, beta, maximizingPlayer) {
    // 1. 基本情况：深度为 0 或游戏结束
    if (depth === 0) {
      // 叶子节点评估：确保返回的是相对于初始调用者 (AI) 的分数
      const evaluation = this.evaluateBoard(board);
      return { score: evaluation };
    }

    // 2. 获取所有合法移动 (使用优化版)
    const legalMoves = this.getLegalMovesOptimized(board);
    
    // 3. 游戏结束判断（没有合法移动）
    if (legalMoves.length === 0) {
      // 检查当前玩家是否处于将军状态，以区分将死和僵局
      const isKingInCheck = this.rules.isCheck(board, board.state.turn);
      
      if (isKingInCheck) {
        // 将死：返回极大或极小值，深度越浅惩罚/奖励越大
        // 最大化玩家被将死 (返回极小值)
        return { score: maximizingPlayer ? -(this.MATE_SCORE - depth) : (this.MATE_SCORE - depth) };
      } else {
        // 僵局：返回 0 (平局)
        return { score: 0 };
      }
    }

    let bestMove = null;
    
    if (maximizingPlayer) {
      let maxEval = -Infinity;
      
      for (const move of legalMoves) {
        const newBoard = this.makeMoveAndSwitchTurn(board, move);
        
        // 递归调用
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, false);
        
        // 更新最佳分数和最佳移动
        if (evaluation.score > maxEval) {
          maxEval = evaluation.score;
          bestMove = move;
        }
        
        // Alpha-Beta 剪枝
        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) {
          break;
        }
      }
      
      return { move: bestMove, score: maxEval };
    } else { // 最小化玩家
      let minEval = Infinity;
      
      for (const move of legalMoves) {
        const newBoard = this.makeMoveAndSwitchTurn(board, move);
        
        // 递归调用
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, true);
        
        // 更新最小分数和最佳移动
        if (evaluation.score < minEval) {
          minEval = evaluation.score;
          bestMove = move;
        }
        
        // Alpha-Beta 剪枝
        beta = Math.min(beta, minEval);
        if (beta <= alpha) {
          break;
        }
      }
      
      return { move: bestMove, score: minEval };
    }
  }
  
  // --- 评估函数和工具方法 (重构) ---

  /**
   * 优化后的合法移动生成
   * 假设 Rules.js 提供了高效的 getPossibleMoves(board, r, c) 方法，
   * 能够获取 r,c 处棋子所有可能的非将军移动目标。
   */
  getLegalMovesOptimized(board) {
    const moves = [];
    const turn = board.state.turn;
    
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
  
  /**
   * 在棋盘上模拟执行移动并切换回合
   */
  makeMoveAndSwitchTurn(board, move) {
    // 1. 克隆当前棋盘状态
    const newBoard = this.rules.cloneBoard(board);
    
    // 2. 执行移动 (假设 executeMove 内部会处理棋子移动、吃子、王位更新等)
    this.rules.executeMove(newBoard, move.from, move.to);
    
    // 3. 切换回合
    newBoard.state.turn = board.state.turn === 'W' ? 'B' : 'W';
    
    return newBoard;
  }
  
  /**
   * 评估当前棋盘局面的价值
   * 返回的分数始终是：AI 的优势分 - 对手的优势分
   */
  evaluateBoard(board) {
    let score = 0;
    
    // 1. 基础子力价值评估 (最重要的部分)
    score += this.evaluateMaterial(board);
    
    // 2. 国王安全性评估 (降低搜索深度中的昂贵操作)
    // 检查将军状态，给对手国王被将军状态加分
    const opponentColor = this.aiColor === 'W' ? 'B' : 'W';
    if (this.rules.isCheck(board, opponentColor)) {
         score += 500; // 被将军是一个巨大的优势
    }
    
    // 3. 子力机动性评估 (适度保留，降低系数)
    score += this.evaluateMobility(board);
    
    return score;
  }

  /**
   * 评估子力价值（相对于 AI 玩家）
   */
  evaluateMaterial(board) {
    let materialScore = 0;
    
    for (let r = 0; r < board.board.length; r++) {
      for (let c = 0; c < board.board[r].length; c++) {
        const piece = board.board[r][c];
        if (piece) {
          const value = this.pieceValues[piece.type] || 0;
          
          // 如果是 AI 玩家的棋子，加分；否则减分
          if (piece.color === this.aiColor) {
            materialScore += value;
          } else {
            materialScore -= value;
          }
        }
      }
    }
    
    return materialScore;
  }

  /**
   * 评估子力机动性 (降低系数，减少影响)
   */
  evaluateMobility(board) {
    // Note: 这里的 getLegalMovesOptimized 会生成当前 board.state.turn 玩家的移动
    const myLegalMoves = this.getLegalMovesOptimized(board);
    
    // 模拟对手回合
    const tempBoard = this.rules.cloneBoard(board);
    tempBoard.state.turn = board.state.turn === 'W' ? 'B' : 'W';
    
    // 获取对手的移动
    const opponentLegalMoves = this.getLegalMovesOptimized(tempBoard);
    
    // 机动性优势评分（我方机动性越高，对方机动性越低，评分越高）
    // 系数从 0.1 提高到 1，以减少浮点运算的影响，但保持其较低的重要性
    return (myLegalMoves.length - opponentLegalMoves.length) * 1; 
  }

  /**
   * 获取棋子价值 (供外部使用)
   */
  getPieceValue(piece) {
    return this.pieceValues[piece.type] || 0;
  }
}

module.exports = AI;
