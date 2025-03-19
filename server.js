const express = require('express')
const dotenv = require('dotenv')
const connectDB = require('./config/db')

dotenv.config({path:'./config/config.env'})

connectDB()

const vish = require('./routes/vish')
const user = require('./routes/user')

const credit = require('./routes/credit');
const merchandise = require('./routes/merchandise');
const transaction = require('./routes/transaction');

const app = express()

const yanTemplateImage = require('./routes/YanTemplateImage')
const yanTemplate = require('./routes/YanTemplate')
const YanSetName = require('./models/YanSetName')

app.use(express.json())
app.use('/api/yan/image', yanTemplateImage)
app.use('/api/yan/template', yanTemplate)

app.use('/api/credit', credit);
app.use('/api/merchandise', merchandise);
app.use('/api/transactions', transaction);

app.get('/', (req , res) => {
    res.status(200).json({success : true, msg : 'Hello World'})
})

app.use('/api/vish', vish)
app.use('/api/user', user)

const PORT = process.env.PORT || 1234

//module.exports = app;
const server = app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, 'mode on port', PORT))
