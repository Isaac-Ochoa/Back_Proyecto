import crypto from "crypto";
import jwt from "jsonwebtoken";
import "dotenv/config"
import { mensajes } from "../libs/mensajes.js";
import { obtenerUsuarioPorId } from "../db/usuariosBD.js";

export function encriptarPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 10, 64, "sha512").toString("hex");
  return {
    salt,
    hash
  }
}

export function validarPassword(password, salt, hash) {
  const hashEvaluar = crypto.scryptSync(password, salt, 10, 64, "sha512").toString("hex");
  return hashEvaluar == hash;
}

export function usuarioAutorizado(token, req) {
  return new Promise((resolve, reject) => {
    if (!token) {
      reject(mensajes(400, "Usuario no autorizado"));
    }

    jwt.verify(token, process.env.SECRET_TOKEN, (error, usuario) => {
      if (error) {
        reject(mensajes(400, "Usuario no autorizado", error));
      }
      req.usuario = usuario;  // Asocia la información del usuario a la solicitud
      resolve(mensajes(200, "Bienvenido", usuario));
    });
  });
}

export async function adminAutorizado(req) {
    const respuesta = await usuarioAutorizado(req.cookies.token, req)
    if(respuesta.status != 200){
        return mensajes(400,"Admin no autorizado")
    }
    const usuario =  await obtenerUsuarioPorId(req.usuario.id);
    if(usuario.tipoUsuario!="admin"){
        return mensajes(400,"Admin no autorizado");
    }
    return mensajes(200,"Admin autorizado");
}
