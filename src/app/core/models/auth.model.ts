export interface LoginCredentials {
  matricula: string;
  password:  string;
}

export interface MedicoSession {
  matricula:       string;
  nombre:          string;
  nombreCorto:     string;
  email?:          string;
  turno?:          string;
  nivel?:          string;

  /**
   * Clave de especialidad del médico en BD — usada en cada request al AI.
   * Valores: MED_GEN, MED_FAM, MED_INT, PEDIATRIA, GINECOOBST, CIRUGIA_GEN,
   *          TRAUMATOLOGIA, CARDIOLOGIA, NEUROLOGIA, PSIQUIATRIA, DERMATOLOGIA,
   *          OFTALMOLOGIA, OTORRINOL, ENDOCRINOL, NEUMOLOGIA, GASTROENT,
   *          ONCOLOGIA, URGENCIAS, ANESTESIOLOGIA, RADIOLOGIA
   */
  cveEspecialidad: string;

  /** Nombre legible de la especialidad para mostrar en UI */
  desEspecialidad: string;

  unidadMedica?:   string;
}
