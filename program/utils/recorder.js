class Recorder {
  constructor() {
    this.moves = [];
  }

  // 记录移动操作
  recordMove(snapshot) {
    this.moves.push(snapshot);
  }

  // 撤销操作
  undo() {
    return this.moves.pop();
  }

  // 是否可以撤销
  canUndo() {
    return this.moves.length > 0;
  }


  
  // 恢复棋盘状态（包括升变）
  restoreBoardState(board, move) {
    // 恢复棋盘状态
    board.board = JSON.parse(JSON.stringify(move.beforeState.board));
    board.state = JSON.parse(JSON.stringify(move.beforeState.state));
    
    // 如果这是升变操作，不需要额外处理，因为已经在board状态中包含了升变后的棋子
  }
}

module.exports = Recorder;