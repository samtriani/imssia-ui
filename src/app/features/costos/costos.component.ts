import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { CostosService } from '../../core/services/costos.service';
import { Paciente } from '../../core/models/paciente.model';
import { ConsultaBriefDto, AnalizarNotasResponse } from '../../core/models/costos.model';
import { ProcedimientoDetectado } from '../../core/models/chat.model';
import { MedicoSession } from '../../core/models/auth.model';

interface NotaItem {
  id:       string;
  archivo:  File;
  texto:    string;
  palabras: number;
  loading:  boolean;
  error:    string;
}

@Component({
  selector: 'app-costos',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './costos.component.html',
  styleUrls: ['./costos.component.scss']
})
export class CostosComponent implements OnInit {

  session: MedicoSession | null = null;

  // ── BÚSQUEDA PACIENTE
  curpInput     = '';
  searchLoading = false;
  searchError   = '';
  paciente: Paciente | null = null;

  // ── CONSULTAS (historial del sistema)
  consultasLoading = false;
  consultas: ConsultaBriefDto[] = [];
  selectedConsultaIds = new Set<string>();

  // ── TAB ACTIVA
  activeTab: 'historial' | 'cargar' = 'historial';

  // ── NOTAS CARGADAS (múltiples)
  readonly MAX_NOTAS = 5;
  notas: NotaItem[]  = [];
  isDragging         = false;

  // ── FECHAS
  fechaIngreso = '';
  fechaEgreso  = '';

  // ── ANÁLISIS
  analizando    = false;
  resultados: AnalizarNotasResponse | null = null;
  errorAnalisis = '';

  constructor(
    private auth:            AuthService,
    private pacienteService: PacienteService,
    private costosService:   CostosService,
    private cdr:             ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.session = this.auth.getSession(); }

  // ── BÚSQUEDA PACIENTE
  buscarPaciente(): void {
    const curp = this.curpInput.trim().toUpperCase();
    if (!curp) return;

    this.searchLoading = true;
    this.searchError   = '';
    this.paciente      = null;
    this.consultas     = [];
    this.selectedConsultaIds.clear();
    this.resultados    = null;

    this.pacienteService.buscarPorCurp(curp).subscribe({
      next: p => {
        this.paciente      = p;
        this.searchLoading = false;
        this.cargarConsultas(p.curp);
      },
      error: err => {
        this.searchError   = err.message;
        this.searchLoading = false;
      }
    });
  }

  limpiarBusqueda(): void {
    this.curpInput   = '';
    this.paciente    = null;
    this.searchError = '';
    this.consultas   = [];
    this.selectedConsultaIds.clear();
    this.resultados  = null;
  }

  onCurpKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.buscarPaciente();
  }

  // ── CONSULTAS DEL SISTEMA
  cargarConsultas(curp: string): void {
    this.consultasLoading = true;
    this.costosService.obtenerConsultas(curp).subscribe({
      next: list => {
        this.consultas        = list;
        this.consultasLoading = false;
        list.forEach(c => this.selectedConsultaIds.add(c.idConsulta));
      },
      error: () => { this.consultasLoading = false; }
    });
  }

  toggleConsulta(id: string): void {
    if (this.selectedConsultaIds.has(id)) this.selectedConsultaIds.delete(id);
    else                                  this.selectedConsultaIds.add(id);
  }

  seleccionarTodas():   void { this.consultas.forEach(c => this.selectedConsultaIds.add(c.idConsulta)); }
  deseleccionarTodas(): void { this.selectedConsultaIds.clear(); }

  get todasSeleccionadas(): boolean {
    return this.consultas.length > 0 && this.selectedConsultaIds.size === this.consultas.length;
  }

  // ── DRAG & DROP
  onDragOver(e: DragEvent): void  { e.preventDefault(); if (this.puedeAgregarMas) this.isDragging = true; }
  onDragLeave(): void             { this.isDragging = false; }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    if (!this.puedeAgregarMas) return;
    const files = e.dataTransfer?.files;
    if (files) this.agregarArchivos(files);
  }

  onFileChange(e: Event): void {
    const files = (e.target as HTMLInputElement).files;
    if (files) this.agregarArchivos(files);
    (e.target as HTMLInputElement).value = '';
  }

  agregarArchivos(files: FileList): void {
    const disponibles = this.MAX_NOTAS - this.notas.length;
    const validas = Array.from(files)
      .filter(f => ['pdf', 'doc', 'docx'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''))
      .slice(0, disponibles);

    validas.forEach(f => this.processFile(f));
  }

  async processFile(file: File): Promise<void> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    const item: NotaItem = {
      id:       Math.random().toString(36).substring(2),
      archivo:  file,
      texto:    '',
      palabras: 0,
      loading:  true,
      error:    ''
    };

    this.notas = [...this.notas, item];
    this.cdr.detectChanges();

    try {
      let texto = '';
      if (ext === 'docx' || ext === 'doc') {
        const mammoth = await import('mammoth');
        const result  = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        texto = result.value;
      } else {
        texto = await this.extractPdfText(file);
      }

      const palabras = texto.trim().split(/\s+/).filter(w => w).length;
      const error    = !texto.trim() ? 'No se pudo extraer texto. Verifica que no sea imagen escaneada.' : '';

      this.notas = this.notas.map(n =>
        n.id === item.id ? { ...n, texto, palabras, loading: false, error } : n
      );
    } catch (err: any) {
      this.notas = this.notas.map(n =>
        n.id === item.id
          ? { ...n, texto: '', palabras: 0, loading: false, error: `Error: ${err?.message ?? 'desconocido'}` }
          : n
      );
    }

    this.cdr.detectChanges();
  }

  eliminarNota(id: string): void {
    this.notas = this.notas.filter(n => n.id !== id);
  }

  limpiarTodasNotas(): void { this.notas = []; }

  private async extractPdfText(file: File): Promise<string> {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useWorkerFetch: false }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((it: any) => ('str' in it ? it.str : '')).join(' '));
    }
    return pages.join('\n').trim();
  }

  // ── GETTERS
  get puedeAgregarMas(): boolean  { return this.notas.length < this.MAX_NOTAS; }
  get procesando(): boolean       { return this.notas.some(n => n.loading); }
  get notasValidas(): NotaItem[]  { return this.notas.filter(n => !n.loading && n.texto && !n.error); }
  get notasTextoTotal(): string   { return this.notasValidas.map(n => n.texto).join('\n\n---\n\n'); }
  get totalPalabras(): number     { return this.notasValidas.reduce((sum, n) => sum + n.palabras, 0); }

  get puedeAnalizar(): boolean {
    if (this.analizando || this.procesando) return false;
    const tieneConsultasSeleccionadas = this.selectedConsultaIds.size > 0;
    const tieneNotas                  = this.notasValidas.length > 0;
    const tieneCurp                   = !!this.paciente;
    return (tieneCurp && tieneConsultasSeleccionadas) || tieneNotas;
  }

  // ── ANÁLISIS
  analizar(): void {
    if (!this.puedeAnalizar) return;

    this.analizando    = true;
    this.errorAnalisis = '';
    this.resultados    = null;

    this.costosService.analizarNotas({
      curp:               this.paciente?.curp,
      numMatricula:       this.session?.matricula ?? '',
      especialidadMedico: this.session?.cveEspecialidad,
      notaTexto:          this.notasTextoTotal || undefined,
      consultaIds:        Array.from(this.selectedConsultaIds),
      fechaIngreso:       this.fechaIngreso || undefined,
      fechaEgreso:        this.fechaEgreso  || undefined,
    }).subscribe({
      next: res => { this.resultados = res; this.analizando = false; },
      error: err => { this.errorAnalisis = err.message ?? 'Error al analizar las notas'; this.analizando = false; }
    });
  }

  // ── FORMATOS
  formatPeso(val: number | null | undefined): string {
    if (val == null) return '—';
    return '$' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get procedimientosList(): ProcedimientoDetectado[] {
    return this.resultados?.procedimientosDetectados ?? [];
  }

  getMotivoResumen(motivo: string | null): string {
    if (!motivo) return '—';
    return motivo.length > 60 ? motivo.substring(0, 60) + '…' : motivo;
  }

  exportarPDF(): void {
    if (!this.resultados) return;

    const nombrePaciente = this.paciente?.nombre ?? 'Sin paciente registrado';
    const curp           = this.paciente?.curp   ?? '—';
    const nss            = this.paciente?.nss     ?? '—';
    const unidad         = this.paciente?.unidadAdscripcion ?? '—';
    const fecha          = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' });
    const horaStr        = new Date().toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });

    const filas = this.procedimientosList.map(p => `
      <tr>
        <td class="td-proc">${p.desProcedimiento}</td>
        <td class="td-num td-base">${this.formatPeso(p.numCostoBase)}</td>
        <td class="td-num td-1">${this.formatPeso(p.numCosto1erNivel)}</td>
        <td class="td-num td-2">${this.formatPeso(p.numCosto2doNivel)}</td>
        <td class="td-num td-3">${this.formatPeso(p.numCosto3erNivel)}</td>
      </tr>`).join('');

    const hospBanner = this.resultados.diasHospitalizacion > 0
      ? `<div class="hosp-banner">🏥 <strong>${this.resultados.diasHospitalizacion} días de hospitalización</strong> — los costos por día ya incluyen el multiplicador correspondiente</div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Costos IMSS — ${nombrePaciente}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; font-size: 13px; }

    /* ENCABEZADO */
    .header { background: linear-gradient(135deg, #7a1034 0%, #9b1a6a 100%); color: #fff; padding: 24px 32px; display: flex; align-items: center; justify-content: space-between; }
    .header-left { display: flex; flex-direction: column; gap: 4px; }
    .header-inst { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; opacity: .75; }
    .header-title { font-size: 20px; font-weight: 700; letter-spacing: .3px; }
    .header-sub { font-size: 11px; opacity: .7; font-family: monospace; }
    .header-right { text-align: right; font-size: 11px; opacity: .8; line-height: 1.7; }
    .header-date { font-weight: 600; font-size: 12px; opacity: 1; }

    /* PACIENTE */
    .patient-section { background: #f5f5f5; border-bottom: 2px solid #1A6B3C; padding: 14px 32px; display: flex; align-items: center; gap: 32px; }
    .patient-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 3px; }
    .patient-name { font-size: 17px; font-weight: 700; color: #1a1a1a; }
    .patient-detail { font-size: 11px; color: #444; font-family: monospace; letter-spacing: .5px; }
    .patient-info-group { display: flex; flex-direction: column; }
    .patient-divider { width: 1px; background: #ddd; height: 36px; flex-shrink: 0; }

    /* CUERPO */
    .body { padding: 24px 32px; }

    /* BANNER HOSPITALIZACIÓN */
    .hosp-banner { background: #fff8e1; border: 1px solid #ffe082; border-radius: 6px; padding: 8px 14px; margin-bottom: 16px; font-size: 12px; color: #7a5800; }

    /* TABLA */
    .table-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #1A6B3C; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .table-title::after { content: ''; flex: 1; height: 1px; background: #d4edda; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    thead tr { background: #1A6B3C; color: #fff; }
    thead th { padding: 9px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; text-align: left; }
    thead th.th-num { text-align: right; }
    thead th.th-1 { background: #16603a; }
    thead th.th-2 { background: #7a5800; }
    thead th.th-3 { background: #7b1457; }

    tbody tr:nth-child(even) { background: #f9fffe; }
    tbody tr:nth-child(odd)  { background: #fff; }
    tbody tr:hover { background: #f0faf5; }

    td { padding: 9px 14px; border-bottom: 1px solid #eaf5ec; vertical-align: middle; }
    .td-proc { font-weight: 500; font-size: 12px; }
    .td-num { text-align: right; font-family: monospace; font-size: 12px; }
    .td-base { color: #1A6B3C; font-weight: 700; }
    .td-1    { color: #1A6B3C; }
    .td-2    { color: #7a5800; }
    .td-3    { color: #7b1457; }

    tfoot tr { background: #e8f5ee; }
    tfoot td { padding: 10px 14px; font-weight: 700; border-top: 2px solid #9FE1CB; }
    .tf-label { font-size: 12px; color: #1A6B3C; }
    .tf-num { text-align: right; font-family: monospace; font-size: 13px; }

    /* RESUMEN NIVELES */
    .levels { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 20px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .level { padding: 14px 16px; text-align: center; border-right: 1px solid #e0e0e0; }
    .level:last-child { border-right: none; }
    .level-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #888; margin-bottom: 5px; font-family: monospace; }
    .level-amt { font-size: 15px; font-weight: 700; font-family: monospace; }
    .lv-base { background: #fafafa; } .lv-base .level-amt { color: #1a1a1a; }
    .lv-1    { background: #f0faf5; } .lv-1    .level-amt { color: #1A6B3C; }
    .lv-2    { background: #fff8e1; } .lv-2    .level-amt { color: #7a5800; }
    .lv-3    { background: #fce7f0; } .lv-3    .level-amt { color: #7b1457; }

    /* FOOTER */
    .footer { margin-top: 28px; padding: 14px 32px; background: #f5f5f5; border-top: 1px solid #e0e0e0; font-size: 10px; color: #999; font-family: monospace; display: flex; justify-content: space-between; align-items: center; }
    .footer-note { line-height: 1.6; }
    .footer-logo { font-size: 11px; font-weight: 700; color: #7a1034; letter-spacing: .5px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A4 landscape; margin: 8mm; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <div class="header-inst">Instituto Mexicano del Seguro Social</div>
      <div class="header-title">Reporte de Costos de Procedimientos</div>
      <div class="header-sub">Catálogo de referencia IMSS por nivel de atención</div>
    </div>
    <div class="header-right">
      <div class="header-date">${fecha}</div>
      <div>${horaStr} hrs</div>
      <div>${unidad}</div>
    </div>
  </div>

  <div class="patient-section">
    <div class="patient-info-group">
      <div class="patient-label">Paciente</div>
      <div class="patient-name">${nombrePaciente}</div>
    </div>
    <div class="patient-divider"></div>
    <div class="patient-info-group">
      <div class="patient-label">CURP</div>
      <div class="patient-detail">${curp}</div>
    </div>
    <div class="patient-divider"></div>
    <div class="patient-info-group">
      <div class="patient-label">NSS</div>
      <div class="patient-detail">${nss}</div>
    </div>
  </div>

  <div class="body">

    ${hospBanner}

    <div class="table-title">Procedimientos detectados (${this.resultados.totalProcedimientos})</div>

    <table>
      <thead>
        <tr>
          <th>Procedimiento</th>
          <th class="th-num">Base</th>
          <th class="th-num th-1">1er Nivel · UMF</th>
          <th class="th-num th-2">2do Nivel · HGZ/HGR</th>
          <th class="th-num th-3">3er Nivel · UMAE</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
      <tfoot>
        <tr>
          <td class="tf-label">Total estimado</td>
          <td class="tf-num td-base">${this.formatPeso(this.resultados.totalBase)}</td>
          <td class="tf-num td-1">${this.formatPeso(this.resultados.total1erNivel)}</td>
          <td class="tf-num td-2">${this.formatPeso(this.resultados.total2doNivel)}</td>
          <td class="tf-num td-3">${this.formatPeso(this.resultados.total3erNivel)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="levels">
      <div class="level lv-base">
        <div class="level-lbl">Costo Base</div>
        <div class="level-amt">${this.formatPeso(this.resultados.totalBase)}</div>
      </div>
      <div class="level lv-1">
        <div class="level-lbl">1er Nivel · UMF</div>
        <div class="level-amt">${this.formatPeso(this.resultados.total1erNivel)}</div>
      </div>
      <div class="level lv-2">
        <div class="level-lbl">2do Nivel · HGZ</div>
        <div class="level-amt">${this.formatPeso(this.resultados.total2doNivel)}</div>
      </div>
      <div class="level lv-3">
        <div class="level-lbl">3er Nivel · UMAE</div>
        <div class="level-amt">${this.formatPeso(this.resultados.total3erNivel)}</div>
      </div>
    </div>

  </div>

  <div class="footer">
    <div class="footer-note">
      Los costos son de referencia basados en el catálogo IMSS.<br>
      Para fines de facturación, verificar con el área administrativa de la unidad médica.
    </div>
    <div class="footer-logo">IMSS · IMSS-IA</div>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const ventana = window.open('', '_blank', 'width=1100,height=750');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
    }
  }
}
