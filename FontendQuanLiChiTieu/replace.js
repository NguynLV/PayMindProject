const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}
const files = walk('c:/ProjectEXE/FontendQuanLiChiTieu/app');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    content = content.replace(/' ₫'/g, "' VNĐ'");
    content = content.replace(/>đ</g, ">VNĐ<");
    content = content.replace(/> ₫</g, "> VNĐ<");
    content = content.replace(/> đ</g, "> VNĐ<");
    content = content.replace(/' đ'/g, "' VNĐ'");

    content = content.replace(/<Text style=\{styles\.currencySymbol\}>đ<\/Text>/g, "<Text style={styles.currencySymbol}>VNĐ</Text>");
    content = content.replace(/<Text style=\{styles\.currencyLabel\}>đ<\/Text>/g, "<Text style={styles.currencyLabel}>VNĐ</Text>");

    if (original !== content) {
        fs.writeFileSync(file, content);
        console.log('Updated', file);
    }
});
