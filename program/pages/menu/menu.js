Page({

  goPVP() {
    wx.navigateTo({
      url: '/program/pages/chess/chess?mode=pvp'
    })
  },

  goPVE() {
    wx.navigateTo({
      url: '/program/pages/chess/chess?mode=pve'
    })
  },

  goSettings() {
    wx.navigateTo({
      url: '/program/pages/settings/settings'
    })
  }

})