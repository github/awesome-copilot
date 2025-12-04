# Dataverse SDK for Python - Pandas Integration Guide

## Overview
Guide to integrating the Dataverse SDK for Python with pandas DataFrames for data science and analysis workflows. The SDK's JSON response format maps seamlessly to pandas DataFrames, enabling data scientists to work with Dataverse data using familiar data manipulation tools.

---

## 1. Introduction to PandasODataClient

### What is PandasODataClient?
`PandasODataClient` is a thin wrapper around the standard `DataverseClient` that returns data in pandas DataFrame format instead of raw JSON dictionaries. This makes it ideal for:
- Data scientists working with tabular data
- Analytics and reporting workflows
- Data exploration and cleaning
- Integration with machine learning pipelines

### Installation Requirements
```bash
# Install core dependencies
pip install PowerPlatform-Dataverse-Client
pip install azure-identity

# Install pandas for data manipulation
pip install pandas
```

### When to Use PandasODataClient
✅ **Use when you need:**
- Data exploration and analysis
- Working with tabular data
- Integration with statistical/ML libraries
- Efficient data manipulation

❌ **Use DataverseClient instead when you need:**
- Real-time CRUD operations only
- File upload operations
- Metadata operations
- Single record operations

---

## 2. Basic DataFrame Workflow

### Converting Query Results to DataFrame
```python
from azure.identity import InteractiveBrowserCredential
from PowerPlatform.Dataverse.client import DataverseClient
import pandas as pd

# Setup authentication
base_url = "https://<myorg>.crm.dynamics.com"
credential = InteractiveBrowserCredential()
client = DataverseClient(base_url=base_url, credential=credential)

# Query data
pages = client.get(
    "account",
    select=["accountid", "name", "creditlimit", "telephone1"],
    filter="statecode eq 0",
    orderby=["name"]
)

# Collect all pages into one DataFrame
all_records = []
for page in pages:
    all_records.extend(page)

# Convert to DataFrame
df = pd.DataFrame(all_records)

# Display first few rows
print(df.head())
print(f"Total records: {len(df)}")
```

### Query Parameters Map to DataFrame
```python
# All query parameters return as columns in DataFrame
df = pd.DataFrame(
    client.get(
        "account",
        select=["accountid", "name", "creditlimit", "telephone1", "createdon"],
        filter="creditlimit > 50000",
        orderby=["creditlimit desc"]
    )
)

# Result is a DataFrame with columns:
# accountid | name | creditlimit | telephone1 | createdon
```

---

## 3. Data Exploration with Pandas

### Basic Exploration
```python
import pandas as pd
from azure.identity import InteractiveBrowserCredential
from PowerPlatform.Dataverse.client import DataverseClient

client = DataverseClient("https://<myorg>.crm.dynamics.com", InteractiveBrowserCredential())

# Load account data
records = []
for page in client.get("account", select=["accountid", "name", "creditlimit", "industrycode"]):
    records.extend(page)

df = pd.DataFrame(records)

# Explore the data
print(df.shape)           # (1000, 4)
print(df.dtypes)          # Data types
print(df.describe())      # Statistical summary
print(df.info())          # Column info and null counts
print(df.head(10))        # First 10 rows
```

### Filtering and Selecting
```python
# Filter rows by condition
high_value = df[df['creditlimit'] > 100000]

# Select specific columns
names_limits = df[['name', 'creditlimit']]

# Multiple conditions
filtered = df[(df['creditlimit'] > 50000) & (df['industrycode'] == 1)]

# Value counts
print(df['industrycode'].value_counts())
```

### Sorting and Grouping
```python
# Sort by column
sorted_df = df.sort_values('creditlimit', ascending=False)

# Group by and aggregate
by_industry = df.groupby('industrycode').agg({
    'creditlimit': ['mean', 'sum', 'count'],
    'name': 'count'
})

# Group statistics
print(df.groupby('industrycode')['creditlimit'].describe())
```

### Data Cleaning
```python
# Handle missing values
df_clean = df.dropna()                    # Remove rows with NaN
df_filled = df.fillna(0)                  # Fill NaN with 0
df_ffill = df.fillna(method='ffill')      # Forward fill

# Check for duplicates
duplicates = df[df.duplicated(['name'])]
df_unique = df.drop_duplicates()

# Data type conversion
df['creditlimit'] = pd.to_numeric(df['creditlimit'])
df['createdon'] = pd.to_datetime(df['createdon'])
```

---

## 4. Data Analysis Patterns

