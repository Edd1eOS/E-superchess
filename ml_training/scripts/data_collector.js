/**
 * 数据收集器
 * 用于监听和记录AI训练过程中的关键函数数据
 */

class DataCollector {
  constructor() {
    this.materialValueHistory = [];  // 子力价值历史
    this.moveScoreHistory = [];      // 步法得分历史
    this.gameStates = [];            // 游戏状态历史
  }

  /**
   * 监听子力价值函数
   * @param {Object} board - 当前棋盘状态
   * @param {Number} materialValue - 子力价值
   * @param {String} player - 当前玩家
   */
  onMaterialValueCalculated(board, materialValue, player) {
    const record = {
      timestamp: Date.now(),
      boardState: this.serializeBoardState(board),
      materialValue: materialValue,
      player: player
    };
    
    this.materialValueHistory.push(record);
    console.log(`[子力价值] 玩家${player}: ${materialValue}`);
  }

  /**
   * 监听步法得分函数
   * @param {Object} board - 当前棋盘状态
   * @param {Object} move - 移动
   * @param {Number} score - 步法得分
   * @param {String} player - 当前玩家
   */
  onMoveScoreCalculated(board, move, score, player) {
    const record = {
      timestamp: Date.now(),
      boardState: this.serializeBoardState(board),
      move: move,
      score: score,
      player: player
    };
    
    this.moveScoreHistory.push(record);
    console.log(`[步法得分] 玩家${player} ${move.from}-${move.to}: ${score}`);
  }

  /**
   * 记录游戏状态
   * @param {Object} board - 棋盘状态
   * @param {String} phase - 游戏阶段
   */
  recordGameState(board, phase) {
    const record = {
      timestamp: Date.now(),
      boardState: this.serializeBoardState(board),
      phase: phase
    };
    
    this.gameStates.push(record);
  }

  /**
   * 序列化棋盘状态
   * @param {Object} board - 棋盘状态
   * @returns {Object} 序列化的棋盘状态
   */
  serializeBoardState(board) {
    // 为了减少数据大小，只序列化关键信息
    return {
      turn: board.state.turn,
      kingPositions: { ...board.state.kingPos },
      pieces: this.extractPiecePositions(board.board)
    };
  }

  /**
   * 提取棋子位置信息
   * @param {Array} board - 棋盘
   * @returns {Array} 棋子位置信息
   */
  extractPiecePositions(board) {
    const pieces = [];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const piece = board[r][c];
        if (piece) {
          pieces.push({
            position: { row: r, col: c },
            type: piece.type,
            color: piece.color
          });
        }
      }
    }
    return pieces;
  }

  /**
   * 生成数据报告
   * @returns {Object} 数据报告
   */
  generateReport() {
    return {
      totalMaterialEvaluations: this.materialValueHistory.length,
      totalMoveScores: this.moveScoreHistory.length,
      gameStatesRecorded: this.gameStates.length,
      materialValueStats: this.calculateMaterialValueStats(),
      moveScoreStats: this.calculateMoveScoreStats()
    };
  }

  /**
   * 计算子力价值统计信息
   * @returns {Object} 统计信息
   */
  calculateMaterialValueStats() {
    if (this.materialValueHistory.length === 0) return {};
    
    const values = this.materialValueHistory.map(record => record.materialValue);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length
    };
  }

  /**
   * 计算步法得分统计信息
   * @returns {Object} 统计信息
   */
  calculateMoveScoreStats() {
    if (this.moveScoreHistory.length === 0) return {};
    
    const scores = this.moveScoreHistory.map(record => record.score);
    return {
      min: Math.min(...scores),
      max: Math.max(...scores),
      avg: scores.reduce((sum, val) => sum + val, 0) / scores.length
    };
  }

  /**
   * 导出数据
   * @param {String} format - 导出格式 ('json')
   * @returns {String} 导出的数据
   */
  exportData(format = 'json') {
    const data = {
      materialValueHistory: this.materialValueHistory,
      moveScoreHistory: this.moveScoreHistory,
      gameStates: this.gameStates
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    return data;
  }

  /**
   * 清空收集的数据
   */
  clearData() {
    this.materialValueHistory = [];
    this.moveScoreHistory = [];
    this.gameStates = [];
  }
}

module.exports = DataCollector;