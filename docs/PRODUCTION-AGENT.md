# Autonomous research-to-video workflow

The topic-only production pipeline first calls the OpenAI Responses API with the built-in `web_search` tool required, saves the returned research report and source URLs, then drafts narration from those research notes. The AI Director breaks the script into scenes; footage is acquired through Pexels and narration synthesized through OpenAI TTS.

This still depends on credentials, source quality, and API access. AI research is not a substitute for editorial fact checking. The workflow saves its sources and report for review; publication is not automatic.
