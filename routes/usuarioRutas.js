import { Router } from "express";
import { login, register, obtenerUsuarios, actualizarUsuario, borrarUsuario } from "../db/usuariosBD.js";
import { usuarioAutorizado, adminAutorizado } from "../middlewares/funcionesPassword.js";
import { temperatureHistory, client, publicarMedicamento } from "../mqtt/mqtt.js";
import Medicamento from "../models/medicamento.js";
import Youtube from "../models/usuarioModelo.js";

const router = Router();

router.post("/registro", async(req, res) => {
    console.log(req.body);
    const respuesta = await register(req.body);
    console.log(respuesta);
    res.cookie('token', respuesta.token).status(respuesta.status).json(respuesta.mensajeUsuario);
});

router.post("/inicioSesion", async (req, res) => {
    const respuesta = await login(req.body);
    res.cookie('token', respuesta.token).status(respuesta.status).json(respuesta.mensajeUsuario);
});

router.get("/cerrarSesion", (req, res) => {
  res.cookie("token", "", { expires: new Date(0) }).clearCookie("token").status(200).json("Sesion cerrada correctamente");
});

router.get("/administradores", async(req, res) => {
  const respuesta = await adminAutorizado(req);
  res.status(respuesta.status).json(respuesta.mensajeUsuario);
});

router.get("/libre", (req, res) => {
  res.json("Aqui puedes entrar sin estar logueado");
});

router.get("/usuarios", async (req, res) => {
  const respuesta = await obtenerUsuarios();
  res.status(respuesta.status).json(respuesta);
});

router.get("/mqtt/test", (req, res) => {
  const testMessage = {
    timestamp: new Date().toISOString(),
    test: true,
    message: "Prueba de conexión MQTT"
  };
  
  req.mqttClient.publish("raspberry/temperatura", JSON.stringify(testMessage));
  res.json({ 
    success: true, 
    message: "Mensaje de prueba enviado a HiveMQ",
    mqttConnected: req.mqttClient.connected
  });
});

router.get("/mqtt/status", (req, res) => {
  res.json({
    connected: req.mqttClient.connected,
    connectionState: req.mqttClient.connected ? "Conectado" : "Desconectado"
  });
});

// Ruta para obtener historial de temperatura
router.get("/mqtt/historial", (req, res) => {
  res.json({ 
    success: true, 
    historial: temperatureHistory
  });
});

// Ruta para obtener usuarios con sus medicamentos
router.get("/usuariosConMedicamentos", async (req, res) => {
  try {
    // Aseguramos que el usuario esté autenticado antes de obtener los datos
    const respuesta = await usuarioAutorizado(req.cookies.token, req);
    if (respuesta.status !== 200) {
      return res.status(400).json({ error: "Usuario no autorizado" });
    }

    // Obtener los usuarios de la colección "Youtube" (excluyendo administradores)
    const usuarios = await Youtube.find({ tipoUsuario: { $ne: "admin" } });

    // Obtener los medicamentos de cada usuario
    const usuariosConMedicamentos = await Promise.all(usuarios.map(async (usuario) => {
      // Buscar los medicamentos que corresponden al usuario
      const medicamentos = await Medicamento.find({ usuarioId: usuario._id });
      return {
        ...usuario.toObject(),
        medicamentos,
      };
    }));

    res.status(200).json(usuariosConMedicamentos);
  } catch (error) {
    console.error("Error obteniendo usuarios y medicamentos:", error);
    res.status(500).json({ error: "Error al obtener los usuarios y medicamentos" });
  }
});

// Rutas para actualizar y eliminar usuarios
router.put("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
      const respuesta = await actualizarUsuario(id, req.body);
      res.status(respuesta.status).json(respuesta.mensajeUsuario);
  } catch (error) {
      res.status(500).json({ mensaje: "Error interno del servidor", error });
  }
});

router.delete("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
      const respuesta = await borrarUsuario(id);
      res.status(respuesta.status).json(respuesta.mensajeUsuario);
  } catch (error) {
      res.status(500).json({ mensaje: "Error interno del servidor", error });
  }
});

// Ruta para registrar medicamentos
router.post("/mqtt/programar", async (req, res) => {
  try {
    const respuesta = await usuarioAutorizado(req.cookies.token, req);
    if (respuesta.status !== 200) {
      return res.status(400).json({ error: "Usuario no autorizado" });
    }

    const usuarioId = req.usuario.id;
    const { fechaInicio, fechaFin, hora, compartimiento, cantidad, nombre } = req.body;

    if (!fechaInicio || !fechaFin || !hora || !compartimiento || !cantidad || !nombre) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // Validar si el compartimento ya está ocupado
    const compartimentoOcupado = await Medicamento.findOne({ usuarioId, compartimiento });
    if (compartimentoOcupado) {
      return res.status(400).json({ error: "El compartimento ya está ocupado con un medicamento." });
    }

    const nuevoMedicamento = new Medicamento({ fechaInicio, fechaFin, hora, compartimiento, cantidad, nombre, usuarioId });
    await nuevoMedicamento.save();

    res.status(201).json({ mensaje: "Medicamento guardado correctamente" });
  } catch (error) {
    console.error("Error en /mqtt/programar:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Nueva ruta para obtener los medicamentos del usuario autenticado organizados por compartimiento
router.get("/medicamentosUsuario", async (req, res) => {
  try {
    // Verificar si el usuario está autenticado
    const respuesta = await usuarioAutorizado(req.cookies.token, req);
    
    if (respuesta.status !== 200) {
      return res.status(400).json({ error: "Usuario no autorizado" });
    }

    // Obtener el ID del usuario desde el token
    const usuarioId = req.usuario.id;

    // Buscar medicamentos asociados a este usuario
    const medicamentos = await Medicamento.find({ usuarioId });

    // Organizar los medicamentos por compartimiento
    const medicamentosOrganizados = {
      compartimiento1: medicamentos.filter(m => m.compartimiento === 1),
      compartimiento2: medicamentos.filter(m => m.compartimiento === 2),
      compartimiento3: medicamentos.filter(m => m.compartimiento === 3),
    };

    res.status(200).json(medicamentosOrganizados);
  } catch (error) {
    console.error("Error obteniendo medicamentos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/compartimentosOcupados", async (req, res) => {
  try {
    const respuesta = await usuarioAutorizado(req.cookies.token, req);
    if (respuesta.status !== 200) {
      return res.status(400).json({ error: "Usuario no autorizado" });
    }

    const usuarioId = req.usuario.id;
    const medicamentos = await Medicamento.find({ usuarioId });

    const compartimentosOcupados = medicamentos.map(m => m.compartimiento);

    res.status(200).json({ compartimentosOcupados });
  } catch (error) {
    console.error("Error obteniendo compartimentos ocupados:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
