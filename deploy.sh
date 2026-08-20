#!/bin/bash
# deploy.sh - Arch Linuxからラズパイへ資材を転送するスクリプト

PI_IP="100.73.243.85"
PI_USER="user"
PI_DIR="/home/user/math-diagnostic-tool"

echo "=== 1. ラズパイ上にディレクトリを作成します ==="
ssh ${PI_USER}@${PI_IP} "mkdir -p ${PI_DIR}"

if [ $? -eq 0 ]; then
  echo "=== 2. ソースコードをラズパイに転送（scp）します ==="
  scp index.html style.css app.js questions.json textbook_mapping.json ${PI_USER}@${PI_IP}:${PI_DIR}/
  
  if [ $? -eq 0 ]; then
    echo "============================================="
    echo "🎉 デプロイ完了しました！"
    echo "ラズパイ上で以下のコマンドを実行してWebサーバーを起動してください："
    echo "ssh ${PI_USER}@${PI_IP} 'cd ${PI_DIR} && python3 -m http.server 8080'"
    echo "============================================="
  else
    echo "❌ 転送に失敗しました。"
  fi
else
  echo "❌ ラズパイへの接続またはディレクトリ作成に失敗しました。"
fi
