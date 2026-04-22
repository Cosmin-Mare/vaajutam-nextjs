import path from "node:path";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { projectPhotoPaths } from "@/lib/gallery";
import { splitPostContent } from "@/lib/content";
import { getProjectById } from "@/lib/queries";

type ProjectProps = {
  id: number;
  title: string;
  content: string;
  type: string;
};

type PageProps = { project: ProjectProps; photos: string[]; thumbnail: string };

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const raw = ctx.params?.id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id)) return { notFound: true };
  const project = await getProjectById(id);
  if (!project) return { notFound: true };

  const { photos, thumbnail } = projectPhotoPaths(
    project.id,
    path.join(process.cwd(), "public")
  );
  return {
    props: {
      project: {
        id: project.id,
        title: project.title,
        content: project.content,
        type: project.type,
      },
      photos,
      thumbnail,
    },
  };
};

export default function ProiectPage({ project, photos, thumbnail }: PageProps) {
  const contents = splitPostContent(project.content);

  return (
    <>
      <Head>
        <title>{`${project.title} | Proiecte`}</title>
      </Head>
      <section id="main">
        <div className="col-12 d-flex justify-content-center pt-3">
          <div className="col-10">
            <h1 className="post-title projects-title">{project.title}</h1>
          </div>
        </div>
      </section>
      <section className="post-content">
        <div className="my-5">
          <div className="col-lg-11 col-sm-11 col-10 mx-auto">
            {contents.map((c, i) => (
              <p className="lead mb-4" key={i}>
                {c}
              </p>
            ))}
            <div className="d-grid gap-2 d-sm-flex post-button-container">
              <Link
                className="btn btn-primary-pink-round btn-lg px-4 gap-3 mx-5 mx-lg-0"
                href="/cum-pot-ajuta#donez"
              >
                Donează
              </Link>
              <Link className="btn btn-secondary-pink btn-lg px-4 mx-5" href="/cum-pot-ajuta">
                Cum poți ajuta
              </Link>
            </div>
          </div>
        </div>
      </section>
      <div className="header-wrapper photo">
        <img
          src={thumbnail}
          className="d-block w-100 project-img"
          id="carousel-img-1"
          alt=""
        />
      </div>
      <div className="photos-container">
        <div className="photos">
          {photos.map((p) => (
            <div className="photo" key={p}>
              <img src={p} alt="" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
