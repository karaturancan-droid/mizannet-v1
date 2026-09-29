#![allow(unused)]
#![recursion_limit = "512"]
mod commands;
mod network_server;
mod db;
mod helpers;
mod models;
mod ai;
pub mod db_migrations;
pub mod domain;
pub mod infrastructure;
pub mod crypto;

use commands::asistan::{
    asistan_clear_history, asistan_get_history, asistan_mesaj_gonder,
    create_chat_session, delete_chat_session, start_voice_recording, stop_voice_recording, get_chat_sessions, update_chat_session_title,
    library_upload_document, library_list_documents, library_delete_document,
};
use commands::backup::{export_backup, import_backup};
use commands::ai_cfo::{get_ceo_dashboard_metrics, generate_cfo_report};
use commands::companies::{create_company, delete_company, get_company, list_companies, update_company};
use commands::data_location::{get_data_location, reset_data_location, set_data_location};
use commands::file_analysis::{
    analyze_file, import_analyzed_data, parse_excel_file, ai_auto_map_excel,
    analyze_files_batch
};
use commands::documents::{
    create_document, delete_document, list_documents, list_expiring_documents,
    open_document_file, save_document_file, update_document,
};
use commands::invoices::{
    approve_invoice, check_import_hash, create_invoice, get_invoice, list_invoices,
    record_import_hash, reject_invoice, update_invoice, upload_and_extract_invoice,
};
use commands::ledger::{
    create_ledger_entry, delete_ledger_entry, get_ledger_summary, list_ledger_entries,
    update_ledger_entry, pay_company_debt,
};
use commands::notifications::{list_notifications, refresh_notifications, update_notification_status, update_notification_date};
use commands::products::{
    create_product, create_stock_movement, delete_product, get_stock_summary, list_products,
    list_stock_movements, update_product,
};
use commands::recycle_bin::{
    list_recycle_bin, permanently_delete_recycle_item, purge_expired_recycle_bin,
    restore_from_recycle_bin,
};
use commands::settings::{get_setting, set_setting, get_license_status, lock_database, unlock_database, activate_license};
use commands::tax::{create_tax_item, delete_tax_item, list_tax_items, refresh_overdue_tax_items, update_tax_item};
use ai::{test_ai_provider, text_to_speech};
use commands::vehicles::{
    create_tire, create_vehicle, create_vehicle_expense, delete_vehicle,
    get_vehicle_expense_summary, list_tires, list_vehicle_expenses, list_vehicles, update_vehicle,
};
use commands::workers::{
    calculate_severance, create_leave, create_overtime, create_payroll, create_worker,
    delete_worker, list_leaves, list_overtimes, list_payrolls, list_workers, update_payroll,
    update_worker, add_worker_advance, get_worker_advances, delete_worker_advance,
};
use commands::local_ai::{check_local_ai_installed, download_local_ai, start_local_ai, stop_local_ai, reset_local_ai, check_local_ai_running, detect_hardware, LocalAiProcess, list_local_models, get_local_ai_dir, search_hf_models, get_hf_model_files, download_hf_model, get_active_download_state};
use commands::telegram::{
    list_telegram_bots, save_telegram_bot, delete_telegram_bot,
    list_telegram_users, list_telegram_requests, update_telegram_request_status,
    list_telegram_messages, list_telegram_drafts, delete_telegram_draft, process_telegram_draft,
    start_telegram_worker, stop_telegram_worker, get_telegram_worker_status
};
use commands::whatsapp::*;
use commands::workspaces::{list_workspaces, create_workspace, switch_workspace, delete_workspace};
use commands::workflow::{list_workflow_jobs, submit_excel_export_job, start_workflow_worker};
use commands::agent_tools::{
    agent_run_terminal, agent_list_dir, agent_read_file, agent_write_file, agent_move_path,
    agent_copy_path, agent_delete_path, agent_search_files, agent_generate_excel,
    agent_generate_word, agent_generate_image, agent_open_path,
};
use commands::auto_messenger::{
    get_messenger_status, set_messenger_enabled, trigger_messenger_now,
    web_login, web_verify, web_activate_license, web_logout,
};
use commands::bank_reconciliation::{
    list_accounts, create_account, delete_account, get_account_balance, update_account_balance,
    import_bank_statement, list_bank_statement_rows, auto_match_bank_statement,
    confirm_bank_statement_row, ignore_bank_statement_row,
};
use commands::gib_einvoice::{
    gib_login, gib_check_session, gib_logout, gib_query_recipient,
    gib_create_invoice, gib_start_sms_sign, gib_complete_sms_sign,
    gib_list_documents, gib_download_invoice, gib_delete_draft,
    gib_create_smm, gib_list_smm, gib_download_smm,
};

