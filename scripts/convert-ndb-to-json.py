#!/usr/bin/env python3
"""
NDB オープンデータ Excel を JSON に変換するスクリプト。

実行: python scripts/convert-ndb-to-json.py
出力: lib/data/ndb-drugs.json

001495390.csv は拡張子が .csv だが中身は Excel (.xlsx)。
openpyxl が .csv 拡張子を拒否するため、一時的に .xlsx で読み込む。
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

# プロジェクトルート（このスクリプトの親の親）
ROOT = Path(__file__).resolve().parent.parent
INPUT_FILE = ROOT / "001495390.csv"
OUTPUT_FILE = ROOT / "lib" / "data" / "ndb-drugs.json"

DATA_START_ROW = 4  # 0-indexed: Excel の Row 5

COLUMNS = {
    "category_code": 0,
    "category_name": 1,
    "drug_code": 2,
    "drug_name": 3,
    "unit": 4,
    "pricing_code": 5,
    "price": 6,
    "generic_flag": 7,
}


def main() -> None:
    # openpyxl は .csv 拡張子を拒否するため、一時コピーで .xlsx として読む
    if INPUT_FILE.suffix.lower() == ".csv":
        import shutil

        xlsx_path = INPUT_FILE.with_suffix(".xlsx")
        shutil.copy(INPUT_FILE, xlsx_path)
        try:
            raw = pd.read_excel(
                xlsx_path,
                header=None,
                skiprows=DATA_START_ROW,
                engine="openpyxl",
            )
        finally:
            xlsx_path.unlink(missing_ok=True)
    else:
        raw = pd.read_excel(
            INPUT_FILE,
            header=None,
            skiprows=DATA_START_ROW,
            engine="openpyxl",
        )

    col_indices = list(COLUMNS.values())
    df = raw.iloc[:, col_indices].copy()
    df.columns = list(COLUMNS.keys())

    # 薬効分類は結合セルで空になるため、前の行の値で補完
    df["category_code"] = df["category_code"].ffill()
    df["category_name"] = df["category_name"].ffill()

    df = df.dropna(subset=["drug_name"])
    df["drug_name"] = df["drug_name"].astype(str)

    records = []
    for _, row in df.iterrows():
        generic_val = row["generic_flag"]
        if pd.isna(generic_val):
            is_generic = False
        else:
            try:
                is_generic = bool(int(generic_val))
            except (ValueError, TypeError):
                is_generic = False

        price_val = row["price"]
        if pd.isna(price_val):
            price = None
        else:
            try:
                price = float(price_val)
            except (ValueError, TypeError):
                price = None

        records.append(
            {
                "name": str(row["drug_name"]).strip(),
                "code": str(row["drug_code"]).strip() if pd.notna(row["drug_code"]) else "",
                "categoryCode": str(row["category_code"]).strip() if pd.notna(row["category_code"]) else "",
                "categoryName": str(row["category_name"]).strip() if pd.notna(row["category_name"]) else "",
                "price": price,
                "isGeneric": is_generic,
            }
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=None)

    print(f"Converted {len(records)} records to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
