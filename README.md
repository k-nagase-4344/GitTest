# 不具合管理システム

## プロジェクト概要

Cloudflare Pages、D1データベース、R2ストレージを活用した本格的な不具合管理Webアプリケーションです。

### 主要機能

✅ **完全実装済み**
- 📋 案件の登録・編集・削除（CRUD操作）
- 📎 ファイル添付機能（Cloudflare R2）
- 👥 担当者・優先度・ステータス管理
- 🔍 高度な検索・フィルタリング機能
- 📁 プロジェクト単位での案件管理
- 💬 コメント機能
- 📜 更新履歴の自動記録
- 🌐 REST API提供
- 👨‍👩‍👧‍👦 複数人同時利用対応
- 🔔 **リアルタイム通知機能**（NEW）
- 👤 **ユーザー管理機能**（NEW）
- 📂 **プロジェクト管理機能**（NEW）

### 技術スタック

- **フレームワーク**: Hono 4.x
- **ランタイム**: Cloudflare Workers
- **データベース**: Cloudflare D1 (SQLite)
- **ストレージ**: Cloudflare R2 (S3互換)
- **フロントエンド**: Vanilla JavaScript + TailwindCSS
- **デプロイ**: Cloudflare Pages

## 開発環境URL

**ローカル開発サーバー**: https://3000-itfratmetvrb93neh8u8u-5c13a017.sandbox.novita.ai

### 主な機能URI

| 機能 | メソッド | パス | 説明 |
|------|---------|------|------|
| **案件管理** | | | |
| 案件一覧 | GET | `/api/issues` | 案件一覧（フィルタ・検索対応） |
| 案件詳細 | GET | `/api/issues/:id` | 案件詳細（コメント、添付ファイル、履歴含む） |
| 案件作成 | POST | `/api/issues` | 新規案件を作成（通知送信） |
| 案件更新 | PUT | `/api/issues/:id` | 案件を更新（履歴自動記録、通知送信） |
| 案件削除 | DELETE | `/api/issues/:id` | 案件を削除 |
| コメント追加 | POST | `/api/issues/:id/comments` | コメントを追加（通知送信） |
| ファイルアップロード | POST | `/api/issues/:id/attachments` | ファイルをアップロード（R2） |
| ファイルダウンロード | GET | `/api/attachments/:id` | 添付ファイルをダウンロード |
| **プロジェクト管理** | | | |
| プロジェクト一覧 | GET | `/api/projects` | すべてのプロジェクトを取得 |
| プロジェクト作成 | POST | `/api/projects` | 新規プロジェクトを作成 |
| プロジェクト更新 | PUT | `/api/projects/:id` | プロジェクトを更新 |
| プロジェクト削除 | DELETE | `/api/projects/:id` | プロジェクトを削除 |
| **ユーザー管理** | | | |
| ユーザー一覧 | GET | `/api/users` | ユーザー一覧取得 |
| ユーザー作成 | POST | `/api/users` | 新規ユーザーを作成（メアド重複チェック） |
| ユーザー更新 | PUT | `/api/users/:id` | ユーザー情報を更新 |
| ユーザー削除 | DELETE | `/api/users/:id` | ユーザーを削除 |
| **通知機能** | | | |
| 通知一覧 | GET | `/api/notifications` | ユーザーの通知を取得 |
| 通知既読 | PUT | `/api/notifications/:id/read` | 通知を既読にする |
| 一括既読 | PUT | `/api/notifications/read-all` | すべての通知を既読にする |
| **マスタデータ** | | | |
| ステータス一覧 | GET | `/api/statuses` | ステータスマスタ取得 |
| 優先度一覧 | GET | `/api/priorities` | 優先度マスタ取得 |

### 検索・フィルタパラメータ

`GET /api/issues` には以下のクエリパラメータが使用可能：
- `project_id`: プロジェクトIDでフィルタ
- `status`: ステータスIDでフィルタ
- `priority`: 優先度IDでフィルタ
- `assignee`: 担当者IDでフィルタ
- `search`: タイトル・説明で部分一致検索

例: `/api/issues?project_id=1&status=1&priority=3&search=ログイン`

