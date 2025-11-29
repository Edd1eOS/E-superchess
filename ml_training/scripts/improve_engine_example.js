/**
 * 示例：如何使用训练数据改进引擎
 * 
 * 这个脚本演示了如何分析训练数据并应用到AI引擎中
 */

// 模拟从训练数据中获得的洞察
const TrainingInsights = {
  // 通过数据分析发现的棋子价值调整建议
  recommendedPieceValues: {
    'A': 1100,   // Assassin 比原来更有价值
    'Q': 950,    // Queen 略微增值
    'M': 820,    // Marshall 略微增值
    'T': 720,    // Templar 略微增值
    'R': 520,    // Rook 略微增值
    'B': 310,    // Bishop 略微增值
    'N': 310,    // Knight 略微增值
    'P': 110,    // Pawn 略微增值
    'SP': 105,   // Spearman 略微增值
    'LG': 95     // Lineguard 略微贬值
  },

  // 通过数据分析发现的位置因子
  positionalFactors: {
    centerControl: 1.2,      // 控制中心的价值系数
    kingSafety: 1.5,         // 国王安全的重要性系数
    mobilityBonus: 1.1       // 机动性奖励系数
  },

  // 通过数据分析发现的策略模式
  strategicPatterns: {
    earlyAggression: 1.3,    // 开局积极进攻的价值
    endgameKingActivation: 2.0 // 残局激活国王的重要性
  }
};

/**
 * 应用改进建议到AI引擎
 */
function applyImprovementsToEngine() {
  console.log('=== 应用改进建议到AI引擎 ===\n');
  
  // 1. 更新棋子价值表
  console.log('1. 更新棋子价值表:');
  console.log('   原始价值 -> 推荐价值');
  for (const [piece, value] of Object.entries(TrainingInsights.recommendedPieceValues)) {
    console.log(`   ${piece}: ${getOriginalValue(piece)} -> ${value}`);
  }
  
  // 2. 调整评估函数参数
  console.log('\n2. 调整评估函数参数:');
  console.log('   中心控制系数:', TrainingInsights.positionalFactors.centerControl);
  console.log('   国王安全系数:', TrainingInsights.positionalFactors.kingSafety);
  console.log('   机动性奖励系数:', TrainingInsights.positionalFactors.mobilityBonus);
  
  // 3. 应用战略模式
  console.log('\n3. 应用战略模式:');
  console.log('   开局侵略性价值:', TrainingInsights.strategicPatterns.earlyAggression);
  console.log('   残局国王激活价值:', TrainingInsights.strategicPatterns.endgameKingActivation);
  
  console.log('\n=== 改进完成 ===');
  console.log('请在 ai.js 文件中应用这些更改');
}

/**
 * 获取原始棋子价值（模拟）
 */
function getOriginalValue(piece) {
  const originalValues = {
    'A': 1000, 'Q': 900, 'M': 800, 'T': 700, 'R': 500,
    'B': 300, 'N': 300, 'P': 100, 'SP': 100, 'LG': 100
  };
  return originalValues[piece];
}

/**
 * 生成改进建议的AI代码片段
 */
function generateImprovedAiCode() {
  console.log('\n=== 建议的AI代码改进 ===\n');
  
  console.log('// 1. 更新棋子价值表');
  console.log('this.pieceValues = {');
  for (const [piece, value] of Object.entries(TrainingInsights.recommendedPieceValues)) {
    console.log(`  '${piece}': ${value},   // ${piece}`);
  }
  console.log('};\n');
  
  console.log('// 2. 改进评估函数示例');
  console.log('evaluateBoard(board) {');
  console.log('  let score = 0;');
  console.log('  score += this.evaluateMaterial(board) * 1.0;  // 基础子力价值');
  console.log('  score += this.evaluateKingSafety(board) * ' + TrainingInsights.positionalFactors.kingSafety + ';  // 国王安全');
  console.log('  score += this.evaluateMobility(board) * ' + TrainingInsights.positionalFactors.mobilityBonus + ';  // 机动性');
  console.log('  score += this.evaluateCenterControl(board) * ' + TrainingInsights.positionalFactors.centerControl + ';  // 中心控制');
  console.log('  return score;');
  console.log('}');
}

// 如果直接运行此脚本
if (require.main === module) {
  applyImprovementsToEngine();
  generateImprovedAiCode();
  
  console.log('\n=== 下一步建议 ===');
  console.log('1. 在 program/utils/ai.js 中应用上述更改');
  console.log('2. 运行更多训练来验证改进效果');
  console.log('3. 根据新数据进一步迭代优化');
}

module.exports = { TrainingInsights, applyImprovementsToEngine };