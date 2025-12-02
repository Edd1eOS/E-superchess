"""
将训练好的 AlphaZeroNet (.pth) 模型导出为 ONNX，
之后可以在本机使用 tensorflowjs_converter 转成 TF.js 的 model.json。

使用步骤（在本机终端里执行）：

1. 安装依赖（建议在虚拟环境中）：
   pip install torch onnx tensorflow tensorflowjs

2. 在项目根目录下执行本脚本（会生成 export/l3_model.onnx）：
   cd ml_pytorch
   python export_to_tfjs.py

3. 使用 tensorflowjs_converter 将 ONNX/SavedModel 转成 TF.js：
   例如（ONNX → TF.js）：
     tensorflowjs_converter \
       --input_format=onnx \
       --output_format=tfjs_graph_model \
       ./export/l3_model.onnx \
       ./export/tfjs_model

4. 将 ./export/tfjs_model 整个目录部署到静态服务器 / 对象存储，
   然后在小程序端把 model.json 的访问 URL 配置到 AI.initLevel3(modelUrl) 中。
"""

import os
import torch

from config import CONFIG
from model_utils import convert_model_to_onnx

# 动态导入 AlphaZeroNet
import importlib.util
import sys


def import_module_from_file(module_name, file_path):
  spec = importlib.util.spec_from_file_location(module_name, file_path)
  module = importlib.util.module_from_spec(spec)
  spec.loader.exec_module(module)
  return module


def load_alpha_zero_net():
  model_module = import_module_from_file("model1", "./1_model.py")
  AlphaZeroNet = model_module.AlphaZeroNet

  cfg = CONFIG
  model = AlphaZeroNet(
    num_channels=cfg["num_channels"],
    num_actions=cfg["num_actions"],
    board_h=cfg["board_h"],
    board_w=cfg["board_w"],
  )
  return model


def main():
  cfg = CONFIG
  print("使用配置:", cfg)

  # 1. 构建模型结构
  model = load_alpha_zero_net()

  # 2. 加载你训练好的权重（这里默认使用 L3_best_model.pth，如需可改成 L3_final_model.pth）
  ckpt_path = os.path.join("checkpoint", "L3_best_model.pth")
  if not os.path.exists(ckpt_path):
    raise FileNotFoundError(f"未找到模型文件: {ckpt_path}")

  state_dict = torch.load(ckpt_path, map_location="cpu")
  # 根据保存方式可能是直接 state_dict，也可能是包含在字典里
  if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
    model.load_state_dict(state_dict["model_state_dict"])
  else:
    model.load_state_dict(state_dict)

  model.eval()
  print(f"已加载模型权重: {ckpt_path}")

  # 3. 构造一个 dummy 输入用于导出（形状需与训练一致：NCHW）
  dummy_input = torch.zeros(
    1,
    cfg["num_channels"],
    cfg["board_h"],
    cfg["board_w"],
    dtype=torch.float32,
  )

  # 4. 导出为 ONNX
  export_dir = "export"
  os.makedirs(export_dir, exist_ok=True)
  onnx_path = os.path.join(export_dir, "l3_model.onnx")

  convert_model_to_onnx(model, dummy_input, onnx_path)

  print("ONNX 导出完成。下一步请在本机终端使用 tensorflowjs_converter 将其转为 TF.js：")
  print()
  print("  tensorflowjs_converter \\")
  print("    --input_format=onnx \\")
  print("    --output_format=tfjs_graph_model \\")
  print("    ./ml_pytorch/export/l3_model.onnx \\")
  print("    ./ml_pytorch/export/tfjs_model")
  print()
  print("完成后，将 ./ml_pytorch/export/tfjs_model 部署到服务器，并在小程序端配置 model.json 的 URL。")


if __name__ == "__main__":
  # 确保当前目录在 sys.path 中
  sys.path.append(os.path.dirname(os.path.abspath(__file__)))
  main()


