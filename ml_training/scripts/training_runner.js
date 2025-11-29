const fs = require('fs');
const path = require('path');
const LightweightAI = require('./lightweight_ai');
const DataCollector = require('./data_collector');

/**
 * 训练运行器
 * 用于运行AI自我对弈并收集训练数据
 */

class TrainingRunner {
  constructor() {
    this.aiWhite = new LightweightAI();
    this.aiBlack = new LightweightAI();
    this.dataCollector = new DataCollector();
    this.gameCount = 0;
  }

  /**
   * 运行指定次数的自我对弈
   * @param {Number} iterations - 对弈次数
   */
  async runTraining(iterations = 100) {
    console.log(`开始运行 ${iterations} 次自我对弈训练...`);
    
    for (let i = 0; i < iterations; i++) {
      console.log(`\n=== 开始第 ${i+1} 局对弈 ===`);
      await this.runSingleGame();
      this.gameCount++;
      
      // 每10局保存一次数据
      if (this.gameCount % 10 === 0) {
        this.saveTrainingData();
        this.generateProgressReport();
      }
    }
    
    // 保存最终数据
    this.saveTrainingData('final');
    this.generateFinalReport();
  }

  /**
   * 运行单局游戏
   */
  async runSingleGame() {
    // 初始化棋盘状态
    const board = this.initializeBoard();
    
    // 记录初始状态
    this.dataCollector.recordGameState(board, 'start');
    
    let moveCount = 0;
    const maxMoves = 100; // 限制最大步数防止无限游戏
    
    // 游戏主循环
    while (!this.isGameFinished(board) && moveCount < maxMoves) {
      // 记录当前游戏状态
      this.dataCollector.recordGameState(board, `move_${moveCount}`);
      
      // 根据当前回合选择AI
      const currentAI = board.state.turn === 'W' ? this.aiWhite : this.aiBlack;
      
      // AI计算下一步移动
      console.log(`\n第${moveCount + 1}步 - ${board.state.turn}方行动:`);
      const move = currentAI.calculateNextMove(board);
      
      if (move) {
        console.log(`  移动: ${move.from} -> ${move.to}`);
        
        // 执行移动
        this.executeMove(board, move);
        
        // 监听并记录子力价值和步法得分
        const materialValue = currentAI.evaluateMaterial(board);
        this.dataCollector.onMaterialValueCalculated(board, materialValue, board.state.turn);
        
        // 注意：在实际实现中，我们需要从minimax算法中获取确切的步法得分
        // 这里只是一个示例
        this.dataCollector.onMoveScoreCalculated(board, move, 0, board.state.turn);
      } else {
        console.log(`  ${board.state.turn}方无法移动，游戏结束`);
        break;
      }
      
      moveCount++;
      
      // 添加小延迟避免计算过快
      await this.sleep(10);
    }
    
    // 记录结束状态
    this.dataCollector.recordGameState(board, 'end');
    console.log(`\n第 ${this.gameCount + 1} 局游戏结束，共 ${moveCount} 步`);
  }

  /**
   * 初始化棋盘
   * @returns {Object} 初始棋盘状态
   */
  initializeBoard() {
    // 这里应该创建一个标准的superchess初始棋盘
    // 为了演示，我们创建一个简化的棋盘结构
    return {
      board: this.createInitialBoard(),
      state: {
        turn: 'W',  // 白方先行
        kingPos: {
          'W': 'e1',
          'B': 'e10'
        }
      }
    };
  }

  /**
   * 创建初始棋盘布局
   * @returns {Array} 棋盘数组
   */
  createInitialBoard() {
    // 创建一个10x10的棋盘
    const board = Array(10).fill(null).map(() => Array(10).fill(null));
    
    // 设置一些初始棋子用于测试
    board[0][4] = { type: 'K', color: 'B' }; // 黑王
    board[9][4] = { type: 'K', color: 'W' }; // 白王
    
    board[0][3] = { type: 'Q', color: 'B' }; // 黑后
    board[9][3] = { type: 'Q', color: 'W' }; // 白后
    
    board[1][2] = { type: 'N', color: 'B' }; // 黑马
    board[8][2] = { type: 'N', color: 'W' }; // 白马
    
    return board;
  }

