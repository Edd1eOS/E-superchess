/**
 * 简化版 AlphaZero 风格 MCTS（支持异步 policyValueFn）
 *
 * 依赖通过构造函数注入：
 * - getLegalMoves(board): 返回合法走子数组 [{ from, to, ... }]
 * - applyMove(board, move): 返回执行走子后、并切换行棋方的新棋盘对象
 * - policyValueFn(board, legalMoves): 异步，返回 { policy: number[], value: number }
 *    policy.length === legalMoves.length
 */

class MCTSNode {
  constructor(parent = null, move = null, priorP = 0) {
    this.parent = parent;
    this.move = move;        // 从父节点到本节点的走子
    this.P = priorP;         // 先验概率 (来自策略网络)
    this.N = 0;              // 访问次数
    this.W = 0;              // 价值和
    this.Q = 0;              // 平均价值

    this.children = [];      // 子节点数组
    this.isExpanded = false; // 是否已经扩展
    this.isTerminal = false; // 是否终局
  }
}

class MCTS {
  /**
   * @param {Object} options
   * @param {number} options.numSimulations - 每次搜索模拟次数
   * @param {function} options.getLegalMoves - (board) => moves[]
   * @param {function} options.applyMove - (board, move) => newBoard
   * @param {function} options.policyValueFn - 异步 (board, legalMoves) => { policy, value }
   * @param {number} [options.cPuct] - UCB 探索系数
   */
  constructor(options) {
    this.numSimulations = options.numSimulations || 800;
    this.getLegalMoves = options.getLegalMoves;
    this.applyMove = options.applyMove;
    this.policyValueFn = options.policyValueFn;
    this.cPuct = options.cPuct || 1.5;
  }

  /**
   * 从根局面出发进行搜索，返回访问次数最多的走子
   * @param {Object} rootBoard
   * @returns {Promise<Object|null>} move
   */
  async getBestMove(rootBoard) {
    const root = new MCTSNode(null, null, 1);

    for (let i = 0; i < this.numSimulations; i++) {
      // 每次模拟都从根开始，用克隆的棋盘避免互相污染
      const rootClone = JSON.parse(JSON.stringify(rootBoard));
      await this._simulate(root, rootClone);
    }

    if (root.children.length === 0) {
      return null;
    }

    // 选择访问次数最多的子节点对应的走子
    let bestChild = root.children[0];
    for (const child of root.children) {
      if (child.N > bestChild.N) {
        bestChild = child;
      }
    }
    return bestChild.move;
  }

  /**
   * 单次模拟：选择 -> 扩展/评估 -> 回传
   * @param {MCTSNode} node
   * @param {Object} board
   * @returns {Promise<number>} 节点价值（从当前行棋方视角）
   */
  async _simulate(node, board) {
    // 1. 如果还没扩展，则扩展并用网络评估
    if (!node.isExpanded) {
      const legalMoves = this.getLegalMoves(board);

      // 没有合法着法，视作终局和棋 / 小负局面，这里简单返回 0
      if (!legalMoves || legalMoves.length === 0) {
        node.isExpanded = true;
        node.isTerminal = true;
        const value = 0;
        this._backpropagate(node, value);
        return value;
      }

      // 使用神经网络获取策略与价值
      const { policy, value } = await this.policyValueFn(board, legalMoves);

      // policy 长度应与 legalMoves 一致，做一层保护
      const priors = Array.isArray(policy) && policy.length === legalMoves.length
        ? policy
        : new Array(legalMoves.length).fill(1 / legalMoves.length);

      // 归一化
      const sumP = priors.reduce((a, b) => a + b, 0) || 1;

      for (let i = 0; i < legalMoves.length; i++) {
        const child = new MCTSNode(node, legalMoves[i], priors[i] / sumP);
        node.children.push(child);
      }

      node.isExpanded = true;

      this._backpropagate(node, value);
      return value;
    }

    // 2. 如果是终局节点，直接回传当前价值
    if (node.isTerminal || node.children.length === 0) {
      const value = 0;
      this._backpropagate(node, value);
      return value;
    }

    // 3. 选择阶段：根据 UCB 选择子节点
    const child = this._selectChild(node);

    // 4. 前进一步
    const nextBoard = this.applyMove(board, child.move);

    // 5. 递归模拟，注意价值符号取反（轮换视角）
    const value = await this._simulate(child, nextBoard);
    const negValue = -value;
    this._backpropagate(node, negValue);
    return negValue;
  }

  /**
   * 使用 UCB 选择子节点
   * @param {MCTSNode} node
   * @returns {MCTSNode}
   */
  _selectChild(node) {
    const parentVisitSum = Math.max(1, node.N);
    let bestScore = -Infinity;
    let bestChild = node.children[0];

    for (const child of node.children) {
      const Q = child.Q;
      const U = this.cPuct * child.P * Math.sqrt(parentVisitSum) / (1 + child.N);
      const score = Q + U;
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    return bestChild;
  }

  /**
   * 从该节点向上回传价值
   * @param {MCTSNode} node
   * @param {number} value
   */
  _backpropagate(node, value) {
    let cur = node;
    let v = value;
    while (cur) {
      cur.N += 1;
      cur.W += v;
      cur.Q = cur.W / cur.N;

      // 上一层视角翻转
      v = -v;
      cur = cur.parent;
    }
  }
}

module.exports = MCTS;


