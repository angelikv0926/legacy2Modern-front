# Reto Legacy2Modern - Motor de Migracion

Este proyecto es una solucion para migrar codigo legacyc ya sea COBOL o Delphi a tecnologias modernas especificas como Node.js, Java, Python y Go. Fue desarrollado implementando dos motores de migracion uno basado en reglas y otro usando Inteligencia Artificial Generativa (GEMINI), una api rest en Node.js y una interfaz en Angular.

---

# Parte 1 & 2 - Motor de Migracion e Interfaz Web

La aplicacion tiene dos enfoques distintos los cuales se pueden seleccionar desde el front:

1. Basico o Regex (Ruta `\migrate-code`): Traduce sentencias de COBOL o Delphi especificas como if, move, entre otras a lenguages como node.js, java, python y Go, adicionalmente genera un reporte con el numero de reglas que se aplicaron y las advertencias sobre las reglas que no se han cofigurado para migrar
2. Avanzado o IA (Ruta `\migrate-code-ai`): Integra gemini para analizar el contexto del codigo y reescribirlo en los lenguajes mencionados anteriormente.

---

# Parte 3 - Arquitectura

La aplicacion tiene arquitectura cliente-servidor, separando las responsabilidades y permitiendo escalabilidad:

1. **Frontend (Presentacion - Angular):** Es un SPA, ya que para el reto no se necesitan mas pantallas, se encarga de gestionar el estado, interactuar con el usuario y realizar las peticiones http al backend.
2. **Backend (Controlador - Node.js/Express):** Recibe las peticiones y enruta hacia el motor definido (`\migrate-code` o `\migrate-code-ai`).
3. **Externo (API Gemini):** el backend se conecta por medio de @google/generative-ai a la api de Gemini para realizar la migracion del codigo.

**Flujo A:**
\`Frontend\` ➔ \`HTTP POST Request \migrate-code\` ➔ \`API Node.js\` ➔ \`Output JSON\` ➔ \`Frontend\`

**Flujo B:**
\`Frontend\` ➔ \`HTTP POST Request \migrate-code-ai\` ➔ \`API Node.js\` ➔ \`External AI API\` ➔ \`Output JSON\` ➔ \`Frontend\`

# Parte 3.1 - Patrones de diseño
El backend fue construido con una arquitectura en capas (Layered Architecture) en TypeScript y se implementaron varios patrones de desarrollo

1.  **Patron Estrategia:** se implementa `BaseTranslator` que contiene las reglas comunes entre lenguajes.
2.  **Mapa de Acciones:** en un inicio como se habia planteado un solo lenguaje de migracion se tenia un `switch` pero al agregar mas funcionalidades y lenguajes este fue aumentando de tamaño lo que hace que a futuro no sea manejable, por esto se usa un diccionario de funciones `O(1)`.
3.  **Separacion de Responsabilidades:** Division de Rutas, Controladores, Servicios.

```mermaid
graph LR
    A[Envía solicitud] --> B[Recibe solicitud]
    B --> C{¿TPS ≤ 5?}
    C -->|No| D[Error 400] --> Z[Fin]
    C -->|Sí| E{¿Tipo de aplicación?}
    subgraph Proceso_Básico
        F[Obtiene configuración del lenguaje] --> G[Procesa código con regex]
        G --> H[Marca líneas no migrables]
        H --> I[Genera response]
    end
    subgraph Proceso_Avanzado
        J[Autentica token de IA] --> K{¿Autenticación exitosa?}
        K -->|No| L[Error 401]
        K -->|Sí| M[Llama a API IA]
        M --> N[Espera respuesta]
        N --> O[Genera response]
    end
    E -->|Básica| F
    E -->|Avanzada| J
    I --> Z
    L --> Z
    O --> Z
