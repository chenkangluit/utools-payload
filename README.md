# Payload管理平台

安全测试Payload集合管理系统，提供高效的Payload存储、检索和管理功能。

## 功能特性

✅ 多分类管理（SQL注入、XSS、RCE等）  
✅ 智能搜索（支持关键词和标签过滤）  
✅ 可视化编辑（支持代码高亮和标签管理）  
✅ 本地存储（自定义Payload永久保存）  
✅ 预置50+常用安全测试Payload

## 项目结构
payload/
├── index.html       # 主界面
├── preload.js       # 核心逻辑
├── payloads.json    # 预置Payload库
├── index.css        # 样式表
└── plugin.json      # 插件配置

## 数据存储
- 预置Payload： payloads.json
- 用户自定义：浏览器LocalStorage