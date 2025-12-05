const app = getApp();
const Recorder = require('../../utils/recorder.js');

Page({
  data: {
    resultText: "游戏结束",
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
      "1-0": "白方获胜 (1-0)",
      "0-1": "黑方获胜 (0-1)",
      "0.5-0.5": "和棋 (0.5-0.5)"
    };

    const reasonMap = {
      "checkmate": "完成将杀",
      "resign": "认输",
      "timeout": "超时",
      "agreement": "协议和棋",
      "stall": "逼和",
      "illegal": "违规移动(处罚)",
      "unknown": ""
    };

    this.setData({
      resultText: resultMap[displayScore] || "游戏结束",
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