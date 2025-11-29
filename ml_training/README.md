# SuperChess 机器学习训练系统

## 概述

本系统用于训练SuperChess AI引擎，通过自我对弈收集数据，并提供数据可视化分析功能。系统包含以下组件：

1. **轻量级AI引擎** - 专门用于高效自我对弈
2. **数据收集器** - 监听关键函数并记录训练数据
3. **训练运行器** - 执行AI自我对弈
4. **可视化工具** - 分析和可视化训练数据

## 目录结构

```
ml_training/
├── data/              # 训练数据存储目录
├── models/            # 训练好的模型存储目录
├── scripts/           # 训练脚本目录
│   ├── lightweight_ai.js    # 轻量级AI实现
│   ├── data_collector.js    # 数据收集器
│   ├── training_runner.js   # 训练运行器
│   └── visualization.js     # 可视化工具
├── main.js            # 主入口文件
└── package.json       # 项目配置文件
```

## 安装

```bash
cd ml_training
```

## 使用方法

### 1. 运行自我对弈训练

```bash
# 运行默认100局训练
node main.js train

# 运行指定局数训练
node main.js train 50
```

### 2. 分析训练数据

```bash
# 分析最新数据文件
node main.js analyze

# 分析指定数据文件
node main.js analyze training_data_2023-01-01.json
```

## 功能详解

### 轻量级AI引擎

该引擎是完整AI的简化版本，专为高效自我对弈设计：

- 使用Minimax算法和Alpha-Beta剪枝优化
- 搜索深度可配置（默认为2层）
- 包含子力价值评估函数
- 记录训练数据用于后续分析

### 数据收集器

监听两个关键函数：

1. **子力价值函数** - 评估当前棋盘局面的材料价值
2. **步法得分函数** - 评估特定移动的质量得分

### 训练运行器

- 执行AI自我对弈
- 控制游戏流程
- 限制最大步数防止无限游戏
- 定期保存训练数据

### 可视化工具

- 分析材料价值分布
- 分析移动得分分布
- 生成文本报告和CSV数据
- 支持自定义数据文件分析

## 数据格式

### 训练数据结构

```json
{
  "materialValueHistory": [
    {
      "timestamp": 1234567890,
      "boardState": {...},
      "materialValue": 1500,
      "player": "W"
    }
  ],
  "moveScoreHistory": [
    {
      "timestamp": 1234567890,
      "boardState": {...},
      "move": {"from": "e2", "to": "e4"},
      "score": 50,
      "player": "W"
    }
  ],
  "gameStates": [
    {
      "timestamp": 1234567890,
      "boardState": {...},
      "phase": "move_10"
    }
  ]
}
```

## 性能优化

1. **定期保存数据** - 每10局保存一次数据防止丢失
2. **限制搜索深度** - 默认2层搜索深度平衡性能和准确性
3. **数据压缩** - 只保存关键棋盘信息减少存储空间
4. **增量分析** - 支持分析特定数据文件

## 扩展建议

1. 集成TensorFlow.js进行更高级的机器学习训练
2. 添加更多评估维度（位置评估、控制域等）
3. 实现分布式训练支持
4. 添加图形化界面用于数据可视化