-- サンプル案件データ
INSERT INTO issues (project_id, title, description, status_id, priority_id, assignee_id, reporter_id) VALUES
  (1, 'ログイン画面でエラーが発生する', 'ユーザー名に特殊文字を入力するとエラーメッセージが表示される', 1, 3, 2, 1),
  (1, 'データ保存時にタイムアウトする', '大量のデータを保存しようとすると処理が完了しない', 2, 4, 2, 1),
  (1, 'UIデザインの改善', 'ボタンの配置が分かりづらいとのフィードバック', 3, 2, 3, 2),
  (1, '検索機能の高速化', '検索結果の表示に時間がかかる', 1, 2, NULL, 1);

-- サンプルコメント
INSERT INTO comments (issue_id, user_id, content) VALUES
  (1, 2, '調査を開始しました。入力バリデーションの問題のようです。'),
  (1, 1, 'ありがとうございます。対応をお願いします。'),
  (2, 2, 'バッチサイズを小さくする対応を実施中です。');

-- サンプル更新履歴
INSERT INTO issue_histories (issue_id, user_id, field_name, old_value, new_value) VALUES
  (2, 2, 'status', '新規', '対応中'),
  (3, 3, 'status', '対応中', 'レビュー待ち');
