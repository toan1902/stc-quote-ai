# Contract: POST /api/ai

Auth: signed `stc_auth` cookie (401 otherwise). Body ≤ 4 MB.

## Request
```json
{
  "task": "classify | frame | legend | detect | verify | panel | estimate",
  "image": "data:image/jpeg;base64,...",
  "context": {
    "legend": [{"name": "Đèn downlight âm trần", "deviceType": "downlight"}],
    "discipline": "lighting",
    "candidates": [{"id": "d12", "type": "downlight"}]
  }
}
```

## Response 200
```json
{ "provider": "gemini", "model": "gemini-flash-latest", "data": { ... task-specific JSON ... } }
```
Task payloads (all coordinates `box_2d = [ymin,xmin,ymax,xmax]` normalised 0–1000 to the sent image):
- classify → `{discipline, floor, confidence}`
- frame → `{box_2d}` (drawing area excluding title block)
- legend → `{symbols:[{name, deviceType, note}]}`
- detect → `{items:[{type, box_2d, circuits, room, note, twoWay}], rooms:[{name, point:[y,x]}]}`
- verify → `{remove:[id], retype:[{id,type}], add:[item]}`
- panel → `{circuits:[{name, function, load_w}]}`
- estimate → `{led_strip:[{room, meters}], rails:[{room, meters}]}`

## Errors
- 401 `{error:"unauthorized"}` · 429 `{error:"rate_limited", retryAfter:s}` · 502 `{error:"provider", detail}`
