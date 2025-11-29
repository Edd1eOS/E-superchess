const app = getApp();
const Recorder = require('../../utils/recorder.js');

Page({
  data: {
    resultText: "Game Over",
    reasonText: ""
  },

  onLoad(options) {
    // 支持多种传参形式：
    // - result=win&winner=W/B&reason=checkmate|resign
    // - result=draw&score=0.5-0.5&reason=agreement
    // - 或直接 result=1-0 / 0-1 / 0.5-0.5
    const rawResult = options.result || "";
    const winner = options.winner || "";
    const score = options.score || "";
    const reason = options.reason || "";

    // 规范化比分为 "1-0" / "0-1" / "0.5-0.5"
    let displayScore = "";
    if (rawResult === 'win' && (winner === 'W' || winner === 'B')) {
      displayScore = winner === 'W' ? '1-0' : '0-1';
    } else if (rawResult === 'draw') {
      displayScore = score || '0.5-0.5';
    } else if (['1-0', '0-1', '0.5-0.5'].includes(rawResult)) {
      displayScore = rawResult;
    } else {
      displayScore = score || rawResult || '';
    }

    const resultMap = {
      "1-0": "White wins (1-0)",
      "0-1": "Black wins (0-1)",
      "0.5-0.5": "Draw (0.5-0.5)"
    };

    const reasonMap = {
      "checkmate": "Checkmate",
      "resign": "Resignation",
      "timeout": "Timeout",
      "agreement": "Draw by agreement",
      "stall": "Stalemate",
      "illegal": "Illegal move (penalty)",
      "unknown": ""
    };

    this.setData({
      resultText: resultMap[displayScore] || "Game Over",
      reasonText: reasonMap[reason] || (reason ? reason : "")
    });
  },

  // 返回主界面
  goMenu() {
    wx.reLaunch({
      url: '/program/pages/menu/menu'
    });
  }
});