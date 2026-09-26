## 2026-09-21 - [Icon-Only Button Tooltips]
**Learning:** While ria-label provides screen reader accessibility, it is invisible to sighted users. When top-nav buttons only contain icons (like Calendar, Notifications), users might not immediately recognize their function without interacting.
**Action:** Always pair ria-label with the standard HTML 	itle attribute for icon-only buttons to provide a native hover tooltip, or use a custom Tooltip component if available.

