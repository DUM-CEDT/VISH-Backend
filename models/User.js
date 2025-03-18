const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getThaiTime } = require('../utils/timeUtils');
const YanTemplate = require('./YanTemplate');

const UserSchema = new mongoose.Schema({
    name: { 
        type: String,
        required: [true, 'Please add a name']
    },
    email: { 
        type: String, 
        required: [true, 'Please add an email'],  
        unique: true,
        match: [/^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,})$/, 'Please add a valid email']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    google_account_token: { 
        type: String 
    },
    google_account_auth_code: { 
        type: String 
    },
    google_account_refresh_token: { 
        type: String 
    },
    password: { 
        type: String, 
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    credit: { 
        type: Number, 
        default: 0 
    },
    premium: { 
        type: Boolean, 
        default: false 
    },
    vish_count: { 
        type: Number, 
        default: 0 
    },
    yan_template_id: [
        { 
            type : mongoose.Schema.ObjectId,
            ref : "YanTemplate",
        }
    ],
    vish_list: [
        { 
            type : mongoose.Schema.ObjectId,
            ref : "Vish",
        }
    ],
    vished_count: { 
        type: Number, 
        default: 0 
    },
    created_at: { 
        type: Date, 
        default: () => getThaiTime()
    }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
    if(this.password){
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
}
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
