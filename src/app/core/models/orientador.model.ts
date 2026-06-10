export interface OrientadorChatRequest {
  pregunta:     string;
  numMatricula?: string;
}

export interface OrientadorChatResponse {
  respuesta:             string;
  responseId:            string;
  modelInstanceId:       string;
  totalOutputTokens:     number;
  tokensPerSecond:       number;
  temaDetectado?:        string;
  imagenesRelacionadas?: string[];
}
