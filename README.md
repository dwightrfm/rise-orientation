# Team RISE Orientation

The animated Orientation deck as a website, editable from the browser.

| Link | For |
|---|---|
| https://dwightrfm.github.io/rise-orientation/ | Presenting. Press F for full screen. |
| https://dwightrfm.github.io/rise-orientation/?edit | Editing. Words, pictures, QR codes, the Zoom schedule, and the big event. |
| https://dwightrfm.github.io/rise-orientation/how-to-edit.html | One-page guide for whoever edits. |

## How editing works

- `index.html` is the whole deck and the only source of truth. The old copy in `Paul/reports/rise-orientation/` is retired.
- `editor.js` loads only on the `?edit` link. Publish takes the newest `index.html` from GitHub, applies the changes, and commits it back, so edits never overwrite each other's words.
- Every slide's words carry a `data-e` number and every picture a `data-img` number. Keep them when editing by hand.
- New pictures land in `assets/` with a fresh name, so the old one stays in history.
- The big events list lives in the `<script type="application/json" id="events">` block. The weekly schedule lives in each session's `data-s="day,hour,minute"` (Pacific, 0 = Sunday).

## The edit key

Publishing needs a GitHub fine-grained token that can only touch this one repo:
Settings, Developer settings, Fine-grained tokens, Generate new token. Repository access: only `rise-orientation`. Permissions: Contents, Read and write. Nothing else.

To cut someone off, delete their token on that same page. To undo any publish, revert its commit.
