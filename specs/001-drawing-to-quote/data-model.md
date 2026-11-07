# Data Model: Drawing-to-Quote

All entities live in the browser (state + localStorage drafts). Coordinates are page-normalised
(0–1 of page width/height).

## Project
| field | type | notes |
|---|---|---|
| id | string | uuid |
| customer, customerUpper, address, date | string | date dd/mm/yyyy |
| sourceName | string | PDF file name |
| status | `draft` \| `reviewed` \| `exported` | `reviewed` set when review screen opened (FR-012) |
| pages | Page[] | |
| legend | LegendSymbol[] | |
| detections | Detection[] | |
| rooms | RoomLabel[] | |
| estimates | Estimate[] | LED strip, rail lengths |
| edits | EditLog[] | before/after (Principle IV) |
| source | `gemini` \| `claude-api` \| `claude-import` | |

## Page
`index:number, discipline: legend|panel|lighting|power|low_voltage|hvac|other, floor:string,
frame:{x,y,w,h} (normalised), confidence:number, analysed:boolean`

## LegendSymbol
`name:string (as printed), deviceType:DeviceType, note?:string (e.g. "H=+1200")`

## DeviceType (canonical)
`downlight, spotlight, panel_light, ceiling_light, chandelier, wall_light, tube_light, led_strip,
exhaust_fan, ceiling_fan, switch, socket, socket_wp, floor_socket, junction_box, curtain_point,
camera_indoor, camera_outdoor, data_outlet, tv_outlet, wifi_ap, ac_indoor, water_heater, db_panel`

## Detection
| field | type |
|---|---|
| id | string |
| page | number |
| type | DeviceType |
| x, y | number (centre) |
| box | [x1,y1,x2,y2] normalised |
| room | string |
| circuits | string (raw, e.g. "13,14,15") |
| twoWay | boolean |
| note | string (e.g. "nguồn rèm", "H=2.0") |
| pass | 1 \| 2 \| `manual` |
| status | `ok` \| `disputed` \| `removed` |
| confidence | number 0–1 |

Validation: x,y ∈ [0,1]; `switch` requires circuits (else warning); `removed` detections excluded
from BOQ but kept for audit.

## RoomLabel
`page, name, x, y, floor`

## Estimate
`key ("led_strip:<room>" | "rail:<room>"), meters:number, source:"ai"|"manual", estimated:true`

## BOQLine (derived, never stored)
`code, name, unit, qty, rooms:string[], detectionIds:string[], estimated:boolean,
scope: "smarthome"|"lighting"|"excluded"`

## CrossCheck (derived)
`code (C1..C6), severity: info|warn|error, message (vi), detectionIds[]`

## CatalogItem (localStorage, editable)
`code, name, desc, img, unit, price, discount, group: lighting_ctrl|curtain|camera|gate|light|
excluded, boqCode` + settings `{installRate:0.15, lightDiscount:0.35, lightInstall:0,
defaultDownlight:"downlight_ab"|"athena", mergeAdjacentSwitches:true}`

## Quote (derived)
lines with price/discount/after/total; sums niem, giam, sau, lapDat, tongSH; lighting niem, ck,
tong; grand total; amount in words.

## Takeoff JSON (import/export contract) — see contracts/takeoff.schema.json
