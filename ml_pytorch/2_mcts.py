# 本文件是搜索算法，基于MCTS决策树的Nerual MCTS算法
# 负责：实现MCTS算法（与1_model.py中的DNN模型进行交互协同）
# 变化： Rollout环节变为调用DNN

# MCT算法（从/program/utils/rules.js获取规则；从/program/utils/ai.js获取AI决策逻辑）
import importlib.util
import sys
import torch
import math

# 动态导入以数字开头的模块
spec1 = importlib.util.spec_from_file_location("model1", "./1_model.py")
model1 = importlib.util.module_from_spec(spec1)
sys.modules["model1"] = model1
spec1.loader.exec_module(model1)
AlphaZeroNet = model1.AlphaZeroNet

spec4 = importlib.util.spec_from_file_location("pipeline4", "./4_pipeline.py")
pipeline4 = importlib.util.module_from_spec(spec4)
sys.modules["pipeline4"] = pipeline4
spec4.loader.exec_module(pipeline4)
DataPipeline = pipeline4.DataPipeline


class MCTSNode:
    def __init__(self, prior=0):
        self.prior = prior
        self.children = {}
        self.visit_count = 0
        self.value_sum = 0
        self.policy = None
        self.parent = None
    
    def expanded(self):
        return len(self.children) > 0
    
    def value(self):
        if self.visit_count == 0:
            return 0
        return self.value_sum / self.visit_count
    
    def expand(self, policy):
        """根据策略展开子节点"""
        self.policy = policy
        for action, prob in enumerate(policy):
            if prob > 0:
                self.children[action] = MCTSNode(prior=prob)
                self.children[action].parent = self


class MCTS:
    def __init__(self, rules, pipeline, config):
        self.rules = rules
        self.pipeline = pipeline
        self.config = config
        self.model = AlphaZeroNet(config['num_channels'], config['num_actions'], config['board_h'], config['board_w'])
        self.root = None

    def search(self, board, model, num_simulations):
        """执行MCTS搜索"""
        # 初始化根节点
        self.root = MCTSNode()
        
        for _ in range(num_simulations):
            node = self.root
            current_board = board
            
            # 选择阶段：从根节点到叶节点
            while node.expanded():
                action, node = self._select_child(node)
                # 这里应该执行动作更新棋盘状态，简化处理
                current_board = self._apply_action(current_board, action)
            
            # 扩展和评估阶段
            tensor_state = self.pipeline.board2tensor(current_board)
            with torch.no_grad():
                policy, value = model(tensor_state)
            
            # 扩展节点
            node.expand(policy.flatten().tolist())
            
            # 反向传播
            self._backpropagate(node, value.item())

        # 返回动作概率分布
        return self._get_action_probs(self.root)
    
    def _select_child(self, node):
        """使用PUCT算法选择子节点"""
        best_score = -float('inf')
        best_action = -1
        best_child = None
        
        for action, child in node.children.items():
            score = self._compute_ucb_score(node, child)
            if score > best_score:
                best_score = score
                best_action = action
                best_child = child
                
        return best_action, best_child
    
    def _compute_ucb_score(self, parent, child):
        """计算UCB分数（PUCT算法）"""
        pb_c = math.log((parent.visit_count + 19652) / 19652) + 1.25
        pb_c *= math.sqrt(parent.visit_count) / (child.visit_count + 1)
        
        prior_score = pb_c * child.prior
        value_score = child.value()
        
        return value_score + prior_score
    
    def _apply_action(self, board, action):
        """应用动作到棋盘（简化实现）"""
        # 简化处理，实际应根据action解析并应用具体动作
        return board
    
    def _backpropagate(self, node, value):
        """反向传播更新节点统计信息"""
        while node is not None:
            node.visit_count += 1
            node.value_sum += value
            node = node.parent
    
    def _get_action_probs(self, node):
        """根据访问次数返回动作概率"""
        action_visits = [(action, child.visit_count) for action, child in node.children.items()]
        total_visits = sum(visits for _, visits in action_visits)
        
        if total_visits == 0:
            # 如果没有访问，均匀分布
            return {action: 1.0/len(action_visits) for action, _ in action_visits} if action_visits else {}
        
        # 根据访问次数计算概率
        return {action: visits/total_visits for action, visits in action_visits}