Page({

  goPVP() {
    wx.navigateTo({
      url: '/pages/game/game?mode=pvp'
    })
  },

  goPVE() {
    wx.navigateTo({
      url: '/pages/game/game?mode=pve'
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