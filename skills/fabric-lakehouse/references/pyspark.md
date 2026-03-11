### Spark Configuration (Best Practices)

```python
# Enable Fabric optimizations
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")
spark.conf.set("spark.microsoft.delta.optimizeWrite.enabled", "true")
```

### Reading Data

```python
# Read CSV file
df = spark.read.format("csv") \
    .option("header", "true") \
    .option("inferSchema", "true") \
    .load("Files/bronze/data.csv")

# Read JSON file
df = spark.read.format("json").load("Files/bronze/data.json")

# Read Parquet file
df = spark.read.format("parquet").load("Files/bronze/data.parquet")

# Read Delta table
df = spark.read.table("my_delta_table")

# Read from SQL endpoint
df = spark.sql("SELECT * FROM lakehouse.my_table")
```

### Writing Delta Tables

```python
# Write DataFrame as managed Delta table
df.write.format("delta") \
    .mode("overwrite") \
    .saveAsTable("silver_customers")

# Write with partitioning
df.write.format("delta") \
    .mode("overwrite") \
    .partitionBy("year", "month") \
    .saveAsTable("silver_transactions")

# Append to existing table
df.write.format("delta") \
    .mode("append") \
    .saveAsTable("silver_events")
```

### Delta Table Operations (CRUD)

```python
# UPDATE
spark.sql("""
    UPDATE silver_customers
    SET status = 'active'
    WHERE last_login > '2024-01-01' -- Example date, adjust as needed
""")

# DELETE
spark.sql("""
    DELETE FROM silver_customers
    WHERE is_deleted = true
""")

# MERGE (Upsert)
spark.sql("""
    MERGE INTO silver_customers AS target
    USING staging_customers AS source
    ON target.customer_id = source.customer_id
    WHEN MATCHED THEN UPDATE SET *
    WHEN NOT MATCHED THEN INSERT *
""")
```

### Schema Definition

```python
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, TimestampType, DecimalType

schema = StructType([
    StructField("id", IntegerType(), False),
    StructField("name", StringType(), True),
    StructField("email", StringType(), True),
    StructField("amount", DecimalType(18, 2), True),
    StructField("created_at", TimestampType(), True)
])

df = spark.read.format("csv") \
    .schema(schema) \
    .option("header", "true") \
    .load("Files/bronze/customers.csv")
```

### SQL Magic in Notebooks

```sql
%%sql
-- Query Delta table directly
SELECT 
    customer_id,
    COUNT(*) as order_count,
    SUM(amount) as total_amount
FROM gold_orders
GROUP BY customer_id
ORDER BY total_amount DESC
LIMIT 10
```

### V-Order Optimization

```python
# Enable V-Order for read optimization
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")
```

### Table Optimization

```sql
%%sql
-- Optimize table (compact small files)
OPTIMIZE silver_transactions

-- Optimize with Z-ordering on query columns
OPTIMIZE silver_transactions ZORDER BY (customer_id, transaction_date)

-- Vacuum old files (default 7 days retention)
VACUUM silver_transactions

-- Vacuum with custom retention
VACUUM silver_transactions RETAIN 168 HOURS

```

### Incremental Load Pattern

```python
from pyspark.sql.functions import col

# Get last processed watermark
last_watermark = spark.sql("""
    SELECT MAX(processed_timestamp) as watermark 
    FROM silver_orders
""").collect()[0]["watermark"]

# Load only new records
new_records = spark.read.format("delta") \
    .table("bronze_orders") \
    .filter(col("created_at") > last_watermark)

# Merge new records
new_records.createOrReplaceTempView("staging_orders")
spark.sql("""
    MERGE INTO silver_orders AS target
    USING staging_orders AS source
    ON target.order_id = source.order_id
    WHEN MATCHED THEN UPDATE SET *
    WHEN NOT MATCHED THEN INSERT *
""")
```

### SCD Type 2 Pattern

```python
from pyspark.sql.functions import current_timestamp, lit

# Close existing records
spark.sql("""
    UPDATE dim_customer
    SET is_current = false, end_date = current_timestamp()
    WHERE customer_id IN (SELECT customer_id FROM staging_customer)
    AND is_current = true
""")

# Insert new versions
spark.sql("""
    INSERT INTO dim_customer
    SELECT 
        customer_id,
        name,
        email,
        address,
        current_timestamp() as start_date,
        null as end_date,
        true as is_current
    FROM staging_customer
""")
```
