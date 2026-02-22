import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  migrateCode(code: string, language: string, engine: 'regex' | 'ai'): Observable<any> {
    const endpoint = engine === 'ai' ? '/migrate-code-ai' : '/migrate-code';
    return this.http.post(`${this.baseUrl}${endpoint}`, { code, language });
  }
}