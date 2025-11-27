class Rules {
  constructor() {
    // 初始化规则类
  }

  /**
   * 检查移动是否合法
   * @param {Object} board - 棋盘对象
   * @param {String} from - 起始位置 (如 "a1")
   * @param {String} to - 目标位置 (如 "b2")
   * @param {String} turn - 当前行棋方 ("W" 或 "B")
   * @returns {Boolean} 是否合法
   */
  isValidMove(board, from, to, turn) {
    // 如果起点或终点无效
    if (!from || !to) return false;

    const fromRC = board.toRC(from);
    const toRC = board.toRC(to);

    // 获取起点棋子
    const piece = board.board[fromRC.r][fromRC.c];
    
    // 如果没有棋子或者不是当前行棋方的棋子
    if (!piece || piece.color !== turn) return false;

    // 如果终点有己方棋子
    const targetPiece = board.board[toRC.r][toRC.c];
    if (targetPiece && targetPiece.color === piece.color) return false;

    // 根据棋子类型判断移动是否合法
    switch (piece.type) {
      case 'P':  // 兵 (Pawn)
        return this.isValidPawnMove(board, from, to, piece);
      
      case 'SP': // 长矛兵 (Spearman)
        return this.isValidSpearmanMove(board, from, to, piece);
        
      case 'N':  // 马 (Knight)
        return this.isValidKnightMove(from, to);
        
      case 'B':  // 象 (Bishop)
        return this.isValidBishopMove(board, from, to);
        
      case 'R':  // 车 (Rook)
        return this.isValidRookMove(board, from, to);
        
      case 'Q':  // 后 (Queen)
        return this.isValidQueenMove(board, from, to);
        
      case 'K':  // 王 (King)
        return this.isValidKingMove(from, to);
        
      case 'T':  // 圣殿骑士 (Templar)
        return this.isValidTemplarMove(board, from, to, piece);
        
      case 'M':  // 元帅 (Marshall)
        return this.isValidMarshallMove(board, from, to, piece);
        
      case 'A':  // 刺客 (Assassin)
        return this.isValidAssassinMove(from, to);
        
      case 'LG': // 弩兵 (Lineguard)
        return this.isValidLineguardMove(from, to);
        
      default:
        return false;
    }
  }

  /**
   * 检查兵(Pawn)的移动是否合法
   */
  isValidPawnMove(board, from, to, piece) {
    const fromRC = board.toRC(from);
    const toRC = board.toRC(to);
    const dr = toRC.r - fromRC.r;
    const dc = toRC.c - fromRC.c;
    
    // 白方往上走，黑方往下走
    const direction = piece.color === 'W' ? -1 : 1;
    
    // 直走
    if (dc === 0) {
      // 向前一格
      if (dr === direction) {
        return !board.board[toRC.r][toRC.c]; // 目标位置必须为空
      }
      
      // 起始位置可以向前两格
      if ((piece.color === 'W' && fromRC.r === 6) || 
          (piece.color === 'B' && fromRC.r === 3)) {
        if (dr === 2 * direction) {
          // 检查路径上是否有阻挡
          const midR = fromRC.r + direction;
          return !board.board[midR][fromRC.c] && !board.board[toRC.r][toRC.c];
        }
      }
      
      return false;
    }
    
    // 斜吃子
    if (Math.abs(dc) === 1 && dr === direction) {
      const targetPiece = board.board[toRC.r][toRC.c];
      return targetPiece && targetPiece.color !== piece.color; // 必须有敌方棋子
    }
    
    return false;
  }

  /**
   * 检查长矛兵(Spearman)的移动是否合法
   */
  isValidSpearmanMove(board, from, to, piece) {
    const fromRC = board.toRC(from);
    const toRC = board.toRC(to);
    const dr = toRC.r - fromRC.r;
    const dc = toRC.c - fromRC.c;
    
    // 只能直走
    if (dc !== 0 && dr !== 0) return false;
    
    // 检查路径是否有阻挡
    if (!this.isPathClear(board, from, to)) return false;
    
    // 白方只能向上，黑方只能向下
    const direction = piece.color === 'W' ? -1 : 1;
    
    if (dc === 0) {
      // 垂直移动
      return (dr * direction) > 0; // 方向正确且至少移动一格
    } else {
      // 水平移动
      return dr === 0;
    }
  }

  /**
   * 检查马(Knight)的移动是否合法
   */
  isValidKnightMove(from, to) {
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
    const dr = Math.abs(toRC.r - fromRC.r);
    const dc = Math.abs(toRC.c - fromRC.c);
    
    // 日字形移动
    return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
  }

  /**
   * 检查象(Bishop)的移动是否合法
   */
  isValidBishopMove(board, from, to) {
    const fromRC = board.toRC(from);
    const toRC = board.toRC(to);
    const dr = toRC.r - fromRC.r;
    const dc = toRC.c - fromRC.c;
    
    // 斜线移动
    if (Math.abs(dr) !== Math.abs(dc) || (dr === 0 && dc === 0)) {
      return false;
    }
    
    // 检查路径是否有阻挡
    return this.isPathClear(board, from, to);
  }

  /**
   * 检查车(Rook)的移动是否合法
   */
  isValidRookMove(board, from, to) {
    const fromRC = board.toRC(from);
    const toRC = board.toRC(to);
    const dr = toRC.r - fromRC.r;
    const dc = toRC.c - fromRC.c;
    
    // 直线移动
    if ((dr !== 0 && dc !== 0) || (dr === 0 && dc === 0)) {
      return false;
    }
    
    // 检查路径是否有阻挡
    return this.isPathClear(board, from, to);
  }

  /**
   * 检查后(Queen)的移动是否合法
   */
  isValidQueenMove(board, from, to) {
    // 后 = 车 + 象
    return this.isValidRookMove(board, from, to) || this.isValidBishopMove(board, from, to);
  }

  /**
   * 检查王(King)的移动是否合法
   */
  isValidKingMove(from, to) {
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
    const dr = Math.abs(toRC.r - fromRC.r);
    const dc = Math.abs(toRC.c - fromRC.c);
    
    // 只能移动一格
    return (dr <= 1 && dc <= 1) && (dr + dc > 0);
  }

  /**
   * 检查圣殿骑士(Templar)的移动是否合法
   */
  isValidTemplarMove(board, from, to, piece) {
    // Templar = Bishop + Knight
    return this.isValidBishopMove(board, from, to) || this.isValidKnightMove(from, to);
  }

  /**
   * 检查元帅(Marshall)的移动是否合法
   */
  isValidMarshallMove(board, from, to, piece) {
    // Marshall = Rook + Knight
    return this.isValidRookMove(board, from, to) || this.isValidKnightMove(from, to);
  }

  /**
   * 检查刺客(Assassin)的移动是否合法
   */
  isValidAssassinMove(from, to) {
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
    const dr = Math.abs(toRC.r - fromRC.r);
    const dc = Math.abs(toRC.c - fromRC.c);
    
    // 2格内的任意方向移动
    return (dr <= 2 && dc <= 2) && (dr + dc > 0);
  }

  /**
   * 检查弩兵(Lineguard)的移动是否合法
   */
  isValidLineguardMove(from, to) {
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
    const dr = Math.abs(toRC.r - fromRC.r);
    const dc = Math.abs(toRC.c - fromRC.c);
    
    // 四个方向移动一格
    return (dr <= 1 && dc <= 1) && (dr + dc === 1);
  }

  /**
   * 检查路径是否畅通（用于象、车、后）
   */
  isPathClear(board, from, to) {
    const fromRC = board.toRC(from);
    const toRC = board.toRC(to);
    const dr = toRC.r - fromRC.r;
    const dc = toRC.c - fromRC.c;
    
    // 计算步长
    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
    
    // 检查路径上的每一个格子（除了起点和终点）
    let r = fromRC.r + stepR;
    let c = fromRC.c + stepC;
    
    while (r !== toRC.r || c !== toRC.c) {
      if (board.board[r][c]) {
        return false; // 有阻挡
      }
      r += stepR;
      c += stepC;
    }
    
    return true;
  }

  // 坐标转行列
  toRC(pos) {
    const file = pos[0].charCodeAt(0) - 97;   // a-j → 0-9
    const rank = 10 - parseInt(pos.slice(1)); // 1-10 → 9-0
    return { r: rank, c: file };
  }
}

module.exports = Rules;