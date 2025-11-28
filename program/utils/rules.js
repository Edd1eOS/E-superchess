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
   * 检查是否处于将军状态
   * @param {Object} board - 棋盘对象
   * @param {String} kingColor - 被将军的王的颜色 ("W" 或 "B")
   * @returns {Boolean} 是否被将军
   */
  isCheck(board, kingColor) {
    // 获取王的位置
    const kingPos = board.state.kingPos[kingColor];
    if (!kingPos) return false;

    // 获取对方颜色
    const opponentColor = kingColor === 'W' ? 'B' : 'W';

    // 遍历整个棋盘，查找对方所有棋子
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const piece = board.board[r][c];
        if (piece && piece.color === opponentColor) {
          // 检查这个棋子是否能攻击到王的位置
          const from = this.toPos(r, c);
          if (this.isValidMove(board, from, kingPos, opponentColor)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 检查是否处于将杀状态
   * @param {Object} board - 棋盘对象
   * @param {String} kingColor - 被将杀的王的颜色 ("W" 或 "B")
   * @returns {Boolean} 是否被将杀
   */
  isCheckmate(board, kingColor) {
    // 首先必须处于将军状态
    if (!this.isCheck(board, kingColor)) {
      return false;
    }

    // 检查所有己方棋子的所有可能移动，看是否能解除将军状态
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const piece = board.board[r][c];
        if (piece && piece.color === kingColor) {
          const from = this.toPos(r, c);
          
          // 尝试所有可能的目标位置
          for (let tr = 0; tr < 10; tr++) {
            for (let tc = 0; tc < 10; tc++) {
              const to = this.toPos(tr, tc);
              
              // 检查移动是否合法
              if (this.isValidMove(board, from, to, kingColor)) {
                // 创建一个临时棋盘来测试这个移动
                const testBoard = this.cloneBoard(board);
                
                // 执行移动
                this.executeMove(testBoard, from, to);
                
                // 检查移动后是否仍然被将军
                if (!this.isCheck(testBoard, kingColor)) {
                  // 如果能找到一个解除将军的移动，则不是将杀
                  return false;
                }
              }
            }
          }
        }
      }
    }

    // 如果所有可能的移动都无法解除将军，则为将杀
    return true;
  }

  /**
   * 克隆棋盘对象
   * @param {Object} board - 原始棋盘
   * @returns {Object} 克隆的棋盘
   */
  cloneBoard(board) {
    return {
      board: JSON.parse(JSON.stringify(board.board)),
      state: JSON.parse(JSON.stringify(board.state))
    };
  }

  /**
   * 在棋盘上执行移动
   * @param {Object} board - 棋盘对象
   * @param {String} from - 起始位置
   * @param {String} to - 目标位置
   */
  executeMove(board, from, to) {
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);

    // 移动棋子
    board.board[toRC.r][toRC.c] = board.board[fromRC.r][fromRC.c];
    board.board[fromRC.r][fromRC.c] = null;

    // 如果是王的移动，更新王的位置记录
    const piece = board.board[toRC.r][toRC.c];
    if (piece && piece.type === 'K') {
      board.state.kingPos[piece.color] = to;
    }
  }

  /**
   * 检查移动是否合法（增强版，考虑将军状态）
   * @param {Object} board - 棋盘对象
   * @param {String} from - 起始位置 (如 "a1")
   * @param {String} to - 目标位置 (如 "b2")
   * @param {String} turn - 当前行棋方 ("W" 或 "B")
   * @returns {Boolean} 是否合法
   */
  isValidMoveConsideringCheck(board, from, to, turn) {
    // 首先检查基本的移动合法性
    if (!this.isValidMove(board, from, to, turn)) {
      return false;
    }

    // 创建一个临时棋盘来测试这个移动
    const testBoard = this.cloneBoard(board);
    
    // 执行移动
    this.executeMove(testBoard, from, to);
    
    // 检查移动后是否自己被将军
    return !this.isCheck(testBoard, turn);
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
    let basicValid = false;
    switch (piece.type) {
      case 'P':  // 兵 (Pawn)
        basicValid = this.isValidPawnMove(board, from, to, piece);
        break;

      case 'SP': // 长矛兵 (Spearman)
        basicValid = this.isValidSpearmanMove(board, from, to, piece);
        break;

      case 'N':  // 马 (Knight)
        basicValid = this.isValidKnightMove(from, to);
        break;

      case 'B':  // 象 (Bishop)
        basicValid = this.isValidBishopMove(board, from, to);
        break;

      case 'R':  // 车 (Rook)
        basicValid = this.isValidRookMove(board, from, to);
        break;

      case 'Q':  // 后 (Queen)
        basicValid = this.isValidQueenMove(board, from, to);
        break;

      case 'K':  // 王 (King)
        basicValid = this.isValidKingMove(board, from, to);
        break;

      case 'T':  // 圣殿骑士 (Templar)
        basicValid = this.isValidTemplarMove(board, from, to, piece);
        break;

      case 'M':  // 元帅 (Marshall)
        basicValid = this.isValidMarshallMove(board, from, to, piece);
        break;

      case 'A':  // 刺客 (Assassin)
        basicValid = this.isValidAssassinMove(from, to);
        break;

      case 'LG': // 弩兵 (Lineguard)
        basicValid = this.isValidLineguardMove(from, to);
        break;

      default:
        return false;
    }

    // 如果基本移动不合法，则直接返回false
    if (!basicValid) {
      return false;
    }

    // 创建一个临时棋盘来测试这个移动
    const testBoard = this.cloneBoard(board);
    
    // 执行移动
    this.executeMove(testBoard, from, to);
    
    // 检查移动后是否自己被将军
    return !this.isCheck(testBoard, turn);
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
      // 向前一格，对于P目标必须为空，但对于SP目标可以不为空
      if (dr === dir) {
        // 检查是否到达底线需要升变
        const isPromotion = (isWhite && toRC.r === 0) || (!isWhite && toRC.r === 9);
        if (type === 'P') {
          // P兵直走时目标必须为空
          const isEmptyTarget = !board.board[toRC.r][toRC.c];
          // 如果是升变情况，允许移动到最后一行
          if (isPromotion) {
            return true;
          }
          return isEmptyTarget;
        } else if (type === 'SP') {
          // SP长矛兵直走时目标可以不为空
          // 如果是升变情况，允许移动到最后一行
          if (isPromotion) {
            return true;
          }
          return true;
        }
      }

      // 向前两格：仅在初始行允许。对于P，中间格与目标格都为空；对于SP，中间格为空即可
      if (dr === 2 * dir) {
        // 白方在第3行(r=7)，黑方在第8行(r=2)
        const isOnStartingRank = (isWhite && fromRC.r === 7) || (!isWhite && fromRC.r === 2);
        if (isOnStartingRank) {
          const midR = fromRC.r + dir;
          // 对于P兵，中间格和目标格都必须为空
          // 对于SP长矛兵，只需要中间格为空（目标格可以不为空）
          if (!board.board[midR][fromRC.c]) {
            if (type === 'P') {
              // P兵需要目标格也为空
              return !board.board[toRC.r][toRC.c];
            } else if (type === 'SP') {
              // SP长矛兵不需要检查目标格是否为空
              return true;
            }
          }
        }
        return false;
      }

      return false;
    }

    // 特殊化处理
    if (type === 'P') {
      // Pawn的斜向吃子：列差为1且向前一格，且目标有敌方棋子
      if (Math.abs(dc) === 1 && dr === dir) {
        const targetPiece = board.board[toRC.r][toRC.c];
        // 检查是否到达底线需要升变
        const isPromotion = (isWhite && toRC.r === 0) || (!isWhite && toRC.r === 9);
        if (targetPiece && targetPiece.color !== piece.color) {
          // 如果是升变情况，允许斜向移动到最后一行
          if (isPromotion) {
            return true;
          }
          return true;
        }

        // 过路兵 (en passant) 判定：
        // 1. 执行兵必须在正确的行：白方第6行(r=4)，黑方第5行(r=5)
        // 2. 上一步行动的敌方棋子必须是邻近两列的P或SP
        // 3. 敌方棋子必须与我方兵相同行
        const state = board.state || {};
        const lastMove = state.lastMove;
        
        // 检查基本条件
        if (lastMove && Math.abs(dc) === 1 && dr === dir) {
          // 修正：白方第6行(r=4)，黑方第5行(r=5)
          const isCorrectRow = (isWhite && fromRC.r === 4) || (!isWhite && fromRC.r === 5);
          
          if (isCorrectRow) {
            const lastMovedPiece = this.parsePiece(lastMove.piece);
            const lastMoveDR = Math.abs(this.toRC(lastMove.to).r - this.toRC(lastMove.from).r);
            
            // 检查上一步是否是敌方的P或SP走了两格，且与当前兵在同一行且邻近列
            // 修改条件：目标列必须与敌方刚移动的棋子所在列相同
            if (lastMovedPiece && 
                lastMovedPiece.color !== piece.color && 
                (lastMovedPiece.type === 'P' || lastMovedPiece.type === 'SP') &&
                lastMoveDR === 2 &&
                this.toRC(lastMove.to).r === fromRC.r &&
                Math.abs(this.toRC(lastMove.to).c - fromRC.c) === 1 &&
                toRC.c === this.toRC(lastMove.to).c) {  // 添加这一行：确保目标列与敌方棋子所在列相同
              return true;
            }
          }
        }

        return false;
      }
      // 添加一个明确的返回值，确保所有路径都有返回
      return false;
    } else if (type === 'SP') {
      // SP在特定行时获得斜线行走能力（不能斜线吃子，即仍要检查目标格是否被占据）
      // 白方：5、6行（r=3、4）；黑方：3、4行（r=5、6）(加大作用，否则难以触发)
      if (Math.abs(dc) === 1 && dr === dir) {
        const isOnCorrectRank = (isWhite && (fromRC.r === 3 || fromRC.r === 4)) || 
                               (!isWhite && (fromRC.r === 5 || fromRC.r === 6));
        
        if (isOnCorrectRank) {
          // 目标格不能被占据（不能斜线吃子）
          return !board.board[toRC.r][toRC.c];
        }
      }
      
     
      
      return false;
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
  isValidKingMove(board, from, to) {
    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
    const dr = Math.abs(toRC.r - fromRC.r);
    const dc = Math.abs(toRC.c - fromRC.c);

    // 普通移动：只能移动一格
    const isNormalMove = (dr <= 1 && dc <= 1) && (dr + dc > 0);
    if (isNormalMove) {
      return true;
    }

    // 检查王车易位
    return this.isValidCastlingMove(board, from, to);
  }

  /**
   * 检查王车易位是否合法
   */
  isValidCastlingMove(board, from, to) {
    // 确保起点是王的位置
    if (from !== board.state.kingPos[board.state.turn]) {
      return false;
    }

    const fromRC = this.toRC(from);
    const toRC = this.toRC(to);
    
    // 确保是水平移动且在同一行
    if (fromRC.r !== toRC.r) {
      return false;
    }

    // 确保是王车易位的特定位置移动
    const isWhite = board.state.turn === 'W';
    
    // 短易位：王从f1(i1)移到i1(h1) 或 王从f10移到i10
    // 长易位：王从f1(i1)移到c1(d1) 或 王从f10移到c10
    const shortCastleTargetCol = isWhite ? 8 : 8; // i1/i10 (i列是8)
    const longCastleTargetCol = isWhite ? 2 : 2;  // c1/c10 (c列是2)
    
    // 短易位检查
    if (toRC.c === shortCastleTargetCol) {
      // 检查是否还有短易位权限
      if (isWhite && !board.state.castling.WK) return false;
      if (!isWhite && !board.state.castling.BK) return false;
      
      // 检查王和车之间的路径是否畅通
      const rookPos = this.toPos(fromRC.r, 9); // j1/j10 (车的初始位置)
      const rookPiece = board.board[fromRC.r][9];
      
      // 确保车存在且未移动
      if (!rookPiece || rookPiece.type !== 'R' || rookPiece.color !== board.state.turn) {
        return false;
      }
      
      // 检查路径是否畅通 (f-g-h-i列，即5-6-7-8列)
      for (let c = 6; c <= 8; c++) {
        if (board.board[fromRC.r][c]) {
          return false;
        }
      }
      
      // 检查王是否在被将军状态或经过的格子是否受攻击
      // 这里简化处理，只检查目标格是否为空
      return !board.board[toRC.r][toRC.c]; // 目标格必须为空
    }
    
    // 长易位检查
    if (toRC.c === longCastleTargetCol) {
      // 检查是否还有长易位权限
      if (isWhite && !board.state.castling.WQ) return false;
      if (!isWhite && !board.state.castling.BQ) return false;
      
      // 检查王和车之间的路径是否畅通
      const rookPos = this.toPos(fromRC.r, 0); // a1/a10 (车的初始位置)
      const rookPiece = board.board[fromRC.r][0];
      
      // 确保车存在且未移动
      if (!rookPiece || rookPiece.type !== 'R' || rookPiece.color !== board.state.turn) {
        return false;
      }
      
      // 检查路径是否畅通 (b-c-d-e列，即1-2-3-4列)
      for (let c = 1; c <= 4; c++) {
        if (board.board[fromRC.r][c]) {
          return false;
        }
      }
      
      // 检查王是否在被将军状态或经过的格子是否受攻击
      // 这里简化处理，只检查目标格是否为空
      return !board.board[toRC.r][toRC.c]; // 目标格必须为空
    }
    
    return false;
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
    // 检查是否到达底线需要升变
    // 注意：这个方法没有board参数，需要通过其他方式获取棋盘信息
    // 由于这个方法不直接访问棋盘状态，我们无法在此处处理升变逻辑
    // 升变逻辑将在游戏控制层处理
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

  /**
   * 检查某个位置是否受到对方攻击
   * @param {Object} board - 棋盘对象
   * @param {String} position - 检查的位置 (如 "e4")
   * @param {String} kingColor - 王的颜色 ("W" 或 "B")
   * @returns {Boolean} 位置是否受到攻击
   */
  isPositionUnderAttack(board, position, kingColor) {
    const opponentColor = kingColor === 'W' ? 'B' : 'W';

    // 遍历整个棋盘，查找对方所有棋子
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const piece = board.board[r][c];
        if (piece && piece.color === opponentColor) {
          // 检查这个棋子是否能攻击到指定位置
          const from = this.toPos(r, c);
          // 注意：这里我们不需要考虑将军状态，否则会造成循环依赖
          if (this.isValidMove(board, from, position, opponentColor)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

module.exports = Rules;