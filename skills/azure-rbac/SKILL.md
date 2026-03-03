---
name: azure-rbac
description: "Helps users find the right Azure RBAC role for an identity with least privilege access, then generate CLI commands and Bicep code to assign it. Also provides guidance on permissions required to grant roles. USE FOR: \"what role should I assign\", \"least privilege role\", \"RBAC role for\", \"role to read blobs\", \"role for managed identity\", \"custom role definition\", \"assign role to identity\", \"what role do I need to grant access\", \"permissions to assign roles\". DO NOT USE FOR: creating or configuring managed identities, or general Azure security hardening; those are out of scope for this role-selection skill."
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---
Use the 'azure__documentation' tool to find the minimal role definition that matches the desired permissions the user wants to assign to an identity. If no built-in role matches the desired permissions, use the 'azure__extension_cli_generate' tool to create a custom role definition with the desired permissions. Then use the 'azure__extension_cli_generate' tool to generate the CLI commands needed to assign that role to the identity. Finally, use the 'azure__bicepschema' and 'azure__get_azure_bestpractices' tools to provide a Bicep code snippet for adding the role assignment. If user is asking about role necessary to set access, refer to Prerequisites for Granting Roles down below:

## Prerequisites for Granting Roles

To assign RBAC roles to identities, you need a role that includes the `Microsoft.Authorization/roleAssignments/write` permission. The most common roles with this permission are:

- **User Access Administrator** (least privilege - recommended for role assignment only)
- **Owner** (full access including role assignment)
- **Custom Role** with `Microsoft.Authorization/roleAssignments/write`
