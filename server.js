const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config({ path: './config/config.env' });

connectDB();

const vish = require('./routes/vish');
const user = require('./routes/user');
const credit = require('./routes/credit');
const merchandise = require('./routes/merchandise');
const transaction = require('./routes/transaction');
const yanTemplateImage = require('./routes/YanTemplateImage');
const yanTemplate = require('./routes/YanTemplate');

const app = express();

app.use(express.json());
app.use('/api/yan/image', yanTemplateImage);
app.use('/api/yan/template', yanTemplate);
app.use('/api/credit', credit);
app.use('/api/merchandise', merchandise);
app.use('/api/transactions', transaction);
app.use('/api/vish', vish);
app.use('/api/user', user);

app.get('/', (req, res) => {
    res.status(200).json({ success: true, msg: 'Hello World' });
});

// Export app for Vercel Serverless Function
module.exports = app;