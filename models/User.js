const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, trim: true, sparse: true, default: null },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    googleId: { type: String, sparse: true },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    photo: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    interviewsCompleted: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    streak: { type: Number, default: 0 }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);