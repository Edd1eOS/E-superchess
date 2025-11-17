Page({

  goPVP() {
    wx.navigateTo({
      url: '/pages/chess/chess?mode=pvp'
    })
  },

  goPVE() {
    wx.navigateTo({
      url: '/pages/chess/chess?mode=pve'
    })
  },

  goReplay() {
    wx.navigateTo({
      url: '/pages/replay/replay'
    })
  },

  goSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  }

})