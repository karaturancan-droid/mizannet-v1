const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function run() {
    const inputPath = path.join(__dirname, 'public', 'logo.svg');
    const outputPath = path.join(__dirname, 'app-icon.png');
    
    console.log("Converting original SVG logo to PNG...");
    
    // Convert SVG to PNG at 1024x1024
    await sharp(inputPath)
        .resize(1024, 1024, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
    
    console.log("Image converted to app-icon.png");
}

run().catch(console.error);
