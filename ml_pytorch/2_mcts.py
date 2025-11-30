# 本文件是搜索算法，基于MCTS决策树的Nerual MCTS算法
# 负责：实现MCTS算法（与1_model.py中的DNN模型进行交互协同）
# 变化： Rollout环节变为调用DNN

# MCT算法（从/program/utils/rules.js获取规则；从/program/utils/ai.js获取AI决策逻辑）
import importlib.util
import sys
import torch

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
    
    def expanded(self):
        return len(self.children) > 0
    
    def value(self):
        if self.visit_count == 0:
            return 0
        return self.value_sum / self.visit_count

class MCTS:
    def __init__(self, rules, pipeline, config):
        self.rules = rules
        self.pipeline = pipeline
        self.config = config
        self.model = AlphaZeroNet(config['num_channels'], config['num_actions'], config['board_h'], config['board_w'])
        self.root = None

    def search(self, board, model, num_simulations):
        # 初始化根节点
        self.root = MCTSNode()
        
        for _ in range(num_simulations):
            node = self._select_node()  # 使用PUCT
            
            # 如果是叶节点（未展开的节点）
            if not node.expanded():
                tensor_state = self.pipeline.board2tensor(board)
                with torch.no_grad():
                    policy, value = model(tensor_state)
                
                # 展开节点
                self._expand_node(node, policy)
                
                # 反向传播
                self._backpropagate(node, value.item())

        # 返回MCTS访问次数最高的move作为最优行动
        return self._get_action_probs(self.root)
    
    def _select_node(self):
        # 简化的节点选择逻辑
        node = self.root
        while node.expanded():
            # 这里应该实现PUCT算法选择下一个子节点
            # 为了简化，我们只选择第一个子节点
            node = next(iter(node.children.values()))
        return node
    
    def _expand_node(self, node, policy):
        # 简化的节点展开逻辑
        # 这里应该根据策略分布创建子节点
        for i, prob in enumerate(policy.flatten()):
            if prob > 0:
                node.children[i] = MCTSNode(prior=prob)
    
    def _backpropagate(self, node, value):
        # 反向传播更新节点统计信息
        while node is not None:
            node.visit_count += 1
            node.value_sum += value
            # 在实际实现中，应该沿着父节点路径向上回溯
            # 这里简化为只更新当前节点
            break
    
    def _get_action_probs(self, node):
        # 根据访问次数返回动作概率
        # 这是一个简化的实现
        return {action: child.visit_count for action, child in node.children.items()}