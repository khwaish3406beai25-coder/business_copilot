"""
CSV Parser Utility

Handles CSV file reading, validation, and normalization before
data is inserted into the database.

Expected CSV columns (required vs optional):
    Required: date, product_name, quantity_sold, unit_price, cost_price
    Optional: category, stock_remaining

TODO (Phase 2): Implement full parsing and validation logic.
"""

import pandas as pd
from typing import tuple

# Columns that must be present in every uploaded CSV
REQUIRED_COLUMNS = {"date", "product_name", "quantity_sold", "unit_price", "cost_price"}

# Columns that are optional but processed if present
OPTIONAL_COLUMNS = {"category", "stock_remaining"}


def validate_csv_columns(df: pd.DataFrame) -> tuple[bool, list[str]]:
    """
    Check that all required columns are present in the DataFrame.

    Returns:
        (is_valid: bool, missing_columns: list[str])
    """
    missing = REQUIRED_COLUMNS - set(df.columns.str.lower().str.strip())
    return len(missing) == 0, list(missing)


def parse_csv(file_bytes: bytes) -> pd.DataFrame:
    """
    Read raw CSV bytes into a validated, normalized DataFrame.

    TODO (Phase 2): Add full type coercion, date parsing, and error reporting.
    """
    raise NotImplementedError("CSV parser coming in Phase 2.")
