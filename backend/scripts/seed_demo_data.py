from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select, text

from app.database import AsyncSessionLocal
from app.modules.curriculum import repository as curriculum_repo
from app.modules.enrollment.models import Batch
from app.modules.enrollment import repository as enrollment_repo
from app.modules.identity import repository as identity_repo
from app.modules.mentors import repository as mentors_repo
from app.modules.students import repository as students_repo


@dataclass(frozen=True)
class DomainSeed:
    name: str
    description: str


@dataclass(frozen=True)
class MentorSeed:
    clerk_user_id: str
    email: str
    first_name: str
    last_name: str
    avatar_url: str
    company: str
    experience_yrs: int
    bio: str
    domain_name: str
    github_username: str
    rating_avg: Decimal


@dataclass(frozen=True)
class BatchSeed:
    name: str
    project_track: str
    domain_name: str
    mentor_email: str
    status: str
    start_offset_days: int
    duration_days: int
    max_students: int
    description: str
    github_template_repo: str
    github_repo_url: str


DOMAINS = [
    DomainSeed("Fintech", "Payments, ledgers, fraud, and transaction infrastructure."),
    DomainSeed("Healthcare", "Clinical data systems, FHIR pipelines, and health analytics."),
    DomainSeed("Logistics", "Routing, dispatch, warehousing, and supply chain operations."),
    DomainSeed("E-commerce", "Catalog, checkout, growth loops, and marketplace UX."),
]

MENTORS = [
    MentorSeed(
        clerk_user_id="seed_mentor_aisha",
        email="aisha.verma@promethean.dev",
        first_name="Aisha",
        last_name="Verma",
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
        company="Northwind Pay",
        experience_yrs=9,
        bio="Payments infrastructure mentor focused on ledgers, idempotency, and backend review habits.",
        domain_name="Fintech",
        github_username="aishaverma",
        rating_avg=Decimal("4.90"),
    ),
    MentorSeed(
        clerk_user_id="seed_mentor_marcus",
        email="marcus.cole@promethean.dev",
        first_name="Marcus",
        last_name="Cole",
        avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        company="Vitalink Health",
        experience_yrs=11,
        bio="Healthcare data mentor who helps students ship FHIR-compliant pipelines and debug analytics workloads.",
        domain_name="Healthcare",
        github_username="marcuscole",
        rating_avg=Decimal("4.80"),
    ),
    MentorSeed(
        clerk_user_id="seed_mentor_diego",
        email="diego.santos@promethean.dev",
        first_name="Diego",
        last_name="Santos",
        avatar_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
        company="Cargologic",
        experience_yrs=10,
        bio="Backend systems mentor with deep experience in routing engines, throughput tuning, and API design.",
        domain_name="Logistics",
        github_username="diegosantos",
        rating_avg=Decimal("4.70"),
    ),
    MentorSeed(
        clerk_user_id="seed_mentor_lena",
        email="lena.hoffmann@promethean.dev",
        first_name="Lena",
        last_name="Hoffmann",
        avatar_url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
        company="Marketplace Co",
        experience_yrs=8,
        bio="Frontend mentor specializing in checkout UX, accessibility, and high-conversion product interfaces.",
        domain_name="E-commerce",
        github_username="lenahoffmann",
        rating_avg=Decimal("4.90"),
    ),
]

