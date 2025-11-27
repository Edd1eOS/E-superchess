class Rules {
  constructor() {
    // 初始化规则类
  }

  // 将棋盘存储的各种棋子表示统一解析为 { color, type }
  parsePiece(p) {
    if (!p) return null;
    if (typeof p === 'string') {
      const color = (p[0] === 'W' || p[0] === 'B') ? p[0] : null;
      const type = color ? p.slice(1) : p;
      return { color, type };
    }
    return {
      color: p.color || p.side || null,
      type: p.type || p.name || null,
      // 保留原始对象以备扩展使用
      raw: p
    };
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

    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);

    // 获取并解析起点棋子（兼容 string 与 object 表示）
    const rawPiece = board.board[fromRC.r][fromRC.c];
    const piece = this.parsePiece(rawPiece);

    // 如果没有棋子或者不是当前行棋方的棋子
    if (!piece || piece.color !== turn) return false;

    // 解析目标格棋子并检查是否为己方
    const rawTarget = board.board[toRC.r][toRC.c];
    const targetPiece = this.parsePiece(rawTarget);
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
    return this.isValidPawnAndSpearmanMove(board, from, to, piece, 'P');
  }

  /**
   * 检查长矛兵(Spearman)的移动是否合法
   */
  isValidSpearmanMove(board, from, to, piece) {
    return this.isValidPawnAndSpearmanMove(board, from, to, piece, 'SP');
  }

  /**
   * 检查兵(Pawn)和长矛兵(Spearman)的通用移动规则
   * 两者都可以在初始位置走两格，之后每次只能走一格
   */
  isValidPawnAndSpearmanMove(board, from, to, piece, type) {
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
    const dr = toRC.r - fromRC.r;
    const dc = toRC.c - fromRC.c;
    const isWhite = piece.color === 'W';
    const dir = isWhite ? -1 : 1; // 白向上(r减小)，黑向下(r增大)

    // 直走：列不变
    if (dc === 0) {
      // 向前一格，目标必须为空
      if (dr === dir) {
        return !board.board[toRC.r][toRC.c];
      }

      // 向前两格：仅在初始行允许，且中间格与目标格都为空
      if (dr === 2 * dir) {
        // 白方在第3行(r=7)，黑方在第8行(r=2)
        const isOnStartingRank = (isWhite && fromRC.r === 7) || (!isWhite && fromRC.r === 2);
        if (isOnStartingRank) {
          const midR = fromRC.r + dir;
          if (!board.board[midR][fromRC.c] && !board.board[toRC.r][toRC.c]) {
            return true;
          }
        }
        return false;
      }

      return false;
    }

    // Pawn和Spearman有不同的斜向移动规则
    if (type === 'P') {
      // Pawn的斜向吃子：列差为1且向前一格，且目标有敌方棋子
      if (Math.abs(dc) === 1 && dr === dir) {
        const targetPiece = board.board[toRC.r][toRC.c];
        if (targetPiece && targetPiece.color !== piece.color) {
          return true;
        }

        // 过路兵 (en passant) 判定：
        // 需要 board.state.lastMove 存在且为对方兵的两格推进，且该兵刚好停在与目标列相同且与起点同行的格子上
        const state = board.state || {};
        const lastMove = state.lastMove;
        if (lastMove && lastMove.piece && lastMove.piece.type === 'P' && lastMove.piece.color !== piece.color) {
          // lastMove.from/lastMove.to 期望为字符串坐标
          const lastFromRC = this.toRC(lastMove.from);
          const lastToRC = this.toRC(lastMove.to);
          // 对方兵是否做了两格推进
          if (Math.abs(lastToRC.r - lastFromRC.r) === 2) {
            // 对方兵当前行应与起点行相同，且列与目标列相同（即可被过路兵吃掉）
            if (lastToRC.r === fromRC.r && lastToRC.c === toRC.c) {
              // 注意：实际执行过路兵时，调用方需移除被吃掉的兵（lastToRC）
              return true;
            }
          }
        }

        return false;
      }
    } else if (type === 'SP') {
      // Spearman的"突围"走法：当在对方半场，有敌方P或SP走到SP旁边时，
      // 如对方P或SP身后格不被占据，SP可以立刻斜向此格吃子
      if (Math.abs(dc) === 1 && dr === dir) {
        const targetPiece = board.board[toRC.r][toRC.c];
        
        // 普通斜向吃子：目标有敌方棋子
        if (targetPiece && targetPiece.color !== piece.color) {
          return true;
        }
        
        // "突围"走法检查
        // 检查是否在对方半场（白方在对面5行及以后，黑方在对面5行及以前）
        const isInOpponentHalf = (isWhite && fromRC.r <= 4) || (!isWhite && fromRC.r >= 5);
        
        if (isInOpponentHalf) {
          // 检查相邻位置是否有敌方P或SP
          const adjacentPos = this.toPos(fromRC.r, toRC.c); // 同行但与目标同列的位置
          const adjacentRC = this.toRC(adjacentPos);
          const adjacentPiece = board.board[adjacentRC.r][adjacentRC.c];
          
          if (adjacentPiece && 
              adjacentPiece.color !== piece.color && 
              (adjacentPiece.type === 'P' || adjacentPiece.type === 'SP')) {
            
            // 检查对方棋子身后格是否为空
            const behindRC = adjacentRC.r + dir; // 对方棋子身后的行
            if (behindRC >= 0 && behindRC < 10 && 
                !board.board[behindRC][adjacentRC.c]) {
              
              // 确保目标位置就是对方棋子身后的格子
              if (toRC.r === behindRC && toRC.c === adjacentRC.c) {
                return true;
              }
            }
          }
        }
        
        return false;
      }
    }

    // 其它情况非法
    return false;
  }

  /**
   * 坐标转行列
   */
  toRC(pos) {
    const file = pos[0].charCodeAt(0) - 97;   // a-j → 0-9
    const rank = 10 - parseInt(pos.slice(1)); // 1-10 → 9-0
    return { r: rank, c: file };
  }

  /**
   * 行列转坐标
   */
  toPos(r, c) {
    return String.fromCharCode(97 + c) + (10 - r);
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
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
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
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
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

    // 2格内的直线或斜线移动
    // 条件：至少移动1格，且在2格范围内，且只能直线或斜线移动（不能走日字）
    return (dr <= 2 && dc <= 2) && (dr + dc > 0) && (dr === 0 || dc === 0 || dr === dc);
  }

  /**
   * 检查线卫(Lineguard)的移动是否合法
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
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
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
}

module.exports = Rules;