
App({
  globalData: {
    version: "1.0.0",
    aiLevel: 1,
    theme: "classic",
    gameHistory: [], // 存放本地对局记录
  },

  onLaunch() {
    console.log("Chess Pro 启动成功");
    this.initSettings();
  },

  onShow() {
    console.log("小程序进入前台");
  },

  onHide() {
    console.log("小程序进入后台运行");
  },

  initSettings() {
    // 可以从本地缓存加载设置（比如AI等级、主题）
    try {
      const settings = wx.getStorageSync('settings');
      if (settings) this.globalData = { ...this.globalData, ...settings };
    } catch (e) {
      console.warn("从本地缓存载入设置失败，使用默认配置");
    }
  }
});