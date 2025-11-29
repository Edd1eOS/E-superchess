Page({

  data: {
    showPvESettings: false,
    pveSettings: {
      white: {
        type: 'human', // human | ai
        level: 1
      },
      black: {
        type: 'ai', // human | ai
        level: 1
      }
    }
  },

  goPVP() {
    wx.navigateTo({
      url: '/program/pages/chess/chess?mode=pvp'
    })
  },

  goPVE() {
    // 显示PvE设置对话框
    this.setData({
      showPvESettings: true
    })
  },

  goSettings() {
    wx.navigateTo({
      url: '/program/pages/settings/settings'
    })
  },

  hidePvESettings() {
    this.setData({
      showPvESettings: false
    })
  },

  confirmPvESettings() {
    const { white, black } = this.data.pveSettings
    
    // 构造查询参数
    const params = []
    params.push(`mode=pve`)
    params.push(`whiteType=${white.type}`)
    params.push(`whiteLevel=${white.type === 'ai' ? white.level : 0}`)
    params.push(`blackType=${black.type}`)
    params.push(`blackLevel=${black.type === 'ai' ? black.level : 0}`)
    
    this.setData({
      showPvESettings: false
    })
    
    wx.navigateTo({
      url: `/program/pages/chess/chess?${params.join('&')}`
    })
  },

  onWhiteTypeChange(e) {
    const type = e.detail.value
    this.setData({
      'pveSettings.white.type': type
    })
  },

  onWhiteLevelChange(e) {
    // picker返回的是索引，需要加1转换为实际等级
    const level = parseInt(e.detail.value) + 1
    this.setData({
      'pveSettings.white.level': level
    })
  },

  onBlackTypeChange(e) {
    const type = e.detail.value
    this.setData({
      'pveSettings.black.type': type
    })
  },

  onBlackLevelChange(e) {
    // picker返回的是索引，需要加1转换为实际等级
    const level = parseInt(e.detail.value) + 1
    this.setData({
      'pveSettings.black.level': level
    })
  }
})