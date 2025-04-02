import mongoose from "mongoose";

const medicamentoSchema = new mongoose.Schema({
  fechaInicio: { type: String, required: true },
  fechaFin: { type: String, required: true },
  hora: { type: String, required: true },
  compartimiento: { type: Number, required: true },
  cantidad: { type: Number, required: true },
  nombre: { type: String, required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Youtube', required: true }  // Este campo es el que se añade
});

const Medicamento = mongoose.model("Medicamento", medicamentoSchema);
export default Medicamento;