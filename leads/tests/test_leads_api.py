"""
Tests for the Leads API.
"""

from django.test import TestCase
from django.urls import reverse
from django.db.models import Q

from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from help_tools import db_tests_dump

from common.models import (
    Org,
    Profile,
    User,
)
from leads.models import Lead


GET_LEADS_LIST = reverse("common_urls:api_leads:get_leads")

LIST_RESPONSE_KEYS = {
    "open_leads": {
        "leads_count": 0,
        "open_leads": [],
        "offset": 0,
    },
    "close_leads": {
        "leads_count": 0,
        "close_leads": [],
        "offset": 0,
    },
    "contacts": [],
    "status": [],
    "source": [],
    "tags": [],
    "users": [],
    "countries": [],
    "industries": [],
}


class PublicLeadsAPITests(TestCase):
    """Test the public features of the leads API."""

    def setUp(self):
        self.client = APIClient()
        org = db_tests_dump.create_test_org()
        db_tests_dump.fill_leads(org, 100) # 20 must be converted leads
        self.org = org

        self.headers = {
            "org": self.org.id,
        }

    def retrieve_token_for_role(self, role_name: str):
        user = Profile.objects.get(org__id=self.org.id, role__name=role_name).user
        return self.retrieve_token_for_user(user)

    def retrieve_token_for_user(self, user: User):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_get_leads_list_org_not_provided(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        res = self.client.get(GET_LEADS_LIST, headers={})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_leads_list_response_structure(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        res = self.client.get(GET_LEADS_LIST, headers=self.headers)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(set(LIST_RESPONSE_KEYS.keys()).issubset(set(res.data.keys())), "Response keys are not as expected")

    def test_get_leads_list_filter_by_status(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"status": "open"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "open")
        self.assertEqual(res.data['close_leads']['close_leads'], [])
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"status": "assigned"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "assigned")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"status": "in process"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "in process")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"status": "converted"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "converted")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"status": "recycled"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "recycled")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"status": "closed"})
        self.assertEqual(res.data["open_leads"]["open_leads"], [])
        for lead in res.data['close_leads']['close_leads']:
            self.assertEqual(lead["status"], "closed")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_get_leads_list_filter_by_source(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"source": "call"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "call")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"source": "email"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "email")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"source": "existing customer"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "existing customer")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"source": "partner"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "partner")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"source": "public relations"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "public relations")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"source": "compaign"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "compaign")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"source": "other"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "other")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_get_leads_list_pagination(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        db_open_leads = (Lead.objects
            .filter(org__id=self.org.id)
            .exclude(status='closed')
            .order_by("-id")
            .all()
        )

        def proceed_limit_offset(limit, offset):
            res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"limit": limit, "offset": offset})
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(db_open_leads.count(), res.data["open_leads"]["leads_count"])
            total_count = db_open_leads.count()

            if total_count - offset <= 0:
                exp_res_count = 0
            elif total_count - offset < limit:
                exp_res_count = total_count - offset
            else:
                exp_res_count = limit

            res_count = len(res.data["open_leads"]["open_leads"])
            self.assertEqual(res_count, exp_res_count, f"Returned leads count {res_count} is not as expected {exp_res_count}")
            paginated_leads_ids = [str(lead.id) for lead in db_open_leads[offset:offset+limit]]
            paginated_res_ids = [lead["id"] for lead in res.data["open_leads"]["open_leads"]]
            self.assertEqual(paginated_leads_ids, paginated_res_ids)

        proceed_limit_offset(10, 0)
        proceed_limit_offset(10, 10)
        proceed_limit_offset(10, 20)
        proceed_limit_offset(20, 0)
        proceed_limit_offset(20, 20)
        proceed_limit_offset(20, 40)
        proceed_limit_offset(30, 0)
        proceed_limit_offset(30, 30)
        proceed_limit_offset(30, 60)
        proceed_limit_offset(40, 0)
        proceed_limit_offset(40, 40)
        proceed_limit_offset(40, 80) # Zero result expected
        proceed_limit_offset(50, 150) # Out of bounds

    def test_get_leads_list_filter_by_assigned_user(self):
        user = User.objects.filter(profile__org__id=self.org.id, email="user3@test.com").first()
        user_leads = (
            Lead.objects
                .filter(org__id=self.org.id, assigned_to__user=user)
                .exclude(status="closed")
                .order_by("-id")
                .distinct()
                .all()
        )
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_user(user))
        res = self.client.get(GET_LEADS_LIST, headers=self.headers, data={"limit": 100, "offset": 0})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(user_leads), len(res.data["open_leads"]["open_leads"]))
        db_leads_ids = [str(lead.id) for lead in user_leads]
        res_leads_ids = [lead["id"] for lead in res.data["open_leads"]["open_leads"]]
        self.assertEqual(db_leads_ids, res_leads_ids)