```
---

# Parte 4 - Arquitectura de Despliegue (Opcion B - AWS)

Para esto se realizaron varias consultas sobre la capa gratuita de AWS y se vio que este proyecto puede ser desplegado en esta:

* **Frontend (Amazon S3 + CloudFront):** Los archivos compilados de Angular se alojan en un bucket S3, expuesto por CloudFront sobre https.

* **Backend (AWS Lambda + Amazon API Gateway)**: La API de Node.js se ejecuta en Lambda, se usa API Gateway para enrutar hacia la Lambda. Las variables de entorno se guardan de forma segura en configuracion de Lambda.
* **Observabilidad:** Logs en Amazon CloudWatch.

```mermaid
graph LR
    %% Actores Externos
    User((Usuario\nNavegador))
    Gemini[Google Gemini\nAPI Externa]
    %% Capa Frontend
    subgraph Frontend [Capa de Presentación - AWS]
        CF[Amazon CloudFront\nCDN HTTPS]
        S3[(Amazon S3\nBucket Angular)]
    end
    %% Capa Backend
    subgraph Backend [Capa de Lógica - AWS Serverless]
        API[Amazon API Gateway\nEnrutamiento REST]
        Lambda((AWS Lambda\nNode.js API))
    end
    %% Capa de Observabilidad
    subgraph Observabilidad [Monitoreo y Logs]
        CW[Amazon CloudWatch\nLogs de Ejecución]
    end
    %% Flujos de Comunicación
    User -- "1. Pide la Web (HTTPS)" --> CF
    CF -- "2. Obtiene estáticos" --> S3
    User -- "3. Petición /api/migrate" --> API
    API -- "4. Desencadena Función" --> Lambda
    Lambda -- "5. Llama al LLM" --> Gemini
    Lambda -. "6. Guarda Logs" .-> CW
    API -. "6. Métricas de API" .-> CW
    %% Estilos (Opcional para que se vea bien en GitHub)
    style Frontend fill:#f9f2ec,stroke:#d2691e,stroke-width:2px
    style Backend fill:#fcf4f4,stroke:#e05252,stroke-width:2px
    style Observabilidad fill:#f4f8fc,stroke:#5271e0,stroke-width:2px
    style CF fill:#ff9900,color:#fff,stroke:#e68a00
    style S3 fill:#569a31,color:#fff,stroke:#4d8a2c
    style API fill:#cc2264,color:#fff,stroke:#b31e58
    style Lambda fill:#ff9900,color:#fff,stroke:#e68a00
    style CW fill:#cc2264,color:#fff,stroke:#b31e58
```
---

# Parte 5 - Seguridad

## 1. Fuga de credenciales
* **Riesgo:** Exposicion secretos como la `GEMINI_API_KEY` en repositorios publicos.
* **Mitigacion:** * Uso de `.gitignore` para excluir el archivo .env
  * En el despliegue en AWS, uso de Secrets Manager.

### 2. Abuso de la API
* **Riesgo:** Gran volumen de peticiones que agoten los recursos o disparen los costos por uso de la API externa de Gemini.
* **Mitigacion:**
  * Implementar express-rate-limit para limitar el numero de peticiones que se pueden realizar por minuto.
  * Establecer limites y alertas de presupuesto para los servicios de terceros.

## 3. Validacion de entrada
* **Riesgo:** Se podrian ingresar cadenas de caracteres extremadamente largas y complejas o lenguajes que no soporta actualmente el motor.
* **Mitigacion:** * Implementar libreria zod para realizar la validacion estricta del tamaño de los datos de entrada.
  * Implementar Emuns dentro de un middleware para que solo se reciba exactamente lo que se requiere node.js, java, python y Go.
  * Generar un prom delimitado para que la IA solo devuelva codigo fuente y rechace cualquier otra instruccion.

------------------------------------------------------------------------------------

# Instalacion Local

## 1. Requisitos Previos
* Angular CLI: 18.2.11
* Node: 20.11.1
* Package Manager: npm 10.2.4
* Una API Key de Google AI Studio (Gemini).

## 2. Configuracion del Backend
* Descargar el repositorio del back localmente
  * https://github.com/angelikv0926/legacy2Modern-back
* npm i

Crear un archivo .env en la raiz del proyecto backend con la clave de Gemini:
+ GEMINI_API_KEY=AIXXXclave_secretaXXXX
+ GEMINI_MODEL=gemini-2.5-flash
+ PORT=3000

Inicia el servidor en modo desarrollo:
* npm run dev

## 3. Configuracion del Frontend

* Descargar el repositorio del front localmente
  * https://github.com/angelikv0926/legacy2Modern-front
* npm i
* ng serve

+ Ingresar a la ruta:
+ http://localhost:4200