const Rules = require('./rules.js');

class AI {
  constructor() {
    // AI 初始化
    this.rules = new Rules();
  }

  // AI 计算下一步移动
  calculateNextMove(board, level = 1) {
    // 目前只实现1级AI
    if (level === 1) {
      return this.calculateLevel1Move(board);
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