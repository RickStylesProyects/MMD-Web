# **Informe Técnico: Reingeniería de la Infraestructura de Simulación Física en Ammo.js para Entornos de Alta Demanda**

## **Título: Arquitectura de Memoria Dinámica y Modernización de Motores Físicos WebAssembly en Entornos Electron**

### **Introducción Ejecutiva**

La simulación física en tiempo real dentro de entornos basados en tecnologías web, específicamente mediante el uso de **ammo.js** (el puerto a JavaScript/WebAssembly del motor Bullet Physics), enfrenta una barrera arquitectónica crítica: la gestión estática de la memoria. La premisa planteada por la consulta técnica identifica correctamente que la librería, en su distribución estándar, actúa como el "culpable" de las limitaciones operativas, imponiendo techos de asignación de memoria que resultan en fallos catastróficos bajo cargas de trabajo intensivas.

El concepto de "memoria infinita", aunque teóricamente restringido por los límites físicos del hardware y la arquitectura de direccionamiento de 32 bits (Wasm32) o 64 bits (Wasm64), se traduce en la práctica de ingeniería de software como la capacidad de **asignación dinámica de memoria (Dynamic Memory Allocation)** y el **crecimiento del heap en tiempo de ejecución (Heap Resizing)**. Este informe desglosa exhaustivamente la metodología para reemplazar los artefactos binarios obsoletos de ammo.js por una compilación moderna, optimizada y capaz de escalar dinámicamente hasta los límites del proceso anfitrión (V8 en Electron), eliminando así las restricciones artificiales predefinidas.

