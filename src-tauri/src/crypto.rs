use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;
use uuid::Uuid;

pub fn derive_key(password: &str) -> [u8; 32] {
    let mut current = password.as_bytes().to_vec();
    current.extend_from_slice(b"mizannet_salt_v1"); // Static salt
    
    // Key stretching to prevent brute force (100,000 iterations is better but 10,000 is a good balance for desktop)
    for _ in 0..10_000 {
        let mut hasher = Sha256::new();
        hasher.update(&current);
        let result = hasher.finalize();
        current = result.to_vec();
    }
    
    let mut key = [0u8; 32];
    key.copy_from_slice(&current);
    key
}

pub fn encrypt_db_file(db_path: &Path, password: &str) -> Result<(), String> {
    if !db_path.exists() {
        return Ok(());
    }
    
    let key = derive_key(password);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let data = fs::read(db_path).map_err(|e| e.to_string())?;
    
    // Use a completely random nonce to prevent AES-GCM key/plaintext recovery on repeated encryptions
    let uuid = Uuid::new_v4();
    let nonce_bytes = &uuid.as_bytes()[0..12]; // GCM nonce is 12 bytes
    let nonce = Nonce::from_slice(nonce_bytes); 
    
    let encrypted = cipher.encrypt(nonce, data.as_ref()).map_err(|e| e.to_string())?;

    // Prepend the 12-byte nonce to the encrypted data
    let mut final_data = nonce_bytes.to_vec();
    final_data.extend(encrypted);

    let enc_path = db_path.with_extension("sqlite.enc");
    fs::write(&enc_path, final_data).map_err(|e| e.to_string())?;
    
    // Secure delete original file
    let _ = fs::write(db_path, vec![0u8; data.len()]); // Overwrite with zeros
    fs::remove_file(db_path).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub fn decrypt_db_file(db_path: &Path, password: &str) -> Result<(), String> {
    let enc_path = db_path.with_extension("sqlite.enc");
    if !enc_path.exists() {
        return Ok(()); // Nothing to decrypt
    }
    
    let key = derive_key(password);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    
    let data = fs::read(&enc_path).map_err(|e| e.to_string())?;
    if data.len() < 12 {
        return Err("Geçersiz şifreli dosya formatı".into());
    }
    
    // Extract the random nonce from the first 12 bytes
    let nonce = Nonce::from_slice(&data[0..12]);
    let ciphertext = &data[12..];
    
    let decrypted = cipher.decrypt(nonce, ciphertext).map_err(|_e| "Şifre çözülemedi. Yanlış şifre girilmiş olabilir.".to_string())?;
    
    fs::write(db_path, decrypted).map_err(|e| e.to_string())?;
    
    // Secure delete encrypted file
    let _ = fs::write(&enc_path, vec![0u8; data.len()]); // Overwrite with zeros
    fs::remove_file(&enc_path).map_err(|e| e.to_string())?;
    
    Ok(())
}
