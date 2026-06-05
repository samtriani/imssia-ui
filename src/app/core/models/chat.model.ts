export interface ImssAiChatRequest {
  curp?:              string;
  numMatricula:       string;
  especialidadMedico: string;
  pregunta:           string;
  modelo?:            string;
  notaMedica?:        string;
  fechaIngreso?:      string;
  fechaEgreso?:       string;
}

export interface ProcedimientoDetectado {
  cveProcedimiento:  string;
  desProcedimiento:  string;
  numCostoBase:      number;
  numCosto1erNivel:  number | null;
  numCosto2doNivel:  number | null;
  numCosto3erNivel:  number | null;
}

export interface ImssAiChatResponse {
  respuesta:                string;
  responseId:               string;
  modelInstanceId:          string;
  totalOutputTokens:        number;
  tokensPerSecond:          number;
  curpPaciente:             string;
  nombrePaciente:           string;
  contextoEnriquecido:      boolean;
  seccionesContexto:        number;
  especialidadDetectada:    string;
  procedimientosDetectados: ProcedimientoDetectado[];
}

export interface ChatMessage {
  id:                        string;
  role:                      'user' | 'ai';
  text:                      string;
  timestamp:                 Date;
  tokensPerSecond?:          number;
  totalTokens?:              number;
  especialidad?:             string;
  modoGeneral?:              boolean;
  procedimientosDetectados?: ProcedimientoDetectado[];
}
