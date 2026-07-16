const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app', 'frontend', 'src', 'components');
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('.jsx')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        // Replace fetch('/api/... with fetch((import.meta.env.VITE_API_URL || '') + '/api/...
        content = content.replace(/fetch\('(?=\/api\/)/g, "fetch((import.meta.env.VITE_API_URL || '') + '");
        content = content.replace(/fetch\("(?=\/api\/)/g, 'fetch((import.meta.env.VITE_API_URL || "") + "');
        content = content.replace(/fetch\(`(?=\/api\/)/g, 'fetch((import.meta.env.VITE_API_URL || "") + `');
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});
