const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config({ path: 'konfig.env' });

const app = express();
app.use(cors());
app.use(express.json());

// 0. RUTE UTAMA (Mengatasi Error 404 saat Frontend Aslab mengetuk cek koneksi awal)
app.get('/', (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Welcome to Anggun's Cloud Computing API!"
    });
});

// Konfigurasi Database Connection Pool menggunakan data dari file konfig.env
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 1. ENDPOINT /health (Cek status backend & koneksi ke MariaDB GCP)
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({
            status: "success",
            message: "Backend is running",
            database: "connected",
            student: {
                name: "Anggun Weldiana Putri",
                nim: "2311523040" 
            }
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Backend is running, but database is not connected",
            database: "disconnected",
            student: {
                name: "Anggun Weldiana Putri",
                nim: "2311523040"
            }
        });
    }
});

// 2. ENDPOINT /schema (Membantu frontend otomatis men-generate form input dan tabel)
app.get('/schema', (req, res) => {
    res.status(200).json({
        student: { 
            name: "Anggun Weldiana Putri", 
            nim: "2311523040" 
        },
        resource: {
            name: "cameras",
            label: "Data Kamera",
            description: "Aplikasi untuk mengelola data kamera"
        },
        fields: [
            { name: "brand", label: "Brand Kamera", type: "text", required: true, showInTable: true },
            { name: "model", label: "Model / Seri", type: "text", required: true, showInTable: true },
            { name: "megapixel", label: "Resolusi (MP)", type: "number", required: true, showInTable: true },
            { name: "price", label: "Harga", type: "number", required: true, showInTable: true }
        ],
        endpoints: {
            list: "/items",
            detail: "/items/{id}",
            create: "/items",
            update: "/items/{id}",
            delete: "/items/{id}"
        }
    });
});

// 3. CRUD: GET ALL ITEMS (Mengambil semua data kamera dari MariaDB)
app.get('/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM cameras');
        console.log("DATA DARI DATABASE:", rows);
        res.status(200).json({
            status: "success",
            message: "Data retrieved successfully",
            data: rows
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 4. CRUD: GET ITEM BY ID (Melihat detail satu data berdasarkan ID)
app.get('/items/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM cameras WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ status: "error", message: "Item not found" });
        
        res.status(200).json({
            status: "success",
            message: "Data retrieved successfully",
            data: rows[0]
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 5. CRUD: POST CREATE ITEM (Menambahkan data kamera baru ke MariaDB)
app.post('/items', async (req, res) => {
    const { brand, model, megapixel, price } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO cameras (brand, model, megapixel, price) VALUES (?, ?, ?, ?)',
            [brand, model, megapixel, price]
        );
        res.status(201).json({
            status: "success",
            message: "Data created successfully",
            data: { id: result.insertId, brand, model, megapixel, price }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 6. CRUD: PUT UPDATE ITEM (Mengubah data kamera berdasarkan ID)
app.put('/items/:id', async (req, res) => {
    const { brand, model, megapixel, price } = req.body;
    const { id } = req.params;
    try {
        await pool.query(
            'UPDATE cameras SET brand = ?, model = ?, megapixel = ?, price = ? WHERE id = ?',
            [brand, model, megapixel, price, id]
        );
        res.status(200).json({
            status: "success",
            message: "Data updated successfully",
            data: { id: parseInt(id), brand, model, megapixel, price }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 7. CRUD: DELETE ITEM (Menghapus data kamera berdasarkan ID)
app.delete('/items/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM cameras WHERE id = ?', [req.params.id]);
        res.status(200).json({
            status: "success",
            message: "Data deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Menjalankan Server dengan Port dinamis untuk GCP Cloud Run serta binding ke 0.0.0.0
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});