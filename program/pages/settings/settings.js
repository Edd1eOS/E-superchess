Page({

  data: {
    // 用户的当前选择
    boardStyle: "wood",
    volume: 70,
    soundType: "wooden",

    // 可扩展的主题列表（未来更新时只需追加即可）
    boardStyles: [
      { label: "Wood 木纹", value: "wood" },
      { label: "天空幻境", value: "light-blue" },
      { label: "玫瑰金", value: "golden" }
    ],
    
    soundTypes: [
      { label: "原木 Wooden", value: "wooden", file: "/program/assets(sucaiku)/sounds/wooden_move.mp3" },
      { label: "玻璃 Glass", value: "glass", file: "/program/assets(sucaiku)/sounds/glass_move.mp3" },
      { label: "喵 meow", value: "meow", file: "/program/assets(sucaiku)/sounds/cat_meow.mp3" }
    ]
  },

  onLoad() {
    // 若有存储，则加载用户设置
    const settings = wx.getStorageSync('settings');
    if (settings) {
      this.setData({
        boardStyle: settings.boardStyle,
        volume: settings.volume,
        soundType: settings.soundType || "wooden"
      });
    }
    
    // 创建音频上下文
    this.initAudioContext();
  },

  initAudioContext() {
    // 销毁旧的音频上下文
    if (this.audioCtx) {
      this.audioCtx.destroy();
    }
    
    // 创建新的音频上下文
    this.audioCtx = wx.createInnerAudioContext();
    
    // 设置当前音效文件
    const currentSound = this.data.soundTypes.find(sound => sound.value === this.data.soundType);
    if (currentSound) {
      this.audioCtx.src = currentSound.file;
    }
  },

  onUnload() {
    // 页面卸载时销毁音频上下文
    if (this.audioCtx) {
      this.audioCtx.destroy();
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

  onSoundTypeChange(e) {
    this.setData({ 
      soundType: e.detail.value
    }, () => {
      // 当音效类型改变时重新初始化音频上下文
      this.initAudioContext();
    });
  },

  playSampleSound() {
    if (this.audioCtx) {
      this.audioCtx.volume = this.data.volume / 100;
      this.audioCtx.play();
    }
  },

  /* -------------------------------
   * 保存设置
   * ------------------------------- */
  saveSettings() {
    const settings = {
      boardStyle: this.data.boardStyle,
      volume: this.data.volume,
      soundType: this.data.soundType
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