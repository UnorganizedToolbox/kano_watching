@AGENTS.md

# CLAUDE.local.mdに記載する情報類
CLAUDE.local.mdを設ける。無い場合は作成し、.gitignoreに追加していない場合は追加。

- 今後実装予定の機能
- 現在実装中の機能
- 既知のバグと実装予定タイミング

# 環境と実行規則
## Python
uv仮想環境を使用。使用する際は必ず仮想環境を用いること。
初期化および外部モジュールの追加には以下のコマンドを強制する
"""Bash
uv init
uv add [module name]"""
## Typst
Typst使用
## Node.js
npmを使用
## Rust
ツールチェーン管理はrustup, パッケージマネージャーにcargoを使用
## C/Cpp
GCC使用。変更を許可
## LaTex
tlmgr使用。pdf作成はtypstを推奨し、LaTexの使用は明確に指示しない限り禁止
