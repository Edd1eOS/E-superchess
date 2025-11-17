Page({

  data: {
    // 用户的当前选择
    pieceStyle: "classic",
    boardStyle: "wood",
    volume: 70,

    // 可扩展的主题列表（未来更新时只需追加即可）
    pieceStyles: [
      { label: "Classic 经典", value: "classic" },
      { label: "Modern 现代", value: "modern" },
      { label: "Medieval 中世纪", value: "medieval" }
    ],

    boardStyles: [
      { label: "Wood 木纹", value: "wood" },
      { label: "Marble 大理石", value: "marble" },
      { label: "Dark 暗色", value: "dark" }
    ],
  },

  onLoad() {
    // 若有存储，则加载用户设置
    const settings = wx.getStorageSync('settings');
    if (settings) {
      this.setData({
        pieceStyle: settings.pieceStyle,
        boardStyle: settings.boardStyle,
        volume: settings.volume
      });
    }
  },

  /* -------------------------------
   * 事件监听：用户修改选项
   * ------------------------------- */
  onPieceStyleChange(e) {
    this.setData({ pieceStyle: e.detail.value });
  },

  onBoardStyleChange(e) {
    this.setData({ boardStyle: e.detail.value });
  },

  onVolumeChange(e) {
    this.setData({ volume: e.detail.value });
  },

  /* -------------------------------
   * 保存设置
   * ------------------------------- */
  saveSettings() {
    const settings = {
      pieceStyle: this.data.pieceStyle,
      boardStyle: this.data.boardStyle,
      volume: this.data.volume
    };

    wx.setStorageSync('settings', settings);

    wx.showToast({
      title: "已保存",
      icon: "success"
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 300);
  }

});