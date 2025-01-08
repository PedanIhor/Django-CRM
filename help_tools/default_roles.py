from common.models import Org, Role, Permission, Module

default_modules_names = [
    "Leads", "Contacts", "Opportunities", "Accounts", "Companies", "Users", "Cases", "Settings", "Roles"
]
permission_types = [
    "list", "get", "add", "edit", "delete"
]
default_roles_names = [
    "ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "EMPLOYEE"
]
roles_permissions_names = {
    "ADMIN": [
        "list_leads", "add_leads", "get_leads", "edit_leads", "delete_leads", "update_lead_status",
        "list_contacts", "add_contacts", "get_contacts", "edit_contacts", "delete_contacts",
        "list_opportunities", "add_opportunities", "get_opportunities", "edit_opportunities", "delete_opportunities", "update_opportunity_status"
        "list_accounts", "add_accounts", "get_accounts", "edit_accounts", "delete_accounts",
        "list_companies", "add_companies", "get_companies", "edit_companies", "delete_companies",
        "list_users", "add_users", "get_users", "edit_users", "delete_users",
        "list_cases", "add_cases", "get_cases", "edit_cases", "delete_cases",
        "list_settings", "add_settings", "get_settings", "edit_settings", "delete_settings",
        "list_roles", "get_roles", "add_roles", "edit_roles", "delete_roles",
    ],
    "SALES_MANAGER": [
        "list_leads", "add_leads", "get_leads", "edit_leads", "delete_leads", "update_lead_status",
        "list_opportunities", "add_opportunities", "get_opportunities", "edit_opportunities", "delete_opportunities", "update_opportunity_status"
    ],
    "SALES_REPRESENTATIVE": [
        "list_leads", "get_leads", "update_lead_status",
        "list_opportunities", "add_opportunities", "get_opportunities", "edit_opportunities", "delete_opportunities",
        "update_opportunity_status"
    ],
    "EMPLOYEE": [
        "list_cases", "add_cases", "get_cases", "edit_cases", "delete_cases",
    ]
}


def generate_default_access_models(org: Org):
    all_permissions = set()
    for module_name in default_modules_names:
        module = Module.objects.create(name=module_name, org=org)
        module_permissions = list()
        for perm_type in permission_types:
            perm_name = f"{perm_type}_{module.name.lower()}"
            permission = Permission(name=perm_name, module=module, org=org)
            all_permissions.add(permission)
            module_permissions.append(permission)

        if module.name == "Leads":
            status_perm = Permission(name="update_lead_status", module=module, org=org)
            all_permissions.add(status_perm)
            module_permissions.append(status_perm)

        if module.name == "Opportunities":
            status_perm = Permission(name="update_opportunity_status", module=module, org=org)
            all_permissions.add(status_perm)
            module_permissions.append(status_perm)

        Permission.objects.bulk_create(module_permissions)

    for role_name, permissions_names in roles_permissions_names.items():
        role = Role.objects.create(name=role_name, org=org)
        permissions = [p for p in all_permissions if p.name in permissions_names]
        role.permissions.set(permissions)
