"""
AI Client — Claude claude-sonnet-4-6

Single entry point for all LLM calls. The rest of the codebase never
imports `anthropic` directly — it only calls `get_ai_response()`.

Failures are caught here and re-raised as a plain RuntimeError so callers
can catch a single exception type and return graceful fallback responses.
"""

import os
import logging

logger = logging.getLogger(__name__)

AI_PROVIDER = os.getenv("AI_PROVIDER", "claude").lower()
CLAUDE_MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 1024


async def get_ai_response(prompt: str, system_prompt: str = "") -> str:
    """
    Send a prompt to the configured AI provider and return the text response.

    Args:
        prompt:        The user-facing prompt (business context + question).
        system_prompt: Optional system instructions for the model.

    Returns:
        str: The AI-generated text response.

    Raises:
        RuntimeError: If the API call fails for any reason (network, auth, rate
                      limit, etc.). Callers should catch this and degrade gracefully.
    """
    provider = os.getenv("AI_PROVIDER", "claude").lower()
    gemini_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")

    # Auto-switch to gemini if GEMINI_API_KEY is configured
    if gemini_key and gemini_key != "your-gemini-api-key-here":
        if provider == "claude" and (not os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_API_KEY") == "your-anthropic-api-key-here"):
            provider = "gemini"

    if provider == "claude":
        return await _call_claude(prompt, system_prompt)
    elif provider == "openai":
        return await _call_openai(prompt, system_prompt)
    elif provider == "gemini":
        return await _call_gemini(prompt, system_prompt)
    else:
        raise RuntimeError(f"Unknown AI_PROVIDER: {provider!r}. Set to 'gemini', 'claude', or 'openai'.")


# ─── Claude ───────────────────────────────────────────────────────────────────

async def _call_claude(prompt: str, system_prompt: str) -> str:
    """Call the Anthropic Claude API (synchronous client, run in thread pool)."""
    import asyncio

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your-anthropic-api-key-here":
        raise RuntimeError("ANTHROPIC_API_KEY is not configured in backend/.env")

    try:
        from anthropic import Anthropic, APIError, APIConnectionError, RateLimitError

        client = Anthropic(api_key=api_key)

        # Anthropic's Python SDK is sync; run it in a thread so we don't block
        def _sync_call() -> str:
            kwargs: dict = {
                "model": CLAUDE_MODEL,
                "max_tokens": MAX_TOKENS,
                "messages": [{"role": "user", "content": prompt}],
            }
            if system_prompt:
                kwargs["system"] = system_prompt

            response = client.messages.create(**kwargs)
            return response.content[0].text

        return await asyncio.get_event_loop().run_in_executor(None, _sync_call)

    except ImportError:
        raise RuntimeError("anthropic package is not installed. Run: pip install anthropic")
    except (APIError, APIConnectionError, RateLimitError) as exc:
        logger.error("Claude API error: %s", exc)
        raise RuntimeError(f"Claude API error: {exc}") from exc
    except Exception as exc:
        logger.error("Unexpected error calling Claude: %s", exc)
        raise RuntimeError(f"Unexpected AI error: {exc}") from exc


# ─── OpenAI ───────────────────────────────────────────────────────────────────

async def _call_openai(prompt: str, system_prompt: str) -> str:
    """Call the OpenAI Chat Completions API."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key == "your-openai-api-key-here":
        raise RuntimeError("OPENAI_API_KEY is not configured in backend/.env")

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=MAX_TOKENS,
        )
        return response.choices[0].message.content or ""

    except ImportError:
        raise RuntimeError("openai package is not installed. Run: pip install openai")
    except Exception as exc:
        logger.error("OpenAI API error: %s", exc)
        raise RuntimeError(f"OpenAI API error: {exc}") from exc


# ─── Gemini ───────────────────────────────────────────────────────────────────

async def _call_gemini(prompt: str, system_prompt: str) -> str:
    """Call Google Gemini API via OpenAI compatibility endpoint."""
    api_key = (
        os.getenv("GEMINI_API_KEY", "")
        or os.getenv("GOOGLE_API_KEY", "")
        or os.getenv("ANTHROPIC_API_KEY", "")
    )
    if not api_key or api_key == "your-gemini-api-key-here":
        raise RuntimeError("GEMINI_API_KEY is not configured in backend/.env")

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Try models in order of preference
        candidate_models = ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.0-flash-lite", "gemini-1.5-flash"]
        last_exc = None

        for model in candidate_models:
            try:
                response = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=MAX_TOKENS,
                    timeout=15.0,
                )
                return response.choices[0].message.content or ""
            except Exception as exc:
                last_exc = exc
                logger.warning("Gemini model %s failed: %s", model, exc)

        raise last_exc or RuntimeError("All Gemini model attempts failed")

    except ImportError:
        raise RuntimeError("openai package is not installed. Run: pip install openai")
    except Exception as exc:
        logger.error("Gemini API error: %s", exc)
        raise RuntimeError(f"Gemini API error: {exc}") from exc