### Aggregation and Summarization
```python
# Create summary report
summary = df.groupby('industrycode').agg({
    'accountid': 'count',
    'creditlimit': ['mean', 'min', 'max', 'sum'],
    'name': lambda x: ', '.join(x.head(3))  # Sample names
}).round(2)

print(summary)
```

### Time-Series Analysis
```python
# Convert to datetime
df['createdon'] = pd.to_datetime(df['createdon'])

# Resample to monthly
monthly = df.set_index('createdon').resample('M').size()

# Extract date components
df['year'] = df['createdon'].dt.year
df['month'] = df['createdon'].dt.month
df['day_of_week'] = df['createdon'].dt.day_name()
```

### Join and Merge Operations
```python
# Load two related tables
accounts = pd.DataFrame(client.get("account", select=["accountid", "name"]))
contacts = pd.DataFrame(client.get("contact", select=["contactid", "parentcustomerid", "fullname"]))

# Merge on relationship
merged = accounts.merge(
    contacts,
    left_on='accountid',
    right_on='parentcustomerid',
    how='left'
)

print(merged.head())
```

### Statistical Analysis
```python
# Correlation matrix
correlation = df[['creditlimit', 'industrycode']].corr()

# Distribution analysis
print(df['creditlimit'].describe())
print(df['creditlimit'].skew())
print(df['creditlimit'].kurtosis())

# Percentiles
print(df['creditlimit'].quantile([0.25, 0.5, 0.75]))
```

---

## 5. Pivot Tables and Reports

### Creating Pivot Tables
```python
# Pivot table by industry and status
pivot = pd.pivot_table(
    df,
    values='creditlimit',
    index='industrycode',
    columns='statecode',
    aggfunc=['sum', 'mean', 'count']
)

print(pivot)
```

### Generating Reports
```python
# Sales report by industry
industry_report = df.groupby('industrycode').agg({
    'accountid': 'count',
    'creditlimit': 'sum',
    'name': 'first'
}).rename(columns={
    'accountid': 'Account Count',
    'creditlimit': 'Total Credit Limit',
    'name': 'Sample Account'
})

# Export to CSV
industry_report.to_csv('industry_report.csv')

# Export to Excel
industry_report.to_excel('industry_report.xlsx')
```

---

## 6. Data Visualization

### Matplotlib Integration
```python
import matplotlib.pyplot as plt

# Create visualizations
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

# Histogram
df['creditlimit'].hist(bins=30, ax=axes[0, 0])
axes[0, 0].set_title('Credit Limit Distribution')

# Bar chart
df['industrycode'].value_counts().plot(kind='bar', ax=axes[0, 1])
axes[0, 1].set_title('Accounts by Industry')

# Box plot
df.boxplot(column='creditlimit', by='industrycode', ax=axes[1, 0])
axes[1, 0].set_title('Credit Limit by Industry')

# Scatter plot
df.plot.scatter(x='creditlimit', y='industrycode', ax=axes[1, 1])
axes[1, 1].set_title('Credit Limit vs Industry')

plt.tight_layout()
plt.show()
```

### Seaborn Integration
```python
import seaborn as sns

# Correlation heatmap
plt.figure(figsize=(8, 6))
sns.heatmap(df[['creditlimit', 'industrycode']].corr(), annot=True)
plt.title('Correlation Matrix')
plt.show()

# Distribution plot
sns.distplot(df['creditlimit'], kde=True)
plt.title('Credit Limit Distribution')
plt.show()
```

---

## 7. Machine Learning Integration

### Preparing Data for ML
```python
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

# Load and prepare data
records = []
for page in client.get("account", select=["accountid", "creditlimit", "industrycode", "statecode"]):
    records.extend(page)

df = pd.DataFrame(records)

# Feature engineering
df['log_creditlimit'] = np.log1p(df['creditlimit'])
df['industry_cat'] = pd.Categorical(df['industrycode']).codes

# Split features and target
X = df[['industrycode', 'log_creditlimit']]
y = df['statecode']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

print(f"Training set: {len(X_train)}, Test set: {len(X_test)}")
```

### Building a Classification Model
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# Train model
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# Feature importance
importances = pd.Series(
    model.feature_importances_,
    index=X.columns
).sort_values(ascending=False)

print(importances)
```

---

## 8. Advanced DataFrame Operations

### Custom Functions
```python
# Apply function to columns
df['name_length'] = df['name'].apply(len)

# Apply function to rows
df['category'] = df.apply(
    lambda row: 'High' if row['creditlimit'] > 100000 else 'Low',
    axis=1
)

