import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    tipoUsuario: {
        type: String,
        default: "usuario"
    },
    password: {
        type: String,
        required: true
    },
    salt: {
        type: String,
        required: true
    }
}, 
{
    timestamps: true,
    collection: "youtube"
});

export default mongoose.model("Youtube", userSchema);