  /**
   * 检查游戏是否结束
   * @param {Object} board - 棋盘状态
   * @returns {Boolean} 是否结束
   */
  isGameFinished(board) {
    // 简化的游戏结束条件
    // 实际实现中需要检查将死、僵局等情况
    return false;
  }

  /**
   * 执行移动
   * @param {Object} board - 棋盘状态
   * @param {Object} move - 移动
   */
  executeMove(board, move) {
    // 简化的移动执行
    // 实际实现中需要处理吃子、升变等复杂情况
    const from = this.parsePosition(move.from);
    const to = this.parsePosition(move.to);
    
    // 移动棋子
    board.board[to.row][to.col] = board.board[from.row][from.col];
    board.board[from.row][from.col] = null;
    
    // 更新王的位置（如果移动的是王）
    if (board.board[to.row][to.col] && board.board[to.row][to.col].type === 'K') {
      board.state.kingPos[board.board[to.row][to.col].color] = move.to;
    }
    
    // 切换回合
    board.state.turn = board.state.turn === 'W' ? 'B' : 'W';
  }

  /**
   * 解析位置字符串为行列坐标
   * @param {String} pos - 位置字符串，如 "e4"
   * @returns {Object} 行列坐标
   */
  parsePosition(pos) {
    if (!pos || pos.length < 2) return { row: 0, col: 0 };
    
    const col = pos.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 10 - parseInt(pos.slice(1));
    
    return { row, col };
  }

  /**
   * 生成进度报告
   */
  generateProgressReport() {
    const report = this.dataCollector.generateReport();
    console.log('\n--- 训练进度报告 ---');
    console.log(`已完成对弈: ${this.gameCount} 局`);
    console.log(`子力价值评估次数: ${report.totalMaterialEvaluations}`);
    console.log(`步法得分计算次数: ${report.totalMoveScores}`);
    console.log(`平均子力价值: ${report.materialValueStats.avg?.toFixed(2) || 'N/A'}`);
    console.log(`平均步法得分: ${report.moveScoreStats.avg?.toFixed(2) || 'N/A'}`);
  }

  /**
   * 生成最终报告
   */
  generateFinalReport() {
    const report = this.dataCollector.generateReport();
    console.log('\n=== 最终训练报告 ===');
    console.log(`总对弈局数: ${this.gameCount}`);
    console.log(`总子力价值评估次数: ${report.totalMaterialEvaluations}`);
    console.log(`总步法得分计算次数: ${report.totalMoveScores}`);
    console.log(`子力价值范围: ${report.materialValueStats.min} ~ ${report.materialValueStats.max}`);
    console.log(`步法得分范围: ${report.moveScoreStats.min} ~ ${report.moveScoreStats.max}`);
  }

  /**
   * 保存训练数据
   * @param {String} suffix - 文件名后缀
   */
  saveTrainingData(suffix = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `training_data_${timestamp}${suffix ? '_' + suffix : ''}.json`;
    const filepath = path.join(__dirname, '..', 'data', filename);
    
    const data = this.dataCollector.exportData();
    fs.writeFileSync(filepath, data);
    console.log(`\n训练数据已保存到: ${filepath}`);
  }

  /**
   * 睡眠函数
   * @param {Number} ms - 毫秒数
   * @returns {Promise} Promise
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 如果直接运行此脚本，则启动训练
if (require.main === module) {
  const runner = new TrainingRunner();
  runner.runTraining(10) // 默认运行10局进行测试
    .then(() => {
      console.log('\n训练完成！');
    })
    .catch(err => {
      console.error('训练过程中发生错误:', err);
    });
}

module.exports = TrainingRunner;