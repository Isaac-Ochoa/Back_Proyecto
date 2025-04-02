import User from "../models/usuarioModelo.js";
import {encriptarPassword, validarPassword} from "../middlewares/funcionesPassword.js";
import {mensajes} from "../libs/mensajes.js";
import {crearToken} from "../libs/jwt.js";

export async function register ({username, email, password}){
    try {
        const usuarioExistente = await User.findOne({username});
        const emailExistente = await User.findOne({email});
        if (usuarioExistente || emailExistente){
            return mensajes(400,"usuario duplicado");
        }
        const {hash, salt} = encriptarPassword(password);
        const data = new User({username,email,password:hash, salt});
        var respuesta = await data.save();
        const token=await crearToken(
            {
                id:respuesta._id,
                username:respuesta.username,
                email:respuesta.email,
                tipoUsuario:respuesta.tipoUsuario
            });
        return mensajes(200,respuesta.tipoUsuario,"",token);
    } catch (error) {
        return mensajes(400,"Error al registrar al usuario",error);
    }
};

export const login = async({username,password})=>{    
    try {
        const usuarioCorrecto = await User.findOne({username});
        console.log(usuarioCorrecto);        
        if (!usuarioCorrecto){
            return mensajes(400,"datos incorrectos, usuario");
        }
        const passwordCorrecto = validarPassword(password, usuarioCorrecto.salt, usuarioCorrecto.password);
        if (!passwordCorrecto){
            return mensajes(400,"datos incorrectos, password");
        }
        const token=await crearToken(
            {
                id:usuarioCorrecto._id, 
                username:usuarioCorrecto.username, 
                email:usuarioCorrecto.email, 
                tipoUsuario:usuarioCorrecto.tipoUsuario
            });
        return mensajes(200, usuarioCorrecto.tipoUsuario,"",token);
    } catch (error) {
        return mensajes(400, "datos incorrectos",error);
    }
}

export const obtenerUsuarioPorId = async (id) => {
    try {
        const usuario = await User.findById(id);
        if (!usuario) {
            return mensajes(404, "Usuario no encontrado");
        }
        return mensajes(200, "Usuario obtenido correctamente", "", usuario);
    } catch (error) {
        return mensajes(400, "Error al obtener usuario", error);
    }
};


export const obtenerUsuarios = async () => {
    try {
        const usuarios = await User.find();
        return mensajes(200, "Usuarios obtenidos correctamente", "", usuarios);
    } catch (error) {
        return mensajes(400, "Error al obtener usuarios", error);
    }
};


//Aqui hacia abajo lo agregue yo 

export const borrarUsuario = async (id) => {
    try {
        const usuario = await User.findByIdAndDelete(id);
        if (!usuario) {
            return mensajes(404, "Usuario no encontrado");
        }
        return mensajes(200, "Usuario eliminado correctamente");
    } catch (error) {
        return mensajes(500, "Error al eliminar usuario", error);
    }
};

export const actualizarUsuario = async (id, datos) => {
    try {
        const usuario = await User.findByIdAndUpdate(id, datos, { new: true });
        if (!usuario) {
            return mensajes(404, "Usuario no encontrado");
        }
        return mensajes(200, "Usuario actualizado correctamente", "", usuario);
    } catch (error) {
        return mensajes(500, "Error al actualizar usuario", error);
    }
};