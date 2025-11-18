class Recorder {
  constructor() {
    this.moves = [];
  }

  // 记录移动
  recordMove(move) {
    this.moves.push(move);
  }

  // 撤销
  undo() {
    return this.moves.pop();
  }

  // 是否可以撤销
  canUndo() {
    return this.moves.length > 0;
  }
}

module.exports = Recorder;