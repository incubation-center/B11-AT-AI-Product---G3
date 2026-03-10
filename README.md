# AI Core API Demo (RAG)

This repo now includes API endpoints for a Postman-first AI core demo:

- `POST /api/ingest`
- `POST /api/extract`
- `POST /api/detect-anomaly`
- `POST /api/execute`

All endpoints return strict JSON only.

## 1. Setup

1. Add `GEMINI_API_KEY` to `.env`.
2. Run:

```bash
npm run dev
```

## 2. Endpoint Specs

### `POST /api/ingest`

`multipart/form-data`:

- `file` (required): PDF, PNG, JPEG, WEBP, or TXT
- `user_id` (optional, default `demo-user`)
- `service_name` (optional; required if `doc_type=bill` to build history)
- `category_hint` (optional)
- `doc_type` (optional: `contract`, `bill`, `other`; default `contract`)

Example flow:

1. Upload service contract (`doc_type=contract`)
2. Upload historical bill #1 (`doc_type=bill`, `service_name=...`)
3. Upload historical bill #2 (`doc_type=bill`, `service_name=...`)

### `POST /api/extract`

`application/json`:

```json
{
  "user_id": "demo-user",
  "service_name": "Acme Internet",
  "doc_type": "contract"
}
```

Response shape:

```json
{
  "category": "Utility",
  "next_due_date": "2026-03-25",
  "amount": 149.99,
  "notice_period": "30 days written notice",
  "penalty_rules": ["Late fee 5%", "Auto-renewal lock-in 12 months"],
  "hidden_rules": ["Price may increase after promo period"],
  "evidence": ["..."]
}
```

### `POST /api/detect-anomaly`

`application/json`:

```json
{
  "user_id": "demo-user",
  "service_name": "Acme Internet",
  "current_amount": 400,
  "current_usage": 980,
  "bill_date": "2026-03-09",
  "persist_current": true
}
```

This compares current bill vs historical records in `data/bills.json` and uses contract RAG evidence to classify likely cause:

- `usage_based`
- `rate_change`
- `unknown`

### `POST /api/execute`

`application/json`:

```json
{
  "user_id": "demo-user",
  "service_name": "Acme Internet",
  "user_request": "Please cancel this service and make a letter",
  "findings": {
    "anomaly": true,
    "wants_termination": true
  }
}
```

Dispatches OpenClaw-style actions:

- `just-fucking-cancel`
- `ai-pdf-builder`

## 3. Demo Script For Thursday

1. `POST /api/ingest` contract
2. `POST /api/ingest` 2 old bills
3. `POST /api/extract` hidden rules + due date + penalties
4. `POST /api/detect-anomaly` with high current bill (example: `200 -> 400`)
5. `POST /api/execute` to auto-trigger cancellation and/or dispute letter

This demonstrates full RAG architecture: Ingest -> Index -> Retrieve -> Generate.