# Conditional operations
df['adjusted_limit'] = df['creditlimit'].where(
    df['statecode'] == 0,
    df['creditlimit'] * 0.5
)
```

### String Operations
```python
# String methods
df['name_upper'] = df['name'].str.upper()
df['name_starts'] = df['name'].str.startswith('A')
df['name_contains'] = df['name'].str.contains('Inc')
df['name_split'] = df['name'].str.split(',').str[0]

# Replace and substitute
df['industry'] = df['industrycode'].map({
    1: 'Retail',
    2: 'Manufacturing',
    3: 'Technology'
})
```

### Reshaping Data
```python
# Transpose
transposed = df.set_index('name').T

# Stack/Unstack
stacked = df.set_index(['name', 'industrycode'])['creditlimit'].unstack()

# Melt long format
melted = pd.melt(df, id_vars=['name'], var_name='metric', value_name='value')
```

---

## 9. Performance Optimization

### Efficient Data Loading
```python
# Load large datasets in chunks
all_records = []
chunk_size = 1000

for page in client.get(
    "account",
    select=["accountid", "name", "creditlimit"],
    top=10000,        # Limit total records
    page_size=chunk_size
):
    all_records.extend(page)
    if len(all_records) % 5000 == 0:
        print(f"Loaded {len(all_records)} records")

df = pd.DataFrame(all_records)
print(f"Total: {len(df)} records")
```

### Memory Optimization
```python
# Reduce memory usage
# Use categorical for repeated values
df['industrycode'] = df['industrycode'].astype('category')

# Use appropriate numeric types
df['creditlimit'] = pd.to_numeric(df['creditlimit'], downcast='float')

# Delete columns no longer needed
df = df.drop(columns=['unused_col1', 'unused_col2'])

# Check memory usage
print(df.memory_usage(deep=True).sum() / 1024**2, "MB")
```

### Query Optimization
```python
# Apply filters on server, not client
# ✅ GOOD: Filter on server
accounts = client.get(
    "account",
    filter="creditlimit > 50000",  # Server-side filter
    select=["accountid", "name", "creditlimit"]
)

# ❌ BAD: Load all, filter locally
all_accounts = client.get("account")  # Loads everything
filtered = [a for a in all_accounts if a['creditlimit'] > 50000]  # Client-side
```

---

## 10. Complete Example: Sales Analytics

```python
import pandas as pd
import numpy as np
from azure.identity import InteractiveBrowserCredential
from PowerPlatform.Dataverse.client import DataverseClient

# Setup
client = DataverseClient(
    "https://<myorg>.crm.dynamics.com",
    InteractiveBrowserCredential()
)

# Load data
print("Loading account data...")
records = []
for page in client.get(
    "account",
    select=["accountid", "name", "creditlimit", "industrycode", "statecode", "createdon"],
    orderby=["createdon"]
):
    records.extend(page)

df = pd.DataFrame(records)
df['createdon'] = pd.to_datetime(df['createdon'])

# Data cleaning
df = df.dropna()

# Feature engineering
df['year'] = df['createdon'].dt.year
df['month'] = df['createdon'].dt.month
df['year_month'] = df['createdon'].dt.to_period('M')

# Analysis
print("\n=== ACCOUNT OVERVIEW ===")
print(f"Total accounts: {len(df)}")
print(f"Total credit limit: ${df['creditlimit'].sum():,.2f}")
print(f"Average credit limit: ${df['creditlimit'].mean():,.2f}")

print("\n=== BY INDUSTRY ===")
industry_summary = df.groupby('industrycode').agg({
    'accountid': 'count',
    'creditlimit': ['sum', 'mean']
}).round(2)
print(industry_summary)

print("\n=== BY STATUS ===")
status_summary = df.groupby('statecode').agg({
    'accountid': 'count',
    'creditlimit': 'sum'
})
print(status_summary)

# Export report
print("\n=== EXPORTING REPORT ===")
industry_summary.to_csv('industry_analysis.csv')
print("Report saved to industry_analysis.csv")
```

---

## 11. Known Limitations

- `PandasODataClient` currently requires manual DataFrame creation from query results
- Very large DataFrames (millions of rows) may experience memory constraints
- Pandas operations are client-side; server-side aggregation is more efficient for large datasets
- File operations require standard `DataverseClient`, not pandas wrapper

---

## 12. Related Resources

- [Pandas Documentation](https://pandas.pydata.org/docs/)
- [Official Example: quickstart_pandas.py](https://github.com/microsoft/PowerPlatform-DataverseClient-Python/blob/main/examples/quickstart_pandas.py)
- [SDK for Python README](https://github.com/microsoft/PowerPlatform-DataverseClient-Python/blob/main/README.md)
- [Microsoft Learn: Working with data](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/sdk-python/work-data)
