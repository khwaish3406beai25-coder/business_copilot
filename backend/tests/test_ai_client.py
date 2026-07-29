"""
Unit tests for AI Client provider configuration and error handling.
"""

import sys
import os
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from ai.ai_client import get_ai_response, _call_gemini


@pytest.mark.asyncio
async def test_ai_provider_routing_unknown():
    orig_provider = os.environ.get("AI_PROVIDER")
    orig_key = os.environ.get("GEMINI_API_KEY")
    try:
        os.environ["AI_PROVIDER"] = "invalid_provider"
        os.environ["GEMINI_API_KEY"] = ""
        os.environ["GOOGLE_API_KEY"] = ""

        with pytest.raises(RuntimeError, match="Unknown AI_PROVIDER"):
            await get_ai_response("Hello")
    finally:
        if orig_provider:
            os.environ["AI_PROVIDER"] = orig_provider
        if orig_key:
            os.environ["GEMINI_API_KEY"] = orig_key


@pytest.mark.asyncio
async def test_gemini_missing_key():
    with pytest.raises(RuntimeError, match="GEMINI_API_KEY is not configured"):
        await _call_gemini("Hello", "")
