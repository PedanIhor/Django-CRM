import random
from faker import Faker
from common.models import Org, Profile, User, Address, Role
from contacts.models import Contact
from leads.models import Lead, Company
from opportunity.models import Opportunity
from accounts.models import Account
from teams.models import Teams
from help_tools.default_roles import generate_default_access_models

faker = Faker()

def seed_database():
    # Create 3 organizations
    organizations = []
    for _ in range(3):
        org = Org.objects.create(
            name=f"{faker.company()} Org",  # Org name ends with 'Org'
            google_auth_enabled=True,  # All google_auth_enabled set to True
            is_active=True
        )
        generate_default_access_models(org)
        organizations.append(org)

    for org in organizations:
        # Create 10–30 profiles for the organization
        profiles = []
        org_admin = None  # To track the organization's admin
        for i in range(random.randint(10, 30)):
            user = User.objects.create(
                email=faker.email(),
                profile_pic=faker.image_url(),
                is_active=True,
                is_staff=False,
                is_superuser=(i == 0)  # Admin's is_superuser is True
            )
            user.set_password("secure_password")
            user.save()
            address = Address.objects.create(
                address_line=faker.street_address(),
                street=faker.street_name(),
                city=faker.city(),
                state=faker.state(),
                postcode=faker.postcode(),
                country="US"
            )
            if i == 0:
                role = Role.objects.filter(org=org).filter(name="ADMIN").first()
            else:
                role = Role.objects.filter(org=org).filter(name="EMPLOYEE").first()
            profile = Profile.objects.create(
                user=user,
                org=org,
                phone=f"+91{random.randint(1000000000, 9999999999)}",
                alternate_phone=f"+91{random.randint(1000000000, 9999999999)}",
                address=address,
                role=role,
                has_sales_access=random.choice([True, False]),
                has_marketing_access=random.choice([True, False]),
                is_active=True,
                is_organization_admin=(i == 0),
                date_of_joining=faker.date_this_decade(),
                created_by=None  # Set later after admin is identified
            )
            profiles.append(profile)
            if i == 0:
                org_admin = profile  # Save admin for later use

        # Update created_by_id for all profiles
        for profile in profiles:
            profile.created_by = org_admin.user
            profile.save()

        # Create 2 teams for the organization
        teams = []
        for _ in range(2):
            team = Teams.objects.create(
                name=f"{faker.color_name()} Team/{org.name}",  # Team name ends with '/Org name'
                description=faker.text(),
                org=org,
                created_by=org_admin.user  # Set created_by_id to org admin
            )
            teams.append(team)

        # Create 10–30 contacts for the organization
        contacts = []
        for _ in range(random.randint(10, 30)):
            address = Address.objects.create(
                address_line=faker.street_address(),
                street=faker.street_name(),
                city=faker.city(),
                state=faker.state(),
                postcode=faker.postcode(),
                country="US"
            )
            contact = Contact.objects.create(
                salutation=faker.prefix(),
                first_name=faker.first_name(),
                last_name=faker.last_name(),
                title=faker.random.choice(['Manager', 'Executive', 'Analyst', 'Consultant']),
                language="English",  # Set language to English
                description=faker.text() if random.choice([True, False]) else None,
                linked_in_url=faker.url() if random.choice([True, False]) else None,
                facebook_url=faker.url() if random.choice([True, False]) else None,
                twitter_username=faker.user_name() if random.choice([True, False]) else None,
                date_of_birth=faker.date_of_birth(minimum_age=18, maximum_age=70),
                primary_email=faker.unique.email(),
                secondary_email=faker.email(),
                mobile_number=faker.phone_number(),
                address=address,
                org=org,
                is_active=True,
                created_by=random.choice(profiles).user  # Created by a random profile in the org
            )
            # Assign contact to 1–2 profiles
            contact.assigned_to.set(random.sample(profiles, random.randint(1, 2)))
            # Assign contact to one of the teams
            contact.teams.add(random.choice(teams))
            contacts.append(contact)

        # Create leads for the organization
        leads = []
        num_converted = len(contacts) // 3  # Ensure exactly 1/3 are "converted"

        for i, contact in enumerate(contacts):
            status = "converted" if i < num_converted else random.choice(
                ['assigned', 'in process', 'recycled', 'closed']
            )
            company = Company.objects.create(
                name=faker.company(),
                org=org
            )
            lead = Lead.objects.create(
                title=faker.catch_phrase(),  # Lead title as a generic headline
                status=status,
                source=random.choice([
                    'call', 'email', 'existing customer', 'partner',
                    'public relations', 'campaign', 'other'
                ]),
                probability=random.choice([10, 20, 30, 40, 50, 60, 70]),  # Multiples of 10, ≤ 70
                country=random.choice(['US', 'NL', 'GB']),
                opportunity_amount=random.randint(6, 100) * 500,  # Multiple of 500, minimum 3000
                org=org,
                company=company,
                created_by=random.choice(profiles).user  # Created by a random profile in the org
            )
            lead.assigned_to.set(random.sample(profiles, random.randint(1, 2)))
            lead.contacts.add(contact)
            leads.append(lead)

        # Filter converted leads for opportunities
        converted_leads = [lead for lead in leads if lead.status == "converted"]

        # Create opportunities based on converted leads
        for lead in converted_leads[:len(leads) // 3]:  # Ensure exactly 1/3 of the total leads
            account = Account.objects.create(
                name=lead.company.name,
                email=faker.email(),
                phone=faker.phone_number(),
                billing_city=faker.city(),
                billing_state=faker.state(),
                billing_postcode=faker.postcode(),
                billing_country="US",
                website=faker.url(),
                description=faker.text(),
                org=org,
                lead=lead,
                contact_name=f"{lead.contacts.first().first_name} {lead.contacts.first().last_name}",
                created_by=org_admin.user  # Set created_by_id to org admin
            )

            increase_percentage = random.randint(10, 50) / 100  # Random percentage between 10% and 50%
            probability = min(int(lead.probability * (1 + increase_percentage)), 100)

            opportunity = Opportunity.objects.create(
                name=f"{lead.title} Opportunity",  # Name reflects lead title
                stage=random.choice(['QUALIFICATION', 'NEEDS ANALYSIS', 'VALUE PROPOSITION',
                                     'ID.DECISION MAKERS', 'PERCEPTION ANALYSIS', 
                                     'PROPOSAL/PRICE QUOTE', 'NEGOTIATION/REVIEW', 'CLOSED WON', 'CLOSED LOST']),
                amount=random.randint(5000, 50000),
                probability=probability,
                org=org,
                account=account,
                currency='EUR',  # Set currency to Euro
                description=f"Opportunity of the converted lead whose id is {lead.id} and whose name title is {lead.title}",
                created_by=lead.created_by  # Set created_by_id to the related lead's creator
            )
            opportunity.contacts.add(lead.contacts.first())
            opportunity.assigned_to.set(lead.assigned_to.all())


if not Org.objects.all():
    seed_database()