BATCHES = [
    BatchSeed(
        name="Batch #16",
        project_track="Payments & Ledgers",
        domain_name="Fintech",
        mentor_email="aisha.verma@promethean.dev",
        status="active",
        start_offset_days=-14,
        duration_days=84,
        max_students=24,
        description="Build a production-style ledger service with fraud scoring, retries, and an ops dashboard.",
        github_template_repo="promethean-demo/template-payments-ledger",
        github_repo_url="https://github.com/promethean-demo/batch-16-payments-ledger",
    ),
    BatchSeed(
        name="Batch #17",
        project_track="Patient Pipelines",
        domain_name="Healthcare",
        mentor_email="marcus.cole@promethean.dev",
        status="upcoming",
        start_offset_days=10,
        duration_days=84,
        max_students=20,
        description="Ship a healthcare ingestion pipeline with validation, transformation, and analytics layers.",
        github_template_repo="promethean-demo/template-patient-pipelines",
        github_repo_url="https://github.com/promethean-demo/batch-17-patient-pipelines",
    ),
    BatchSeed(
        name="Batch #18",
        project_track="Fleet Routing API",
        domain_name="Logistics",
        mentor_email="diego.santos@promethean.dev",
        status="upcoming",
        start_offset_days=21,
        duration_days=84,
        max_students=20,
        description="Design and optimize a dispatch and routing backend for real-time fleet assignment.",
        github_template_repo="promethean-demo/template-fleet-routing",
        github_repo_url="https://github.com/promethean-demo/batch-18-fleet-routing",
    ),
    BatchSeed(
        name="Batch #19",
        project_track="Checkout Flow",
        domain_name="E-commerce",
        mentor_email="lena.hoffmann@promethean.dev",
        status="upcoming",
        start_offset_days=35,
        duration_days=84,
        max_students=20,
        description="Rebuild a high-conversion checkout experience with accessibility, observability, and experiment hooks.",
        github_template_repo="promethean-demo/template-checkout-flow",
        github_repo_url="https://github.com/promethean-demo/batch-19-checkout-flow",
    ),
]


def _slugify(value: str) -> str:
    return value.lower().replace(" ", "-").replace("#", "")


async def _upsert_user(
    session,
    *,
    clerk_user_id: str,
    email: str,
    first_name: str,
    last_name: str,
    avatar_url: str | None,
    role: str,
):
    user = await identity_repo.get_user_by_email(session, email)
    if user is None:
        user = await identity_repo.create_user(
            session,
            clerk_user_id=clerk_user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            avatar_url=avatar_url,
        )
    else:
        if user.clerk_user_id.startswith("seed_"):
            user.clerk_user_id = clerk_user_id
        await identity_repo.update_user_fields(
            session,
            user,
            email=email,
            first_name=first_name,
            last_name=last_name,
            avatar_url=avatar_url,
        )

    await identity_repo.upsert_user_role(session, user_id=user.id, role=role)
    return user