## データ構造

### データベーステーブル

1. **projects** - プロジェクト管理
   - id, name, description, created_at, updated_at

2. **users** - ユーザー管理
   - id, username, email, display_name, created_at

3. **issue_statuses** - ステータスマスタ
   - id, name, color, sort_order
   - デフォルト: 新規、対応中、レビュー待ち、完了、保留

4. **priorities** - 優先度マスタ
   - id, name, level, color
   - デフォルト: 低、中、高、緊急

5. **issues** - 案件情報
   - id, project_id, title, description, status_id, priority_id
   - assignee_id, reporter_id, created_at, updated_at

6. **attachments** - 添付ファイル情報
   - id, issue_id, filename, filesize, content_type
   - r2_key, uploaded_by, uploaded_at

7. **issue_histories** - 更新履歴
   - id, issue_id, user_id, field_name
   - old_value, new_value, created_at

8. **comments** - コメント
   - id, issue_id, user_id, content, created_at

9. **notifications** - 通知（NEW）
   - id, user_id, issue_id, type, title, message
   - is_read, created_at

### ストレージサービス

- **Cloudflare D1**: リレーショナルデータの保存
- **Cloudflare R2**: 添付ファイルの保存（バケット: webapp-attachments）

## ユーザーガイド

### 画面切り替え

ヘッダーのナビゲーションボタンで3つの画面を切り替えられます：
- **案件**: 不具合案件の一覧・管理
- **プロジェクト**: プロジェクトの作成・編集・削除
- **ユーザー**: ユーザーの追加・編集・削除

### 案件の作成

1. 「案件」タブで右上の「新規案件」ボタンをクリック
2. プロジェクト、タイトル、説明、ステータス、優先度を入力
3. 担当者と報告者を選択
4. 「作成」ボタンをクリック
5. **担当者に自動で通知が送信されます**

### 案件の編集

1. 案件一覧から編集したい案件をクリック
2. 詳細モーダルが開き、各項目を編集可能
3. 「保存」ボタンで変更を保存
4. 変更は自動的に履歴に記録され、**関係者に通知が送信されます**

### 通知機能

1. ヘッダーのベルアイコンをクリックして通知パネルを開く
2. 未読通知には青い点が表示されます
3. 通知をクリックすると該当の案件詳細を表示（自動既読）
4. 「すべて既読」ボタンで一括既読化
5. **通知が発生するタイミング**:
   - 案件が割り当てられたとき
   - 案件のステータスが変更されたとき
   - コメントが追加されたとき
   - 案件が更新されたとき

### プロジェクト管理

1. 「プロジェクト」タブを開く
2. 「新規プロジェクト」ボタンで新しいプロジェクトを作成
3. 各プロジェクトカードの編集・削除ボタンで管理
4. **案件が紐づいているプロジェクトは削除できません**

### ユーザー管理

1. 「ユーザー」タブを開く
2. 「新規ユーザー」ボタンで新しいユーザーを追加
3. ユーザー名、メールアドレス、表示名を入力
4. **メールアドレスの重複はチェックされます**
5. **案件の担当者に割り当てられているユーザーは削除できません**

### ファイルの添付

1. 案件詳細画面で「ファイルを追加」ボタンをクリック
2. ファイルを選択してアップロード
3. 添付されたファイルはダウンロード可能

### コメントの追加

1. 案件詳細画面のコメント欄に入力
2. 「コメント追加」ボタンをクリック
3. コメントが時系列で表示される
4. **担当者と報告者に通知が送信されます**

### 検索とフィルタ

1. 画面上部のフィルタでステータス、優先度、担当者を選択
2. 検索ボックスでタイトル・説明を検索
3. 複数のフィルタを組み合わせて使用可能

## ローカル開発

### セットアップ

