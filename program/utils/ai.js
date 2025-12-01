/**
 * AI_Fixed_Level2.js - Level 2 简化为 "随机合法 + 不送子" 规则
 */
const Rules = require('./rules.js'); 

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
  }

  // --- 公共接口方法 ---

  calculateNextMove(board, level = 2) {
    this.aiColor = board.state.turn; // 确定 AI 当前的回合颜色
    
    if (level === 1) {
      // 1级AI：随机合法移动
      return this.calculateLevel1Move(board);
    } else if (level >= 2) {
      // 2级AI：随机合法 + 不送子 (固定规则)
      return this.calculateLevel2Move_Fixed(board); 
    }
      else if (level === 3) {
        //3级ai：调用ml_pytorch训练结果模型
        return this.calculateLevel3Move_Fixed(board);
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

  calculateLevel3Move_Fixed(board){
    //分三步：1.用api调用pth文件；2.用模型进行演算，并最终只传出被选择的move ；3.返回move执行移动操作，渲染
    //将在ml_pytorch/中添加添加API服务（如api_server.py）（完成后删除此注释）
    

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
