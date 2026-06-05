import { ProcedimientoDetectado } from './chat.model';

export interface AnalizarNotasRequest {
  curp?:             string;
  numMatricula:      string;
  especialidadMedico?: string;
  notaTexto?:        string;
  consultaIds?:      string[];
  fechaIngreso?:     string;
  fechaEgreso?:      string;
}

export interface AnalizarNotasResponse {
  procedimientosDetectados: ProcedimientoDetectado[];
  diasHospitalizacion:      number;
  totalBase:                number;
  total1erNivel:            number;
  total2doNivel:            number;
  total3erNivel:            number;
  totalProcedimientos:      number;
}

export interface ConsultaBriefDto {
  idConsulta:        string;
  fecConsulta:       string;
  desTipoConsulta:   string;
  desMotivoConsulta: string;
  nombreMedico:      string;
  textoNota:         string;
}
