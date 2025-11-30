# 本文件是训练脚本，负责训练基于神经网络和MCTS的superchess引擎
# 负责：
#1.Selfplay
#2.Update

# 3_trainer.py 示例结构
import torch
import torch.nn.functional as F
import torch.optim as optim
import importlib.util
import sys

# 动态导入模块
spec1 = importlib.util.spec_from_file_location("model1", "./1_model.py")
model1 = importlib.util.module_from_spec(spec1)
sys.modules["model1"] = model1
spec1.loader.exec_module(model1)
AlphaZeroNet = model1.AlphaZeroNet

spec2 = importlib.util.spec_from_file_location("mcts2", "./2_mcts.py")
mcts2 = importlib.util.module_from_spec(spec2)
sys.modules["mcts2"] = mcts2
spec2.loader.exec_module(mcts2)
MCTS = mcts2.MCTS 


class Trainer:
    def __init__(self, game_rules, config):
        # 1. 初始化模型
        self.model = AlphaZeroNet(config['num_channels'], config['num_actions'], 
                                  config['board_h'], config['board_w'])
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)
        self.mcts = MCTS(game_rules, None, config)  # pipeline暂时设为None
        self.training_data = []
        self.config = config

    def run_self_play(self, num_games):
        """运行自我对弈"""
        # 这里应该实现完整的自我对弈逻辑
        # 为简化，我们只打印信息
        print(f"运行 {num_games} 局自我对弈游戏")
        # 实际实现应该：
        # 1. 初始化游戏状态
        # 2. 使用MCTS搜索动作
        # 3. 执行动作并更新游戏状态
        # 4. 记录状态、动作概率和游戏结果
        # 5. 直到游戏结束
        # 6. 返回训练数据

    def train_step(self, data_loader):
        """训练步骤"""
        self.model.train()
        total_loss = 0
        for states, pi_targets, z_targets in data_loader:
            self.optimizer.zero_grad()
            
            p_logits, v_preds = self.model(states)
            
            # 策略损失 (交叉熵)
            log_p = F.log_softmax(p_logits, dim=1)
            policy_loss = -torch.sum(pi_targets * log_p, dim=1).mean()
            
            # 价值损失 (MSE)
            value_loss = F.mse_loss(v_preds.squeeze(), z_targets.float())
            
            total_loss = policy_loss + value_loss  # + regularization_term
            
            total_loss.backward()
            self.optimizer.step()
            
        return total_loss.item()