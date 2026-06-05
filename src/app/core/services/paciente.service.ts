import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Paciente } from '../models/paciente.model';

@Injectable({ providedIn: 'root' })
export class PacienteService {

  /**
   * Datos demo para desarrollo.
   * En producción reemplazar por:
   * return this.http.get<Paciente>(`${environment.apiUrl}/api/v1/pacientes/curp/${curp}`);
   * apuntando al microservicio mspua-registro-pacientes
   */
  private readonly DEMO: Record<string, Paciente> = {
    'ROAY900421MDFDYS08': {
      nombre:            'YESSICA ESMERALDA RODRIGUEZ AYALA',
      sexo:              'Femenino',
      turno:             'Matutino',
      edad:              '35 años',
      fechaNacimiento:   '21/04/1990',
      curp:              'ROAY900421MDFDYS08',
      nss:               '9409906332',
      medicoAdscrito:    '1F1990OR',
      unidadAdscripcion: 'UMF-001'
    },
    'GAMA850312HDFRRN09': {
      nombre:            'MARIO ANTONIO GARCIA MARTINEZ',
      sexo:              'Masculino',
      turno:             'Vespertino',
      edad:              '40 años',
      fechaNacimiento:   '12/03/1985',
      curp:              'GAMA850312HDFRRN09',
      nss:               '8812345678',
      medicoAdscrito:    '2A1985OR',
      unidadAdscripcion: 'HGZ-046'
    },
    'LOPE751103HDFPRR05': {
      nombre:            'ERNESTO LOPEZ PERALTA',
      sexo:              'Masculino',
      turno:             'Matutino',
      edad:              '49 años',
      fechaNacimiento:   '03/11/1975',
      curp:              'LOPE751103HDFPRR05',
      nss:               '7523456789',
      medicoAdscrito:    '3B1975OR',
      unidadAdscripcion: 'UMF-010'
    },
    'SANA960808MDFNVN06': {
      nombre:            'ANDREA SANCHEZ NAVARRO',
      sexo:              'Femenino',
      turno:             'Matutino',
      edad:              '28 años',
      fechaNacimiento:   '08/08/1996',
      curp:              'SANA960808MDFNVN06',
      nss:               '9667891234',
      medicoAdscrito:    '4C1996OR',
      unidadAdscripcion: 'CMN-001'
    }
  };

  buscarPorCurp(curp: string): Observable<Paciente> {
    const paciente = this.DEMO[curp.toUpperCase()];
    if (paciente) {
      return of(paciente).pipe(delay(400));
    }
    return throwError(() => new Error(`Paciente no encontrado con CURP: ${curp}`));
  }
}
