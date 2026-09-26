#![allow(unused)]
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Branch {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Company {
    pub id: String,
    pub name: String,
    pub tax_no: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub contact_person: Option<String>,
    pub balance: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LedgerEntry {
    pub id: String,
    pub company_id: String,
    pub date: String,
    pub document_no: Option<String>,
    pub description: Option<String>,
    pub debit: f64,
    pub credit: f64,
    pub running_balance: f64,
    pub entry_type: Option<String>,
    pub created_at: String,
    pub branch_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LedgerSummary {
    pub total_debit: f64,
    pub total_credit: f64,
    pub net: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecycleBinItem {
    pub id: String,
    pub entity_type: String,
    pub record_data: String,
    pub deleted_at: String,
    pub restore_deadline: String,
    pub days_left: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub sku: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub purchase_price: f64,
    pub sale_price: f64,
    pub min_stock: f64,
    pub current_stock: f64,
    pub supplier: Option<String>,
    pub image_path: Option<String>,
    pub branch_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockMovement {
    pub id: String,
    pub product_id: String,
    #[serde(rename = "type")]
    pub movement_type: String,
    pub quantity: f64,
    pub date: String,
    pub note: Option<String>,
    pub branch_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockSummary {
    pub total_stock_value: f64,
    pub critical_products: Vec<Product>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vehicle {
    pub id: String,
    pub plate: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub year: Option<i64>,
    pub status: Option<String>,
    pub km: Option<f64>,
    pub inspection_due_date: Option<String>,
    pub insurance_due_date: Option<String>,
    pub created_at: String,
    pub category: Option<String>,
    pub branch_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VehicleExpense {
    pub id: String,
    pub vehicle_id: String,
    #[serde(rename = "type")]
    pub expense_type: Option<String>,
    pub amount: f64,
    pub date: String,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VehicleExpenseByType {
    #[serde(rename = "type")]
    pub expense_type: String,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VehicleExpenseSummary {
    pub by_type: Vec<VehicleExpenseByType>,
    pub grand_total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tire {
    pub id: String,
    pub vehicle_id: String,
    pub position: Option<String>,
    pub dot_code: Option<String>,
    pub tread_depth: Option<f64>,
    pub change_date: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaxItem {
    pub id: String,
    #[serde(rename = "type")]
    pub tax_type: String,
    pub period: Option<String>,
    pub amount: f64,
    pub due_date: String,
    pub status: String,
    pub receipt_path: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub branch_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Worker {
    pub id: String,
    pub full_name: String,
    pub tc_no: Option<String>,
    pub birth_date: Option<String>,
    pub hire_date: Option<String>,
    pub exit_date: Option<String>,
    pub position: Option<String>,
    pub sgk_no: Option<String>,
    pub iban: Option<String>,
    pub salary: f64,
    pub contract_end_date: Option<String>,
    pub created_at: String,
    pub image_path: Option<String>,
    pub branch_id: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkerAdvance {
    pub id: String,
    pub worker_id: String,
    pub amount: f64,
    pub date: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Leave {
    pub id: String,
    pub worker_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(rename = "type")]
    pub leave_type: Option<String>,
    pub days: Option<f64>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Overtime {
    pub id: String,
    pub worker_id: String,
    pub date: String,
    pub hours: f64,
    pub rate: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Payroll {
    pub id: String,
    pub worker_id: String,
    pub period: String,
    pub gross: Option<f64>,
    pub net: Option<f64>,
    pub deductions: Option<f64>,
    pub status: Option<String>,
    pub receipt_path: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub category: Option<String>,
    pub file_type: Option<String>,
    pub file_path: Option<String>,
    pub related_type: Option<String>,
    pub related_id: Option<String>,
    pub expiry_date: Option<String>,
    pub tags: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub module: String,
    pub related_id: Option<String>,
    pub due_date: Option<String>,
    pub days_left: Option<i64>,
    pub status: String,
    pub source_type: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Invoice {
    pub id: String,
    pub company_id: Option<String>,
    pub invoice_no: Option<String>,
    pub date: Option<String>,
    pub subtotal: Option<f64>,
    pub vat_amount: Option<f64>,
    pub total: Option<f64>,
    pub iban: Option<String>,
    pub raw_data: Option<String>,
    pub status: String,
    pub file_path: Option<String>,
    pub created_at: String,
    pub branch_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Setting {
    pub key: String,
    pub value: Option<String>,
}
