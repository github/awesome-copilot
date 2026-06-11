#!/usr/bin/env python3
"""
Execution script
Version: 1.0.0
Last modified: 02-03-2026
"""
import os, sys
import time
import pandas as pd
from typing import Dict, List, Optional, Any, Callable
import numpy as np
import multiprocessing

# =============================================================================
# System Configuration
# =============================================================================
CPU_COUNT = multiprocessing.cpu_count()
N_JOBS = max(1, CPU_COUNT - 1)  # Multi-process parallel count, keep 1 core for system

def _ensure_references_on_path():
    script_dir = os.path.dirname(__file__)
    cur = script_dir
    for _ in range(8):
        candidate = os.path.join(cur, 'references')
        if os.path.isdir(candidate):
            # add parent folder (which contains `references`) to sys.path
            sys.path.insert(0, cur)
            return
        parent = os.path.dirname(cur)
        if parent == cur:
            break
        cur = parent
    # fallback: add a reasonable repo-root guess
    sys.path.insert(0, os.path.abspath(os.path.join(script_dir, '..', '..', '..')))


_ensure_references_on_path()

from references.func import get_dataset, missing_check, org_analysis
from references.analysis import (drop_abnormal_ym, drop_highmiss_features,
                               drop_lowiv_features, drop_highcorr_features,
                               drop_highpsi_features,
                               drop_highnoise_features,
                               export_cleaning_report,
                               iv_distribution_by_org,
                               psi_distribution_by_org,
                               value_ratio_distribution_by_org)

# ==================== Path Configuration (Interactive Input) ====================
# Use 50-column test data as default, support interactive modification in command line
default_data_path = ''
default_output_dir = ''

def _get_path_input(prompt, default):
    try:
        user_val = input(f"{prompt} (default: {default}): ").strip()
    except Exception:
        user_val = ''
    return user_val if user_val else default

DATA_PATH = _get_path_input('Please enter data file path DATA_PATH', default_data_path)
OUTPUT_DIR = _get_path_input('Please enter output directory OUTPUT_DIR', default_output_dir)
REPORT_PATH = os.path.join(OUTPUT_DIR, '数据清洗报告.xlsx')

# Data column name configuration (adjust according to actual data)
DATE_COL = _get_path_input('Please enter date column name in data', 'apply_date')
Y_COL = _get_path_input('Please enter label column name in data', 'target')
ORG_COL = _get_path_input('Please enter organization column name in data', 'org_info')

# Support multiple primary key column names input (comma or space separated)
def _get_list_input(prompt, default):
    try:
        user_val = input(f"{prompt} (default: {default}): ").strip()
    except Exception:
        user_val = ''
    if not user_val:
        user_val = default
    # Support comma or space separation
    parts = [p.strip() for p in user_val.replace(',', ' ').split() if p.strip()]
    return parts

KEY_COLS = _get_list_input('Please enter primary key column names in data (multiple columns separated by comma or space)', 'record_id')

# ==================== Multi-process Configuration Information ====================
print("=" * 60)
print("Multi-process Configuration")
print("=" * 60)
print(f"   Local CPU cores: {CPU_COUNT}")
print(f"   Current process count: {N_JOBS}")
print("=" * 60)

# ==================== OOS Organization Configuration (Interactive Input) ====================
# Default out-of-sample organization list, users can input custom list in comma-separated format during interaction
default_oos = [
   'orgA', 'orgB', 'orgC', 'orgD', 'orgE',
]

try:
    oos_input = input('Please enter out-of-sample organization list, comma separated (press Enter to use default list):').strip()
except Exception:
    oos_input = ''
if oos_input:
    OOS_ORGS = [s.strip() for s in oos_input.split(',') if s.strip()]
else:
    OOS_ORGS = default_oos

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ==================== Interactive Hyperparameter Input ====================
def get_user_input(prompt, default, dtype=float):
    """Get user input, support default value and type conversion"""
    while True:
        try:
            user_input = input(f"{prompt} (default: {default}): ").strip()
            if not user_input:
                return default
            return dtype(user_input)
        except ValueError:
            print(f"   Invalid input, please enter {dtype.__name__} type")

# Record cleaning steps
steps = []

# Store parameters for each step
params = {}

