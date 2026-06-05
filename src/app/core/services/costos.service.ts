import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AnalizarNotasRequest, AnalizarNotasResponse, ConsultaBriefDto } from '../models/costos.model';

@Injectable({ providedIn: 'root' })
export class CostosService {

  private readonly BASE = `${environment.apiUrl}/api/v1/costos`;

  constructor(private http: HttpClient) {}

  analizarNotas(request: AnalizarNotasRequest): Observable<AnalizarNotasResponse> {
    return this.http.post<AnalizarNotasResponse>(`${this.BASE}/analizar`, request);
  }

  obtenerConsultas(curp: string): Observable<ConsultaBriefDto[]> {
    return this.http.get<ConsultaBriefDto[]>(`${this.BASE}/consultas/${encodeURIComponent(curp)}`);
  }
}
