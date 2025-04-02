import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import usuariosRutas from "./routes/usuarioRutas.js";
import { conectarBD } from "./db/db.js";
// Importar el cliente MQTT
import {client as mqttClient} from "./mqtt/mqtt.js";

const app = express();
conectarBD();

// Configuración de middleware Express
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: true, 
    credentials: true
}));

// Hacer disponible el cliente MQTT en las rutas
app.use((req, res, next) => {
  req.mqttClient = mqttClient;
  next();
});

// Rutas
app.use("/api", usuariosRutas);

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor express en http://localhost:${PORT}`);
});

// Manejar el cierre apropiado
process.on('SIGINT', () => {
  mqttClient.end();
  process.exit();
});