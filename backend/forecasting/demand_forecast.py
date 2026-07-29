"""
Demand Forecasting Module

Provides statistical demand forecasting using historical sales data.
Uses scikit-learn for regression-based forecasting.

Design: Statistical forecasting is kept separate from AI insights.
The forecast gives a numerical prediction; the AI layer then explains it in words.

TODO (Phase 5): Implement forecasting models.
"""

import numpy as np
from typing import Optional


def forecast_demand(
    dates: list,
    quantities: list,
    forecast_days: int = 30,
    product_name: Optional[str] = None,
) -> list[dict]:
    """
    Forecast future demand using a linear regression model on historical data.

    Args:
        dates: List of historical sale dates (as datetime objects)
        quantities: List of quantities sold corresponding to each date
        forecast_days: Number of days to forecast ahead
        product_name: Optional product name for labeling output

    Returns:
        List of dicts: [{"date": date, "predicted_quantity": float}, ...]

    TODO (Phase 5): Implement with sklearn LinearRegression or seasonal decomposition
    """
    raise NotImplementedError(
        "Demand forecasting not yet implemented. Coming in Phase 5."
    )
