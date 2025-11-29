const fs = require('fs');
const path = require('path');

/**
 * 轻量级AI实现，用于机器学习训练
 * 该版本是AI.js的简化版本，专为高效自我对弈和数据收集而设计
 */
class LightweightAI {
  constructor() {
    // 统一的棋子价值表
    this.pieceValues = {
      'A': 1000,   // Assassin
      'Q': 900,    // Queen 
      'M': 800,    // Marshall 
      'T': 700,    // Templar 
      'R': 500,    // Rook 
      'B': 300,    // Bishop 
      'N': 300,    // Knight 
      'P': 100,    // Pawn 
      'SP': 100,   // Spearman 
      'LG': 100    // Lineguard
    };
    
    // 训练数据存储
    this.trainingData = [];
    
    // Minimax 剪枝中使用的极大极小值
    this.MATE_SCORE = 1000000;
  }

  /**
   * AI 计算下一步移动 (level 2 轣量级版本)
   * @param {Object} board - 当前棋盘状态
   * @param {Number} depth - 搜索深度
   * @returns {Object} 最佳移动
   */
  calculateNextMove(board, depth = 2) {
    this.aiColor = board.state.turn;
    
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
   * @param {Boolean} maximizingPlayer - 是否为最大化玩家
   * @returns {Object} 包含最佳移动和评估分数的对象
   */
  minimax(board, depth, alpha, beta, maximizingPlayer) {
    // 基本情况：如果达到最大搜索深度，则返回当前局面的评估分数
    if (depth === 0) {
      const evaluation = this.evaluateBoard(board);
      // 记录评估数据用于训练
      this.recordEvaluationData(board, evaluation);
      return { score: evaluation };
    }

    // 获取所有合法移动
    const legalMoves = this.getLegalMoves(board);
    
    // 如果没有合法移动，说明游戏可能已经结束
    if (legalMoves.length === 0) {
      // 检查当前玩家是否处于将军状态，以区分将死和僵局
      const isKingInCheck = this.isCheck(board, board.state.turn);
      
      if (isKingInCheck) {
        // 将死：返回极大或极小值，深度越浅惩罚/奖励越大
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
        const newBoard = this.makeMove(board, move);
        
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
      
      // 记录最佳移动数据用于训练
      if (depth === 2) { // 只记录根节点的移动
        this.recordMoveData(board, bestMove, maxEval);
      }
      
      return { move: bestMove, score: maxEval };
    } else {
      let minEval = Infinity;
      
      for (const move of legalMoves) {
        const newBoard = this.makeMove(board, move);
        
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
      
      // 记录最佳移动数据用于训练
      if (depth === 2) { // 只记录根节点的移动
        this.recordMoveData(board, bestMove, minEval);
      }
      
      return { move: bestMove, score: minEval };
    }
  }

  /**
   * 记录局面评估数据
   * @param {Object} board - 棋盘状态
   * @param {Number} evaluation - 评估分数
   */
  recordEvaluationData(board, evaluation) {
    const materialValue = this.evaluateMaterial(board);
    this.trainingData.push({
      type: 'evaluation',
      board: this.serializeBoard(board),
      materialValue: materialValue,
      evaluation: evaluation
    });
  }

  /**
   * 记录移动选择数据
   * @param {Object} board - 棋盘状态
   * @param {Object} move - 选择的移动
   * @param {Number} score - 移动得分
   */
  recordMoveData(board, move, score) {
    this.trainingData.push({
      type: 'move',
      board: this.serializeBoard(board),
      move: move,
      score: score
    });
  }

  /**
   * 序列化棋盘状态用于存储
   * @param {Object} board - 棋盘状态
   * @returns {String} 序列化的棋盘状态
   */
  serializeBoard(board) {
    // 简化序列化，只保存关键信息
    return JSON.stringify({
      board: board.board,
      turn: board.state.turn,
      kingPos: board.state.kingPos
    });
  }

  /**
   * 获取所有合法的移动
   * @param {Object} board - 棋盘状态
   * @returns {Array} 合法移动列表
   */
  getLegalMoves(board) {
    // 这里应该导入并使用Rules模块来获取合法移动
    // 为了简化，我们暂时返回一个空数组
    // 实际实现中需要连接Rules模块
    return [];
  }

  /**
   * 在棋盘上模拟执行移动
   * @param {Object} board - 棋盘状态
   * @param {Object} move - 要执行的移动
   * @returns {Object} 执行移动后的新棋盘状态
   */
  makeMove(board, move) {
    // 这里应该实现移动执行逻辑
    // 为了简化，我们暂时返回原始棋盘的克隆
    return this.cloneBoard(board);
  }

  /**
   * 克隆棋盘状态
   * @param {Object} board - 棋盘状态
   * @returns {Object} 克隆的棋盘状态
   */
  cloneBoard(board) {
    return {
      board: JSON.parse(JSON.stringify(board.board)),
      state: JSON.parse(JSON.stringify(board.state))
    };
  }

  /**
   * 检查是否处于将军状态
   * @param {Object} board - 棋盘对象
   * @param {String} kingColor - 被将军的王的颜色
   * @returns {Boolean} 是否被将军
   */
  isCheck(board, kingColor) {
    // 这里应该是对Rules.isCheck方法的调用
    // 为了简化，暂时返回false
    return false;
  }

  /**
   * 评估当前棋盘局面的价值
   * @param {Object} board - 棋盘状态
   * @returns {Number} 棋盘局面的评估分数
   */
  evaluateBoard(board) {
    let score = 0;
    
    // 1. 基础子力价值评估
    score += this.evaluateMaterial(board);
    
    // 2. 国王安全性评估
    const opponentColor = this.aiColor === 'W' ? 'B' : 'W';
    if (this.isCheck(board, opponentColor)) {
         score += 500; // 被将军是一个巨大的优势
    }
    
    return score;
  }

  /**
   * 评估子力价值
   * @param {Object} board - 棋盘状态
   * @returns {Number} 子力价值评分
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
   * 保存训练数据到文件
   * @param {String} filename - 文件名
   */
  saveTrainingData(filename) {
    const filePath = path.join(__dirname, '..', 'data', filename);
    fs.writeFileSync(filePath, JSON.stringify(this.trainingData, null, 2));
    console.log(`训练数据已保存到: ${filePath}`);
  }

  /**
   * 清空训练数据
   */
  clearTrainingData() {
    this.trainingData = [];
  }
}

module.exports = LightweightAI;