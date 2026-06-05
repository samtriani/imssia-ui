import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImssAiChatRequest, ImssAiChatResponse } from '../models/chat.model';
import { Paciente } from '../models/paciente.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ImssAiService {

  private readonly BASE = `${environment.apiUrl}/api/v1/imss-ai`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  chatConContexto(
    pregunta:     string,
    paciente:     Paciente,
    notaContext?: { notaMedica?: string; fechaIngreso?: string; fechaEgreso?: string }
  ): Observable<ImssAiChatResponse> {
    const session = this.auth.getSession();
    const payload: ImssAiChatRequest = {
      curp:               paciente.curp,
      numMatricula:       session?.matricula       ?? '',
      especialidadMedico: session?.cveEspecialidad ?? '',
      pregunta,
      ...notaContext
    };
    return this.http.post<ImssAiChatResponse>(`${this.BASE}/chat`, payload);
  }

  chatGeneral(
    pregunta:     string,
    notaContext?: { notaMedica?: string; fechaIngreso?: string; fechaEgreso?: string }
  ): Observable<ImssAiChatResponse> {
    const session = this.auth.getSession();
    const payload: ImssAiChatRequest = {
      numMatricula:       session?.matricula       ?? '',
      especialidadMedico: session?.cveEspecialidad ?? '',
      pregunta,
      ...notaContext
    };
    return this.http.post<ImssAiChatResponse>(`${this.BASE}/chat`, payload);
  }
}