async def seed() -> None:
    today = datetime.now(tz=UTC).date()

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await session.execute(text("SET LOCAL app.bypass_rls = '1'"))

            domains_by_name: dict[str, uuid.UUID] = {}
            for seed_domain in DOMAINS:
                domain = await curriculum_repo.get_domain_by_name(session, seed_domain.name)
                if domain is None:
                    domain = await curriculum_repo.create_domain(
                        session,
                        name=seed_domain.name,
                        description=seed_domain.description,
                    )
                else:
                    await curriculum_repo.update_domain(
                        session,
                        domain,
                        description=seed_domain.description,
                        status="active",
                    )
                domains_by_name[seed_domain.name] = domain.id

            mentors_by_email = {}
            for mentor_seed in MENTORS:
                mentor_user = await _upsert_user(
                    session,
                    clerk_user_id=mentor_seed.clerk_user_id,
                    email=mentor_seed.email,
                    first_name=mentor_seed.first_name,
                    last_name=mentor_seed.last_name,
                    avatar_url=mentor_seed.avatar_url,
                    role="mentor",
                )
                mentors_by_email[mentor_seed.email] = mentor_user

                mentor_profile = await mentors_repo.get_mentor_profile_by_user_id(
                    session, mentor_user.id
                )
                domain_id = domains_by_name[mentor_seed.domain_name]
                if mentor_profile is None:
                    mentor_profile = await mentors_repo.create_mentor_profile(
                        session,
                        user_id=mentor_user.id,
                        bio=mentor_seed.bio,
                        company=mentor_seed.company,
                        experience_yrs=mentor_seed.experience_yrs,
                        domains=[str(domain_id)],
                        github_username=mentor_seed.github_username,
                    )
                else:
                    await mentors_repo.update_mentor_profile(
                        session,
                        mentor_profile,
                        bio=mentor_seed.bio,
                        company=mentor_seed.company,
                        experience_yrs=mentor_seed.experience_yrs,
                        domains=[str(domain_id)],
                        github_username=mentor_seed.github_username,
                    )
                mentor_profile.is_verified = True
                mentor_profile.rating_avg = mentor_seed.rating_avg
                await session.flush()

            charan_user = await _upsert_user(
                session,
                clerk_user_id="seed_charan_demo",
                email="charan.kdf15@gmail.com",
                first_name="Charan",
                last_name="Kdf",
                avatar_url=None,
                role="student",
            )

            fintech_domain_id = domains_by_name["Fintech"]
            student_profile = await students_repo.get_student_profile_by_user_id(session, charan_user.id)
            if student_profile is None:
                student_profile = await students_repo.create_student_profile(
                    session,
                    user_id=charan_user.id,
                    education="B.Tech in Computer Science",
                    skills=["React", "Next.js", "TypeScript", "FastAPI", "PostgreSQL"],
                    career_goals="Ship production-style full-stack systems and grow into a backend-leaning product engineer.",
                    domain_id=fintech_domain_id,
                    profile_complete=True,
                )
            else:
                await students_repo.update_student_profile(
                    session,
                    student_profile,
                    education="B.Tech in Computer Science",
                    skills=["React", "Next.js", "TypeScript", "FastAPI", "PostgreSQL"],
                    career_goals="Ship production-style full-stack systems and grow into a backend-leaning product engineer.",
                    domain_id=fintech_domain_id,
                    github_username="charankdf15",
                    profile_complete=True,
                )
            student_profile.github_username = "charankdf15"
            await session.flush()

            batches_by_name: dict[str, Batch] = {}
            for batch_seed in BATCHES:
                result = await session.execute(select(Batch).where(Batch.name == batch_seed.name))
                batch = result.scalar_one_or_none()
                mentor_user = mentors_by_email[batch_seed.mentor_email]
                start_date = today + timedelta(days=batch_seed.start_offset_days)
                end_date = start_date + timedelta(days=batch_seed.duration_days)

                if batch is None:
                    batch = await enrollment_repo.create_batch(
                        session,
                        name=batch_seed.name,
                        project_track=batch_seed.project_track,
                        domain_id=domains_by_name[batch_seed.domain_name],
                        mentor_id=mentor_user.id,
                        start_date=start_date,
                        end_date=end_date,
                        max_students=batch_seed.max_students,
                        description=batch_seed.description,
                        github_template_repo=batch_seed.github_template_repo,
                        github_repo_url=batch_seed.github_repo_url,
                        status=batch_seed.status,
                    )
                else:
                    await enrollment_repo.update_batch(
                        session,
                        batch,
                        project_track=batch_seed.project_track,
                        domain_id=domains_by_name[batch_seed.domain_name],
                        mentor_id=mentor_user.id,
                        start_date=start_date,
                        end_date=end_date,
                        max_students=batch_seed.max_students,
                        description=batch_seed.description,
                        github_template_repo=batch_seed.github_template_repo,
                        status=batch_seed.status,
                    )
                    batch.github_repo_url = batch_seed.github_repo_url
                    await session.flush()

                batches_by_name[batch_seed.name] = batch

            charan_batch = batches_by_name["Batch #16"]
            enrollment = await enrollment_repo.get_enrollment(session, charan_user.id, charan_batch.id)
            if enrollment is None:
                enrollment = await enrollment_repo.create_enrollment(
                    session,
                    student_id=charan_user.id,
                    batch_id=charan_batch.id,
                )
            enrollment.github_repo_url = (
                f"https://github.com/promethean-demo/{_slugify(charan_user.first_name)}-payments-ledger-lab"
            )
            enrollment.status = "active"
            enrollment.payment_status = "free"
            await session.flush()

    print("Demo data seeded for charan.kdf15@gmail.com")


if __name__ == "__main__":
    asyncio.run(seed())
