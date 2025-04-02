import mqtt from "mqtt";
import mongoose from "mongoose";

// Conectar a MongoDB
const mongoUri = "mongodb+srv://demo_user:caPwKFH62mMXDqjh@cluster0.rk3zm.mongodb.net/test?retryWrites=true&w=majority";

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Conectado a MongoDB Atlas"))
  .catch((err) => console.error("Error al conectar a MongoDB:", err));

// Definir el esquema de los datos de temperatura y humedad
const dataSchema = new mongoose.Schema({
  temperatura: { type: Number, required: true },
  humedad: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Crear el modelo con el nombre "Temperatura"
const Temperatura = mongoose.model("Temperatura", dataSchema);

const options = {
  host: "5a1568cc16b746f284fa5a6d3697dc89.s1.eu.hivemq.cloud",
  port: 8883,
  username: "connectionPi",
  password: "raspberryPi1",
  protocol: "mqtts"
};

// Conexión con el broker MQTT
const client = mqtt.connect(options);

// Historial en memoria para almacenar los últimos 10 registros
let temperatureHistory = [];

client.on("connect", () => {
  console.log("Conectado a HiveMQ Cloud!");
  client.subscribe("raspberry/temperatura", (err) => {
    if (err) {
      console.error("Error al suscribirse:", err);
    } else {
      console.log("Suscrito al topic: raspberry/temperatura");
    }
  });
});

client.on("error", (err) => {
  console.error("Error en la conexión MQTT:", err);
});

client.on("message", (topic, message) => {
  try {
    console.log("Mensaje recibido (sin procesar):", message.toString());
    let parsedMessage = JSON.parse(message.toString());

    // Extraer y limpiar los valores
    let temperatura = parseFloat(parsedMessage.Temperatura?.replace("°C", ""));
    let humedad = parseFloat(parsedMessage.Humedad?.replace("%", ""));

    if (isNaN(temperatura) || isNaN(humedad)) {
      console.warn("Datos inválidos recibidos, no se guardarán:", parsedMessage);
      return;
    }

    const data = new Temperatura({ temperatura, humedad });
    data.save()
      .then(() => console.log("Datos guardados en MongoDB:", { temperatura, humedad }))
      .catch((err) => console.error("Error al guardar en MongoDB:", err));

    // Almacenar en historial (últimos 10 registros)
    temperatureHistory.unshift({ temperatura, humedad });
    if (temperatureHistory.length > 10) temperatureHistory.pop();

    console.log("Mensaje recibido (procesado):", { temperatura, humedad });
  } catch (error) {
    console.error("Error al procesar el mensaje MQTT:", error);
  }
});

//  Función para publicar medicamentos en MQTT
function publicarMedicamento(datos) {
  const mensaje = JSON.stringify(datos);
  client.publish("raspberry/pastillero", mensaje, { qos: 1 }, (error) => {
    if (error) console.error("Error al publicar en MQTT:", error);
    else console.log("Datos de medicamento enviados a MQTT:", mensaje);
  });
}


export { client, temperatureHistory, publicarMedicamento };