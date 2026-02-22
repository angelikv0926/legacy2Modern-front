import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MigrationService } from './services/migration.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Legacy2Modern';
  selectedApi: 'regex' | 'ai' = 'regex';
  tarLanguage: string = 'Node.js';
  legacyCode: string = '';
  migrateCode: string = '';
  migrateReport: any = null;

  loading: boolean = false;
  errorMessage: string = '';

  copyButtonText: string = 'Copiar';

  constructor(private migrationService: MigrationService) { }

  onMigrate() {
    if (!this.legacyCode.trim()) {
      this.errorMessage = 'Debe ingresar un codigo para migrar.';
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    this.migrateReport = null;
    this.migrateCode = 'Procesando...';

    this.migrationService.migrateCode(this.legacyCode, this.tarLanguage, this.selectedApi)
      .subscribe({
        next: (response) => {
          this.migrateCode = response.result;
          this.migrateReport = response.report;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = err.error?.error || 'Error al conectar con el backend.';
          this.migrateCode = '';
          this.loading = false;
        }
      });
  }

  clearCode() {
    this.legacyCode = '';
    this.migrateCode = '';
    this.errorMessage = '';
    this.migrateReport = null;
  }

  async copyCode() {
    if (!this.migrateCode) return;

    try {
      await navigator.clipboard.writeText(this.migrateCode);
      this.copyButtonText = 'Copiado';

      setTimeout(() => { this.copyButtonText = 'Copiar'; }, 2000);
    } catch (err) {
      console.error('Error al copiar: ', err);
      this.errorMessage = 'No se pudo copiar.';
    }
  }
}