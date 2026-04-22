import type { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { loadProjects } from "@/lib/queries";
import type { Project } from "@/lib/types";

type Props = { actual: Project[]; recurrent: Project[]; past: Project[] };

function group(projects: Project[]) {
  const actual: Project[] = [];
  const recurrent: Project[] = [];
  const past: Project[] = [];
  for (const p of projects) {
    if (p.type === "a") actual.push(p);
    else if (p.type === "r") recurrent.push(p);
    else past.push(p);
  }
  return { actual, recurrent, past };
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const projects = await loadProjects();
  const { actual, recurrent, past } = group(projects);
  return { props: { actual, recurrent, past } };
};

function ProjectBlock({
  title,
  list,
}: {
  title: string;
  list: Project[];
}) {
  if (list.length === 0) return null;
  return (
    <>
      <div className="container px-4 py-4">
        <h2 className="pb-2 border-bottom projects-title">{title}</h2>
      </div>
      <div className="album projects-album-wrapper">
        <div className="container">
          <div className="row row-cols-1 row-cols-md-2 g-5 actual-projects-album">
            {list.map((project) => (
              <div className="col" key={project.id}>
                <div className="card shadow-sm">
                  <Link className="post-img-link" href={`/proiect/${project.id}`}>
                    <img
                      src={`/images/projects/${project.id}/thumbnail.webp`}
                      style={{ objectFit: "fill" }}
                      alt=""
                    />
                  </Link>
                  <div className="card-body">
                    <h2 className="card-text">{project.title}</h2>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="project-buttons">
                        <Link
                          className="btn btn-primary-pink-round"
                          href="/cum-pot-ajuta#donez"
                        >
                          Doneaza
                        </Link>
                        <Link className="btn btn-secondary-pink" href="/cum-pot-ajuta">
                          Cum poți ajuta
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProiectePage({ actual, recurrent, past }: Props) {
  return (
    <>
      <Head>
        <title>Proiecte | Vă ajutam din Dej</title>
      </Head>
      <section id="posts">
        <ProjectBlock title="Proiecte Actuale" list={actual} />
        <div className="pt-3" />
        <ProjectBlock title="Proiecte Recurente" list={recurrent} />
        <div className="pt-3" />
        <ProjectBlock title="Proiecte Trecute" list={past} />
        <section className="px-4 my-5 text-center">
          <Image
            className="d-block mx-auto mb-4"
            src="/images/logo.png"
            alt=""
            width={100}
            height={100}
          />
          <h1 className="display-5 fw-bold text-body-emphasis projects-title">Vă mulțumim</h1>
          <p className="lead">Pentru sprijinul acordat proiectelor noastre.</p>
          <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
            <Link className="btn btn-primary-pink-round btn-lg px-4" href="/noutati">
              Noutăți
            </Link>
          </div>
        </section>
      </section>
    </>
  );
}
