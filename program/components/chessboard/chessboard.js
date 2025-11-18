Component({
  properties: {
    boardState: {
      type: Array,
      value: []
    }
  },

  observers: {
    'boardState': function(boardState) {
      if (!boardState || !Array.isArray(boardState)) return;
      
      // 生成带颜色信息的网格数据
      const grid = [];
      for (let y = 0; y < boardState.length; y++) {
        const row = [];
        for (let x = 0; x < boardState[y].length; x++) {
          // 计算是否为深色格子：(x+y) 为偶数时是深色格子
          const isDark = (x + y) % 2 === 0;
          row.push({
            x,
            y,
            piece: boardState[y][x],
            isDark
          });
        }
        grid.push(row);
      }
      
      this.setData({
        grid
      });
    }
  },

  methods: {
    onCellTap(e) {
      const { x, y } = e.currentTarget.dataset;
      this.triggerEvent("celltap", { x, y });
    }
  }
});