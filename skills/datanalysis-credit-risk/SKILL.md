---
name: datanalysis-credit-risk
description: Credit risk data cleaning and variable screening pipeline for pre-loan modeling. Use when working with raw credit data that needs quality assessment,  missing value analysis, or variable selection before modeling. it covers data loading and formatting, abnormal period filtering, missing rate calculation, high-missing variable removal,low-IV variable filtering, high-PSI variable removal, Null Importance denoising, high-correlation variable removal, and cleaning report generation. Applicable scenarios arecredit risk data cleaning, variable screening, pre-loan modeling preprocessing.
---

# Data Cleaning and Variable Screening

## Quick Start

```bash
# Run the complete data cleaning pipeline
python ".github/skills/datanalysis-credit-risk/scripts/example.py"
```

## Complete Process Description

The data cleaning pipeline consists of the following 11 steps, each executed independently without deleting the original data:

1. **Get Data** - Load and format raw data
2. **Organization Sample Analysis** - Statistics of sample count and bad sample rate for each organization
3. **Separate OOS Data** - Separate out-of-sample (OOS) samples from modeling samples
4. **Filter Abnormal Months** - Remove months with insufficient bad sample count or total sample count
5. **Calculate Missing Rate** - Calculate overall and organization-level missing rates for each feature
6. **Drop High Missing Rate Features** - Remove features with overall missing rate exceeding threshold
7. **Drop Low IV Features** - Remove features with overall IV too low or IV too low in too many organizations
8. **Drop High PSI Features** - Remove features with unstable PSI
9. **Null Importance Denoising** - Remove noise features using label permutation method
10. **Drop High Correlation Features** - Remove high correlation features based on original gain
11. **Export Report** - Generate Excel report containing details and statistics of all steps

## Core Functions

| Function | Purpose | Module |
|------|------|----------|
| `get_dataset()` | Load and format data | references.func |
| `org_analysis()` | Organization sample analysis | references.func |
| `missing_check()` | Calculate missing rate | references.func |
| `drop_abnormal_ym()` | Filter abnormal months | references.analysis |
| `drop_highmiss_features()` | Drop high missing rate features | references.analysis |
| `drop_lowiv_features()` | Drop low IV features | references.analysis |
| `drop_highpsi_features()` | Drop high PSI features | references.analysis |
| `drop_highnoise_features()` | Null Importance denoising | references.analysis |
| `drop_highcorr_features()` | Drop high correlation features | references.analysis |
| `iv_distribution_by_org()` | IV distribution statistics | references.analysis |
| `psi_distribution_by_org()` | PSI distribution statistics | references.analysis |
| `value_ratio_distribution_by_org()` | Value ratio distribution statistics | references.analysis |
| `export_cleaning_report()` | Export cleaning report | references.analysis |

## Parameter Description

### Data Loading Parameters
- `DATA_PATH`: Data file path (best are parquet format)
- `DATE_COL`: Date column name
- `Y_COL`: Label column name
- `ORG_COL`: Organization column name
- `KEY_COLS`: Primary key column name list

### OOS Organization Configuration
- `OOS_ORGS`: Out-of-sample organization list

### Abnormal Month Filtering Parameters
- `min_ym_bad_sample`: Minimum bad sample count per month (default 10)
- `min_ym_sample`: Minimum total sample count per month (default 500)

### Missing Rate Parameters
- `missing_ratio`: Overall missing rate threshold (default 0.6)

### IV Parameters
- `overall_iv_threshold`: Overall IV threshold (default 0.1)
- `org_iv_threshold`: Single organization IV threshold (default 0.1)
- `max_org_threshold`: Maximum tolerated low IV organization count (default 2)

### PSI Parameters
- `psi_threshold`: PSI threshold (default 0.1)
- `max_months_ratio`: Maximum unstable month ratio (default 1/3)
- `max_orgs`: Maximum unstable organization count (default 6)

### Null Importance Parameters
- `n_estimators`: Number of trees (default 100)
- `max_depth`: Maximum tree depth (default 5)
- `gain_threshold`: Gain difference threshold (default 50)

### High Correlation Parameters
- `max_corr`: Correlation threshold (default 0.9)
- `top_n_keep`: Keep top N features by original gain ranking (default 20)

## Output Report

The generated Excel report contains the following sheets:

1. **汇总** - Summary information of all steps, including operation results and conditions
2. **机构样本统计** - Sample count and bad sample rate for each organization
3. **分离OOS数据** - OOS sample and modeling sample counts
4. **Step4-异常月份处理** - Abnormal months that were removed
5. **缺失率明细** - Overall and organization-level missing rates for each feature
6. **Step5-有值率分布统计** - Distribution of features in different value ratio ranges
7. **Step6-高缺失率处理** - High missing rate features that were removed
8. **Step7-IV明细** - IV values of each feature in each organization and overall
9. **Step7-IV处理** - Features that do not meet IV conditions and low IV organizations
10. **Step7-IV分布统计** - Distribution of features in different IV ranges
11. **Step8-PSI明细** - PSI values of each feature in each organization each month
12. **Step8-PSI处理** - Features that do not meet PSI conditions and unstable organizations
13. **Step8-PSI分布统计** - Distribution of features in different PSI ranges
14. **Step9-null importance处理** - Noise features that were removed
15. **Step10-高相关性剔除** - High correlation features that were removed

## Features

- **Interactive Input**: Parameters can be input before each step execution, with default values supported
- **Independent Execution**: Each step is executed independently without deleting original data, facilitating comparative analysis
- **Complete Report**: Generate complete Excel report containing details, statistics, and distributions
- **Multi-process Support**: IV and PSI calculations support multi-process acceleration
- **Organization-level Analysis**: Support organization-level statistics and modeling/OOS distinction
