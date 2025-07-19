require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://atlas-sql-687af49c3cba7712fbf8add1-8ytrwg.a.query.mongodb.net/sample_mflix?ssl=true&authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Level Schema
const levelSchema = new mongoose.Schema({
    title: String,
    author: String,
    difficulty: Number,
    songUrl: String,
    coverUrl: String,
    noteData: Array,
    createdAt: { type: Date, default: Date.now }
});
const Level = mongoose.model('Level', levelSchema);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// API Routes
app.get('/api/levels', async (req, res) => {
    try {
        const levels = await Level.find().sort({ createdAt: -1 });
        res.json(levels);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch levels' });
    }
});

app.post('/api/levels', upload.fields([
    { name: 'song', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), async (req, res) => {
    try {
        const { title, author, difficulty, noteData } = req.body;
        
        const newLevel = new Level({
            title,
            author,
            difficulty: parseInt(difficulty),
            songUrl: `/uploads/${req.files.song[0].filename}`,
            coverUrl: `/uploads/${req.files.cover[0].filename}`,
            noteData: JSON.parse(noteData)
        });
        
        await newLevel.save();
        res.status(201).json(newLevel);
    } catch (error) {
        console.error('Error creating level:', error);
        res.status(500).json({ error: 'Failed to create level' });
    }
});

// Serve static files
app.use('/uploads', express.static(uploadDir));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
