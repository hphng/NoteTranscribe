import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Username is required'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true, 
        lowercase: true,
        validate: [validator.isEmail, 'Please enter a valid email address.']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8
    },
    photo: {
        type: String,
    },
});

// Hash the password before saving the user
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const User = mongoose.model('User', userSchema);

export default User;