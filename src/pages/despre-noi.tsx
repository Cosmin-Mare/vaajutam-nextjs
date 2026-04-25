import type { GetStaticProps } from "next";
import Image from "next/image";
import Link from "next/link";
import { SeoHead } from "@/components/site/SeoHead";
import { loadMembers } from "@/lib/queries";
import { MEMBERS_REVALIDATE } from "@/lib/revalidate";
import { SITE_NAME } from "@/lib/seo";
import type { Member } from "@/lib/types";

type Props = { council: Member[]; notCouncil: Member[] };

function TeamMemberTile({ member }: { member: Member }) {
  const inner = (
    <div className="member">
      <img
        src={member.photoUrl ?? `/images/members/${member.name.replaceAll(" ", "_")}.webp`}
        className="pb-2"
        alt={`Foto ${member.name}`}
      />
      <h2>{member.name}</h2>
      <h3>{member.status}</h3>
    </div>
  );
  if (member.link) {
    return (
      <a href={member.link} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}

const PAGE_DESCRIPTION =
  "Cine suntem: Asociația Vă Ajutăm din Dej — voluntariat, obiective sociale și echipa din Dej, județul Cluj.";

export const getStaticProps: GetStaticProps<Props> = async () => {
  const members = await loadMembers();
  const council = members.filter((m) => m.is_council);
  const notCouncil = members.filter((m) => !m.is_council);
  return { props: { council, notCouncil }, revalidate: MEMBERS_REVALIDATE };
};

export default function DespreNoiPage({ council, notCouncil }: Props) {
  return (
    <>
      <SeoHead
        title={`Despre noi | ${SITE_NAME}`}
        description={PAGE_DESCRIPTION}
        path="/despre-noi"
      />
      <section id="main">
        <div
          className="container-fluid carousel-container bg-white"
          style={{ ["--bs-bg-opacity" as string]: 0.65 }}
        >
          <h1 className="header-title">Despre noi</h1>
        </div>
        <img
          src="/images/carousel/landscape/carousel-img-1.webp"
          className="d-block w-100 header-img"
          alt="Voluntari și activități Vă Ajutăm din Dej"
        />
      </section>
      <section id="about-us">
        <div className="px-4 my-5 text-center">
          <Image
            className="d-block mx-auto mb-4"
            src="/images/logo.png"
            alt="Logo Vă ajutăm din Dej"
            width={100}
            height={100}
          />
          <h1 className="display-5 fw-bold text-body-emphasis projects-title">Cine suntem</h1>
          <div className="col-lg-8 mx-auto">
            <p className="lead mb-4">
              În martie 2020, #împreună cu câțiva oameni de bine din Dej, puneam pe
              picioare grupul de voluntari Vă Ajutăm din Dej. Asociația continuă
              proiecte de educație, sănătate și sprijin pentru comunitate.
            </p>
            <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
              <Link
                className="btn btn-primary-pink-round btn-lg px-4 gap-3 mx-5"
                href="/proiecte"
              >
                Proiectele noastre
              </Link>
              <Link className="btn btn-secondary-pink btn-lg px-4 mx-5" href="/cum-pot-ajuta">
                Cum poți ajuta
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section id="obiective">
        <div className="container px-4 py-5">
          <h2 className="pb-2 border-bottom projects-title">Obiective</h2>
          <div className="row g-4 py-5 row-cols-1 row-cols-lg-3">
            <div className="feature col">
              <div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
                <img src="/images/checkmark-32.png" height={20} width={20} alt="" />
              </div>
              <h3 className="fs-2 text-body-emphasis">Construim o comunitate solidă</h3>
              <p>
                Organizarea și furnizarea de servicii sociale, medicale, educaționale
                și economice pentru categorii vulnerabile.
              </p>
            </div>
            <div className="feature col">
              <div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
                <img src="/images/checkmark-32.png" height={20} width={20} alt="" />
              </div>
              <h3 className="fs-2 text-body-emphasis">Oportunități noi</h3>
              <p>Dezvoltare socio-economică pentru persoanele defavorizate.</p>
            </div>
            <div className="feature col">
              <div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
                <img src="/images/checkmark-32.png" height={20} width={20} alt="" />
              </div>
              <h3 className="fs-2 text-body-emphasis">Implicare civică prin voluntariat</h3>
              <p>Promovarea activităților de voluntariat prin inițiative educaționale.</p>
            </div>
          </div>
        </div>
      </section>
      <section id="team">
        <div className="team-header">
          <h2 className="projects-title">Echipa</h2>
          <h3 className="projects-title">Consiliul Director</h3>
        </div>
        <div className="team-grid cd council-grid">
          {council.map((member) => (
            <TeamMemberTile key={member.id} member={member} />
          ))}
        </div>
        <div className="members-header">
          <h3 className="projects-title">Membrii asociației</h3>
        </div>
        <div className="team-grid cd">
          {notCouncil.map((member) => (
            <TeamMemberTile key={member.id} member={member} />
          ))}
        </div>
      </section>
    </>
  );
}
