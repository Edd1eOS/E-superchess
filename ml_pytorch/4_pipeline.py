# 本文件用于数据处理
#负责：将Superchess board（from rules.js）转换为Pytorch Tensor（处理CHannels所需逻辑）
import torch as t

class DataPipeline:
    def __init__(self, board_dims, num_channels):
        self.num_channels = num_channels
        self.board_h, self.board_w = board_dims

    def board2tensor(self, board):
        tensor = t.zeros((self.num_channels, self.board_h, self.board_w))
        for i in range(self.board_h):
            for j in range(self.board_w):
                if board[i][j] == 1:
                    tensor[0, i, j] = 1  # 第一个通道表示某种棋子
                elif board[i][j] == 2:
                    tensor[1, i, j] = 1  # 第二个通道表示另一种棋子
                # 可以添加更多通道表示其他特征
        
        return tensor.unsqueeze(0)  # 返回批次维度为1的张量