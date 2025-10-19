import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    specialization: {
        type: String,
        required: true
    },
    experience: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },

    degree: {
        type: String,
        required: true
    },

    about: {
        type: String,
        required: true
    },
    fees: {
        type: Number,
        required: true
    },
    availability: {
        type: Boolean,
        required: true
    },
    date: {
        type: Number,
        required: true
    },
    slots_booked: {
        type: Object,
        default: {}
    }

}, {minimize: false}); // we can use this empty object as default value



const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);

export default Doctor;


//using this model we can create, read, update, delete doctor records in the "doctors" collection in MongoDB