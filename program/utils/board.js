import { getLegalMoves } from "./rules.js"

//用于管理棋盘的
let board = []
let history = []
let state = {}//状态栈

function initBoard(){
    board  = [
        "a1","a2","a3","a4","a5","a6","a7","a8","a9","a10",
        "b1","b2","b3","b4","b5","b6","b7","b8","b9","b10",
        "c1","c2","c3","c4","c5","c6","c7","c8","c9","c10",
        "d1","d2","d3","d4","d5","d6","d7","d8","d9","d10",
        "e1","e2","e3","e4","e5","e6","e7","e8","e9","e10",
        "f1","f2","f3","f4","f5","f6","f7","f8","f9","f10",
        "g1","g2","g3","g4","g5","g6","g7","g8","g9","g10",
        "h1","h2","h3","h4","h5","h6","h7","h8","h9","h10",
        "i1","i2","i3","i4","i5","i6","i7","i8","i9","i10",
        "j1","j2","j3","j4","j5","j6","j7","j8","j9","j10",
    ]//棋盘由坐标组成

    state = {
        "SP": ["a3","b3","i3","j3"],
        "P": ["c3","d3","e3","f3","g3","h3"],
        "G": ["a2","j2"],
        "N": ["b2","i2"],
        "B": ["c2","h2"],
        "A": ["d2","g2"],
        "R": ["a1","g1"],
        "M": ["d1"],
        "T": ["g1"],
        "Q": ["e1"],
        "K": ["f1"]


    }
}

//获取棋盘快照以供渲染
function getBoard(){
    return board
}


function movePiece(from, to) {
    // 保存当前棋盘状态到历史记录
    history.push({
        from: from,
        to: to,
        board: [...board], // 保存棋盘副本
        state: {...state}  // 保存状态副本
    });

    // 查找哪个棋子位于from位置
    let piece = null;
    let pieceType = null;
    
    for (const [type, positions] of Object.entries(state)) {
        const index = positions.indexOf(from);
        if (index !== -1) {
            pieceType = type;
            piece = positions[index];
            positions.splice(index, 1); // 从原位置移除
            break;
        }
    }

    if (!piece) {
        console.log("无棋子可移动");
        return false;
    }

    // 检查目标位置是否有敌方棋子(需要先找到敌方棋子)
    for (const [type, positions] of Object.entries(state)) {
        const targetIndex = positions.indexOf(to);
        if (targetIndex !== -1) {
            // 移除被吃掉的棋子
            positions.splice(targetIndex, 1);
            break;
        }
    }

    // 将棋子添加到新位置
    if (!state[pieceType]) {
        state[pieceType] = [];
    }
    state[pieceType].push(to);
    
    return true;
}

function undo(){
    if (history.length === 0) {
        console.log("没有可撤销的步骤");
        return;
    }

    const lastMove = history.pop();
    board = lastMove.board;
    state = lastMove.state;
}

function isCheck(color){
    getBoard("K")//K的位置
    return getLegalMoves(getBoard("K"),state).some(move => move.includes("K"))//本位置是否合法

}

function isCheckmate(color){
    getBoard("K")
    return getLegalMoves(getBoard("K"),state).every(move => move.includes("K"))
}

MediaSourceHandle.exports = {
    initBoard,
    getBoard,
    movePiece,
    undo,
    isCheck,
    isCheckmate
}//类似头文件写法