# Timer decorator
def timer(step_name):
    """Timer decorator"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            print(f"\nStarting {step_name}...")
            start_time = time.time()
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            print(f"   {step_name} elapsed: {elapsed:.2f} seconds")
            return result
        return wrapper
    return decorator

# ==================== Step 1: Get Data ====================
print("\n" + "=" * 60)
print("Step 1: Get Data")
print("=" * 60)
step_start = time.time()
# Use configuration from global_parameters
data = get_dataset(
    data_pth=DATA_PATH,
    date_colName=DATE_COL,
    y_colName=Y_COL,
    org_colName=ORG_COL,
    data_encode='utf-8',
    key_colNames=KEY_COLS,
    drop_colNames=[],
    miss_vals=[-1, -999, -1111]
)
print(f"   Original data: {data.shape}")
print(f"   Abnormal values replaced with NaN: [-1, -999, -1111]")
print(f"   Step 1 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Step 2: Organization Sample Analysis ====================
print("\n" + "=" * 60)
print("Step 2: Organization Sample Analysis")
print("=" * 60)
step_start = time.time()
org_stat = org_analysis(data, oos_orgs=OOS_ORGS)
steps.append(('机构样本统计', org_stat))
print(f"   Organization count: {data['new_org'].nunique()}, Month count: {data['new_date_ym'].nunique()}")
print(f"   Out-of-sample organizations: {len(OOS_ORGS)}")
print(f"   Step 2 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Step 3: Separate OOS Data ====================
print("\n" + "=" * 60)
print("Step 3: Separate OOS Data")
print("=" * 60)
step_start = time.time()
oos_data = data[data['new_org'].isin(OOS_ORGS)]
data = data[~data['new_org'].isin(OOS_ORGS)]
print(f"   OOS samples: {oos_data.shape[0]} rows")
print(f"   Modeling samples: {data.shape[0]} rows")
print(f"   OOS organizations: {OOS_ORGS}")
print(f"   Step 3 elapsed: {time.time() - step_start:.2f} seconds")
# Create separation information DataFrame
oos_info = pd.DataFrame({'变量': ['OOS样本', '建模样本'], '数量': [oos_data.shape[0], data.shape[0]]})
steps.append(('分离OOS数据', oos_info))

# ==================== Step 4: Filter Abnormal Months (Modeling Data Only) ====================
print("\n" + "=" * 60)
print("Step 4: Filter Abnormal Months (Modeling Data Only)")
print("=" * 60)
print("   Press Enter to use default values")
print("=" * 60)
params['min_ym_bad_sample'] = int(get_user_input("Bad sample count threshold", 10, int))
params['min_ym_sample'] = int(get_user_input("Total sample count threshold", 500, int))
step_start = time.time()
data_filtered, abnormal_ym = drop_abnormal_ym(data.copy(), min_ym_bad_sample=params['min_ym_bad_sample'], min_ym_sample=params['min_ym_sample'])
steps.append(('Step4-异常月份处理', abnormal_ym))
print(f"   After filtering: {data_filtered.shape}")
print(f"   Parameters: min_ym_bad_sample={params['min_ym_bad_sample']}, min_ym_sample={params['min_ym_sample']}")
if len(abnormal_ym) > 0:
    print(f"   Dropped months: {abnormal_ym['年月'].tolist()}")
    print(f"   Removal conditions: {abnormal_ym['去除条件'].tolist()}")
print(f"   Step 4 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Step 5: Calculate Missing Rate ====================
print("\n" + "=" * 60)
print("Step 5: Calculate Missing Rate")
print("=" * 60)
step_start = time.time()
orgs = data['new_org'].unique().tolist()
channel = {'整体': orgs}
miss_detail, miss_channel = missing_check(data, channel=channel)
# miss_detail: Missing rate details (format: feature, overall, org1, org2, ..., orgn)
# miss_channel: Overall missing rate
steps.append(('缺失率明细', miss_detail))
print(f"   Feature count: {len(miss_detail['变量'].unique())}")
print(f"   Organization count: {len(miss_detail.columns) - 2}")  # Subtract '变量' and '整体' columns
print(f"   Step 5 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Step 6: Drop High Missing Rate Features ====================
print("\n" + "=" * 60)
print("Step 6: Drop High Missing Rate Features")
print("=" * 60)
print("   Press Enter to use default values")
print("=" * 60)
params['missing_ratio'] = get_user_input("Missing rate threshold", 0.6)
step_start = time.time()
data_miss, dropped_miss = drop_highmiss_features(data.copy(), miss_channel, threshold=params['missing_ratio'])
steps.append(('Step6-高缺失率处理', dropped_miss))
print(f"   Dropped: {len(dropped_miss)}")
print(f"   Threshold: {params['missing_ratio']}")
if len(dropped_miss) > 0:
    print(f"   Dropped features: {dropped_miss['变量'].tolist()[:5]}...")
    print(f"   Removal conditions: {dropped_miss['去除条件'].tolist()[:5]}...")
print(f"   Step 6 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Step 7: Drop Low IV Features ====================
print("\n" + "=" * 60)
print("Step 7: Drop Low IV Features")
print("=" * 60)
print("   Press Enter to use default values")
print("=" * 60)
params['overall_iv_threshold'] = get_user_input("Overall IV threshold", 0.1)
params['org_iv_threshold'] = get_user_input("Single organization IV threshold", 0.1)
params['max_org_threshold'] = int(get_user_input("Maximum tolerated low IV organization count", 2, int))
step_start = time.time()
# Get feature list (use all features)
features = [c for c in data.columns if c.startswith('i_')]
data_iv, iv_detail, iv_process = drop_lowiv_features(
    data.copy(), features,
    overall_iv_threshold=params['overall_iv_threshold'],
    org_iv_threshold=params['org_iv_threshold'],
    max_org_threshold=params['max_org_threshold'],
    n_jobs=N_JOBS
)
# iv_detail: IV details (IV value of each feature in each organization and overall)
# iv_process: IV processing table (features that do not meet the conditions)
steps.append(('Step7-IV处理', iv_process))
print(f"   Dropped: {len(iv_process)}")
print(f"   Parameters: overall_iv_threshold={params['overall_iv_threshold']}, org_iv_threshold={params['org_iv_threshold']}, max_org_threshold={params['max_org_threshold']}")
if len(iv_process) > 0:
    print(f"   Dropped features: {iv_process['变量'].tolist()[:5]}...")
    print(f"   Processing reasons: {iv_process['处理原因'].tolist()[:5]}...")
print(f"   Step 7 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Step 8: Drop High PSI Features ====================
print("\n" + "=" * 60)
print("Step 8: Drop High PSI Features (By Organization + Month-by-Month)")
print("=" * 60)
print("   Press Enter to use default values")
print("=" * 60)
params['psi_threshold'] = get_user_input("PSI threshold", 0.1)
params['max_months_ratio'] = get_user_input("Maximum unstable month ratio", 1/3)
params['max_orgs'] = int(get_user_input("Maximum unstable organization count", 6, int))
step_start = time.time()
# Get features before PSI calculation (use all features)
features_for_psi = [c for c in data.columns if c.startswith('i_')]
data_psi, psi_detail, psi_process = drop_highpsi_features(
    data.copy(), features_for_psi,
    psi_threshold=params['psi_threshold'],
    max_months_ratio=params['max_months_ratio'],
    max_orgs=params['max_orgs'],
    min_sample_per_month=100,
    n_jobs=N_JOBS
)
# psi_detail: PSI details (PSI value of each feature in each organization each month)
# psi_process: PSI processing table (features that do not meet the conditions)
steps.append(('Step8-PSI处理', psi_process))
print(f"   Dropped: {len(psi_process)}")
print(f"   Parameters: psi_threshold={params['psi_threshold']}, max_months_ratio={params['max_months_ratio']:.2f}, max_orgs={params['max_orgs']}")
if len(psi_process) > 0:
    print(f"   Dropped features: {psi_process['变量'].tolist()[:5]}...")
    print(f"   Processing reasons: {psi_process['处理原因'].tolist()[:5]}...")
print(f"   PSI details: {len(psi_detail)} records")
print(f"   Step 8 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Step 9: Null Importance Denoising ====================
print("\n" + "=" * 60)
print("Step 9: Null Importance Remove High Noise Features")
print("=" * 60)
print("   Press Enter to use default values")
print("=" * 60)
params['n_estimators'] = int(get_user_input("Number of trees", 100, int))
params['max_depth'] = int(get_user_input("Maximum tree depth", 5, int))
params['gain_threshold'] = get_user_input("Gain difference threshold", 50)
step_start = time.time()
# Get feature list (use all features)
features = [c for c in data.columns if c.startswith('i_')]
data_noise, dropped_noise = drop_highnoise_features(data.copy(), features, n_estimators=params['n_estimators'], max_depth=params['max_depth'], gain_threshold=params['gain_threshold'])
steps.append(('Step9-null importance处理', dropped_noise))
print(f"   Dropped: {len(dropped_noise)}")
print(f"   Parameters: n_estimators={params['n_estimators']}, max_depth={params['max_depth']}, gain_threshold={params['gain_threshold']}")
if len(dropped_noise) > 0:
    print(f"   Dropped features: {dropped_noise['变量'].tolist()}")
print(f"   Step 9 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Step 10: Drop High Correlation Features (Based on Null Importance Original Gain) ====================
print("\n" + "=" * 60)
print("Step 10: Drop High Correlation Features (Based on Null Importance Original Gain)")
print("=" * 60)
print("   Press Enter to use default values")
print("=" * 60)
params['max_corr'] = get_user_input("Correlation threshold", 0.9)
params['top_n_keep'] = int(get_user_input("Keep top N features by original gain ranking", 20, int))
step_start = time.time()
# Get feature list (use all features)
features = [c for c in data.columns if c.startswith('i_')]
# Get original gain from null importance results
if len(dropped_noise) > 0 and '原始gain' in dropped_noise.columns:
    gain_dict = dict(zip(dropped_noise['变量'], dropped_noise['原始gain']))
else:
    gain_dict = {}
data_corr, dropped_corr = drop_highcorr_features(data.copy(), features, threshold=params['max_corr'], gain_dict=gain_dict, top_n_keep=params['top_n_keep'])
steps.append(('Step10-高相关性剔除', dropped_corr))
print(f"   Dropped: {len(dropped_corr)}")
print(f"   Threshold: {params['max_corr']}")
if len(dropped_corr) > 0:
    print(f"   Dropped features: {dropped_corr['变量'].tolist()}")
    print(f"   Removal conditions: {dropped_corr['去除条件'].tolist()[:5]}...")
print(f"   Step 10 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Step 11: Export Report ====================
print("\n" + "=" * 60)
print("Step 11: Export Report")
print("=" * 60)
step_start = time.time()

# Calculate IV distribution statistics
print("   Calculating IV distribution statistics...")
iv_distribution = iv_distribution_by_org(iv_detail, oos_orgs=OOS_ORGS)
print(f"   IV distribution statistics: {len(iv_distribution)} records")

# Calculate PSI distribution statistics
print("   Calculating PSI distribution statistics...")
psi_distribution = psi_distribution_by_org(psi_detail, oos_orgs=OOS_ORGS)
print(f"   PSI distribution statistics: {len(psi_distribution)} records")

# Calculate value ratio distribution statistics (use all features)
print("   Calculating value ratio distribution statistics...")
features_for_value_ratio = [c for c in data.columns if c.startswith('i_')]
value_ratio_distribution = value_ratio_distribution_by_org(data, features_for_value_ratio, oos_orgs=OOS_ORGS)
print(f"   Value ratio distribution statistics: {len(value_ratio_distribution)} records")

# Add details and distribution statistics to steps list
steps.append(('Step7-IV明细', iv_detail))
steps.append(('Step7-IV分布统计', iv_distribution))
steps.append(('Step8-PSI明细', psi_detail))
steps.append(('Step8-PSI分布统计', psi_distribution))
steps.append(('Step5-有值率分布统计', value_ratio_distribution))

export_cleaning_report(REPORT_PATH, steps,
                      iv_detail=iv_detail,
                      iv_process=iv_process,
                      psi_detail=psi_detail,
                      psi_process=psi_process,
                      params=params,
                      iv_distribution=iv_distribution,
                      psi_distribution=psi_distribution,
                      value_ratio_distribution=value_ratio_distribution)
print(f"   Report: {REPORT_PATH}")
print(f"   Step 11 elapsed: {time.time() - step_start:.2f} seconds")

# ==================== Summary ====================
print("\n" + "=" * 60)
print("Data Cleaning Completed!")
print("=" * 60)
print(f"   Original data: {data.shape[0]} rows")
print(f"   Original features: {len([c for c in data.columns if c.startswith('i_')])}")
print(f"   Cleaning steps (each step executed independently, data not deleted):")
for name, df in steps:
    print(f"     - {name}: Dropped {df.shape[0] if hasattr(df, 'shape') else len(df)}")
