Component({
  properties: {
    boardState: {
      type: Array,
      value: []
    }
  },

  observers: {
    'boardState': function (boardState) {
      if (!boardState || !Array.isArray(boardState)) return;

      // 生成带颜色信息的网格数据
      const grid = [];
      for (let y = 0; y < boardState.length; y++) {
        const row = [];
        for (let x = 0; x < boardState[y].length; x++) {
          // 计算是否为深色格子：(x+y) 为偶数时是深色格子
          const isDark = (x + y) % 2 === 0;
          // 计算国际象棋式坐标：文件 a-j，左下角 a1 为原点
          const file = String.fromCharCode(97 + x); // 97 == 'a'
          const rank = boardState.length - y; // y=9 -> rank=1
          const coord = `${file}${rank}`;

          row.push({
            coord,
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
      const { coord } = e.currentTarget.dataset;
      // 仅传递字母+数字组合坐标
      this.triggerEvent("celltap", { coord });
    }
  }
});