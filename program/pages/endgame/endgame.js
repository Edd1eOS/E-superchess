Page({
  data: {
    resultText: "Game Over",
    reasonText: ""
  },

  onLoad(options) {
    // 期望 options.result 为 "1-0" / "0-1" / "0.5-0.5"
    const result = options.result || "";
    const reason = options.reason || "";

    // 显示友好文本
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
      resultText: resultMap[result] || "Game Over",
      reasonText: reasonMap[reason] || (reason ? reason : "")
    });
  },

  // 跳转到复盘页面（复盘会从 recorder 中加载最近一局）
  goReplay() {
    wx.navigateTo({
      url: '/pages/replay/replay'
    });
  },

  // 返回主界面
  goMenu() {
    wx.reLaunch({
      url: '/pages/menu/menu'
    });
  }
});