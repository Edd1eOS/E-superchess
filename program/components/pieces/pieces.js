Component({
  properties: {
    type: {   // 棋子类型
      type: String,
      value: ""
    },
    color: {  
      type: String,
      value: "white"
    },
    selected: { 
      type: Boolean,
      value: false
    },
    x: Number, 
    y: Number
  },

  methods: {
    onTap() {
      // 回传
      this.triggerEvent("pieceTap", {
        type: this.data.type,
        color: this.data.color,
        x: this.data.x,
        y: this.data.y
      });
    }
  }
});