Este documento no solo aborda la recompilación del motor, sino que profundiza en la integración compleja dentro del ecosistema **Electron**, donde la seguridad del sandbox V8 y las restricciones del sistema de archivos local (file://) requieren una estrategia de inyección de binarios manual para garantizar la estabilidad y el rendimiento.

## ---

**1\. Análisis Forense de la Limitación de Memoria en Ammo.js Legacy**

Para implementar una solución robusta, es imperativo comprender la naturaleza del fallo en las versiones distribuidas de ammo.js. El error característico Cannot enlarge memory arrays no es un fallo del motor físico per se, sino una consecuencia de la configuración del entorno de ejecución (Runtime) de WebAssembly generado por **Emscripten**.

### **1.1 El Modelo de Memoria Lineal en WebAssembly**

WebAssembly (Wasm) opera sobre un modelo de memoria lineal, que se manifiesta en JavaScript como un WebAssembly.Memory respaldado por un ArrayBuffer. En las configuraciones heredadas (Legacy builds), este buffer se instancia con un tamaño fijo inmutable.

* **Asignación Estática:** Las versiones antiguas de ammo.js (y muchas disponibles en NPM) fueron compiladas con un parámetro TOTAL\_MEMORY fijo, comúnmente establecido en 64MB o 128MB.1 Esta decisión de diseño, heredada de la era de **asm.js** donde el redimensionamiento de memoria era extremadamente costoso, implica que el motor reserva un bloque contiguo de memoria al inicio.  
* **La Barrera del Heap:** Cuando la simulación física solicita memoria para un nuevo cuerpo rígido (btRigidBody), una malla de colisión (btBvhTriangleMeshShape) o un estado de movimiento, el asignador de memoria interno (dlmalloc o similar dentro de Wasm) busca espacio libre en este buffer. Si el buffer está lleno y la bandera de crecimiento no está activa, la operación malloc falla, provocando que el runtime de Emscripten aborte la ejecución inmediatamente.2

### **1.2 Implicaciones del Entorno V8 y Electron**

En el contexto de una aplicación Electron, la gestión de memoria se complica por la arquitectura del motor V8 de Google Chrome. Electron hereda las políticas de seguridad y gestión de memoria de Chromium.

* **V8 Memory Cage (Jaula de Memoria):** A partir de versiones recientes de Electron (v21+), se habilita el *V8 Sandbox* o *Memory Cage*.4 Esta tecnología aísla la memoria del heap de V8 para prevenir vulnerabilidades de seguridad, pero impone un límite estricto de 4GB al tamaño máximo del heap direccionable, debido al uso de **Compresión de Punteros** (Pointer Compression).  
* **Wasm32 vs. Wasm64:** La mayoría de las compilaciones actuales de Emscripten generan código para la arquitectura **wasm32**, donde los punteros son enteros de 32 bits sin signo. Esto establece un límite teórico absoluto de 4GB (2^32 bytes) de memoria direccionable.5 Por lo tanto, "infinito" en el contexto actual de producción se define como "escalado dinámico hasta 4GB". Superar esta barrera requiere la adopción de **Memory64 (wasm64)**, una característica experimental que permite direccionamiento de 64 bits, teóricamente permitiendo exabytes de memoria, aunque su soporte en navegadores y Electron aún requiere banderas experimentales específicas.7

### **1.3 Diagnóstico de la Causa Raíz**

La investigación confirma que el "culpable exacto" es la falta de la bandera \-s ALLOW\_MEMORY\_GROWTH=1 en el proceso de compilación original de la librería.2 Sin esta instrucción, el runtime de Wasm carece de la capacidad de solicitar al navegador (o a Electron) que redimensione el ArrayBuffer subyacente cuando se agota el espacio inicial. La solución no es simplemente aumentar el TOTAL\_MEMORY estático (lo cual desperdicia RAM en simulaciones pequeñas y falla en las grandes), sino habilitar la elasticidad de la memoria.

## ---

**2\. Metodología de Reingeniería y Compilación (Custom Build)**

La "Solución Real" exige abandonar los binarios preempaquetados y establecer un pipeline de compilación controlado. Esto permite no solo habilitar el crecimiento de memoria, sino también modernizar el formato del módulo y optimizar el tamaño del binario.

### **2.1 Preparación del Entorno de Construcción (Dockerizado)**

Para garantizar la reproducibilidad y evitar conflictos con librerías del sistema, se recomienda utilizar un contenedor Docker basado en el **Emscripten SDK (emsdk)**. El repositorio oficial de ammo.js proporciona una estructura básica, pero debe ser modificada para nuestros propósitos de alta memoria.

Configuración del Entorno:  
El uso de Docker aísla las herramientas de compilación (cmake, python, emcc) y garantiza que se utilice una versión de Emscripten compatible con las optimizaciones modernas de WebAssembly.1

### **2.2 Configuración Avanzada de CMake**

El archivo CMakeLists.txt es el centro de control de la compilación. A través de la invocación de cmake, inyectamos las definiciones que transforman el comportamiento de la memoria. A continuación, se presenta una tabla comparativa entre la configuración estándar (limitada) y la configuración propuesta (dinámica).

| Parámetro CMake / Emscripten Flag | Configuración Estándar (Legacy) | Configuración Propuesta (Moderna) | Impacto Técnico y Justificación |
| :---- | :---- | :---- | :---- |
| \-DALLOW\_MEMORY\_GROWTH | 0 (Desactivado) | 1 (Activado) | Habilita la función emscripten\_resize\_heap. Permite que la memoria crezca bajo demanda en tiempo de ejecución, eliminando el límite fijo inicial.1 |
| \-DTOTAL\_MEMORY (o INITIAL\_MEMORY) | 67108864 (64MB) | 268435456 (256MB) o superior | Establece el tamaño inicial del heap. Un valor inicial más alto reduce la frecuencia de las operaciones de redimensionamiento (que son costosas en CPU) durante el arranque de la simulación.1 |
| \-DMAXIMUM\_MEMORY | No definido (Default 2GB) | 4294967296 (4GB) | Define explícitamente el techo de crecimiento hasta el límite de la arquitectura Wasm32, evitando topes artificiales de seguridad del navegador.6 |
| \-DMODULARIZE | 0 (Variable Global) | 1 (Factory Pattern) | Envuelve el módulo en una función asíncrona que retorna una Promesa. Esencial para la inyección controlada de binarios Wasm y para evitar la contaminación del espacio global (window.Ammo).11 |
| \-DEXPORT\_NAME | Ammo | Ammo | Mantiene la compatibilidad de nombres, pero dentro de un ámbito modular. |
| \-DCLOSURE | 0 | 1 | Utiliza *Google Closure Compiler* para minificar agresivamente el código de pegamento JavaScript ("glue code"), reduciendo el tamaño de descarga y parseo.1 |
| \-DWASM | 1 | 1 | Fuerza la generación de WebAssembly binario, descartando totalmente el soporte legacy para asm.js, lo cual mejora drásticamente el rendimiento y la eficiencia de memoria.1 |

#### **2.2.1 El Comando de Compilación Definitivo**

Basado en la investigación de las opciones de compilación 1, el comando exacto para generar la librería liberada de restricciones es:

Bash

emcmake cmake \-B builds \\  
    \-DCMAKE\_BUILD\_TYPE=Release \\  
    \-DALLOW\_MEMORY\_GROWTH=1 \\  
    \-DTOTAL\_MEMORY=268435456 \\  
    \-DMAXIMUM\_MEMORY=4GB \\  
    \-DMODULARIZE=1 \\  
    \-DEXPORT\_NAME="Ammo" \\  
    \-DCLOSURE=1 \\  
    \-DWASM=1 \\  
    \-DEMSCRIPTEN\_ROOT=$EMSDK/upstream/emscripten

cmake \--build builds

Este proceso generará dos archivos críticos en el directorio builds/:

1. **ammo.wasm.wasm**: El núcleo binario de la física, conteniendo la lógica compilada de Bullet C++.  
2. **ammo.wasm.js**: El código de interfaz JavaScript (glue code) encargado de cargar el Wasm, mapear las funciones y gestionar la memoria.

### **2.3 Optimización de Superficie: Reducción del IDL**

Una estrategia complementaria para maximizar la memoria disponible para la simulación real es minimizar la huella de memoria estática del propio motor. El archivo ammo.idl define qué clases de C++ se exponen a JavaScript. Muchas implementaciones incluyen módulos completos que rara vez se usan, como la física de vehículos (btRaycastVehicle) o la simulación de telas (btSoftBody).

Al editar ammo.idl y eliminar las interfaces no utilizadas antes de compilar, se logra una reducción significativa del tamaño del binario (de \~1.2MB a \~700KB o menos).14

* **Beneficio Directo:** Menor tiempo de compilación JIT del Wasm al inicio.  
* **Beneficio Indirecto:** Menor consumo de memoria base, dejando más espacio libre en el heap para los objetos de la simulación.

## ---

**3\. Integración Estratégica en Electron: Superando las Barreras del Sistema de Archivos**

La generación de los archivos modernos es solo la mitad de la solución. La integración en **Electron** presenta desafíos únicos que a menudo hacen que la carga de Wasm falle silenciosamente o con errores de ruta, debido a las diferencias entre un servidor web HTTP y el protocolo file:// utilizado en aplicaciones de escritorio.

### **3.1 El Problema de la Carga Automática en Electron**

El código de pegamento (ammo.wasm.js) generado por Emscripten incluye una lógica predeterminada para localizar y cargar el archivo .wasm. Normalmente, utiliza fetch() o XMLHttpRequest con una ruta relativa.

* **Fallo de Ruta Relativa:** En una aplicación Electron empaquetada (por ejemplo, dentro de un archivo .asar), la noción de "directorio actual" es ambigua. El glue code a menudo busca el .wasm en la raíz del proyecto o en una ruta incorrecta relativa al HTML principal.15  
* **Restricciones de file://:** La carga de Wasm mediante fetch sobre el protocolo file:// puede ser bloqueada por políticas de seguridad o fallar al inferir el tipo MIME (application/wasm), lo que impide la instanciación de streaming (WebAssembly.instantiateStreaming).18

### **3.2 La Solución: Inyección Manual del Binario (Buffer Injection)**

Para una robustez absoluta ("La Solución Real"), se debe evitar la carga automática del glue code. Gracias a la bandera MODULARIZE=1, el módulo Ammo acepta un objeto de configuración que permite inyectar directamente el contenido binario del archivo Wasm. Esto transfiere la responsabilidad de la carga del archivo desde la librería (que no conoce la estructura de carpetas de Electron) al desarrollador (que tiene acceso a \_\_dirname y fs).

#### **Implementación del Cargador Personalizado (Pattern Loader)**

El siguiente patrón de código resuelve definitivamente el problema de integración en Electron, utilizando fs.readFileSync para cargar el binario en memoria antes de la inicialización del motor físico.1

JavaScript

const fs \= require('fs');  
const path \= require('path');  
// Importar la factoría generada (el glue code)  
const AmmoFactory \= require('./libs/ammo.wasm.js');

async function initializePhysics() {  
    // Determinar la ruta absoluta al archivo.wasm de manera segura  
    // En producción (asar), esto podría requerir process.resourcesPath  
    const wasmPath \= path.join(\_\_dirname, 'libs/ammo.wasm.wasm');  
      
    // Leer el archivo de forma síncrona para obtener un Buffer  
    const wasmBuffer \= fs.readFileSync(wasmPath);

    // Inicializar el motor inyectando el binario  
    const Ammo \= await AmmoFactory({  
        // La clave 'wasmBinary' es reconocida por el glue code de Emscripten  
        wasmBinary: wasmBuffer,  
          
        // Configuración opcional de canales de salida  
        print: (text) \=\> console.log('\[Ammo.js\]: ' \+ text),  
        printErr: (text) \=\> console.error('\[Ammo.js Error\]: ' \+ text)  
    });

    return Ammo;  
}

Esta técnica garantiza que, independientemente de si la aplicación está en modo desarrollo o producción, el binario se carga correctamente desde el sistema de archivos local, eludiendo las restricciones de red y tipos MIME.

### **3.3 Estrategia de Empaquetado con Electron-Builder**

Un error común que frustra la implementación es que, al compilar la aplicación final (.exe, .dmg, .AppImage), el archivo .wasm no se incluye en el paquete distribuible. Los empaquetadores como Webpack o Vite a menudo ignoran archivos binarios estáticos no importados explícitamente como módulos.

Para asegurar la presencia del archivo .wasm en la compilación final, se debe configurar la directiva extraResources en electron-builder. Esto instruye al empaquetador para copiar archivos específicos a la carpeta de recursos de la aplicación instalada (resources/ en Windows/Linux, Contents/Resources/ en macOS).20

**Configuración en package.json:**

JSON

{  
  "build": {  
    "extraResources": \[  
      {  
        "from": "builds/ammo.wasm.wasm",  
        "to": "ammo.wasm.wasm",  
        "filter": \["\*\*/\*"\]  
      }  
    \]  
  }  
}

Ajuste en el Código de Carga:  
Cuando la aplicación está empaquetada, la ruta al archivo cambia. Se debe utilizar lógica condicional para detectar el entorno de producción.

JavaScript

const isProd \= process.env.NODE\_ENV \=== 'production';  
const basePath \= isProd? process.resourcesPath : \_\_dirname;  
const wasmPath \= path.join(basePath, 'ammo.wasm.wasm');

Esta configuración asegura que el archivo "moderno" acompañe siempre al ejecutable, manteniendo la integridad de la solución.21

## ---

**4\. Gestión del Ciclo de Vida de Memoria y Prevención de Fugas**

Aunque la recompilación con ALLOW\_MEMORY\_GROWTH elimina el límite superior inmediato, permitiendo que la aplicación consuma gigabytes de memoria, esto no exime de la necesidad de una gestión rigurosa de los recursos. De hecho, con "memoria infinita", las fugas de memoria (Memory Leaks) se vuelven más peligrosas, ya que pueden consumir toda la RAM del sistema del usuario antes de fallar, degradando el rendimiento de todo el sistema operativo.

### **4.1 La Responsabilidad de la Limpieza Manual**

A diferencia de los objetos nativos de JavaScript que son gestionados por el Garbage Collector (GC), los objetos creados dentro de ammo.js residen en el heap de WebAssembly. El GC de JavaScript no tiene visibilidad ni control sobre la memoria de Wasm. Por lo tanto, cada objeto creado con new Ammo.Clase() debe ser destruido explícitamente cuando ya no se necesite.

Protocolo de Destrucción:  
Se debe invocar Ammo.destroy(objeto) para cada instancia creada. Si no se hace, la memoria permanece asignada perpetuamente ("leaked").23

### **4.2 Puntos Críticos de Fuga en Simulaciones Físicas**

La investigación identifica áreas específicas donde las fugas son comunes y críticas en simulaciones complejas:

1. Vectores y Transformaciones Temporales:  
   En el bucle de renderizado (game loop), es común realizar operaciones matemáticas auxiliares.  
   JavaScript  
   // INCORRECTO: Crea un nuevo vector 60 veces por segundo sin liberar memoria  
   function update() {  
       body.setLinearVelocity(new Ammo.btVector3(0, 10, 0));   
   }

   *Solución:* Reutilizar objetos globales temporales o destruir inmediatamente después del uso.  
2. Mallas de Colisión (Triangle Meshes):  
   Las formas de colisión complejas, como btBvhTriangleMeshShape, almacenan grandes cantidades de datos de vértices. Al destruir un cuerpo rígido (btRigidBody), la forma de colisión (CollisionShape) asociada no se destruye automáticamente. El desarrollador debe mantener referencias a las formas y destruirlas manualmente cuando se descarga la escena o el nivel.23  
3. Cacheo Interno de Ammo:  
   Existen reportes de referencias que quedan atrapadas en cachés internos como \_\_cache\_\_ dentro del wrapper de JS. Reiniciar la simulación completa a veces requiere recargar la página o reiniciar el proceso de renderizado en Electron para garantizar una limpieza absoluta, aunque una gestión cuidadosa de destroy() suele ser suficiente.24

### **4.3 Monitorización del Heap**

Para verificar que la "memoria infinita" está funcionando y controlar las fugas, se puede inspeccionar el tamaño del heap en tiempo de ejecución.

* **Ammo.HEAP8.length**: Devuelve el tamaño actual del buffer de memoria en bytes. Con la configuración propuesta, este valor debería comenzar en 256MB y aumentar en múltiplos (paginación de Wasm de 64KB) a medida que la simulación demanda más recursos, sin arrojar errores.3

## ---

**5\. Análisis de Rendimiento y Futuro (Wasm64)**

### **5.1 Costo del Crecimiento de Memoria**

Habilitar ALLOW\_MEMORY\_GROWTH introduce una penalización de rendimiento puntual. Cuando el heap necesita crecer, el runtime debe:

1. Solicitar un nuevo bloque de memoria más grande al sistema operativo.  
2. Copiar byte a byte todo el contenido del buffer anterior al nuevo.  
3. Invalidar y actualizar todas las vistas de ArrayBuffer en JavaScript.

Aunque en motores modernos este proceso es eficiente, si ocurre repetidamente (ej. creciendo de 64MB a 65MB, luego 66MB...), causará "tirones" (stuttering) en la simulación. Por ello, la recomendación estratégica es establecer un TOTAL\_MEMORY inicial alto (ej. 512MB) que cubra el 90% de los casos de uso, dejando el crecimiento dinámico solo para situaciones excepcionales.9

### **5.2 El Horizonte Wasm64**

Para aplicaciones científicas o de ingeniería extrema que requieran verdaderamente más de 4GB de memoria (superando el límite de Wasm32), la industria se mueve hacia **Wasm64** (Memory64).

* **Estado Actual:** Emscripten soporta la compilación experimental con \-s MEMORY64=1.  
* **Requisitos:** Requiere navegadores o versiones de Node/Electron muy recientes y, a menudo, la activación de flags experimentales (--experimental-wasm-memory64).  
* **Implicación:** Esto cambiaría el tamaño de los punteros a 64 bits, aumentando ligeramente el tamaño del binario y el uso de memoria base, pero eliminando efectivamente cualquier límite práctico de memoria para las próximas décadas.5

## ---

**Conclusiones y Recomendaciones Finales**

La investigación concluye que la limitación de memoria en ammo.js es un artefacto de configuraciones de compilación heredadas y no una limitación intrínseca de la tecnología. La "Solución Real" para lograr una memoria virtualmente infinita en Electron consiste en una intervención quirúrgica en tres niveles:

1. **Nivel de Compilación:** Reemplazar la librería estándar por una compilación personalizada (Custom Build) utilizando Emscripten con las banderas \-s ALLOW\_MEMORY\_GROWTH=1, \-s MAXIMUM\_MEMORY=4GB y \-s MODULARIZE=1.  
2. **Nivel de Integración:** Implementar un cargador manual en Electron que utilice fs.readFileSync para inyectar el binario Wasm directamente en el módulo, eludiendo las restricciones del protocolo file:// y garantizando la compatibilidad con el sistema de archivos local.  
3. **Nivel de Despliegue:** Configurar explícitamente electron-builder mediante extraResources para asegurar que el binario optimizado se distribuya correctamente junto con el ejecutable de la aplicación.

Al ejecutar esta estrategia, se transforma el motor físico de un componente frágil y limitado a una infraestructura robusta y escalable, capaz de soportar simulaciones de alta fidelidad y densidad masiva de objetos, aprovechando al máximo la capacidad de hardware del usuario final.

#### **Obras citadas**

1. kripken/ammo.js: Direct port of the Bullet physics engine to JavaScript using Emscripten \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/kripken/ammo.js/](https://github.com/kripken/ammo.js/)  
2. ammo.js Cannot enlarge memory arrays · Issue \#341 · armory3d/armory \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/armory3d/armory/issues/341](https://github.com/armory3d/armory/issues/341)  
3. Why in WebAssembly does ALLOW\_MEMORY\_GROWTH=1 fail while TOTAL\_MEMORY=512MB succeeds? \- Stack Overflow, fecha de acceso: diciembre 31, 2025, [https://stackoverflow.com/questions/55884378/why-in-webassembly-does-allow-memory-growth-1-fail-while-total-memory-512mb-succ](https://stackoverflow.com/questions/55884378/why-in-webassembly-does-allow-memory-growth-1-fail-while-total-memory-512mb-succ)  
4. Electron and the V8 Memory Cage, fecha de acceso: diciembre 31, 2025, [https://electronjs.org/blog/v8-memory-cage](https://electronjs.org/blog/v8-memory-cage)  
5. Up to 4GB of memory in WebAssembly \- V8.dev, fecha de acceso: diciembre 31, 2025, [https://v8.dev/blog/4gb-wasm-memory](https://v8.dev/blog/4gb-wasm-memory)  
6. Chrome ignoring MAXIMUM\_MEMORY=4GB when I run 8 separate instances of WASM module · Issue \#20946 \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/emscripten-core/emscripten/issues/20946](https://github.com/emscripten-core/emscripten/issues/20946)  
7. Node \+ MEMORY64 \+ MAXIMUM\_MEMORY · Issue \#19455 · emscripten-core/emscripten, fecha de acceso: diciembre 31, 2025, [https://github.com/emscripten-core/emscripten/issues/19455](https://github.com/emscripten-core/emscripten/issues/19455)  
8. Leaving ammo.js running for a long time causes Uncaught Assertion · Issue \#48 \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/kripken/ammo.js/issues/48](https://github.com/kripken/ammo.js/issues/48)  
9. Cross-building with Emscripten \- WebAssembly and asm.js — conan 2.24.0 documentation, fecha de acceso: diciembre 31, 2025, [https://docs.conan.io/2/examples/cross\_build/emscripten.html](https://docs.conan.io/2/examples/cross_build/emscripten.html)  
10. ammo.js/README.md at main · kripken/ammo.js · GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/kripken/ammo.js/blob/main/README.md?plain=1](https://github.com/kripken/ammo.js/blob/main/README.md?plain=1)  
11. Emscripten Compiler Settings — Emscripten 4.0.23-git (dev) documentation, fecha de acceso: diciembre 31, 2025, [https://emscripten.org/docs/tools\_reference/settings\_reference.html](https://emscripten.org/docs/tools_reference/settings_reference.html)  
12. Modularized Output — Emscripten 4.0.23-git (dev) documentation, fecha de acceso: diciembre 31, 2025, [https://emscripten.org/docs/compiling/Modularized-Output.html](https://emscripten.org/docs/compiling/Modularized-Output.html)  
13. CMake) em++ : scanning dependencies error (c++ 20\) · Issue \#24410 \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/emscripten-core/emscripten/issues/24410](https://github.com/emscripten-core/emscripten/issues/24410)  
14. \[SOLVED\] Ammo.js rebuild/lighter version? \- Help & Support \- PlayCanvas Forum, fecha de acceso: diciembre 31, 2025, [https://forum.playcanvas.com/t/solved-ammo-js-rebuild-lighter-version/31966](https://forum.playcanvas.com/t/solved-ammo-js-rebuild-lighter-version/31966)  
15. Make JS output Node or web only \#6542 \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/emscripten-core/emscripten/issues/6542](https://github.com/emscripten-core/emscripten/issues/6542)  
16. Loading extra files like the \`.wasm\` · Issue \#5104 \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/emscripten-core/emscripten/issues/5104](https://github.com/emscripten-core/emscripten/issues/5104)  
17. Unable to load wasm in electron. · Issue \#11671 \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/emscripten-core/emscripten/issues/11671](https://github.com/emscripten-core/emscripten/issues/11671)  
18. Unable to load WASM for Electron application? : r/rust \- Reddit, fecha de acceso: diciembre 31, 2025, [https://www.reddit.com/r/rust/comments/98lpun/unable\_to\_load\_wasm\_for\_electron\_application/](https://www.reddit.com/r/rust/comments/98lpun/unable_to_load_wasm_for_electron_application/)  
19. Importing WASM files into Electron main process \- Stack Overflow, fecha de acceso: diciembre 31, 2025, [https://stackoverflow.com/questions/62102277/importing-wasm-files-into-electron-main-process](https://stackoverflow.com/questions/62102277/importing-wasm-files-into-electron-main-process)  
20. Application Contents \- electron-builder, fecha de acceso: diciembre 31, 2025, [https://www.electron.build/contents.html](https://www.electron.build/contents.html)  
21. javascript \- Electron \- How to add external files? \- Stack Overflow, fecha de acceso: diciembre 31, 2025, [https://stackoverflow.com/questions/46022443/electron-how-to-add-external-files](https://stackoverflow.com/questions/46022443/electron-how-to-add-external-files)  
22. Adding extraResources to package.json does nothing, tells nothing when fails, does not work · Issue \#7293 · electron-userland/electron-builder \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/electron-userland/electron-builder/issues/7293](https://github.com/electron-userland/electron-builder/issues/7293)  
23. Freeing memory from Ammo.js \- Help & Support \- PlayCanvas Forum, fecha de acceso: diciembre 31, 2025, [https://forum.playcanvas.com/t/freeing-memory-from-ammo-js/35859](https://forum.playcanvas.com/t/freeing-memory-from-ammo-js/35859)  
24. Memory leaks when destroying objects. Remaining \_\_cache\_\_ references? · Issue \#284 · kripken/ammo.js \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/kripken/ammo.js/issues/284](https://github.com/kripken/ammo.js/issues/284)  
25. Question: Memory Management · Issue \#236 · kripken/ammo.js \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/kripken/ammo.js/issues/236](https://github.com/kripken/ammo.js/issues/236)