const TrainingRunner = require('./scripts/training_runner');
const Visualization = require('./scripts/visualization');

/**
 * SuperChess ML训练主入口
 * 提供命令行接口来运行训练或分析数据
 */

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'train':
      // 运行训练
      const iterations = parseInt(args[1]) || 100;
      const runner = new TrainingRunner();
      await runner.runTraining(iterations);
      break;
      
    case 'analyze':
      // 分析数据
      const vis = new Visualization();
      const filename = args[1]; // 可选的文件名参数
      vis.runAnalysis(filename);
      break;
      
    default:
      // 显示帮助信息
      showHelp();
  }
}

function showHelp() {
  console.log(`
SuperChess 机器学习训练工具
============================

用法:
  node main.js [命令] [参数]

命令:
  train [局数]     运行自我对弈训练
                  默认局数: 100
                  
  analyze [文件]   分析训练数据
                  默认分析最新数据文件

示例:
  node main.js train 50      # 运行50局自我对弈
  node main.js train         # 运行100局自我对弈（默认）
  node main.js analyze       # 分析最新数据文件
  node main.js analyze data.json  # 分析指定数据文件
  `);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, showHelp };