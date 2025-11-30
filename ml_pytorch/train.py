#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ML训练流程主入口脚本
负责协调模型、MCTS、数据管道和训练器，启动完整的AlphaZero训练流程
"""

import sys
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import importlib.util

# 确保可以导入同目录下的模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入配置
from config import CONFIG

# 导入本地模块
from rules import Rules

# 使用importlib导入以数字开头的模块
def import_module_from_file(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

# 动态导入模块
model_module = import_module_from_file("model1", "./1_model.py")
mcts_module = import_module_from_file("mcts2", "./2_mcts.py")
trainer_module = import_module_from_file("trainer3", "./3_trainer.py")
pipeline_module = import_module_from_file("pipeline4", "./4_pipeline.py")

# 获取类
AlphaZeroNet = model_module.AlphaZeroNet
MCTS = mcts_module.MCTS
Trainer = trainer_module.Trainer
DataPipeline = pipeline_module.DataPipeline


class SelfPlayGame:
    """自我对弈游戏模拟器"""
    
    def __init__(self, rules):
        self.rules = rules
        # 初始化棋盘状态（简化版）
        self.board = self._init_board()
        self.game_history = []
        
    def _init_board(self):
        """初始化棋盘"""
        # 创建一个简单的棋盘表示
        board = {
            'board': [[None for _ in range(10)] for _ in range(10)],
            'state': {
                'turn': 'W',
                'kingPos': {'W': 'e1', 'B': 'e10'},
                'castling': {'WK': True, 'WQ': True, 'BK': True, 'BQ': True}
            }
        }
        return board
    
    def play_game(self, model, mcts, num_simulations):
        """进行一局自我对弈"""
        game_data = []
        
        while not self._is_game_over():
            # 使用MCTS搜索最佳动作
            action_probs = mcts.search(self.board, model, num_simulations)
            
            # 选择动作
            action = self._select_action(action_probs)
            
            # 记录状态和动作概率
            state_tensor = self._board_to_tensor(self.board)
            game_data.append((state_tensor, action_probs))
            
            # 执行动作
            self._execute_action(action)
            
            # 切换回合
            self.board['state']['turn'] = 'B' if self.board['state']['turn'] == 'W' else 'W'
        
        # 获取游戏结果
        result = self._get_game_result()
        
        # 为每个状态添加结果标签
        training_data = [(state, probs, result) for state, probs in game_data]
        
        return training_data
    
    def _is_game_over(self):
        """检查游戏是否结束（简化版）"""
        # 简化实现，随机决定游戏是否结束
        import random
        return random.random() < 0.05  # 5%概率游戏结束
    
    def _select_action(self, action_probs):
        """根据动作概率选择动作"""
        # 简化实现，选择概率最高的动作
        if action_probs:
            return max(action_probs.keys(), key=lambda k: action_probs[k])
        return None
    
    def _execute_action(self, action):
        """执行动作"""
        # 简化实现，仅记录动作
        pass
    
    def _get_game_result(self):
        """获取游戏结果"""
        # 简化实现，随机生成结果
        import random
        result = random.choice([-1, 0, 1])  # -1:黑胜, 0:平局, 1:白胜
        return result
    
    def _board_to_tensor(self, board):
        """将棋盘转换为张量"""
        # 简化实现，创建一个随机张量
        return torch.randn(1, 3, 10, 10)


def main():
    """主训练流程"""
    print("开始启动AlphaZero训练流程...")
    
    # 1. 初始化配置
    cfg = CONFIG
    print(f"使用配置: {cfg}")
    
    # 2. 初始化组件
    rules = Rules()
    pipeline = DataPipeline((cfg['board_h'], cfg['board_w']), cfg['num_channels'])
    
    # 3. 初始化模型
    model = AlphaZeroNet(
        num_channels=cfg['num_channels'],
        num_actions=cfg['num_actions'],
        board_h=cfg['board_h'],
        board_w=cfg['board_w']
    )
    
    # 4. 初始化MCTS
    mcts = MCTS(rules, pipeline, cfg)
    
    # 5. 初始化训练器
    trainer = Trainer(rules, cfg)
    
    # 6. 自我对弈收集数据
    print("开始自我对弈收集数据...")
    all_training_data = []
    
    for game_idx in range(cfg['num_games']):
        print(f"正在进行第 {game_idx + 1}/{cfg['num_games']} 局游戏...")
        game = SelfPlayGame(rules)
        game_data = game.play_game(model, mcts, cfg['num_simulations'])
        all_training_data.extend(game_data)
    
    # 7. 准备训练数据
    if all_training_data:
        states, policies, values = zip(*all_training_data)
        states = torch.cat(states, dim=0)
        policies = torch.tensor([[p.get(a, 0) for a in range(cfg['num_actions'])] 
                                for p in policies], dtype=torch.float32)
        values = torch.tensor(values, dtype=torch.float32)
        
        dataset = TensorDataset(states, policies, values)
        dataloader = DataLoader(dataset, batch_size=cfg['batch_size'], shuffle=True)
        
        # 8. 训练模型
        print("开始训练模型...")
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        criterion_policy = nn.CrossEntropyLoss()
        criterion_value = nn.MSELoss()
        
        model.train()
        for epoch in range(cfg['epochs']):
            total_loss = 0
            for batch_states, batch_policies, batch_values in dataloader:
                optimizer.zero_grad()
                
                pred_policies, pred_values = model(batch_states)
                
                loss_policy = criterion_policy(pred_policies, batch_policies)
                loss_value = criterion_value(pred_values.squeeze(), batch_values)
                
                loss = loss_policy + loss_value
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            print(f"Epoch {epoch+1}/{cfg['epochs']}, Loss: {total_loss/len(dataloader):.4f}")
        
        print("模型训练完成！")
    else:
        print("没有收集到训练数据")
    
    print("训练流程完成！")


if __name__ == "__main__":
    main()