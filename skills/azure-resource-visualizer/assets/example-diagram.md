# Example Architecture Diagram

This example shows a typical Azure resource group with resources organized into logical layers.

## Sample Mermaid Diagram

```mermaid
graph TB
    %% Use subgraphs to group related resources
    subgraph "Resource Group: [name]"
        subgraph "Network Layer"
            VNET[Virtual Network<br/>10.0.0.0/16]
            SUBNET1[Subnet: web<br/>10.0.1.0/24]
            SUBNET2[Subnet: data<br/>10.0.2.0/24]
            NSG[Network Security Group]
        end
        
        subgraph "Compute Layer"
            APP[App Service<br/>Plan: P1v2]
            FUNC[Function App<br/>Runtime: .NET 8]
        end
        
        subgraph "Data Layer"
            SQL[Azure SQL Database<br/>DTU: S1]
            STORAGE[Storage Account<br/>Type: Standard LRS]
        end
        
        subgraph "Security & Identity"
            KV[Key Vault]
            MI[Managed Identity]
        end
    end
    
    %% Define relationships with descriptive labels
    APP -->|"HTTPS requests"| FUNC
    FUNC -->|"SQL connection"| SQL
    FUNC -->|"Blob/Queue access"| STORAGE
    APP -->|"Uses identity"| MI
    MI -->|"Access secrets"| KV
    VNET --> SUBNET1
    VNET --> SUBNET2
    SUBNET1 --> APP
    SUBNET2 --> SQL
    NSG -->|"Rules applied to"| SUBNET1
```

## Diagram Features

This example demonstrates:

- **Layered organization**: Resources grouped by function (Network, Compute, Data, Security)
- **Detailed node labels**: Each resource includes configuration details (SKUs, tiers, settings)
- **Descriptive connections**: Relationships are labeled to show data flow and dependencies
- **Subgraphs**: Logical grouping makes the architecture easy to understand
- **Resource variety**: Shows common Azure services and their interconnections
