"""Google Gemini Chat Completions provider (HTTPS via httpx; no SDK dependency)."""

from __future__ import annotations

from typing import Any

import httpx

from app.ai.base import AIProvider, AIProviderError, AIResponse, AITask
from app.ai.prompts import render_user_message


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta",
        timeout: float = 45.0,
        max_tokens: int = 2000,
        temperature: float = 0.2,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        # Clean model name if user wrote e.g. "gemini 2.5 flask" or "models/gemini-2.0-flash"
        cleaned_model = model.strip().replace(" ", "-").lower()
        if "flask" in cleaned_model:
            cleaned_model = cleaned_model.replace("flask", "flash")
        if cleaned_model.startswith("models/"):
            cleaned_model = cleaned_model.replace("models/", "")
        self.model = cleaned_model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_tokens = max_tokens
        self.temperature = temperature
        self._transport = transport

    def __repr__(self) -> str:
        return f"<GeminiProvider model={self.model!r} key=***>"

    async def generate_response(
        self,
        context: dict[str, Any],
        prompt: str,
        *,
        system: str,
        task: AITask,
        history: list[dict[str, str]] | None = None,
    ) -> AIResponse:
        # Secure endpoint: Send key in header (x-goog-api-key) rather than URL query parameter
        url = f"{self.base_url}/models/{self.model}:generateContent"

        contents: list[dict[str, Any]] = []
        if history:
            for m in history:
                role = "user" if m.get("role") == "user" else "model"
                contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})

        # Append current user prompt + verified live inventory context
        contents.append({"role": "user", "parts": [{"text": render_user_message(prompt, context)}]})

        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": {
                "temperature": self.temperature,
                "maxOutputTokens": self.max_tokens,
                "responseMimeType": "application/json",
            },
        }

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self._api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout, transport=self._transport) as client:
                resp = await client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise AIProviderError(f"Gemini request failed: {type(exc).__name__}") from exc

        if resp.status_code >= 400:
            error_msg = resp.text
            try:
                err_json = resp.json()
                error_msg = err_json.get("error", {}).get("message", resp.text)
            except Exception:
                pass
            # Mask any accidental key reflection in error messages
            if self._api_key and self._api_key in error_msg:
                error_msg = error_msg.replace(self._api_key, "[REDACTED_API_KEY]")
            raise AIProviderError(f"Gemini returned HTTP {resp.status_code}: {error_msg}")

        try:
            data = resp.json()
            candidates = data.get("candidates") or []
            if not candidates:
                raise AIProviderError("Gemini returned no candidates in response")
            parts = candidates[0].get("content", {}).get("parts") or []
            if not parts:
                raise AIProviderError("Gemini candidate has no content parts")
            text = parts[0].get("text", "")
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise AIProviderError("Gemini returned an unexpected payload structure") from exc

        if not isinstance(text, str) or not text.strip():
            raise AIProviderError("Gemini returned an empty response")

        usage = data.get("usageMetadata") or {}
        return AIResponse(text=text.strip(), provider=self.name, model=self.model, usage=usage)
