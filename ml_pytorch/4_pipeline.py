# 本文件用于数据处理
#负责：将Superchess board（from rules.js）转换为Pytorch Tensor（处理CHannels所需逻辑）
import torch as t

class DataPipeline:
    def __init__(self, board_dims, num_channels):
        self.num_channels = num_channels
        self.board_h, self.board_w = board_dims

    def board2tensor(self, board):
        """将棋盘转换为张量"""
        tensor = t.zeros((self.num_channels, self.board_h, self.board_w))
        
        # 如果board是字典格式（来自JavaScript规则）
        if isinstance(board, dict) and 'board' in board:
            board_data = board['board']
        else:
            board_data = board
            
        for i in range(self.board_h):
            for j in range(self.board_w):
                piece = board_data[i][j]
                if piece is not None:
                    # 简化处理，根据棋子类型填充不同的通道
                    if isinstance(piece, dict):
                        piece_type = piece.get('type', '')
                        piece_color = piece.get('color', '')
                    elif isinstance(piece, str):
                        piece_color = piece[0] if piece[0] in ['W', 'B'] else ''
                        piece_type = piece[1:] if piece_color else piece
                    else:
                        continue
                        
                    # 根据棋子类型和颜色填充张量
                    channel = self._get_channel_for_piece(piece_type, piece_color)
                    if 0 <= channel < self.num_channels:
                        tensor[channel, i, j] = 1
        
        return tensor.unsqueeze(0)  # 返回批次维度为1的张量
    
    def _get_channel_for_piece(self, piece_type, piece_color):
        """根据棋子类型和颜色确定通道"""
        # 简化映射，实际应该根据具体需求调整
        piece_types = ['P', 'N', 'B', 'R', 'Q', 'K', 'SP', 'T', 'M', 'A', 'LG']
        try:
            type_index = piece_types.index(piece_type)
            # 白子在前半部分通道，黑子在后半部分通道
            if piece_color == 'W':
                return type_index % self.num_channels
            else:
                return (type_index + len(piece_types)) % self.num_channels
        except ValueError:
            return 0  # 默认返回第一个通道