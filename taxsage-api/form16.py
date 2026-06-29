import io
import base64
import json
import anthropic
import pikepdf

FORM16_SYSTEM = """You are an Indian income tax expert parsing a Form 16 PDF
(issued by employer under Section 203 of Income Tax Act).
Extract structured data accurately. Return only valid JSON."""

FORM16_PROMPT = """From this Form 16 PDF (Parts A, B and Annexure), extract:

1. Employer details: name, TAN
2. Employee details: name, PAN
3. Assessment year
4. Salary breakup from Annexure (all components listed)
5. Gross salary total
6. Section 10 exemptions (HRA, LTA etc) — amount and type
7. Standard deduction u/s 16(ia)
8. Net taxable salary (after sec 16 deductions)
9. Deductions claimed under Chapter VI-A — list each:
   - section (e.g. 80C, 80CCD1B, 80CCD2, 80D)
   - gross_amount
   - eligible_amount (the deductible amount)
10. Total deductions
11. Total taxable income
12. Tax on total income
13. Surcharge
14. Health and education cess
15. Total tax payable
16. TDS deducted total
17. Regime: check "opting out of 115BAC" field —
    if "No" = new_regime, if "Yes" = old_regime, if blank = unknown
18. Is 80CCD(2) present? If yes, extract:
    - employer_nps_amount (gross amount contributed)
    - employer_nps_eligible (eligible deduction — may be 0 if portal bug)
    - basic_salary (extract from annexure salary breakup)
    - max_allowed_14pct (compute as basic_salary * 0.14)
    - portal_bug_detected (true if employer_nps_eligible = 0
      but employer_nps_amount > 0)

Return ONLY this JSON structure, no other text:
{
  "employer_name": "",
  "employer_tan": "",
  "employee_name": "",
  "employee_pan": "",
  "assessment_year": "",
  "regime": "new_regime|old_regime|unknown",
  "gross_salary": 0,
  "section10_exemptions": 0,
  "standard_deduction": 0,
  "net_taxable_salary": 0,
  "salary_components": [{"name": "", "amount": 0}],
  "deductions": [{"section": "", "gross_amount": 0, "eligible_amount": 0}],
  "total_deductions": 0,
  "total_taxable_income": 0,
  "tax_on_income": 0,
  "surcharge": 0,
  "cess": 0,
  "total_tax_payable": 0,
  "tds_deducted": 0,
  "nps_80ccd2": {
    "employer_nps_amount": 0,
    "employer_nps_eligible": 0,
    "basic_salary": 0,
    "max_allowed_14pct": 0,
    "portal_bug_detected": false
  }
}"""


def _decrypt_pdf(pdf_bytes: bytes, password: str) -> bytes:
    try:
        with pikepdf.open(io.BytesIO(pdf_bytes)) as pdf:
            buf = io.BytesIO()
            pdf.save(buf)
            return buf.getvalue()
    except pikepdf.PasswordError:
        pass
    try:
        with pikepdf.open(io.BytesIO(pdf_bytes), password=password) as pdf:
            buf = io.BytesIO()
            pdf.save(buf)
            return buf.getvalue()
    except pikepdf.PasswordError:
        raise ValueError("wrong_password")


def _call_claude(pdf_bytes: bytes) -> dict:
    client = anthropic.Anthropic()
    b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

    def _attempt():
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=FORM16_SYSTEM,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "document",
                     "source": {"type": "base64",
                                "media_type": "application/pdf",
                                "data": b64}},
                    {"type": "text", "text": FORM16_PROMPT},
                ],
            }],
        )
        raw = resp.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        return json.loads(raw)

    try:
        data = _attempt()
    except (json.JSONDecodeError, Exception):
        try:
            data = _attempt()
        except Exception as e:
            raise ValueError(f"claude_parse_failed: {e}")

    # Post-process: add filing guidance
    data["filing_guidance"] = _build_guidance(data)
    return data


def _build_guidance(data: dict) -> dict:
    """Build actionable ITR filing guidance from extracted Form 16 data."""
    regime = data.get("regime", "unknown")
    nps = data.get("nps_80ccd2", {})
    guidance = {
        "schedule_s": [],
        "schedule_via": [],
        "schedule_tds1": [],
        "flags": [],
        "regime_note": ""
    }

    # Schedule S entries
    guidance["schedule_s"] = [
        {"label": "Gross salary (row 2)",
         "value": data.get("gross_salary", 0),
         "action": "verify_prefilled"},
        {"label": "Standard deduction u/s 16(ia) (row 5)",
         "value": data.get("standard_deduction", 0),
         "action": "verify_prefilled"},
        {"label": "Net taxable salary (row 6)",
         "value": data.get("net_taxable_salary", 0),
         "action": "verify_prefilled"},
    ]

    # TDS1 entries
    guidance["schedule_tds1"] = [
        {"label": "Employer name",
         "value": data.get("employer_name", ""),
         "action": "verify_prefilled"},
        {"label": "Employer TAN",
         "value": data.get("employer_tan", ""),
         "action": "verify_prefilled"},
        {"label": "TDS deducted",
         "value": data.get("tds_deducted", 0),
         "action": "verify_prefilled"},
    ]

    # Schedule VI-A — regime-aware
    if regime == "new_regime":
        guidance["regime_note"] = ("New regime detected. Only 80CCD(2) employer NPS "
                                   "is deductible. 80C, 80D, 80TTA not available.")
        if nps.get("employer_nps_amount", 0) > 0:
            guidance["schedule_via"].append({
                "section": "80CCD(2) — Employer NPS",
                "amount": nps.get("employer_nps_amount", 0),
                "eligible": nps.get("employer_nps_amount", 0),
                "action": "manual_entry_required",
                "note": ("⚠️ Known portal issue: ITR portal often shows 'Amount eligible for "
                         "deduction' as ₹0 for 80CCD(2). Verify your Schedule VI-A shows "
                         "₹{:,} in both fields. If eligible amount shows ₹0, delete "
                         "the entry and re-add manually.").format(
                             nps.get("employer_nps_amount", 0))
            })
    else:
        guidance["regime_note"] = ("Old regime detected. All eligible deductions "
                                   "under Chapter VI-A can be claimed.")
        for ded in data.get("deductions", []):
            if ded.get("eligible_amount", 0) > 0:
                guidance["schedule_via"].append({
                    "section": ded["section"],
                    "amount": ded.get("gross_amount", 0),
                    "eligible": ded.get("eligible_amount", 0),
                    "action": "verify_prefilled"
                })

    # Flags
    if data.get("surcharge", 0) > 0:
        guidance["flags"].append({
            "type": "info",
            "message": ("Surcharge applicable — your income exceeds ₹50L. "
                        "Auto-computed by portal.")
        })
    if nps.get("portal_bug_detected", False):
        guidance["flags"].append({
            "type": "error",
            "message": ("80CCD(2) deduction of ₹{:,} not applied — "
                        "portal shows eligible amount as ₹0. "
                        "Fix this before filing.").format(
                            nps.get("employer_nps_amount", 0))
        })
    tds = data.get("tds_deducted", 0)
    tax = data.get("total_tax_payable", 0)
    if tds < tax:
        guidance["flags"].append({
            "type": "warning",
            "message": ("TDS ₹{:,} is less than tax payable ₹{:,}. "
                        "Difference of ₹{:,} will show as payable — "
                        "pay via self-assessment tax before filing.").format(
                            tds, tax, tax - tds)
        })

    return guidance


def parse(pdf_bytes: bytes, password: str) -> dict:
    decrypted = _decrypt_pdf(pdf_bytes, password)
    return _call_claude(decrypted)
