/**
 * AI 引擎管理：
 * - Level 1：随机合法走子
 * - Level 2：随机合法 + 不送子
 * - Level 3：基础规则过滤 + 位置评估
 * - Level 4：增强规则过滤 + 更深入的位置评估
 * - Level 5：高级规则过滤 + 最优位置评估
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
    
    // 中心控制权重
    this.centerControlWeights = {};
    // 初始化中心权重 - 中心区域权重更高
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const pos = this.rules.toPos(r, c);
        // 计算到中心的距离，越近权重越高
        const centerDistance = Math.sqrt(Math.pow(r - 4.5, 2) + Math.pow(c - 4.5, 2));
        // 中心权重在5-25之间
        this.centerControlWeights[pos] = Math.max(5, 25 - centerDistance * 3);
      }
    }
  }

  // --- 公共接口方法 ---

  /**
   * 同步接口：支持 Level1 / Level2 / Level3 / Level4 / Level5
   */
  calculateNextMove(board, level = 2) {
    this.aiColor = board.state.turn; // 确定 AI 当前的回合颜色
    
    switch(level) {
      case 1:
        return this.calculateLevel1Move(board);
      case 2:
        return this.calculateLevel2Move(board);
      case 3:
        return this.calculateLevel3Move(board);
      case 4:
        return this.calculateLevel4Move(board);
      case 5:
        return this.calculateLevel5Move(board);
      default:
        return this.calculateLevel2Move(board);
    }
  }

  /**
   * 异步接口：支持所有级别AI
   */
  async calculateNextMoveAsync(board, level = 2) {
    // 所有级别现在都是同步的，直接调用同步方法
    return this.calculateNextMove(board, level);
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

  // 2级AI：随机合法 + 不送子规则
  calculateLevel2Move(board) {
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

  // 3级AI：基础规则过滤 + 位置评估
  calculateLevel3Move(board) {
    const allMoves = this.getLegalMovesOptimized(board);
    if (allMoves.length === 0) return null;

    // 筛选出安全的移动
    const safeMoves = allMoves.filter(move => this.isMoveSafe(board, move));
    const movesToUse = safeMoves.length > 0 ? safeMoves : allMoves;

    // 评估所有候选移动
    const evaluatedMoves = movesToUse.map(move => ({
      move: move,
      score: this.evaluateMove(board, move)
    }));

    // 按分数排序，高分优先
    evaluatedMoves.sort((a, b) => b.score - a.score);
    
    // 返回最高分的移动
    return evaluatedMoves[0]?.move || null;
  }

  // 4级AI：增强规则过滤 + 更深入的位置评估
  calculateLevel4Move(board) {
    const allMoves = this.getLegalMovesOptimized(board);
    if (allMoves.length === 0) return null;

    // 多层次筛选移动
    let candidateMoves = allMoves;
    
    // 第一层：筛选安全移动
    const safeMoves = allMoves.filter(move => this.isMoveSafe(board, move));
    if (safeMoves.length > 0) {
      candidateMoves = safeMoves;
    }

    // 第二层：进一步筛选更具战略意义的移动
    const strategicMoves = candidateMoves.filter(move => this.isStrategicMove(board, move));
    if (strategicMoves.length > 0) {
      candidateMoves = strategicMoves;
    }

    // 评估候选移动
    const evaluatedMoves = candidateMoves.map(move => ({
      move: move,
      score: this.evaluateMoveEnhanced(board, move)
    }));

    // 按分数排序，高分优先
    evaluatedMoves.sort((a, b) => b.score - a.score);
    
    // 有一定概率选择最佳移动或者前几个中的一个（增加多样性）
    if (evaluatedMoves.length > 0) {
      const pickIndex = Math.min(Math.floor(Math.random() * 3), evaluatedMoves.length - 1);
      return evaluatedMoves[pickIndex].move;
    }
    
    return null;
  }

  // 5级AI：高级规则过滤 + 最优位置评估
  calculateLevel5Move(board) {
    const allMoves = this.getLegalMovesOptimized(board);
    if (allMoves.length === 0) return null;

    // 多层次筛选移动
    let candidateMoves = allMoves;
    
    // 第一层：筛选安全移动
    const safeMoves = allMoves.filter(move => this.isMoveSafe(board, move));
    if (safeMoves.length > 0) {
      candidateMoves = safeMoves;
    }

    // 第二层：筛选战略性移动
    const strategicMoves = candidateMoves.filter(move => this.isStrategicMove(board, move));
    if (strategicMoves.length > 0) {
      candidateMoves = strategicMoves;
    }

    // 第三层：筛选具有发展性的移动
    const developmentalMoves = candidateMoves.filter(move => this.isDevelopmentalMove(board, move));
    if (developmentalMoves.length > 0) {
      candidateMoves = developmentalMoves;
    }

    // 评估候选移动（使用最复杂的评估函数）
    const evaluatedMoves = candidateMoves.map(move => ({
      move: move,
      score: this.evaluateMoveAdvanced(board, move)
    }));

    // 按分数排序，高分优先
    evaluatedMoves.sort((a, b) => b.score - a.score);
    
    // 返回最高分的移动
    return evaluatedMoves[0]?.move || null;
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

  /**
   * 判断移动是否具有战略意义
   * @param {Object} board - 当前棋盘
   * @param {Object} move - 待检查的移动
   * @returns {boolean} - true 如果具有战略意义
   */
  isStrategicMove(board, move) {
    // 吃子总是具有战略意义
    if (move.capturedPiece) return true;
    
    // 控制中心位置的移动具有战略意义 (中心为 d5, e5, d6, e6)
    const centerPositions = ['d5', 'e5', 'd6', 'e6'];
    if (centerPositions.includes(move.to)) return true;
    
    // 王车易位具有战略意义
    if (move.piece.type === 'K' && Math.abs(move.from.charCodeAt(0) - move.to.charCodeAt(0)) > 1) {
      return true;
    }
    
    return false;
  }

  /**
   * 判断移动是否具有发展性
   * @param {Object} board - 当前棋盘
   * @param {Object} move - 待检查的移动
   * @returns {boolean} - true 如果具有发展性
   */
  isDevelopmentalMove(board, move) {
    // 发展性移动包括：出子、控制关键线路等
    if (this.isStrategicMove(board, move)) return true;
    
    // 兵的推进具有发展性
    if (move.piece.type === 'P' || move.piece.type === 'SP') {
      // 兵向前推进
      const fromRow = parseInt(move.from[1]);
      const toRow = parseInt(move.to[1]);
      const direction = move.piece.color === 'W' ? 1 : -1;
      
      // 正向推进至少两格认为具有发展性
      if ((toRow - fromRow) * direction >= 2) return true;
    }
    
    return false;
  }

  /**
   * 基础移动评估函数 (Level 3)
   * 包含：材料价值、中心控制、基本安全检查
   * @param {Object} board - 当前棋盘
   * @param {Object} move - 待评估的移动
   * @returns {number} - 评估分数
   */
  evaluateMove(board, move) {
    let score = 0;
    
    // 1. 材料价值
    if (move.capturedPiece) {
      score += this.pieceValues[move.capturedPiece.type] || 0;
    }
    
    // 2. 中心控制奖励
    const centerPositions = ['d5', 'e5', 'd6', 'e6'];
    if (centerPositions.includes(move.to)) {
      score += 10;
    }
    
    // 3. 安全性奖励（避免送子）
    if (this.isMoveSafe(board, move)) {
      score += 5;
    }
    
    return score;
  }

  /**
   * 增强移动评估函数 (Level 4)
   * 在基础评估基础上增加：战略位置、发展性、更严格的安全部署
   * @param {Object} board - 当前棋盘
   * @param {Object} move - 待评估的移动
   * @returns {number} - 评估分数
   */
  evaluateMoveEnhanced(board, move) {
    let score = this.evaluateMove(board, move);
    
    // 1. 战略位置奖励
    if (this.isStrategicMove(board, move)) {
      score += 20;
    }
    
    // 2. 发展性奖励
    if (this.isDevelopmentalMove(board, move)) {
      score += 15;
    }
    
    // 3. 对手反击惩罚（更严格的安全部署）
    if (!this.isMoveSafe(board, move)) {
      score -= 50;
    }
    
    return score;
  }

  /**
   * 高级移动评估函数 (Level 5)
   * 在增强评估基础上增加：全局局势评估、王的安全、兵线结构、活动性等
   * @param {Object} board - 当前棋盘
   * @param {Object} move - 待评估的移动
   * @returns {number} - 评估分数
   */
  evaluateMoveAdvanced(board, move) {
    // 先执行基础和增强评估
    let score = this.evaluateMoveEnhanced(board, move);
    
    // 1. 对王的威胁奖励
    if (move.capturedPiece && move.capturedPiece.type === 'A') {
      score += 500;
    }
    
    // 2. 对重要子力的威胁奖励
    if (move.capturedPiece && ['Q', 'M', 'T'].includes(move.capturedPiece.type)) {
      score += this.pieceValues[move.capturedPiece.type] * 0.5;
    }
    
    // 3. 双重攻击奖励
    const tempBoard = this.makeMoveAndSwitchTurn(board, move);
    const nextMoves = this.getLegalMovesOptimized(tempBoard);
    const nextCaptures = nextMoves.filter(m => m.capturedPiece);
    if (nextCaptures.length > 0) {
      // 如果下一步还能吃子，给予奖励
      const maxCaptureValue = Math.max(...nextCaptures.map(m => this.pieceValues[m.capturedPiece.type] || 0));
      score += maxCaptureValue * 0.3;
    }
    
    // 4. 全局局势评估
    const globalEvaluation = this.evaluateGlobalPosition(tempBoard, move);
    score += globalEvaluation;
    
    return score;
  }

  /**
   * 全局局势评估函数
   * 评估包括：物质优势、中心控制、活动性、兵线结构、王的安全、威胁/被威胁、子力出动程度、将军惩罚等
   * @param {Object} board - 当前棋盘状态
   * @param {Object} move - 当前移动
   * @returns {number} - 评估分数
   */
  evaluateGlobalPosition(board, move) {
    let score = 0;
    const aiColor = this.aiColor;
    const opponentColor = aiColor === 'W' ? 'B' : 'W';
    
    // 1. 物质优势评估
    const materialScore = this.evaluateMaterialAdvantage(board, aiColor, opponentColor);
    score += materialScore * 0.5; // 物质优势权重为0.5
    
    // 2. 中心控制评估
    const centerControlScore = this.evaluateCenterControl(board, aiColor, opponentColor);
    score += centerControlScore * 0.3; // 中心控制权重为0.3
    
    // 3. 活动性评估（可移动的合法着法数量）
    const mobilityScore = this.evaluateMobility(board, aiColor, opponentColor);
    score += mobilityScore * 0.2; // 活动性权重为0.2
    
    // 4. 兵线结构评估
    const pawnStructureScore = this.evaluatePawnStructure(board, aiColor, opponentColor);
    score += pawnStructureScore * 0.2; // 兵线结构权重为0.2
    
    // 5. 王的安全评估
    const kingSafetyScore = this.evaluateKingSafety(board, aiColor, opponentColor);
    score += kingSafetyScore * 0.4; // 王的安全权重为0.4
    
    // 6. 威胁/被威胁评估
    const threatScore = this.evaluateThreats(board, aiColor, opponentColor);
    score += threatScore * 0.3; // 威胁评估权重为0.3
    
    // 7. 子力出动程度评估
    const pieceDevelopmentScore = this.evaluatePieceDevelopment(board, aiColor, opponentColor);
    score += pieceDevelopmentScore * 0.2; // 子力出动权重为0.2
    
    // 8. 将军惩罚（避免被将军）
    const checkPenalty = this.evaluateChecks(board, aiColor, opponentColor);
    score += checkPenalty * 0.5; // 将军惩罚权重为0.5
    
    return score;
  }

  /**
   * 评估物质优势
   * @param {Object} board - 棋盘状态
   * @param {string} aiColor - AI颜色
   * @param {string} opponentColor - 对手颜色
   * @returns {number} - 物质优势分数
   */
  evaluateMaterialAdvantage(board, aiColor, opponentColor) {
    let aiMaterial = 0;
    let opponentMaterial = 0;
    
    // 遍历棋盘计算双方物质总值
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const piece = board.board[r][c];
        if (piece) {
          const value = this.pieceValues[piece.type] || 0;
          if (piece.color === aiColor) {
            aiMaterial += value;
          } else if (piece.color === opponentColor) {
            opponentMaterial += value;
          }
        }
      }
    }
    
    // 返回物质优势差值
    return aiMaterial - opponentMaterial;
  }

  /**
   * 评估中心控制
   * @param {Object} board - 棋盘状态
   * @param {string} aiColor - AI颜色
   * @param {string} opponentColor - 对手颜色
   * @returns {number} - 中心控制分数
   */
  evaluateCenterControl(board, aiColor, opponentColor) {
    let aiCenterControl = 0;
    let opponentCenterControl = 0;
    
    // 遍历棋盘评估中心控制
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const pos = this.rules.toPos(r, c);
        const weight = this.centerControlWeights[pos] || 0;
        
        if (weight > 0) {
          // 检查这个位置是否被某一方控制（有合法移动可以到达）
          const aiControls = this.positionControlledBy(board, pos, aiColor);
          const opponentControls = this.positionControlledBy(board, pos, opponentColor);
          
          if (aiControls) aiCenterControl += weight;
          if (opponentControls) opponentCenterControl += weight;
        }
      }
    }
    
    return aiCenterControl - opponentCenterControl;
  }

  /**
   * 检查某个位置是否被指定颜色控制
   * @param {Object} board - 棋盘状态
   * @param {string} pos - 位置
   * @param {string} color - 颜色
   * @returns {boolean} - 是否被控制
   */
  positionControlledBy(board, pos, color) {
    // 遍历棋盘上该颜色的所有棋子
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const piece = board.board[r][c];
        if (piece && piece.color === color) {
          const fromPos = this.rules.toPos(r, c);
          // 检查是否有合法移动可以到达目标位置
          if (this.rules.isValidMove(board, fromPos, pos, color)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * 评估活动性（合法着法数量）
   * @param {Object} board - 棋盘状态
   * @param {string} aiColor - AI颜色
   * @param {string} opponentColor - 对手颜色
   * @returns {number} - 活动性分数
   */
  evaluateMobility(board, aiColor, opponentColor) {
    const aiMoves = this.getAllLegalMovesForColor(board, aiColor);
    const opponentMoves = this.getAllLegalMovesForColor(board, opponentColor);
    
    // 返回合法着法数量差值
    return aiMoves.length - opponentMoves.length;
  }

  /**
   * 评估兵线结构
   * @param {Object} board - 棋盘状态
   * @param {string} aiColor - AI颜色
   * @param {string} opponentColor - 对手颜色
   * @returns {number} - 兵线结构分数
   */
  evaluatePawnStructure(board, aiColor, opponentColor) {
    let aiPawnScore = 0;
    let opponentPawnScore = 0;
    
    // 评估兵的结构（孤立兵、落后兵等）
    aiPawnScore += this.analyzePawnStructure(board, aiColor);
    opponentPawnScore += this.analyzePawnStructure(board, opponentColor);
    
    return aiPawnScore - opponentPawnScore;
  }

  /**
   * 分析兵的结构
   * @param {Object} board - 棋盘状态
   * @param {string} color - 颜色
   * @returns {number} - 兵结构分数
   */
  analyzePawnStructure(board, color) {
    let score = 0;
    const pawns = [];
    
    // 收集所有兵的位置
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const piece = board.board[r][c];
        if (piece && piece.color === color && (piece.type === 'P' || piece.type === 'SP')) {
          pawns.push({r, c});
        }
      }
    }
    
    // 简单评估：兵的数量（越多越好）和兵的前进程度（越靠前越好）
    for (const pawn of pawns) {
      // 基础分数
      score += 10;
      
      // 根据兵的位置加分（越接近对方底线分数越高）
      if (color === 'W') {
        score += pawn.r; // 白方兵越往下分数越高
      } else {
        score += (9 - pawn.r); // 黑方兵越往上分数越高
      }
    }
    
    return score;
  }

  /**
   * 评估王的安全
   * @param {Object} board - 棋盘状态
   * @param {string} aiColor - AI颜色
   * @param {string} opponentColor - 对手颜色
   * @returns {number} - 王的安全分数
   */
  evaluateKingSafety(board, aiColor, opponentColor) {
    let score = 0;
    
    // 查找双方王的位置
    const aiKingPos = board.state.kingPos[aiColor];
    const opponentKingPos = board.state.kingPos[opponentColor];
    
    // 王周围保护子力加分，受攻击子力减分
    if (aiKingPos) {
      const aiKingSafety = this.evaluateKingProtection(board, aiKingPos, aiColor);
      score += aiKingSafety;
    }
    
    if (opponentKingPos) {
      const opponentKingSafety = this.evaluateKingProtection(board, opponentKingPos, opponentColor);
      score -= opponentKingSafety; // 对方王越安全，我们得分越少
    }
    
    return score;
  }

  /**
   * 评估王周围的保护
   * @param {Object} board - 棋盘状态
   * @param {string} kingPos - 王的位置
   * @param {string} kingColor - 王的颜色
   * @returns {number} - 保护分数
   */
  evaluateKingProtection(board, kingPos, kingColor) {
    let protectionScore = 0;
    const kingRC = this.rules.toRC(kingPos);
    
    // 检查王周围8个方向的格子
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dr, dc] of directions) {
      const r = kingRC.r + dr;
      const c = kingRC.c + dc;
      
      // 检查是否在棋盘内
      if (r >= 0 && r < 10 && c >= 0 && c < 10) {
        const pos = this.rules.toPos(r, c);
        const piece = board.board[r][c];
        
        // 如果是己方棋子，提供保护
        if (piece && piece.color === kingColor) {
          protectionScore += 5; // 每个保护子力加5分
        }
        
        // 如果是对方棋子，可能存在威胁
        if (piece && piece.color !== kingColor) {
          protectionScore -= 3; // 每个威胁子力减3分
        }
      }
    }
    
    return protectionScore;
  }

  /**
   * 评估威胁
   * @param {Object} board - 棋盘状态
   * @param {string} aiColor - AI颜色
   * @param {string} opponentColor - 对手颜色
   * @returns {number} - 威胁分数
   */
  evaluateThreats(board, aiColor, opponentColor) {
    let aiThreats = 0;
    let opponentThreats = 0;
    
    // 计算双方的威胁
    const aiMoves = this.getAllLegalMovesForColor(board, aiColor);
    const opponentMoves = this.getAllLegalMovesForColor(board, opponentColor);
    
    // 统计能吃子的着法
    aiThreats += aiMoves.filter(move => move.capturedPiece).length;
    opponentThreats += opponentMoves.filter(move => move.capturedPiece).length;
    
    return (aiThreats - opponentThreats) * 5; // 每个威胁乘以5
  }

  /**
   * 评估子力出动程度
   * @param {Object} board - 棋盘状态
   * @param {string} aiColor - AI颜色
   * @param {string} opponentColor - 对手颜色
   * @returns {number} - 子力出动分数
   */
  evaluatePieceDevelopment(board, aiColor, opponentColor) {
    let aiDevelopment = 0;
    let opponentDevelopment = 0;
    
    // 评估子力出动（初始位置的子力移动加分）
    aiDevelopment += this.calculatePieceDevelopment(board, aiColor);
    opponentDevelopment += this.calculatePieceDevelopment(board, opponentColor);
    
    return aiDevelopment - opponentDevelopment;
  }

  /**
   * 计算子力出动程度
   * @param {Object} board - 棋盘状态
   * @param {string} color - 颜色
   * @returns {number} - 出动分数
   */
  calculatePieceDevelopment(board, color) {
    let score = 0;
    
    // 对于每个己方棋子，如果不在初始位置，则加分
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const piece = board.board[r][c];
        if (piece && piece.color === color) {
          // 简单评估：所有子力只要不在初始行就加分
          if (color === 'W' && r > 0) {
            score += 2; // 白方只要不在第1行就加分
          } else if (color === 'B' && r < 9) {
            score += 2; // 黑方只要不在第10行就加分
          }
        }
      }
    }
    
    return score;
  }

  /**
   * 评估将军状态（避免被将军）
   * @param {Object} board - 棋盘状态
   * @param {string} aiColor - AI颜色
   * @param {string} opponentColor - 对手颜色
   * @returns {number} - 将军惩罚分数
   */
  evaluateChecks(board, aiColor, opponentColor) {
    let score = 0;
    
    // 如果AI被将军，要惩罚
    if (this.rules.isCheck(board, aiColor)) {
      score -= 50;
    }
    
    // 如果AI能将军对方，要奖励
    if (this.rules.isCheck(board, opponentColor)) {
      score += 30;
    }
    
    return score;
  }

  /**
   * 获取指定颜色的所有合法移动
   * @param {Object} board - 棋盘状态
   * @param {string} color - 颜色
   * @returns {Array} - 合法移动列表
   */
  getAllLegalMovesForColor(board, color) {
    const moves = [];
    const size = board.board.length;
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const piece = board.board[r][c];
        if (piece && piece.color === color) {
          const fromPos = this.rules.toPos(r, c);
          
          for (let tr = 0; tr < size; tr++) {
            for (let tc = 0; tc < size; tc++) {
              const toPos = this.rules.toPos(tr, tc);
              
              if (this.rules.isValidMove(board, fromPos, toPos, color)) {
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

  // --- 辅助方法 ---
  
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