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
      // 当棋盘状态变化时，若之前选中的格子已无棋子则清除选择（避免走子后显示上一步的目标）
      if (!boardState || !Array.isArray(boardState)) {
        this.setData({ grid: [] });
        return;
      }
      const sel = this.data.selectedCoord;
      if (sel) {
        const { r, c } = this.coordToRC(sel);
        const pieceStillHere = !!(boardState[r] && boardState[r][c]);
        if (!pieceStillHere) {
          this.setData({ selectedCoord: null, targetCoords: [] });
        }
      }
      this.updateGrid();
    },
    'selectedCoord': function () { this.updateGrid(); },
    'targetCoords': function () { this.updateGrid(); }
  },

  methods: {
    // 统一渲染 grid 的方法（boardState / selectedCoord / targetCoords 改变时调用）
    updateGrid() {
      const boardState = this.properties.boardState;
      if (!boardState || !Array.isArray(boardState)) {
        this.setData({ grid: [] });
        return;
      }
      const grid = [];
      for (let y = 0; y < boardState.length; y++) {
        const row = [];
        for (let x = 0; x < boardState[y].length; x++) {
          const isDark = (x + y) % 2 === 0;
          const file = String.fromCharCode(97 + x);
          const rank = boardState.length - y;
          const coord = `${file}${rank}`;
          const isSelected = this.data.selectedCoord === coord;
          const isTarget = this.data.targetCoords && this.data.targetCoords.includes(coord);
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
      this.setData({ grid });
    },

    // v15.1修复定位1：高亮延迟
    onCellTap(e) {
      const { coord } = e.currentTarget.dataset;

      // 点击同格则取消选择
      if (this.data.selectedCoord === coord) {
        this.setData({ selectedCoord: null, targetCoords: [] });
        return;
      }

      // 若点击的是目标格，触发移动
      if (this.data.selectedCoord && this.data.targetCoords && this.data.targetCoords.includes(coord)) {
        this.triggerEvent("move", {
          from: this.data.selectedCoord,
          to: coord
        });
        // 触发移动后立即清除选择（boardState 更新会再次触发 updateGrid）
        this.setData({ selectedCoord: null, targetCoords: [] });
        return;
      }

      // 选择新棋子：立即设置 selectedCoord（保证立刻高亮），先清空 targetCoords
      this.setData({ selectedCoord: coord, targetCoords: [] });

      // 计算合法目标（同步或异步均可），计算完成后设置 targetCoords 会触发 updateGrid
      const { r, c } = this.coordToRC(coord);
      const piece = this.properties.boardState[r] && this.properties.boardState[r][c];
      if (!piece) {
        // 点击空格则取消选择
        this.setData({ selectedCoord: null, targetCoords: [] });
        return;
      }
      const targets = this.calculatePossibleMoves(coord);
      this.setData({ targetCoords: targets });
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
      const rawPiece = this.properties.boardState[r][c];

      // 解析棋子（优先使用 rules.parsePiece，兼容 string/object）
      const parsePiece = (p) => {
        if (!p) return null;
        if (rules && typeof rules.parsePiece === 'function') return rules.parsePiece(p);
        if (typeof p === 'string') {
          const color = (p[0] === 'W' || p[0] === 'B') ? p[0] : null;
          const type = color ? p.slice(1) : p;
          return { color, type };
        }
        return { color: p.color || p.side || null, type: p.type || p.name || null };
      };

      const piece = parsePiece(rawPiece);

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