\`\`\`bash
cd /home/user/webapp
npm install
\`\`\`

### データベース初期化

\`\`\`bash
# マイグレーション適用
npm run db:migrate:local

# サンプルデータ投入
npm run db:seed

# データベースリセット（開発時）
npm run db:reset
\`\`\`

### 開発サーバー起動

\`\`\`bash
# ビルド
npm run build

# PM2で起動
pm2 start ecosystem.config.cjs

# ログ確認
pm2 logs webapp --nostream

# 停止
pm2 stop webapp
\`\`\`

### テスト

\`\`\`bash
# APIテスト
curl http://localhost:3000/api/projects
curl http://localhost:3000/api/issues
curl http://localhost:3000/api/statuses
\`\`\`

## デプロイ

### 本番環境へのデプロイ手順

1. **Cloudflare API Key設定**
\`\`\`bash
# Cloudflareの認証設定
setup_cloudflare_api_key
\`\`\`

2. **D1データベース作成**
\`\`\`bash
# 本番用データベースを作成
npx wrangler d1 create webapp-production

# database_idをwrangler.jsoncに設定
\`\`\`

3. **R2バケット作成**
\`\`\`bash
# 本番用バケットを作成
npx wrangler r2 bucket create webapp-attachments
\`\`\`

4. **マイグレーション適用**
\`\`\`bash
# 本番データベースにマイグレーションを適用
npm run db:migrate:prod
\`\`\`

5. **Cloudflare Pagesにデプロイ**
\`\`\`bash
# プロジェクト作成
npx wrangler pages project create webapp --production-branch main

# デプロイ
npm run deploy:prod
\`\`\`

### 環境変数設定

必要に応じてシークレットを設定：
\`\`\`bash
npx wrangler pages secret put API_KEY --project-name webapp
\`\`\`

## API仕様

すべてのAPIエンドポイントは `/api/*` パスでアクセス可能です。

### リクエスト例

**案件作成**
\`\`\`bash
curl -X POST http://localhost:3000/api/issues \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": 1,
    "title": "バグ報告",
    "description": "詳細説明",
    "status_id": 1,
    "priority_id": 3,
    "assignee_id": 2,
    "reporter_id": 1
  }'
\`\`\`

**案件検索**
\`\`\`bash
curl "http://localhost:3000/api/issues?project_id=1&status=1&search=ログイン"
\`\`\`

## プロジェクト構成

\`\`\`
webapp/
├── src/
│   ├── index.tsx           # メインアプリケーション（API + HTML）
│   └── renderer.tsx        # レンダラー（未使用）
├── public/
│   └── static/
│       └── app.js          # フロントエンドJavaScript
├── migrations/
│   ├── 0001_initial_schema.sql  # データベーススキーマ
│   └── 0002_add_notifications.sql  # 通知機能テーブル
├── seed.sql                # サンプルデータ
├── ecosystem.config.cjs    # PM2設定
├── wrangler.jsonc          # Cloudflare設定
├── package.json            # 依存関係とスクリプト
└── README.md               # このファイル
\`\`\`

## 新規追加機能（2025-12-16更新）

### 🔔 リアルタイム通知機能
- 案件の割り当て、ステータス変更、コメント追加時に自動通知
- ヘッダーのベルアイコンに未読バッジ表示
- 30秒ごとに自動更新
- 通知クリックで該当案件へジャンプ
- 一括既読機能

### 👤 ユーザー管理機能
- ユーザーの追加・編集・削除
- メールアドレスの重複チェック
- 案件担当者チェック（削除前の安全確認）
- ユーザー一覧表示

### 📂 プロジェクト管理機能
- プロジェクトの新規作成・編集・削除
- プロジェクト説明の管理
- 案件紐付けチェック（削除前の安全確認）
- プロジェクト一覧表示

## 今後の機能拡張案

- [ ] ユーザー認証機能（メール/パスワード）
- [ ] 案件のラベル・タグ機能
- [ ] ダッシュボード（統計・グラフ表示）
- [ ] メール通知機能（外部サービス連携）
- [ ] エクスポート機能（CSV、PDF）
- [ ] Webhook連携
- [ ] カスタムフィールド
- [ ] 権限管理（閲覧のみ、編集可能など）
- [ ] 通知設定（どの通知を受け取るか）

## デプロイステータス

- ✅ ローカル開発環境: 稼働中
- ⏳ 本番環境: 未デプロイ（Cloudflare Pages）

## 最終更新日

2025-12-16
