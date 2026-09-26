# Tauri v2 Event Emitting

When writing Rust code for Tauri v2 to emit events to the frontend:
1. **Do not use** `emit_all()`. This method was removed in v2.
2. **Use** `emit()` instead. For example: `app_handle.emit("event-name", payload);`
3. **Always import** the `Emitter` trait: `use tauri::Emitter;` or `use tauri::{Manager, Emitter};`
