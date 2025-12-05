Page({

  data: {
    // 用户的当前选择
    boardStyle: "wood",
    volume: 70,

    // 可扩展的主题列表（未来更新时只需追加即可）
    boardStyles: [
      { label: "Wood 木纹", value: "wood" },
      { label: "天空幻境", value: "light-blue" },
      { label: "玫瑰金", value: "golden" }
    ],
  },

  onLoad() {
    // 若有存储，则加载用户设置
    const settings = wx.getStorageSync('settings');
    if (settings) {
      this.setData({
        boardStyle: settings.boardStyle,
        volume: settings.volume
      });
    }
  },

  /* -------------------------------
   * 事件监听：用户修改选项
   * ------------------------------- */
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