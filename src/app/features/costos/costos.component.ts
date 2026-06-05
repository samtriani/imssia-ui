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
}
