import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrientadorChatRequest, OrientadorChatResponse } from '../models/orientador.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class OrientadorService {

  private readonly BASE = `${environment.apiUrl}/api/v1/orientador`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  chat(pregunta: string): Observable<OrientadorChatResponse> {
    const session = this.auth.getSession();
    const payload: OrientadorChatRequest = {
      pregunta,
      numMatricula: session?.matricula ?? ''
    };
    return this.http.post<OrientadorChatResponse>(`${this.BASE}/chat`, payload);
  }
}
