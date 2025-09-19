# PDF検証ツール

Java側で出力された勤怠レポートPDFの内容を自動検証するPythonツールです。

## 機能

- ダミーPDFをreportlabで生成
- 既存PDFをPyPDF2で読み込み
- 仕様に沿った内容が含まれているかチェック

## チェック項目

1. **ヘッダー**: 「KintaiSystem」が含まれているか
2. **対象年月**: yyyy-MM形式で記載されているか
3. **社員情報**: 社員名・社員コードが出力されているか
4. **勤怠データ**: 勤怠日ごとの出退勤情報が含まれているか
5. **フッター**: 承認欄・ページ番号があるか
6. **データなし**: 本文に「データなし」が記載されているか（データなしの場合は社員情報・勤怠データは不要）

## テストケース

1. **正常系**: 正しいPDF → すべての項目が検出され、チェック合格
2. **データなしPDF**: 本文に「データなし」が記載されていることを確認
3. **フォーマット異常**: 年月が "202509" のようなフォーマット → 不合格
4. **ヘッダー欠落**: "KintaiSystem" が存在しない場合 → 不合格
5. **フッター欠落**: 承認欄 or ページ番号がない場合 → 不合格

## 使用方法

### 基本的な使用方法

```python
from pdf_validator import PDFValidator, PDFGenerator

# PDF検証器を初期化
validator = PDFValidator()

# PDFファイルを検証
results = validator.validate_pdf('path/to/your/pdf/file.pdf')

# 結果を確認
print(f"全体判定: {'合格' if results['overall_pass'] else '不合格'}")
print(f"ヘッダー: {'✓' if results['header_kintai_system'] else '✗'}")
print(f"年月フォーマット: {'✓' if results['year_month_format'] else '✗'}")
# ... その他の項目
```

### テスト用PDFの生成

```python
# PDF生成器を初期化
generator = PDFGenerator()

# 正常なPDFを生成
generator.generate_valid_pdf('test_valid.pdf', '2025-01')

# データなしPDFを生成
generator.generate_no_data_pdf('test_no_data.pdf', '2025-01')

# フォーマット異常PDFを生成
generator.generate_invalid_format_pdf('test_invalid_format.pdf')

# ヘッダー欠落PDFを生成
generator.generate_missing_header_pdf('test_missing_header.pdf')

# フッター欠落PDFを生成
generator.generate_missing_footer_pdf('test_missing_footer.pdf')
```

### コマンドライン実行

```bash
# 仮想環境をアクティベート
source venv/bin/activate

# PDF検証ツールを実行
python pdf_validator.py
```

## 必要なライブラリ

- reportlab: PDF生成
- PyPDF2: PDF読み込み

## インストール

```bash
pip install reportlab PyPDF2
```

## 注意事項

- 日本語フォントの問題により、PDFの内容が文字化けすることがありますが、検証ロジックは文字化けした文字も検出できるように調整されています
- 検証結果は辞書形式で返され、各項目の詳細な結果を確認できます
- デバッグモードを有効にすると、PDFの内容を確認できます（`debug=True`）

## 検証結果の例

```
--- valid ---
ヘッダー(KintaiSystem): ✓
年月フォーマット: ✓
社員情報: ✓
勤怠データ: ✓
データなしメッセージ: ✗
承認欄: ✓
ページ番号: ✓
全体判定: ✓ 合格
```

## カスタマイズ

検証ロジックは各メソッドで実装されているため、必要に応じてカスタマイズできます：

- `_check_header_kintai_system()`: ヘッダー検証
- `_check_year_month_format()`: 年月フォーマット検証
- `_check_employee_info()`: 社員情報検証
- `_check_attendance_data()`: 勤怠データ検証
- `_check_footer_approval()`: 承認欄検証
- `_check_footer_page_number()`: ページ番号検証
- `_check_no_data_message()`: データなしメッセージ検証
