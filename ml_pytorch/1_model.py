# 本文件是模型定义:定义DNN结构，实现前向传播，为MCTS提供策略和价值输出
import torch as t
import torch.nn as tnn
import torch.nn.functional as tnnf

# DNN模型架构
class AlphaZeroNet(tnn.Module):
    
    #以下五个参数：实例、输入、输出、棋盘长宽
    def __init__(self, num_channels, num_actions, board_h, board_w):
        super(AlphaZeroNet, self).__init__()

        #定义共享躯干
        self.shared = tnn.Sequential(
            tnn.Conv2d(num_channels, 32, kernel_size=3, padding=1),
            tnn.ReLU(),
            tnn.Conv2d(32, 64, kernel_size=3, padding=1),
            tnn.ReLU()
        )
        self.board_h = board_h
        self.board_w = board_w

        # 卷积层
        self.conv1 = tnn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.conv2 = tnn.Conv2d(128, 256, kernel_size=3, padding=1)

        # 策略头，映射到num_actions
        self.policy_head = tnn.Conv2d(256, num_actions, kernel_size=1)
        self.policy_fc = tnn.Linear(256 * board_h * board_w, num_actions)

        # 价值头, 映射到1
        self.value_conv = tnn.Conv2d(256, 1, kernel_size=1)
        self.value_fc1 = tnn.Linear(board_h * board_w, 256)
        self.value_fc2 = tnn.Linear(256, 1)

    def forward(self, x):
        # 前向传播
        x = self.shared(x)
        x = self.conv1(x)
        x = tnnf.relu(x)
        x = self.conv2(x)
        x = tnnf.relu(x)
        
        # 策略头
        policy = self.policy_head(x)
        policy = policy.view(policy.size(0), -1)
        policy = self.policy_fc(policy)
        policy = tnnf.softmax(policy, dim=1)
        
        # 价值头
        value = self.value_conv(x)
        value = value.view(value.size(0), -1)
        value = tnnf.relu(self.value_fc1(value))
        value = tnnf.tanh(self.value_fc2(value))
        
        return policy, value

# 运作原理（分步）：
# 1. 输入棋盘数据，输入数据为二维矩阵，大小为board_h * board_w，每个元素为0或1，0表示无子，1表示黑子，2表示白子
# 2. 输入数据经过卷积层，得到特征图，大小为board_h * board_w * 64
# 3. 输入数据经过池化层，得到池化特征图，大小为board_h / 2 * board_w / 2 * 64