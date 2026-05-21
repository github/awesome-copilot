#!/usr/bin/env python3
"""
Monitor Azure AI Search Indexer status and statistics
"""

import os
import sys
import time
from datetime import datetime
from azure.search.documents.indexes import SearchIndexerClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()

def monitor_indexer():
    """Monitor indexer execution"""
    
    endpoint = os.getenv('AZURE_SEARCH_ENDPOINT')
    key = os.getenv('AZURE_SEARCH_KEY')
    indexer_name = sys.argv[1] if len(sys.argv) > 1 else 'blob-indexer'
    
    client = SearchIndexerClient(endpoint, AzureKeyCredential(key))
    
    print(f"📊 Monitoreando indexer: {indexer_name}\n")
    
    try:
        indexer = client.get_indexer(indexer_name)
        status = client.get_indexer_status(indexer_name)
        print(f"Estado del indexer: {status.status}")
        print(f"Data source: {indexer.data_source_name}")
        
        print(f"\n📈 Estadísticas:")
        print(f"   Documentos procesados: {status.execution_history[0].item_count if status.execution_history else 'N/A'}")
        print(f"   Errores: {status.execution_history[0].failed_item_count if status.execution_history else 0}")
        if status.execution_history and status.execution_history[0].start_time and status.execution_history[0].end_time:
            duration_ms = int((status.execution_history[0].end_time - status.execution_history[0].start_time).total_seconds() * 1000)
            print(f"   Duración: {duration_ms} ms")
        else:
            print("   Duración: N/A")
        
        if status.execution_history:
            print(f"\n📋 Últimas 5 ejecuciones:")
            for i, execution in enumerate(status.execution_history[:5], 1):
                total = execution.item_count if execution.item_count is not None else 0
                failed = execution.failed_item_count if execution.failed_item_count is not None else 0
                print(f"   {i}. {execution.start_time} - Items: {total}/{total + failed}")
        
        schedule = indexer.schedule
        if schedule and schedule.interval:
            interval_str = str(schedule.interval)
            if interval_str in ("PT1H", "1:00:00", "0:01:00:00"):
                schedule_str = "Cada hora (PT1H)"
            elif interval_str in ("PT2H", "2:00:00", "0:02:00:00"):
                schedule_str = "Cada 2 horas (PT2H)"
            elif interval_str in ("PT30M", "0:30:00", "0:00:30:00"):
                schedule_str = "Cada 30 minutos"
            else:
                schedule_str = interval_str
        else:
            schedule_str = "Sin programar (manual)"
        print(f"\n✨ Próxima ejecución programada: {schedule_str}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

def run_indexer():
    """Trigger indexer manually"""
    
    endpoint = os.getenv('AZURE_SEARCH_ENDPOINT')
    key = os.getenv('AZURE_SEARCH_KEY')
    indexer_name = 'blob-indexer'
    
    client = SearchIndexerClient(endpoint, AzureKeyCredential(key))
    
    print(f"🚀 Ejecutando indexer: {indexer_name}")
    
    try:
        client.run_indexer(indexer_name)
        print(f"✅ Indexer iniciado")
        print(f"⏳ Esperando resultados...")
        
        # Wait y monitor
        for i in range(12):  # 2 minutos
            time.sleep(10)
            status = client.get_indexer_status(indexer_name)
            if status.execution_history:
                last_exec = status.execution_history[0]
                count = last_exec.item_count if last_exec.item_count is not None else 0
                print(f"   [{datetime.now().strftime('%H:%M:%S')}] Items: {count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'run':
        run_indexer()
    else:
        monitor_indexer()
