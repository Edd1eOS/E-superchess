# 本文件是模型定义:定义DNN结构，实现前向传播，为MCTS提供策略和价值输出
import torch as t
import torch.nn as tnn
import torch.nn.functional as tnnf

# DNN模型架构
class AlphaZeroNet(tnn.Module):
    
    #以下参数：输入通道数、动作数、棋盘高、棋盘宽
    def __init__(self, num_channels, num_actions, board_h, board_w):
        super(AlphaZeroNet, self).__init__()

        # 定义共享躯干
        self.shared = tnn.Sequential(
            tnn.Conv2d(num_channels, 32, kernel_size=3, padding=1),
            tnn.BatchNorm2d(32),
            tnn.ReLU(),
            tnn.Conv2d(32, 64, kernel_size=3, padding=1),
            tnn.BatchNorm2d(64),
            tnn.ReLU(),
            tnn.Conv2d(64, 128, kernel_size=3, padding=1),
            tnn.BatchNorm2d(128),
            tnn.ReLU()
        )
        self.board_h = board_h
        self.board_w = board_w

        # 策略头，映射到num_actions
        self.policy_head = tnn.Sequential(
            tnn.Conv2d(128, 64, kernel_size=1),
            tnn.BatchNorm2d(64),
            tnn.ReLU(),
            tnn.Flatten(),
            tnn.Linear(64 * board_h * board_w, num_actions)
        )

        # 价值头, 映射到1
        self.value_head = tnn.Sequential(
            tnn.Conv2d(128, 32, kernel_size=1),
            tnn.BatchNorm2d(32),
            tnn.ReLU(),
            tnn.Flatten(),
            tnn.Linear(32 * board_h * board_w, 256),
            tnn.ReLU(),
            tnn.Linear(256, 1),
            tnn.Tanh()
        )

    def forward(self, x):
        # 前向传播
        shared_features = self.shared(x)
        
        # 策略头
        policy = self.policy_head(shared_features)
        policy = tnnf.softmax(policy, dim=1)
        
        # 价值头
        value = self.value_head(shared_features)
        
        return policy, value

# 运作原理（分步）：
# 1. 输入棋盘数据，输入数据为多通道张量，每个通道表示一种棋子状态
# 2. 输入数据经过共享躯干的多个卷积+BN+ReLU层，提取深层空间特征
# 3. 特征分别送入策略头和价值头：
#    - 策略头输出各动作的logits，经softmax转为概率分布
#    - 价值头输出标量，经tanh压缩到[-1,1]表示胜率期望