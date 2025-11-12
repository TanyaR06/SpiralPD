console.log("🚀 Starting Weather App server...");


require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const History = require('./models/History');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Endpoint: get weather for city
app.get('/api/weather/:city', async (req, res) => {
  try {
    const city = req.params.city;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.json({ error: 'API key not configured.' });

    // Call OpenWeatherMap current weather API (metric units)
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    const response = await axios.get(url);
    const d = response.data;

    const result = {
      city: `${d.name}, ${d.sys.country}`,
      temp: d.main.temp,
      humidity: d.main.humidity,
      wind: d.wind.speed,
      condition: d.weather[0].main,
      description: d.weather[0].description
    };

    // Save to history (keep only last 5)
    // Save to history (keep only last 5)
try {
  const newEntry = await History.create({ city: result.city });
  console.log('✅ Saved to DB:', newEntry);

  const count = await History.countDocuments();
  if (count > 5) {
    // delete oldest
    const oldest = await History.find().sort({ createdAt: 1 }).limit(count - 5);
    const ids = oldest.map(o => o._id);
    await History.deleteMany({ _id: { $in: ids } });
  }
} catch (e) {
  console.warn('⚠️ History save failed:', e.message);
}


    res.json(result);
  } catch (err) {
    // handle 404 city not found from API
    if (err.response && err.response.data && err.response.data.message) {
      return res.json({ error: err.response.data.message });
    }
    res.json({ error: 'Could not fetch weather. Try again.' });
  }
});

// Endpoint: get search history
app.get('/api/history', async (req, res) => {
  try {
    const hist = await History.find().sort({ createdAt: -1 }).limit(5);
    res.json(hist);
  } catch (e) {
    res.json([]);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
