export interface Paciente {
  nombre:            string;
  sexo:              'Femenino' | 'Masculino';
  turno:             string;
  edad:              string;
  fechaNacimiento:   string;
  curp:              string;
  nss:               string;
  medicoAdscrito:    string;
  unidadAdscripcion: string;
}
