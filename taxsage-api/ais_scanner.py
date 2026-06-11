import io
import json
import base64

import pikepdf
import anthropic

SYSTEM_PROMPT = """You are a tax assistant specialized in Indian income tax \
compliance for FY 2025-26. Analyze the Annual Information Statement (AIS) and \
return a structured JSON response with plain-English flags. Be accurate, cite \
exact amounts and sources. Return ONLY valid JSON, no other text."""

USER_PROMPT = """Analyze this AIS for FY 2025-26. Return ONLY this JSON structure, \
no other text, no markdown fences:
{
  "summary": {
    "total_sections_found": <number>,
    "red_flags": <number>,
    "yellow_flags": <number>,
    "green_flags": <number>,
    "headline": "<one sentence: most important action>"
  },
  "flags": [
    {
      "id": <number>,
      "section_code": "<e.g. TDS-192>",
      "section_name": "<e.g. Salary>",
      "flag_level": "<green|yellow|red>",
      "source": "<payer/deductor name>",
      "amount": <integer paise-free>,
      "plain_english": "<1-2 sentences for a salaried professional, no jargon>",
      "action": "<specific next step or null>"
    }
  ]
}

Flag rules:
- TDS-192 Salary: all quarters Active + TDS>0 → green. Any TDS=0 on salary → red.
- TDS-194 Dividend with TDS=0 and amount<5000 per company → yellow (declare in Schedule OS).
- TDS-194C Business receipts on salaried person → red (wrong section, scrutiny risk).
- TCS-206CQ LRS remittance ≤7,00,000 with TCS=0 → green. Above 7L with TCS=0 → red.
- TDS-194IA Property purchase with TDS deposited → yellow if "Not Categorized". \
  Verify Form 26QB on TRACES.
- TCS-206CL Vehicle with TCS deposited Active → green.
- SFT-015 Dividend income → yellow (must declare in Schedule OS regardless of amount).
- SFT-016(SB) Savings interest → yellow (declare in OS; 80TTA exempt ₹10K old regime only).
- SFT-016(TD) Term deposit interest → yellow (fully taxable, declare in OS).
- SFT-017 Equity share sales with STCG/LTCG mix → red (Schedule CG required; \
  STCG 20%, LTCG above ₹1.25L at 12.5%).
- SFT-018 MF redemptions → red (Schedule CG required).
- Inactive status on any entry → yellow (dispute raised; verify before including in ITR).
- Part B4 Refund → yellow (verify credited to bank).
- Part B3 Tax payment challan → green if BSR+serial present and amount matches TDS.
"""


def scan(pdf_bytes: bytes, password: str) -> dict:
    # Step 1: decrypt PDF
    try:
        with pikepdf.open(io.BytesIO(pdf_bytes), password=password) as pdf:
            buf = io.BytesIO()
            pdf.save(buf)
            decrypted_bytes = buf.getvalue()
    except pikepdf.PasswordError:
        return {
            "error": "wrong_password",
            "message": "Incorrect PAN or date of birth. Please check and retry.",
        }

    # Step 2: base64 encode
    b64_pdf = base64.standard_b64encode(decrypted_bytes).decode("utf-8")

    # Step 3: call Anthropic API
    client = anthropic.Anthropic()
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": b64_pdf,
                            },
                        },
                        {
                            "type": "text",
                            "text": USER_PROMPT,
                        },
                    ],
                }
            ],
        )
    except anthropic.APIError as e:
        return {"error": "api_error", "detail": str(e)}

    # Step 4: extract text
    raw = response.content[0].text

    # Step 5: strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    # Step 6: parse JSON
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "error": "parse_error",
            "message": "Could not parse AIS. Please try again.",
        }
