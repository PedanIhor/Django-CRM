"""
Tests for the Leads API.
"""

from django.test import TestCase
from django.urls import reverse

from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from seeders.seed import seed_database

from common.models import (
    Org,
    Profile,
    User,
)


GET_LEADS_LIST = reverse("common_urls:api_leads:get_leads")


class PublicLeadsAPITests(TestCase):
    """Test the public features of the leads API."""

    def setUp(self):
        self.client = APIClient()
        seed_database()
        self.org = Org.objects.first()

        self.headers = {
            "org": self.org.id,
        }

        return super().setUp()

    def retrieve_token_for_role(self, role_name: str):
        user = Profile.objects.get(org__id=self.org.id, role__name=role_name).user
        return self.retrieve_token_for_user(user)

    def retrieve_token_for_user(self, user: User):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_get_leads_list(self):

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))

        res = self.client.get(GET_LEADS_LIST, headers=self.headers)

        print(res.data.pretty())

        self.assertEqual(res.status_code, status.HTTP_200_OK)
