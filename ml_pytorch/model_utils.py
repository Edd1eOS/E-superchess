#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
模型保存和加载工具
用于保存训练好的模型并在小程序中使用
"""

import torch
import os

def save_model(model, optimizer, epoch, loss, filepath):
    """
    保存模型状态
    """
    # 确保checkpoint目录存在
    checkpoint_dir = os.path.dirname(filepath)
    if not os.path.exists(checkpoint_dir):
        os.makedirs(checkpoint_dir)
    
    torch.save({
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'loss': loss,
    }, filepath)
    print(f"模型已保存到: {filepath}")

def load_model(model, optimizer, filepath):
    """
    加载模型状态
    """
    if not os.path.exists(filepath):
        print(f"模型文件不存在: {filepath}")
        return None
        
    checkpoint = torch.load(filepath)
    model.load_state_dict(checkpoint['model_state_dict'])
    optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
    epoch = checkpoint['epoch']
    loss = checkpoint['loss']
    
    print(f"模型已从 {filepath} 加载")
    return {'epoch': epoch, 'loss': loss}

def export_model_for_inference(model, filepath):
    """
    导出模型用于推理（简化版）
    """
    # 确保checkpoint目录存在
    checkpoint_dir = os.path.dirname(filepath)
    if not os.path.exists(checkpoint_dir):
        os.makedirs(checkpoint_dir)
    
    # 保存模型权重
    torch.save(model.state_dict(), filepath)
    print(f"模型权重已导出到: {filepath}")

def convert_model_to_onnx(model, dummy_input, filepath):
    """
    将模型转换为ONNX格式（便于在其他平台使用）
    """
    try:
        # 确保目标目录存在
        checkpoint_dir = os.path.dirname(filepath)
        if not os.path.exists(checkpoint_dir):
            os.makedirs(checkpoint_dir)
            
        torch.onnx.export(
            model,
            dummy_input,
            filepath,
            export_params=True,
            opset_version=11,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['policy', 'value'],
            dynamic_axes={
                'input': {0: 'batch_size'},
                'policy': {0: 'batch_size'},
                'value': {0: 'batch_size'}
            }
        )
        print(f"模型已转换为ONNX格式并保存到: {filepath}")
    except Exception as e:
        print(f"模型转换失败: {e}")