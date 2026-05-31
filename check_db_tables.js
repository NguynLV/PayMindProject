const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://paymind:b4A5uhEz5OdoQXWVDKBjuETXZ2AB8oTx@dpg-d8e1uft8nd3s73a7p69g-a.singapore-postgres.render.com:5432/paymind?ssl=true'
});

async function main() {
    try {
        console.log('Đang kết nối tới database Render PostgreSQL...');
        await client.connect();
        console.log('Kết nối thành công! 🎉');

        // Query all user tables
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        console.log('\n--- Danh sách các bảng đã tạo ---');
        if (res.rows.length === 0) {
            console.log('Chưa có bảng nào được tạo.');
        } else {
            for (let row of res.rows) {
                // Get row count for each table
                const countRes = await client.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
                console.log(`- Bảng: ${row.table_name} (${countRes.rows[0].count} dòng)`);
            }
        }
        console.log('---------------------------------');

    } catch (err) {
        console.error('Lỗi khi kết nối hoặc truy vấn:', err.message);
    } finally {
        await client.end();
    }
}

main();
