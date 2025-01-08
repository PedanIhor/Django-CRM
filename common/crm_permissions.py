from rest_framework.permissions import IsAuthenticated
from common.models import Profile, Permission


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        user_id = request.user.id
        profile = Profile.objects.filter(user_id=user_id).first()
        return bool(super().has_permission(request, view)
                    and (profile.role.name == "ADMIN" or request.user.is_superuser))


class CrmRoles(IsAuthenticated):
    def __init__(self, roles):
        self.roles = roles

    def has_permission(self, request, view):
        if super().has_permission(request, view):
            user_id = request.user.id
            profile = Profile.objects.filter(user__id=user_id).first()
            is_admin = profile.role.name == "ADMIN" or request.user.is_superuser
            return is_admin or profile.role.name in self.roles
        else:
            return False


class CrmPermissions(IsAuthenticated):
    def __init__(self,
                 list: str = None,
                 get: str = None,
                 post: str = None,
                 patch: str = None,
                 put: str = None,
                 delete: str = None
                 ):
        self.list = list
        self.post = post
        self.get = get
        self.patch = patch
        self.put = put
        self.delete = delete

    def has_permission(self, request, view):
        if super().has_permission(request, view):
            user_id = request.user.id
            profile = Profile.objects.get(user_id=user_id)
            role_permissions = Permission.objects.filter(roles=profile.role).all()
            user_permissions = set(map(lambda x: x.name, role_permissions))

            if self.get and request.method == 'GET':
                if view.action == "list":
                    return self.list in user_permissions
                else:
                    return self.get in user_permissions

            elif self.post and request.method == 'POST':
                return self.post in user_permissions

            elif self.patch and request.method == 'PATCH':
                return self.patch in user_permissions

            elif self.put and request.method == 'PUT':
                return self.put in user_permissions

            elif self.delete and request.method == 'DELETE':
                return self.delete in user_permissions

            else:
                return True

        return False


def crm_roles(roles: list[str]):
    class CustomCrmRoles(CrmRoles):
        def __init__(self):
            super().__init__(roles)

    return CustomCrmRoles


def crm_permissions(list: str = None,
                    get: str = None,
                    post: str = None,
                    patch: str = None,
                    put: str = None,
                    delete: str = None):
    class CustomCrmPermission(CrmPermissions):
        def __init__(self):
            super().__init__(list=list, get=get, post=post, patch=patch, put=put, delete=delete)

    return CustomCrmPermission