use db::DbPool;
use tauri::Manager;


#[tauri::command]
fn get_local_ip() -> String {
    use std::net::UdpSocket;
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if let Ok(_) = socket.connect("8.8.8.8:80") {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }


            let data_dir = commands::data_location::resolve_data_dir(app.handle())
                .expect("failed to resolve data dir");
            std::fs::create_dir_all(&data_dir).expect("failed to create data dir");

            let pool_inner = db::create_pool(&data_dir);

            {
                let conn = pool_inner.get().expect("failed to get db connection");
                db_migrations::run_migrations(&conn).expect("failed to run migrations");

                commands::recycle_bin::purge_expired_recycle_bin_conn(&conn)
                    .expect("failed to purge expired recycle bin items");

                commands::tax::refresh_overdue_tax_items_conn(&conn)
                    .expect("failed to refresh overdue tax items");

                commands::notifications::refresh_notifications_conn(&conn)
                    .expect("failed to refresh notifications");
            }
            
            // Start telegram background worker if a bot is active
            commands::telegram::start_worker_on_startup(app.handle().clone(), pool_inner.clone());

            // Start auto backup worker
            commands::backup::start_auto_backup_worker(data_dir, pool_inner.clone());

            // Start workflow worker
            start_workflow_worker(app.handle().clone(), DbPool(std::sync::RwLock::new(pool_inner.clone())));

            // Start auto messenger (WhatsApp/Telegram hatırlatma ve özet gönderimi)
            commands::auto_messenger::start_auto_messenger(app.handle().clone(), pool_inner.clone());

            app.manage(DbPool(std::sync::RwLock::new(pool_inner)));
            app.manage(LocalAiProcess(std::sync::Mutex::new(None)));
            app.manage(commands::local_ai::DownloadState(std::sync::Mutex::new(commands::local_ai::ActiveDownloadState::default())));
            app.manage(commands::whatsapp::WhatsAppProcess(std::sync::Mutex::new(None)));
            
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                network_server::start_lan_server(handle).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ceo_dashboard_metrics,
            generate_cfo_report,
            get_local_ip,
            // branches
            commands::branches::list_branches,
            // workspaces
            list_workspaces,
            create_workspace,
            switch_workspace,
            delete_workspace,
            // companies
            create_company,
            update_company,
            list_companies,
            get_company,
            delete_company,
            // ledger
            create_ledger_entry,
            update_ledger_entry,
            delete_ledger_entry,
            list_ledger_entries,
            get_ledger_summary,
            pay_company_debt,
            // recycle bin
            list_recycle_bin,
            restore_from_recycle_bin,
            permanently_delete_recycle_item,
            purge_expired_recycle_bin,
            // products / stock
            create_product,
            update_product,
            list_products,
            delete_product,
            create_stock_movement,
            list_stock_movements,
            get_stock_summary,
            // vehicles
            create_vehicle,
            update_vehicle,
            list_vehicles,
            delete_vehicle,
            create_vehicle_expense,
            list_vehicle_expenses,
            get_vehicle_expense_summary,
            create_tire,
            list_tires,
            // tax
            create_tax_item,
            update_tax_item,
            list_tax_items,
            delete_tax_item,
            refresh_overdue_tax_items,
            // workers
            create_worker,
            update_worker,
            list_workers,
            delete_worker,
            create_leave,
            list_leaves,
            create_overtime,
            list_overtimes,
            create_payroll,
            update_payroll,
            list_payrolls,
            calculate_severance,
            add_worker_advance,
            get_worker_advances,
            delete_worker_advance,
            // documents
            create_document,
            update_document,
            list_documents,
            delete_document,
            list_expiring_documents,
            save_document_file,
            open_document_file,
            // notifications
            refresh_notifications,
            list_notifications,
            update_notification_status,
            update_notification_date,
            // invoices
            create_invoice,
            update_invoice,
            list_invoices,
            get_invoice,
            approve_invoice,
            reject_invoice,
            check_import_hash,
            record_import_hash,
            upload_and_extract_invoice,
            get_setting,
            set_setting,
            get_license_status,
            activate_license,
            // data location
            get_data_location,
            set_data_location,
            reset_data_location,
            // backup
            export_backup,
            import_backup,
            // asistan
            asistan_get_history,
            asistan_mesaj_gonder,
            asistan_clear_history,
            get_chat_sessions,
            create_chat_session,
            update_chat_session_title,
            delete_chat_session, start_voice_recording, stop_voice_recording,
            // kitaplık
            library_upload_document,
            library_list_documents,
            library_delete_document,
            // ai
            test_ai_provider,
            text_to_speech,
            check_local_ai_installed,
            download_local_ai,
            start_local_ai,
            stop_local_ai,
            reset_local_ai,
            check_local_ai_running,
            detect_hardware,
            list_local_models,
            get_local_ai_dir,
            search_hf_models,
            get_hf_model_files,
            download_hf_model,
            get_active_download_state,
            // whatsapp
            start_whatsapp_worker,
            stop_whatsapp_worker,
            get_whatsapp_status,
            send_whatsapp_message,
            logout_whatsapp,
            sync_whatsapp_messages,
            get_whatsapp_approvals,
            update_whatsapp_approval,
            // file analysis
            analyze_file,
            analyze_files_batch,
            import_analyzed_data,
            parse_excel_file,
            ai_auto_map_excel,
            // telegram
            list_telegram_bots,
            save_telegram_bot,
            delete_telegram_bot,
            list_telegram_users,
            list_telegram_requests,
            update_telegram_request_status,
            list_telegram_messages,
            list_telegram_drafts,
            delete_telegram_draft,
            start_telegram_worker,
            stop_telegram_worker,
            get_telegram_worker_status,
            process_telegram_draft,
            lock_database,
            unlock_database,
            list_workflow_jobs,
            submit_excel_export_job,
            // ajan araçları
            agent_run_terminal,
            agent_list_dir,
            agent_read_file,
            agent_write_file,
            agent_move_path,
            agent_copy_path,
            agent_delete_path,
            agent_search_files,
            agent_generate_excel,
            agent_generate_word,
            agent_generate_image,
            agent_open_path,
            // otomatik bildirim çalışanı
            get_messenger_status,
            set_messenger_enabled,
            trigger_messenger_now,
            // banka mutabakatı ve hesaplar
            list_accounts,
            create_account,
            delete_account,
            get_account_balance,
            update_account_balance,
            import_bank_statement,
            list_bank_statement_rows,
            auto_match_bank_statement,
            confirm_bank_statement_row,
            ignore_bank_statement_row,
            // web sitesi entegrasyonu
            web_login,
            web_verify,
            web_activate_license,
            web_logout,
            // GİB e-Arşiv e-Fatura
            gib_login,
            gib_check_session,
            gib_logout,
            gib_query_recipient,
            gib_create_invoice,
            gib_start_sms_sign,
            gib_complete_sms_sign,
            gib_list_documents,
            gib_download_invoice,
            gib_delete_draft,
            // AI fiş/gider OCR
            commands::fis_ocr::analyze_receipt,
            commands::fis_ocr::save_expense,
            commands::fis_ocr::list_expenses,
            commands::fis_ocr::delete_expense,
            commands::fis_ocr::get_expense_summary,
            // Fatura şablonu markalaşma
            commands::invoice_branding::get_invoice_branding,
            commands::invoice_branding::set_invoice_branding,
            commands::invoice_branding::render_branded_invoice_html,
            // e-SMM makbuzu
            gib_create_smm,
            gib_list_smm,
            gib_download_smm,
            // Nakit akış ajandası
            commands::cash_agenda::get_cash_agenda,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| if let tauri::RunEvent::Exit = event {
            let state = app_handle.state::<commands::local_ai::LocalAiProcess>();
            let mut guard = state.0.lock().unwrap();
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
            }
        });
}
