import mongoose from "mongoose";
import { mensajes } from "../libs/mensajes.js";

const MONGO_CONN_URL= 'mongodb+srv://demo_user:caPwKFH62mMXDqjh@cluster0.rk3zm.mongodb.net/test?retryWrites=true&w=majority';

export async function conectarBD() {
    try {
        await mongoose.connect(MONGO_CONN_URL);
        return mensajes(200, "Conexión a la BD en MongoDB Atlas exitosa");
    } catch (error) {
        console.error("Error en la conexión:", error);
        return mensajes(400, "Error al conectarse a la BD en MongoDB Atlas", error);
    }
}