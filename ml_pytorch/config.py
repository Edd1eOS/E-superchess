# 训练配置参数

CONFIG = {
    'num_channels': 3,           # 输入通道数
    'num_actions': 64*64,       # 动作空间大小 (64x64棋盘的每个位置到每个位置)
    'board_h': 10,              # 棋盘高度
    'board_w': 10,              # 棋盘宽度
    'num_simulations': 800,     # MCTS模拟次数
    'num_games': 100,           # 自我对弈局数
    'batch_size': 32,           # 训练批次大小
    'epochs': 10                # 训练轮数
}