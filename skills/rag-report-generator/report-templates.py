#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Report Templates & Quality Guidelines
Professional templates for different report types
Ensures consistent, high-quality output across all client reports
"""

from typing import Dict, Any, List
from dataclasses import dataclass
from enum import Enum


class ToneGuideline(Enum):
    """Tone guidelines for professional reports"""
    
    EXECUTIVE = """
    • Profesional y confiado sin ser presuntuoso
    • Datos concretos, no especulación
    • Enfoque en valor de negocio, no tecnología
    • Frases cortas (máx 20 palabras)
    • Verbos activos (no pasiva)
    • Números siempre: "2,345 documentos" no "muchos documentos"
    • Evita: Jerga técnica, puntos grises, disclaimers
    • Incluye: Riesgos/oportunidades, timeline, ROI
    """
    
    TECHNICAL = """
    • Preciso y completo
    • Diagramas y ejemplos de código
    • Transparencia sobre limitaciones
    • Referencias a Azure best practices
    • Opciones alternativas cuando proceda
    """
    
    BALANCED = """
    • Mezcla datos duros + contexto de negocio
    • Accesible para no-técnicos
    • Soportado con ejemplos reales
    • Destaca impacto en operaciones
    """


class ReportTemplate:
    """Professional report templates"""
    
    @staticmethod
    def RAG_IMPLEMENTATION() -> Dict[str, Any]:
        """Template for RAG implementation report"""
        return {
            "title": "Informe Ejecutivo: Implementación de Búsqueda Inteligente",
            "sections": [
                {
                    "name": "Resumen Ejecutivo",
                    "guidelines": """
                    - 2-3 párrafos máximo
                    - Responda: Qué, cuándo, valor
                    - Incluya: Número de documentos, plazo, beneficio principal
                    - Tono: Profesional, orientado a resultados
                    - Ejemplo: "Se han indexado 2,345 documentos en Azure Search,
                      permitiendo búsqueda instantánea que reduce el tiempo de consulta
                      de 15 minutos a 30 segundos."
                    """,
                    "min_words": 150,
                    "max_words": 300,
                },
                {
                    "name": "Situación Actual",
                    "guidelines": """
                    - Describe el estado antes de la solución
                    - Incluya: Volumen de documentos, desafíos, costos actuales
                    - Tono: Neutral, basado en hechos
                    - Use bullets para claridad
                    """,
                    "bullets": 4,
                },
                {
                    "name": "Solución Propuesta",
                    "guidelines": """
                    - Explique QUÉ se construyó, no CÓMO (nivel ejecutivo)
                    - Incluya: Arquitectura conceptual, integraciones
                    - Opcional: Diagrama simple
                    - Destaque: Escalabilidad, seguridad, cumplimiento
                    """,
                },
                {
                    "name": "Beneficios Cuantificables",
                    "guidelines": """
                    - SIEMPRE números concretos
                    - Formato: "X% reducción en tiempo de búsqueda"
                    - Incluya: Productividad, costos, satisfacción
                    - Mínimo 3 beneficios clave
                    - Opcional: ROI (si datos disponibles)
                    """,
                },
                {
                    "name": "Recomendaciones",
                    "guidelines": """
                    - 4-5 recomendaciones máximo
                    - Estructura: [Recomendación] - [Beneficio] - [Timeline]
                    - Priorícelas: Alta/Media/Baja
                    - Incluya costos estimados
                    - Horizonte: Corto (1mes)/Medio (3-6m)/Largo (6-12m)
                    """,
                },
                {
                    "name": "Plan de Implementación",
                    "guidelines": """
                    - Timeline: Fases claras con duración
                    - Mínimo: 4 fases (Setup, Indexación, UAT, Producción)
                    - Incluya: Dependencias, entregables, responsables
                    - Tono: Realista (mejor estimar pesimista)
                    """,
                },
                {
                    "name": "Riesgos & Mitigaciones",
                    "guidelines": """
                    - Ábrase sobre riesgos (genera confianza)
                    - Cada riesgo: descripción + impacto + mitigación
                    - Ejemplo: "Riesgo: Documentos sin indexar. Mitigación: 
                      Validación de formato, pre-procesamiento automático"
                    """,
                },
                {
                    "name": "Anexos",
                    "guidelines": """
                    - Detalles técnicos, logs, ejemplos de queries
                    - Arquitectura detallada (si hay espacio)
                    - Matriz de características
                    - Glosario de términos (si es necesario)
                    """,
                },
            ],
        }
    
    @staticmethod
    def QUALITY_CHECKLIST() -> List[str]:
        """Quality checklist before finalizing report"""
        return [
            # Content quality
            "☑ ¿Cada afirmación está soportada por datos?",
            "☑ ¿Se incluyen números concretos (no 'muchos', 'varios')?",
            "☑ ¿El resumen ejecutivo tiene máx 300 palabras?",
            "☑ ¿Hay al menos 3 beneficios cuantificables?",
            "☑ ¿Las recomendaciones son accionables (no vagas)?",
            
            # Tone & language
            "☑ ¿El tono es profesional pero accesible?",
            "☑ ¿Se evita jerga técnica (o está explicada)?",
            "☑ ¿Los párrafos tienen máx 4 líneas?",
            "☑ ¿Se usan verbos activos?",
            "☑ ¿Los bullet points son paralelos (misma estructura)?",
            
            # Structure
            "☑ ¿Hay introducción con contexto?",
            "☑ ¿Hay conclusión clara con next steps?",
            "☑ ¿Las secciones tienen transiciones?",
            "☑ ¿Hay al menos 1 diagrama/tabla?",
            "☑ ¿Los títulos son descriptivos?",
            
            # Professional appearance
            "☑ ¿Hay 0 errores de ortografía?",
            "☑ ¿Hay 0 errores de puntuación?",
            "☑ ¿El formato está consistente (fuentes, tamaños)?",
            "☑ ¿Las tablas están bien formateadas?",
            "☑ ¿El documento tiene página de portada?",
            
            # Specific to RAG
            "☑ ¿Se menciona el número de documentos indexados?",
            "☑ ¿Se menciona el tiempo de respuesta (mejora)?",
            "☑ ¿Se justifica la tecnología Azure (no genérico)?",
            "☑ ¿Hay referencia a security/compliance?",
            "☑ ¿El ROI o beneficio final está claro?",
        ]


class ContentGuidelines:
    """Specific content guidelines"""
    
    EXECUTIVE_SUMMARY = """
    ESTRUCTURA RECOMENDADA (2-3 párrafos):
    
    Párrafo 1 - Contexto:
    "El cliente tenía [problema/oportunidad] con [X documentos/proceso].
    Se implementó [solución] usando [tecnología clave]."
    
    Párrafo 2 - Resultados:
    "Como resultado, [métrica de impacto 1], [métrica de impacto 2],
    y [métrica de impacto 3]. El ROI es de [X]% en [timeframe]."
    
    Párrafo 3 - Siguiente:
    "Se recomienda [acción principal] para [objetivo]. Esto requiere
    [recursos] y [timeline]. El cliente está listo para [next phase]."
    
    MÉTRICAS A INCLUIR:
    • Documentos indexados: [número]
    • Tiempo de búsqueda: [antes] → [después]
    • Disponibilidad: [%]
    • Usuarios impactados: [número]
    • Costo anual: [cantidad] (si aplica)
    
    TONO:
    - Confianza sin arrogancia
    - Hechos, no promesas
    - Enfoque en valor, no en tecnología
    - Referencia a estándares (Azure, ISO, etc.)
    """
    
    RECOMMENDATIONS = """
    ESTRUCTURA POR RECOMENDACIÓN:
    
    [Número]. [Título de Recomendación]
    
    Descripción: [1-2 frases sobre QUÉ]
    
    Beneficio: [Impacto concreto - use números si es posible]
    
    Implementación: [Timeline corto/medio/largo]
    
    Inversión estimada: [Si disponible]
    
    Prioridad: [Alta/Media/Baja]
    
    EJEMPLO BIEN HECHO:
    1. Integrar SharePoint con búsqueda
    
    Descripción: Conectar automáticamente nuevos documentos de
    SharePoint a la búsqueda inteligente, eliminando uploads manuales.
    
    Beneficio: Reduce tiempo de indexación de 1 hora a 10 minutos,
    garantiza documentos siempre actualizados, elimina punto de fallo manual.
    
    Implementación: 2-3 semanas (corto plazo)
    
    Inversión: $0 (aprovecha licencias existentes)
    
    Prioridad: Alta
    
    EJEMPLO MAL HECHO (evitar):
    "Mejorar el sistema" ← vago, no accionable
    "Considerar opciones futuras" ← no concreto
    "Optimizar según necesidades" ← no específico
    """
    
    TIMELINE = """
    FASES ESTÁNDAR PARA RAG:
    
    Fase 1: Preparación (1-2 semanas)
    - Setup Azure, creación de recursos
    - Preparación de documentos
    - Entrenamiento de equipo
    
    Fase 2: Implementación (2-4 semanas)
    - Indexación de documentos
    - Configuración de búsqueda
    - Tuning de parámetros
    
    Fase 3: Validación (1-2 semanas)
    - UAT con usuarios
    - Ajustes según feedback
    - Documentación final
    
    Fase 4: Producción (1 semana)
    - Go-live
    - Monitoreo inicial
    - Handover a soporte
    
    TOTAL TÍPICO: 4-8 semanas
    
    REGLA: Siempre estima pesimista (+20%)
    """


class ExampleReports:
    """Real example content (redacted/anonymized)"""
    
    GOOD_SUMMARY = """
    Se ha implementado un sistema inteligente de búsqueda sobre 2,345 documentos
    internos de MENSADEF, que cubre procedimientos, legislación, casos de uso y
    análisis técnico. Utilizando Azure OpenAI y Azure Search, el sistema permite
    búsqueda semántica instantánea que reduce el tiempo de consulta de 15 minutos
    a 30 segundos, beneficiando a más de 200 usuarios.
    
    Los resultados iniciales muestran que el 94% de las búsquedas devuelven el
    documento correcto en el primer resultado. Se han validado 500+ casos de uso
    reales, con una precisión del 97%. El sistema está listo para producción y
    puede escalarse a 5,000+ documentos sin cambios arquitectónicos.
    
    Se recomienda: (1) activar búsqueda en producción en la próxima sprint,
    (2) integrar SharePoint en Q3 para documentos corporativos, (3) expandir a
    análisis de tendencias en Q4. La inversión inicial de $15K generará $120K en
    ahorros anuales por reducción de tiempo de búsqueda.
    """
    
    BAD_SUMMARY = """
    Hemos implementado un sistema de IA usando ML y NLP. Se indexaron documentos
    en la nube. El sistema funciona bien y es escalable. Se pueden hacer muchas
    cosas con esto. Recomendamos implementarlo pronto. Será útil para los usuarios.
    """
    
    @staticmethod
    def get_feedback():
        """Why GOOD is better than BAD"""
        return {
            "GOOD": [
                "✅ Números concretos (2,345, 15min→30s, 200 users, 94%, 97%)",
                "✅ Beneficio específico (reducción de tiempo de búsqueda)",
                "✅ Métrica de éxito (94% en primer resultado)",
                "✅ Escalabilidad demostrada (5,000 docs)",
                "✅ ROI cuantificado ($120K savings)",
                "✅ Next steps concretos (sprint, Q3, Q4)",
                "✅ Tono: Confianza sin arrogancia",
            ],
            "BAD": [
                "❌ Jerga sin contexto (ML, NLP, ML)",
                "❌ Adjetivos sin datos (bien, escalable, útil)",
                "❌ Vaguedad total (muchas cosas, pronto)",
                "❌ Sin métricas de éxito",
                "❌ Sin números concretos",
                "❌ Sin ROI o valor",
                "❌ Tono: Poco profesional, poco convincente",
            ],
        }
