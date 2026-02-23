"""
NDB オープンデータ 医薬品検索アプリ（Streamlit）

データソース: 厚生労働省 NDB オープンデータ（内服薬 外来 院外）
ファイル形式: .csv 拡張子だが中身は Excel (.xlsx)

設計方針:
- SRP: データ読込・検索・URL構築・UI描画をそれぞれ独立した関数に分離
- OCP: 検索条件を追加する場合は SearchConfig を拡張するだけで対応可能
- DRY: データ読込は @st.cache_data で1度だけ、URL構築は共通関数に集約
"""

from __future__ import annotations

import urllib.parse
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
import streamlit as st

# ---------------------------------------------------------------------------
# 定数
# ---------------------------------------------------------------------------

DATA_FILE = Path(__file__).resolve().parent.parent / "001495390.csv"

HEADER_ROW = 2  # 0-indexed: Excel の Row 3
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
    "total_prescriptions": 8,
}

DISPLAY_COLUMNS = [
    "医薬品名",
    "薬効分類名称",
    "単位",
    "薬価",
    "後発品区分",
    "総計（処方数量）",
]

PMDA_SEARCH_URL = "https://www.pmda.go.jp/PmdaSearch/iyakuSearch/"

# ---------------------------------------------------------------------------
# Data Layer（SRP: データ読み込みのみ担当）
# ---------------------------------------------------------------------------


@st.cache_data(show_spinner="医薬品データを読み込み中…")
def load_drug_data(file_path: str) -> pd.DataFrame:
    """Excel ファイルを読み込み、必要な列だけの DataFrame を返す。"""
    raw = pd.read_excel(
        file_path,
        header=None,
        skiprows=DATA_START_ROW,
        engine="openpyxl",
    )

    col_indices = list(COLUMNS.values())
    df = raw.iloc[:, col_indices].copy()
    df.columns = [
        "薬効分類",
        "薬効分類名称",
        "医薬品コード",
        "医薬品名",
        "単位",
        "薬価基準収載コード",
        "薬価",
        "後発品区分",
        "総計（処方数量）",
    ]

    df = df.dropna(subset=["医薬品名"])
    df["医薬品名"] = df["医薬品名"].astype(str)

    df["後発品区分"] = df["後発品区分"].map({0: "先発品", 1: "後発品", "0": "先発品", "1": "後発品"}).fillna("—")

    df["_name_lower"] = df["医薬品名"].str.lower()

    return df


# ---------------------------------------------------------------------------
# Search Layer（SRP: 検索ロジックのみ担当）
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SearchConfig:
    """検索パラメータ。OCP: フィルタ条件を追加する場合はここにフィールドを追加。"""
    query: str
    generic_only: bool = False
    category_filter: str = ""


def search_drugs(df: pd.DataFrame, config: SearchConfig) -> pd.DataFrame:
    """SearchConfig に基づいて DataFrame をフィルタする。"""
    if not config.query.strip():
        return df.head(0)

    mask = df["_name_lower"].str.contains(config.query.lower(), na=False)

    if config.generic_only:
        mask &= df["後発品区分"] == "後発品"

    if config.category_filter:
        mask &= df["薬効分類名称"].str.contains(config.category_filter, na=False)

    return df.loc[mask].reset_index(drop=True)


# ---------------------------------------------------------------------------
# URL Builder（SRP: 外部サイト URL 構築のみ担当 / DRY: 1箇所で管理）
# ---------------------------------------------------------------------------


def build_pmda_url(drug_name: str) -> str:
    """PMDA 医薬品検索ページの URL を構築する。"""
    params = urllib.parse.urlencode({"keyword": drug_name})
    return f"{PMDA_SEARCH_URL}?{params}"


# ---------------------------------------------------------------------------
# UI Layer（SRP: 表示のみ担当）
# ---------------------------------------------------------------------------


def render_sidebar(df: pd.DataFrame) -> SearchConfig:
    """サイドバーに検索フォームを描画し、SearchConfig を返す。"""
    st.sidebar.header("検索条件")

    query = st.sidebar.text_input(
        "薬の名前を入力",
        placeholder="例: ロキソプロフェン、マイスリー",
    )

    generic_only = st.sidebar.checkbox("後発品（ジェネリック）のみ表示")

    categories = sorted(df["薬効分類名称"].dropna().unique().tolist())
    category_filter = st.sidebar.selectbox(
        "薬効分類で絞り込み（任意）",
        options=[""] + categories,
        format_func=lambda x: "すべて" if x == "" else x,
    )

    return SearchConfig(
        query=query,
        generic_only=generic_only,
        category_filter=category_filter,
    )


def render_results(results: pd.DataFrame) -> None:
    """検索結果をテーブルと PMDA リンクで描画する。"""
    st.subheader(f"検索結果: {len(results)} 件")

    if results.empty:
        st.info("該当する医薬品が見つかりませんでした。別のキーワードをお試しください。")
        return

    display = results[DISPLAY_COLUMNS].copy()
    st.dataframe(display, use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("副作用を確認する")

    unique_names = results["医薬品名"].unique()
    shown = min(len(unique_names), 50)
    for name in unique_names[:shown]:
        url = build_pmda_url(name)
        st.link_button(
            f"PMDA で確認: {name}",
            url=url,
            use_container_width=True,
        )

    if len(unique_names) > shown:
        st.caption(f"※ 上位 {shown} 件のみ表示しています。検索語を絞り込んでください。")


# ---------------------------------------------------------------------------
# Main（Composition Root）
# ---------------------------------------------------------------------------


def main() -> None:
    st.set_page_config(
        page_title="NDB 医薬品検索",
        page_icon="💊",
        layout="wide",
    )

    st.title("💊 NDB 医薬品検索")
    st.caption(
        "厚生労働省 NDB オープンデータ（2023年度・内服薬 外来 院外）から医薬品を検索し、"
        "PMDA で副作用情報を確認できます。"
    )

    if not DATA_FILE.exists():
        st.error(f"データファイルが見つかりません: {DATA_FILE}")
        return

    df = load_drug_data(str(DATA_FILE))
    config = render_sidebar(df)

    if not config.query.strip():
        st.info("← サイドバーから薬の名前を入力して検索してください。")
        st.metric("収録医薬品数", f"{len(df):,} 件")
        return

    results = search_drugs(df, config)
    render_results(results)


if __name__ == "__main__":
    main()
