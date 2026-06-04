require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Force Node.js to use Google DNS to fix 'querySrv ECONNREFUSED' error in Windows
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/biodataSync';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Mongoose Schema & Model
const biodataSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  data: { type: Object, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const Biodata = mongoose.model('Biodata', biodataSchema);

// Routes
app.get('/', (req, res) => {
  res.send('Biodata Team Sync API is running...');
});

// GET all biodata changes (similar to Firebase /biodata.json)
app.get('/api/biodata', async (req, res) => {
  try {
    const allData = await Biodata.find();
    // Convert array to object to match Firebase structure: { "od_123": { ... }, "hb_456": { ... } }
    const formattedData = {};
    allData.forEach(item => {
      formattedData[item.id] = item.data;
    });
    res.json(formattedData);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single biodata changes by ID
app.get('/api/biodata/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const biodata = await Biodata.findOne({ id: id });
    if (biodata) {
      res.json(biodata.data);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error("Error fetching single data:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT (Save/Update) biodata by ID (similar to Firebase /biodata/id.json)
app.put('/api/biodata/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Use findOneAndUpdate with upsert: true to either update or create
    await Biodata.findOneAndUpdate(
      { id: id },
      { id: id, data: data, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Data saved securely in MongoDB' });
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE biodata by ID (optional, if they want to clear edits)
app.delete('/api/biodata/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await Biodata.findOneAndDelete({ id: id });
      res.json({ success: true, message: 'Data deleted securely from MongoDB' });
    } catch (error) {
      console.error("Error deleting data:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
