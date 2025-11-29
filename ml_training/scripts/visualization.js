const fs = require('fs');
const path = require('path');

/**
 * 数据可视化工具
 * 用于分析和可视化训练数据
 */

class Visualization {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
  }

  /**
   * 加载训练数据
   * @param {String} filename - 数据文件名
   * @returns {Object} 训练数据
   */
  loadData(filename) {
    const filepath = path.join(this.dataDir, filename);
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * 查找最新的训练数据文件
   * @returns {String|null} 最新数据文件名
   */
  findLatestDataFile() {
    try {
      const files = fs.readdirSync(this.dataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (jsonFiles.length === 0) return null;
      
      // 按修改时间排序，返回最新的文件
      const sortedFiles = jsonFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(this.dataDir, a));
        const statB = fs.statSync(path.join(this.dataDir, b));
        return statB.mtime - statA.mtime;
      });
      
      return sortedFiles[0];
    } catch (err) {
      console.error('查找数据文件时出错:', err);
      return null;
    }
  }

  /**
   * 分析材料价值分布
   * @param {Array} materialHistory - 材料价值历史数据
   * @returns {Object} 分析结果
   */
  analyzeMaterialValueDistribution(materialHistory) {
    if (!materialHistory || materialHistory.length === 0) {
      return { error: '没有材料价值数据' };
    }

    // 按玩家分组
    const whiteValues = materialHistory
      .filter(record => record.player === 'W')
      .map(record => record.materialValue);
    
    const blackValues = materialHistory
      .filter(record => record.player === 'B')
      .map(record => record.materialValue);

    return {
      totalRecords: materialHistory.length,
      white: this.calculateStats(whiteValues),
      black: this.calculateStats(blackValues),
      overall: this.calculateStats([...whiteValues, ...blackValues])
    };
  }

  /**
   * 分析移动得分分布
   * @param {Array} moveHistory - 移动历史数据
   * @returns {Object} 分析结果
   */
  analyzeMoveScoreDistribution(moveHistory) {
    if (!moveHistory || moveHistory.length === 0) {
      return { error: '没有移动得分数据' };
    }

    // 按玩家分组
    const whiteScores = moveHistory
      .filter(record => record.player === 'W')
      .map(record => record.score);
    
    const blackScores = moveHistory
      .filter(record => record.player === 'B')
      .map(record => record.score);

    return {
      totalRecords: moveHistory.length,
      white: this.calculateStats(whiteScores),
      black: this.calculateStats(blackScores),
      overall: this.calculateStats([...whiteScores, ...blackScores])
    };
  }

  /**
   * 计算统计数据
   * @param {Array} values - 数值数组
   * @returns {Object} 统计结果
   */
  calculateStats(values) {
    if (values.length === 0) return {};

    // 排序以便计算百分位数
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((sum, val) => sum + val, 0) / values.length,
      median: this.median(sorted),
      q1: this.percentile(sorted, 25),
      q3: this.percentile(sorted, 75)
    };
  }

  /**
   * 计算中位数
   * @param {Array} sortedArray - 已排序的数组
   * @returns {Number} 中位数
   */
  median(sortedArray) {
    const mid = Math.floor(sortedArray.length / 2);
    return sortedArray.length % 2 !== 0 
      ? sortedArray[mid] 
      : (sortedArray[mid - 1] + sortedArray[mid]) / 2;
  }

  /**
   * 计算百分位数
   * @param {Array} sortedArray - 已排序的数组
   * @param {Number} percentile - 百分位数 (0-100)
   * @returns {Number} 百分位数值
   */
  percentile(sortedArray, percentile) {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * 生成文本报告
   * @param {Object} data - 训练数据
   */
  generateTextReport(data) {
    console.log('\n========== 数据分析报告 ==========\n');
    
    // 材料价值分析
    console.log('1. 材料价值分布分析:');
    const materialAnalysis = this.analyzeMaterialValueDistribution(data.materialValueHistory);
    if (materialAnalysis.error) {
      console.log(`   ${materialAnalysis.error}\n`);
    } else {
      console.log(`   总记录数: ${materialAnalysis.totalRecords}`);
      console.log('   白方:');
      this.printStats(materialAnalysis.white, '     ');
      console.log('   黑方:');
      this.printStats(materialAnalysis.black, '     ');
      console.log('   总体:');
      this.printStats(materialAnalysis.overall, '     ');
    }
    
    // 移动得分分析
    console.log('\n2. 移动得分分布分析:');
    const moveAnalysis = this.analyzeMoveScoreDistribution(data.moveScoreHistory);
    if (moveAnalysis.error) {
      console.log(`   ${moveAnalysis.error}\n`);
    } else {
      console.log(`   总记录数: ${moveAnalysis.totalRecords}`);
      console.log('   白方:');
      this.printStats(moveAnalysis.white, '     ');
      console.log('   黑方:');
      this.printStats(moveAnalysis.black, '     ');
      console.log('   总体:');
      this.printStats(moveAnalysis.overall, '     ');
    }
    
    // 游戏状态分析
    console.log('\n3. 游戏状态分析:');
    console.log(`   总游戏状态记录数: ${data.gameStates?.length || 0}`);
    
    console.log('\n================================\n');
  }

  /**
   * 打印统计信息
   * @param {Object} stats - 统计数据
   * @param {String} indent - 缩进字符串
   */
  printStats(stats, indent = '') {
    console.log(`${indent}记录数: ${stats.count}`);
    console.log(`${indent}最小值: ${stats.min.toFixed(2)}`);
    console.log(`${indent}最大值: ${stats.max.toFixed(2)}`);
    console.log(`${indent}平均值: ${stats.mean.toFixed(2)}`);
    console.log(`${indent}中位数: ${stats.median.toFixed(2)}`);
    console.log(`${indent}第一四分位数: ${stats.q1.toFixed(2)}`);
    console.log(`${indent}第三四分位数: ${stats.q3.toFixed(2)}`);
  }

  /**
   * 生成简单的图表数据
   * @param {Array} data - 数据数组
   * @param {Number} bins - 分箱数
   * @returns {Array} 图表数据
   */
  generateHistogramData(data, bins = 10) {
    if (!data || data.length === 0) return [];
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;
    
    // 初始化分箱
    const histogram = Array(bins).fill(0).map((_, i) => ({
      range: `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`,
      count: 0
    }));
    
    // 填充分箱
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex].count++;
    });
    
    return histogram;
  }

  /**
   * 生成CSV格式的报告
   * @param {Object} data - 训练数据
   * @param {String} filename - 输出文件名
   */
  generateCSVReport(data, filename) {
    const csvPath = path.join(this.dataDir, filename);
    
    // 创建CSV内容
    let csvContent = '类型,时间戳,玩家,数值\n';
    
    // 添加材料价值数据
    if (data.materialValueHistory) {
      data.materialValueHistory.forEach(record => {
        csvContent += `材料价值,${record.timestamp},${record.player},${record.materialValue}\n`;
      });
    }
    
    // 添加移动得分数据
    if (data.moveScoreHistory) {
      data.moveScoreHistory.forEach(record => {
        csvContent += `移动得分,${record.timestamp},${record.player},${record.score}\n`;
      });
    }
    
    // 写入文件
    fs.writeFileSync(csvPath, csvContent);
    console.log(`\nCSV报告已保存到: ${csvPath}`);
  }

  /**
   * 运行完整分析
   * @param {String|null} filename - 数据文件名（可选）
   */
  runAnalysis(filename = null) {
    try {
      // 确定要分析的文件
      const dataFile = filename || this.findLatestDataFile();
      
      if (!dataFile) {
        console.log('没有找到训练数据文件');
        return;
      }
      
      console.log(`正在分析数据文件: ${dataFile}`);
      
      // 加载数据
      const data = this.loadData(dataFile);
      
      // 生成文本报告
      this.generateTextReport(data);
      
      // 生成CSV报告
      const csvFilename = dataFile.replace('.json', '.csv');
      this.generateCSVReport(data, csvFilename);
      
    } catch (err) {
      console.error('数据分析过程中出错:', err);
    }
  }
}

// 如果直接运行此脚本，则执行分析
if (require.main === module) {
  const vis = new Visualization();
  
  // 获取命令行参数
  const args = process.argv.slice(2);
  const filename = args[0]; // 可选的文件名参数
  
  vis.runAnalysis(filename);
}

module.exports = Visualization;