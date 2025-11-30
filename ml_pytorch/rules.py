#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Python版本的游戏规则实现
基于JavaScript版本的rules.js转换
"""

class Rules:
    def __init__(self):
        """初始化规则类"""
        pass

    def parse_piece(self, p):
        """
        将棋盘存储的各种棋子表示统一解析为 { color, type }
        """
        if not p:
            return None
            
        if isinstance(p, str):
            color = p[0] if p[0] in ['W', 'B'] else None
            piece_type = p[1:] if color else p
            return {'color': color, 'type': piece_type}
            
        return {
            'color': p.get('color') or p.get('side') or None,
            'type': p.get('type') or p.get('name') or None,
            'raw': p  # 保留原始对象以备扩展使用
        }

    def to_rc(self, pos):
        """
        将位置字符串(如"a1")转换为行列坐标
        注意：这里使用与JavaScript版本相同的坐标系统
        """
        if not pos or len(pos) < 2:
            return None
            
        col_char = pos[0].lower()
        row_char = pos[1:]
        
        # 检查列字符是否有效 (a-j)
        if col_char < 'a' or col_char > 'j':
            return None
            
        try:
            # 转换为行列坐标 (r行, c列)
            c = ord(col_char) - ord('a')
            r = 10 - int(row_char)  # 与JavaScript版本一致的转换
            return {'r': r, 'c': c}
        except ValueError:
            return None

    def to_pos(self, r, c):
        """
        将行列坐标转换为位置字符串(如"a1")
        """
        if r < 0 or r > 9 or c < 0 or c > 9:
            return None
            
        col_char = chr(ord('a') + c)
        row_num = 10 - r
        return f"{col_char}{row_num}"

    def is_check(self, board, king_color):
        """
        检查是否处于将军状态
        :param board: 棋盘对象
        :param king_color: 被将军的王的颜色 ("W" 或 "B")
        :return: 是否被将军
        """
        # 获取王的位置
        king_pos = board['state']['kingPos'].get(king_color)
        if not king_pos:
            return False

        # 获取对方颜色
        opponent_color = 'B' if king_color == 'W' else 'W'

        # 遍历整个棋盘，查找对方所有棋子
        for r in range(10):
            for c in range(10):
                piece = board['board'][r][c]
                if piece and self.parse_piece(piece)['color'] == opponent_color:
                    # 检查这个棋子是否能攻击到王的位置
                    from_pos = self.to_pos(r, c)
                    if self.is_valid_move(board, from_pos, king_pos, opponent_color):
                        return True

        return False

    def is_valid_move(self, board, from_pos, to_pos, turn):
        """
        检查移动是否合法
        :param board: 棋盘对象
        :param from_pos: 起始位置 (如 "a1")
        :param to_pos: 目标位置 (如 "b2")
        :param turn: 当前行棋方 ("W" 或 "B")
        :return: 是否合法
        """
        # 如果起点或终点无效
        if not from_pos or not to_pos:
            return False

        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)

        # 获取并解析起点棋子
        raw_piece = board['board'][from_rc['r']][from_rc['c']]
        piece = self.parse_piece(raw_piece)

        # 如果没有棋子或者不是当前行棋方的棋子
        if not piece or piece['color'] != turn:
            return False

        # 解析目标格棋子并检查是否为己方
        raw_target = board['board'][to_rc['r']][to_rc['c']]
        target_piece = self.parse_piece(raw_target) if raw_target else None
        if target_piece and target_piece['color'] == piece['color']:
            return False

        # 根据棋子类型判断移动是否合法
        basic_valid = False
        piece_type = piece['type']
        
        if piece_type == 'P':  # 兵 (Pawn)
            basic_valid = self._is_valid_pawn_move(board, from_pos, to_pos, piece)
        elif piece_type == 'SP':  # 长矛兵 (Spearman)
            basic_valid = self._is_valid_spearman_move(board, from_pos, to_pos, piece)
        elif piece_type == 'N':  # 马 (Knight)
            basic_valid = self._is_valid_knight_move(from_pos, to_pos)
        elif piece_type == 'B':  # 象 (Bishop)
            basic_valid = self._is_valid_bishop_move(board, from_pos, to_pos)
        elif piece_type == 'R':  # 车 (Rook)
            basic_valid = self._is_valid_rook_move(board, from_pos, to_pos)
        elif piece_type == 'Q':  # 后 (Queen)
            basic_valid = self._is_valid_queen_move(board, from_pos, to_pos)
        elif piece_type == 'K':  # 王 (King)
            basic_valid = self._is_valid_king_move(board, from_pos, to_pos)
        elif piece_type == 'T':  # 圣殿骑士 (Templar)
            basic_valid = self._is_valid_templar_move(board, from_pos, to_pos, piece)
        elif piece_type == 'M':  # 元帅 (Marshall)
            basic_valid = self._is_valid_marshall_move(board, from_pos, to_pos, piece)
        elif piece_type == 'A':  # 刺客 (Assassin)
            basic_valid = self._is_valid_assassin_move(from_pos, to_pos)
        elif piece_type == 'LG':  # 弩兵 (Lineguard)
            basic_valid = self._is_valid_lineguard_move(from_pos, to_pos)
        else:
            return False

        # 如果基本移动不合法，则直接返回False
        if not basic_valid:
            return False

        # 创建一个临时棋盘来测试这个移动
        test_board = self._clone_board(board)
        
        # 执行移动
        self._execute_move(test_board, from_pos, to_pos)
        
        # 检查移动后是否自己被将军
        return not self.is_check(test_board, turn)

    def _clone_board(self, board):
        """
        克隆棋盘对象
        """
        import copy
        return copy.deepcopy(board)

    def _execute_move(self, board, from_pos, to_pos):
        """
        在棋盘上执行移动
        """
        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)

        # 移动棋子
        board['board'][to_rc['r']][to_rc['c']] = board['board'][from_rc['r']][from_rc['c']]
        board['board'][from_rc['r']][from_rc['c']] = None

        # 如果是王的移动，更新王的位置记录
        piece = board['board'][to_rc['r']][to_rc['c']]
        if piece and self.parse_piece(piece)['type'] == 'K':
            piece_color = self.parse_piece(piece)['color']
            board['state']['kingPos'][piece_color] = to_pos

    def _is_valid_pawn_move(self, board, from_pos, to_pos, piece):
        """检查兵(Pawn)的移动是否合法"""
        return self._is_valid_pawn_and_spearman_move(board, from_pos, to_pos, piece, 'P')

    def _is_valid_spearman_move(self, board, from_pos, to_pos, piece):
        """检查长矛兵(Spearman)的移动是否合法"""
        return self._is_valid_pawn_and_spearman_move(board, from_pos, to_pos, piece, 'SP')

    def _is_valid_pawn_and_spearman_move(self, board, from_pos, to_pos, piece, piece_type):
        """
        检查兵(Pawn)和长矛兵(Spearman)的通用移动规则
        """
        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)
        dr = to_rc['r'] - from_rc['r']
        dc = to_rc['c'] - from_rc['c']
        is_white = piece['color'] == 'W'
        direction = -1 if is_white else 1  # 白向上(r减小)，黑向下(r增大)

        # 直走：列不变
        if dc == 0:
            # 向前一格
            if dr == direction:
                # 检查是否到达底线需要升变
                is_promotion = (is_white and to_rc['r'] == 0) or (not is_white and to_rc['r'] == 9)
                if piece_type == 'P':
                    # P兵直走时目标必须为空
                    is_empty_target = board['board'][to_rc['r']][to_rc['c']] is None
                    return is_empty_target
                else:  # SP长矛兵
                    # SP长矛兵直走时目标可以不为空
                    if is_promotion:
                        return True
                    return True

            # 向前两格：仅在初始行允许
            if dr == 2 * direction:
                # 白方在第3行(r=7)，黑方在第8行(r=2)
                is_on_starting_rank = (is_white and from_rc['r'] == 7) or (not is_white and from_rc['r'] == 2)
                if is_on_starting_rank:
                    # 检查中间格是否为空
                    mid_r = from_rc['r'] + direction
                    is_mid_empty = board['board'][mid_r][from_rc['c']] is None
                    if is_mid_empty:
                        if piece_type == 'P':
                            # P兵需要目标格也为空
                            is_target_empty = board['board'][to_rc['r']][to_rc['c']] is None
                            return is_target_empty
                        else:  # SP长矛兵
                            return True
                return False

        # 斜吃：前进一格且横向一格
        elif abs(dc) == 1 and dr == direction:
            target_piece = board['board'][to_rc['r']][to_rc['c']]
            # 必须有目标棋子才能吃子
            if target_piece is not None:
                target = self.parse_piece(target_piece)
                # 不能吃己方棋子
                if target['color'] != piece['color']:
                    return True
            return False

        return False

    def _is_valid_knight_move(self, from_pos, to_pos):
        """检查马(Knight)的移动是否合法"""
        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)
        dr = abs(to_rc['r'] - from_rc['r'])
        dc = abs(to_rc['c'] - from_rc['c'])
        
        # 走"日"字：2格纵向+1格横向，或2格横向+1格纵向
        return (dr == 2 and dc == 1) or (dr == 1 and dc == 2)

    def _is_valid_bishop_move(self, board, from_pos, to_pos):
        """检查象(Bishop)的移动是否合法"""
        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)
        dr = to_rc['r'] - from_rc['r']
        dc = to_rc['c'] - from_rc['c']
        
        # 斜线移动：行差等于列差（非零）
        if abs(dr) == abs(dc) and dr != 0:
            return self._is_path_clear(board, from_pos, to_pos)
        return False

    def _is_valid_rook_move(self, board, from_pos, to_pos):
        """检查车(Rook)的移动是否合法"""
        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)
        dr = to_rc['r'] - from_rc['r']
        dc = to_rc['c'] - from_rc['c']
        
        # 直线移动：行差或列差为0（非同时为0）
        if (dr == 0 and dc != 0) or (dr != 0 and dc == 0):
            return self._is_path_clear(board, from_pos, to_pos)
        return False

    def _is_valid_queen_move(self, board, from_pos, to_pos):
        """检查后(Queen)的移动是否合法"""
        # 后 = 车 + 象
        return self._is_valid_rook_move(board, from_pos, to_pos) or \
               self._is_valid_bishop_move(board, from_pos, to_pos)

    def _is_valid_king_move(self, board, from_pos, to_pos):
        """检查王(King)的移动是否合法"""
        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)
        dr = abs(to_rc['r'] - from_rc['r'])
        dc = abs(to_rc['c'] - from_rc['c'])
        
        # 一步移动到相邻格子
        if dr <= 1 and dc <= 1 and (dr + dc > 0):
            return True
            
        # 王车易位（简化处理）
        # 这里应该实现完整的王车易位逻辑，但为了简化，暂时只检查基本移动
        return False

    def _is_valid_templar_move(self, board, from_pos, to_pos, piece):
        """检查圣殿骑士(Templar)的移动是否合法"""
        # Templar = Bishop + Knight
        return self._is_valid_bishop_move(board, from_pos, to_pos) or \
               self._is_valid_knight_move(from_pos, to_pos)

    def _is_valid_marshall_move(self, board, from_pos, to_pos, piece):
        """检查元帅(Marshall)的移动是否合法"""
        # Marshall = Rook + Knight
        return self._is_valid_rook_move(board, from_pos, to_pos) or \
               self._is_valid_knight_move(from_pos, to_pos)

    def _is_valid_assassin_move(self, from_pos, to_pos):
        """检查刺客(Assassin)的移动是否合法"""
        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)
        dr = abs(to_rc['r'] - from_rc['r'])
        dc = abs(to_rc['c'] - from_rc['c'])

        # 2格内的直线或斜线移动
        return (dr <= 2 and dc <= 2) and (dr + dc > 0) and (dr == 0 or dc == 0 or dr == dc)

    def _is_valid_lineguard_move(self, from_pos, to_pos):
        """检查线卫(Lineguard)的移动是否合法"""
        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)
        dr = abs(to_rc['r'] - from_rc['r'])
        dc = abs(to_rc['c'] - from_rc['c'])

        # 四个方向移动一格
        return (dr <= 1 and dc <= 1) and (dr + dc == 1)

    def _is_path_clear(self, board, from_pos, to_pos):
        """
        检查路径是否畅通（用于象、车、后）
        """
        from_rc = self.to_rc(from_pos)
        to_rc = self.to_rc(to_pos)
        dr = to_rc['r'] - from_rc['r']
        dc = to_rc['c'] - from_rc['c']

        # 计算步长
        step_r = 0 if dr == 0 else dr // abs(dr)
        step_c = 0 if dc == 0 else dc // abs(dc)

        # 检查路径上的每一个格子（除了起点和终点）
        r = from_rc['r'] + step_r
        c = from_rc['c'] + step_c

        while r != to_rc['r'] or c != to_rc['c']:
            if board['board'][r][c] is not None:
                return False  # 有阻挡
            r += step_r
            c += step_c

        return True