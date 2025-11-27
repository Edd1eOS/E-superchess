Component({
  properties: {
    boardState: {
      type: Array,
      value: []
    }
  },

  data: {
    selectedCoord: null,  // 当前选中的棋子坐标
    targetCoords: []      // 可移动到的目标坐标列表
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

          // 检查是否是选中的格子或目标格子
          const isSelected = this.data.selectedCoord === coord;
          const isTarget = this.data.targetCoords.includes(coord);

          row.push({
            coord,
            piece: boardState[y][x],
            isDark,
            isSelected,
            isTarget
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
      
      // 如果已经选中了一个棋子
      if (this.data.selectedCoord) {
        // 如果点击的是已选中的棋子，则取消选择
        if (this.data.selectedCoord === coord) {
          this.setData({
            selectedCoord: null,
            targetCoords: []
          });
          return;
        }
        
        // 如果点击的是目标位置之一，则触发移动事件
        if (this.data.targetCoords.includes(coord)) {
          this.triggerEvent("move", { 
            from: this.data.selectedCoord, 
            to: coord 
          });
          
          // 清除选中状态
          this.setData({
            selectedCoord: null,
            targetCoords: []
          });
          return;
        }
      }
      
      // 选择一个新的棋子（这里暂时不检查是否有棋子）
      // 在实际应用中应该检查这个位置是否有棋子
      const { r, c } = this.coordToRC(coord);
      const piece = this.properties.boardState[r][c];
      
      // 只有当格子上有棋子时才能选中
      if (piece) {
        // 计算可能的移动位置（暂时不检查合法性）
        const targets = this.calculatePossibleMoves(coord);
        
        this.setData({
          selectedCoord: coord,
          targetCoords: targets
        });
      }
    },
    
    // 坐标转行列
    coordToRC(coord) {
      const file = coord.charCodeAt(0) - 97;    // a-j → 0-9
      const rank = 10 - parseInt(coord.slice(1)); // 1-10 → 9-0
      return { r: rank, c: file };
    },
    
    // 计算可能的移动位置（使用规则引擎检查合法性）
    calculatePossibleMoves(coord) {
      // 获取页面实例以访问规则引擎和棋盘状态
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      // 如果无法获取页面实例，则返回空数组
      if (!currentPage || !currentPage.board || !currentPage.rules) {
        return [];
      }
      
      const board = currentPage.board;
      const rules = currentPage.rules;
      const turn = board.state.turn;
      
      // 获取当前选中棋子的信息
      const { r, c } = this.coordToRC(coord);
      const piece = this.properties.boardState[r][c];
      
      // 如果没有棋子或者不是当前行棋方的棋子，返回空数组
      if (!piece || piece.color !== turn) {
        return [];
      }
      
      const targets = [];
      
      // 遍历整个棋盘寻找合法移动位置
      for (let rank = 1; rank <= 10; rank++) {
        for (let file = 0; file < 10; file++) {
          const targetCoord = String.fromCharCode(97 + file) + rank;
          // 检查移动是否合法
          if (rules.isValidMove(board, coord, targetCoord, turn)) {
            targets.push(targetCoord);
          }
        }
      }
      
      return targets;
    }
  }
});