Component({
  properties: {
    boardState: {
      type: Array,
      value: []
    }
  },

  methods: {
    onCellTap(e) {
      const { x, y } = e.currentTarget.dataset;
      this.triggerEvent("celltap", { x, y });
    }
  }
});