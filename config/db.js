const mongoose = require('mongoose')

const connectDB = async () => {
    mongoose.set('strictQuery', true)
    const conn = await mongoose.connect(process.env.MONGOOSE_URI)

    console.log(`Mongo DB Connected : ${conn.connection.host}`)
}

module.exports = connectDB